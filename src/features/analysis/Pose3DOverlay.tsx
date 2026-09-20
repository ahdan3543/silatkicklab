import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';
import { HumanMannequin3D, Landmark3D } from './HumanMannequin3D';
import { TargetDefinition } from '../../types/accuracy';

interface Pose3DOverlayProps {
  currentFramePose: { landmarks: Landmark3D[] } | null;
  videoWidth: number;
  videoHeight: number;
  isImpactFrame?: boolean;
  kickingLeg?: 'Kanan' | 'Kiri';
  showMannequin: boolean;
  target?: TargetDefinition | null;
  onToggleMannequin?: (val: boolean) => void;
}

export const Pose3DOverlay: React.FC<Pose3DOverlayProps> = ({
  currentFramePose,
  videoWidth,
  videoHeight,
  isImpactFrame = false,
  kickingLeg = 'Kanan',
  showMannequin,
  target,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reference Three.js Instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mannequinRef = useRef<HumanMannequin3D | null>(null);
  const targetGroupRef = useRef<THREE.Group | null>(null);
  const worldGroupRef = useRef<THREE.Group | null>(null);

  // State Kontrol Interaksi 3D
  const [rotationY, setRotationY] = useState<number>(0);
  const [rotationX, setRotationX] = useState<number>(0);
  const [cameraZ, setCameraZ] = useState<number>(2.4);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Konversi Koordinat Normalisasi (0..1) ke Ruang 3D Three.js
  const to3DSpace = useCallback(
    (lm: Landmark3D | { x: number; y: number; z?: number }): THREE.Vector3 => {
      const aspect = videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 16 / 9;
      const x = (lm.x - 0.5) * 2 * aspect;
      const y = -(lm.y - 0.5) * 2;
      const z = -(lm.z || 0) * 1.5;
      return new THREE.Vector3(x, y, z);
    },
    [videoWidth, videoHeight]
  );

  // 1 Lembar Tekstur Kanvas 2D Anti-Glitch (Bebas Z-Fighting)
  const createFrontPadTexture = useCallback((): THREE.CanvasTexture => {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 1024;
    const ctx = cv.getContext('2d');

    if (ctx) {
      // Background Merah Silat
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, 1024, 1024);

      // Lis Tepi Putih
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 36;
      ctx.strokeRect(18, 18, 1024 - 36, 1024 - 36);

      // Sabuk Strip Putih Atas & Bawah
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(24, 140, 1024 - 48, 50);
      ctx.fillRect(24, 1024 - 190, 1024 - 48, 50);

      // Lingkaran Sasaran Luar
      ctx.beginPath();
      ctx.arc(512, 512, 220, 0, Math.PI * 2);
      ctx.lineWidth = 48;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Titik Pusat Bulls-Eye
      ctx.beginPath();
      ctx.arc(512, 512, 85, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(cv);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);

  // Pembuat Mesh Pecing Box Silat dengan Pivot di Permukaan Kontak (Sisi Depan)
  const buildTargetPad = useCallback((): THREE.Group => {
    const group = new THREE.Group();

    // Dimensi Pecing Box: Lebar 0.65m x Tinggi 1.15m x Tebal 0.30m
    const padWidth = 0.65;
    const padHeight = 1.15;
    const padDepth = 0.30;
    const halfDepth = padDepth / 2;

    const boxGeometry = new THREE.BoxGeometry(padWidth, padHeight, padDepth);
    // Geser geometri ke belakang agar Z=0 pas di permukaan depan pecing (bidang kontak merah)
    boxGeometry.translate(0, 0, -halfDepth);

    const frontTexture = createFrontPadTexture();
    const frontMaterial = new THREE.MeshStandardMaterial({
      map: frontTexture,
      roughness: 0.35,
      metalness: 0.05,
    });

    const sideBackMaterial = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.45,
      metalness: 0.05,
    });

    const materials = [
      sideBackMaterial, // Kanan (+X)
      sideBackMaterial, // Kiri (-X)
      sideBackMaterial, // Atas (+Y)
      sideBackMaterial, // Bawah (-Y)
      frontMaterial,    // Depan (+Z) -> Permukaan kontak terluar
      sideBackMaterial, // Belakang (-Z)
    ];

    const bodyMesh = new THREE.Mesh(boxGeometry, materials);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Rotasi pecing 90 derajat agar menghadap ke arah datangnya tendangan
    group.rotation.y = Math.PI / 2;

    // Tali Peluk & Handle Belakang
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    [-0.32, 0, 0.32].forEach((yPos) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.02), handleMat);
      strap.position.set(0, yPos, -padDepth - 0.01);
      group.add(strap);

      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.34, 16),
        new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 })
      );
      grip.rotateZ(Math.PI / 2);
      grip.position.set(0, yPos, -padDepth - 0.05);
      group.add(grip);
    });

    return group;
  }, [createFrontPadTexture]);

  // Inisialisasi Engine Three.js
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || videoWidth || 640;
    const height = containerRef.current.clientHeight || videoHeight || 360;

    const scene = new THREE.Scene();
    // Latar Belakang Hitam Pekat Ruang Lab Biomekanika
    scene.background = new THREE.Color(0x020617);
    sceneRef.current = scene;

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);
    worldGroupRef.current = worldGroup;

    // Grid Lantai Studio Biomekanika
    const gridFloor = new THREE.GridHelper(6, 20, 0x334155, 0x1e293b);
    gridFloor.position.y = -1.0;
    worldGroup.add(gridFloor);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.3, 50);
    camera.position.set(0, 0, cameraZ);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current = renderer;

    // Pencahayaan
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 1.4);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    const dirLightFront = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLightFront.position.set(2, 4, 5);
    scene.add(dirLightFront);

    const dirLightBack = new THREE.DirectionalLight(0x800000, 0.8);
    dirLightBack.position.set(-3, -2, -3);
    scene.add(dirLightBack);

    // Mannequin
    const mannequin = new HumanMannequin3D();
    worldGroup.add(mannequin.group);
    mannequinRef.current = mannequin;

    // Pecing Target
    const targetGroup = buildTargetPad();
    worldGroup.add(targetGroup);
    targetGroupRef.current = targetGroup;

    let animationFrameId: number;
    const renderLoop = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      mannequin.dispose();
      renderer.dispose();
    };
  }, [buildTargetPad, cameraZ, videoHeight, videoWidth]);

  // Update Posisi & Visibilitas Pecing Box 3D
  useEffect(() => {
    if (!targetGroupRef.current) return;

    if (!showMannequin || !target || target.centerX === undefined || target.centerY === undefined) {
      targetGroupRef.current.visible = false;
      return;
    }

    targetGroupRef.current.visible = true;
    const pos3D = to3DSpace({ x: target.centerX, y: target.centerY, z: 0 });
    targetGroupRef.current.position.set(pos3D.x, pos3D.y, 0);
    targetGroupRef.current.scale.set(1.0, 1.0, 1.0);
  }, [target, showMannequin, to3DSpace]);

  // Sinkronisasi Pose Frame ke Mannequin
  useEffect(() => {
    if (!mannequinRef.current) return;

    if (!showMannequin || !currentFramePose?.landmarks) {
      mannequinRef.current.group.visible = false;
      return;
    }

    mannequinRef.current.group.visible = true;
    mannequinRef.current.updatePose(
      currentFramePose.landmarks,
      to3DSpace,
      isImpactFrame,
      kickingLeg
    );
  }, [currentFramePose, showMannequin, isImpactFrame, kickingLeg, to3DSpace]);

  // Rotasi Bersama
  useEffect(() => {
    if (!worldGroupRef.current || !cameraRef.current) return;
    worldGroupRef.current.rotation.y = rotationY;
    worldGroupRef.current.rotation.x = rotationX;
    cameraRef.current.position.z = cameraZ;
  }, [rotationY, rotationX, cameraZ]);

  const onStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    lastPointerPos.current = { x: clientX, y: clientY };
  };

  const onMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - lastPointerPos.current.x;
    const deltaY = clientY - lastPointerPos.current.y;

    setRotationY((prev) => prev + deltaX * 0.012);
    setRotationX((prev) => Math.max(-0.6, Math.min(0.6, prev + deltaY * 0.012)));

    lastPointerPos.current = { x: clientX, y: clientY };
  };

  const onEnd = () => setIsDragging(false);

  const handleResetView = () => {
    setRotationY(0);
    setRotationX(0);
    setCameraZ(2.4);
  };

  // Jangan render canvas ke DOM jika sedang di mode video
  if (!showMannequin) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none z-10 bg-[#020617]"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={(e) => onStart(e.clientX, e.clientY)}
        onMouseMove={(e) => onMove(e.clientX, e.clientY)}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={(e) => {
          if (e.touches[0]) onStart(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchEnd={onEnd}
        className="w-full h-full absolute inset-0 pointer-events-auto cursor-grab active:cursor-grabbing"
      />

      {/* Floating Toolbar Kontrol Rotasi & Zoom */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-white/15 px-2.5 py-1.5 rounded-xl shadow-lg pointer-events-auto z-20">
        <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase tracking-wider font-mono">
          Putar 3D
        </span>
        <button
          type="button"
          onClick={() => setRotationY((prev) => prev - 0.3)}
          title="Putar Kiri"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCw size={13} className="-scale-x-100" />
        </button>
        <button
          type="button"
          onClick={() => setRotationY((prev) => prev + 0.3)}
          title="Putar Kanan"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCw size={13} />
        </button>
        <div className="w-[1px] h-3.5 bg-white/20 mx-0.5" />
        <button
          type="button"
          onClick={() => setCameraZ((prev) => Math.max(1.4, prev - 0.25))}
          title="Perbesar"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomIn size={13} />
        </button>
        <button
          type="button"
          onClick={() => setCameraZ((prev) => Math.min(4.0, prev + 0.25))}
          title="Perkecil"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomOut size={13} />
        </button>
        <div className="w-[1px] h-3.5 bg-white/20 mx-0.5" />
        <button
          type="button"
          onClick={handleResetView}
          title="Reset Sudut Pandang"
          className="p-1.5 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-white/10 transition-colors"
        >
          <RefreshCcw size={13} />
        </button>
      </div>
    </div>
  );
};