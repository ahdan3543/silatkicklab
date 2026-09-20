import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, RefreshCcw, Eye, Layers } from 'lucide-react';
import { HumanMannequin3D, Landmark3D } from './HumanMannequin3D';

interface Pose3DOverlayProps {
  currentFramePose: { landmarks: Landmark3D[] } | null;
  videoWidth: number;
  videoHeight: number;
  isImpactFrame?: boolean;
  kickingLeg?: 'Kanan' | 'Kiri';
  showMannequin: boolean;
  onToggleMannequin?: (val: boolean) => void;
}

export const Pose3DOverlay: React.FC<Pose3DOverlayProps> = ({
  currentFramePose,
  videoWidth,
  videoHeight,
  isImpactFrame = false,
  kickingLeg = 'Kanan',
  showMannequin,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reference Three.js Instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mannequinRef = useRef<HumanMannequin3D | null>(null);

  // State Kontrol Interaksi 3D
  const [rotationY, setRotationY] = useState<number>(0);
  const [rotationX, setRotationX] = useState<number>(0);
  const [cameraZ, setCameraZ] = useState<number>(2.4);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Konversi Koordinat Normalisasi MediaPipe (0..1) ke Ruang 3D Three.js
  const to3DSpace = useCallback(
    (lm: Landmark3D): THREE.Vector3 => {
      const aspect = videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 16 / 9;
      // Inversi sumbu Y agar kepala tetap di atas dan kaki di bawah
      const x = (lm.x - 0.5) * 2 * aspect;
      const y = -(lm.y - 0.5) * 2;
      // Z depth dari MediaPipe berskala relatif terhadap lebar tubuh
      const z = -(lm.z || 0) * 1.5;
      return new THREE.Vector3(x, y, z);
    },
    [videoWidth, videoHeight]
  );

  // Inisialisasi Three.js Engine
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || videoWidth || 640;
    const height = containerRef.current.clientHeight || videoHeight || 360;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, cameraZ);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current = renderer;

    // Tata Cahaya Lembut Studio Biomekanika
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x475569, 1.2);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    const dirLightFront = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLightFront.position.set(2, 4, 5);
    scene.add(dirLightFront);

    const dirLightBack = new THREE.DirectionalLight(0x800000, 0.4); // Rim light aksen maroon
    dirLightBack.position.set(-2, -2, -3);
    scene.add(dirLightBack);

    // Instansiasi Mannequin 3D
    const mannequin = new HumanMannequin3D();
    scene.add(mannequin.group);
    mannequinRef.current = mannequin;

    // Loop Render
    let animationFrameId: number;
    const renderLoop = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // Resize Handler
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
  }, []);

  // Sinkronisasi Frame Pose ke Mannequin
  useEffect(() => {
    if (!mannequinRef.current) return;

    if (!showMannequin || !currentFramePose?.landmarks) {
      mannequinRef.current.group.visible = false;
      return;
    }

    mannequinRef.current.updatePose(
      currentFramePose.landmarks,
      to3DSpace,
      isImpactFrame,
      kickingLeg
    );
  }, [currentFramePose, showMannequin, isImpactFrame, kickingLeg, to3DSpace]);

  // Update Rotasi & Jarak Kamera
  useEffect(() => {
    if (!mannequinRef.current || !cameraRef.current) return;
    mannequinRef.current.group.rotation.y = rotationY;
    mannequinRef.current.group.rotation.x = rotationX;
    cameraRef.current.position.z = cameraZ;
  }, [rotationY, rotationX, cameraZ]);

  // Handler Interaksi Mouse Orbit / Rotasi
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;

    setRotationY((prev) => prev + deltaX * 0.012);
    setRotationX((prev) => Math.max(-0.6, Math.min(0.6, prev + deltaY * 0.012)));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setRotationY(0);
    setRotationX(0);
    setCameraZ(2.4);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-10"
      style={{ touchAction: 'none' }}
    >
      {/* Kanvas WebGL 3D Mannequin */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full absolute inset-0 ${
          showMannequin ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : 'pointer-events-none'
        }`}
      />

      {/* Kontrol Mini Floating 3D (Hanya Tampil Jika Mannequin Aktif) */}
      {showMannequin && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-white/10 px-2 py-1.5 rounded-xl shadow-lg pointer-events-auto z-20">
          <button
            onClick={() => setRotationY((prev) => prev - 0.3)}
            title="Putar Kiri (Y-Axis)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCw size={13} className="-scale-x-100" />
          </button>
          <button
            onClick={() => setRotationY((prev) => prev + 0.3)}
            title="Putar Kanan (Y-Axis)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCw size={13} />
          </button>
          <div className="w-[1px] h-3.5 bg-white/20 mx-0.5" />
          <button
            onClick={() => setCameraZ((prev) => Math.max(1.4, prev - 0.25))}
            title="Perbesar (Zoom In)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setCameraZ((prev) => Math.min(4.0, prev + 0.25))}
            title="Perkecil (Zoom Out)"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ZoomOut size={13} />
          </button>
          <div className="w-[1px] h-3.5 bg-white/20 mx-0.5" />
          <button
            onClick={handleResetView}
            title="Reset Sudut Pandang"
            className="p-1.5 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-white/10 transition-colors"
          >
            <RefreshCcw size={13} />
          </button>
        </div>
      )}
    </div>
  );
};