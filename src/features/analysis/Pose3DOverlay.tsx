import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
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
  /** Zoom 3D dikontrol dari player utama agar indikator zoom selalu sinkron. 1 = 100%, 0.5 = 50%. */
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}

export const Pose3DOverlay: React.FC<Pose3DOverlayProps> = ({
  currentFramePose,
  videoWidth,
  videoHeight,
  isImpactFrame = false,
  kickingLeg = 'Kanan',
  showMannequin,
  target,
  zoomLevel = 1,
  onZoomChange,
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
  const cameraZ = 2.4 / Math.max(0.5, zoomLevel);
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


  // Ruangan studio biomekanika: dibuat seperti studio motion-capture modern,
  // bukan sekadar box hitam. Bagian depan tetap terbuka agar pose dan target jelas.
  const buildStudioRoom = useCallback((): THREE.Group => {
    const room = new THREE.Group();

    // Studio biomekanika: gelap-premium seperti ruang motion lab, tetapi subjek
    // tetap terang dan mudah dibaca dari seluruh sudut 360°.
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1b2028,
      roughness: 0.28,
      metalness: 0.22,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x252b34,
      roughness: 0.72,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x303741,
      roughness: 0.62,
      metalness: 0.08,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x66707d,
      roughness: 0.42,
      metalness: 0.2,
    });
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xc81018,
      emissive: 0x52080b,
      emissiveIntensity: 0.22,
      roughness: 0.38,
    });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 3.0,
      roughness: 0.18,
    });

    // Lantai hitam/charcoal glossy agar terlihat seperti studio profesional.
    const floor = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.12, 7.2), floorMat);
    floor.position.set(0, -1.06, -0.15);
    floor.receiveShadow = true;
    room.add(floor);

    // Garis arena merah tetap menjadi acuan biomekanika.
    const floorBorder = new THREE.Mesh(new THREE.BoxGeometry(8.45, 0.018, 0.055), trimMat);
    floorBorder.position.set(0, -0.995, -3.05);
    room.add(floorBorder);
    const floorLine = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.018, 0.045), redMat);
    floorLine.position.set(0, -0.988, -1.55);
    room.add(floorLine);
    const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 5.2), redMat);
    centerLine.position.set(0, -0.987, -0.2);
    room.add(centerLine);

    // Empat sisi ruangan benar-benar memiliki dinding sehingga saat orbit ke belakang
    // tidak pernah muncul background hitam kosong.
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(9.2, 5.35, 0.16), wallMat);
    backWall.position.set(0, 1.55, -3.48);
    backWall.receiveShadow = true;
    room.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(9.2, 5.35, 0.16), wallMat);
    frontWall.position.set(0, 1.55, 3.42);
    frontWall.receiveShadow = true;
    room.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.35, 7.0), wallMat);
    leftWall.position.set(-4.55, 1.55, -0.05);
    leftWall.receiveShadow = true;
    room.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.35, 7.0), wallMat);
    rightWall.position.set(4.55, 1.55, -0.05);
    rightWall.receiveShadow = true;
    room.add(rightWall);

    // Panel vertikal untuk memberi kedalaman seperti studio nyata.
    const addBackPanels = (z: number, facing: number) => {
      [-3.55, -2.15, -0.75, 0.65, 2.05, 3.45].forEach((x) => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.22, 3.75, 0.075), panelMat);
        panel.position.set(x, 1.43, z);
        panel.receiveShadow = true;
        room.add(panel);

        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.025, 3.78, 0.035), trimMat);
        seam.position.set(x + 0.62, 1.43, z + facing * 0.055);
        room.add(seam);
      });
    };
    addBackPanels(-3.36, 1);
    addBackPanels(3.30, -1);

    // Panel aksen merah di kiri/kanan seperti dinding branding pada referensi.
    const addSideAccent = (x: number, facing: number) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 3.25, 3.65), redMat);
      panel.position.set(x + facing * 0.035, 1.42, -0.95);
      room.add(panel);

      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.65, 2.75), wallMat);
      inner.position.set(x + facing * 0.06, 1.42, -0.95);
      room.add(inner);
    };
    addSideAccent(-4.44, 1);
    addSideAccent(4.44, -1);

    // Branding SILAT MOTION pada dinding samping.
    const makeSideBrand = () => {
      const cv = document.createElement('canvas');
      cv.width = 1000;
      cv.height = 560;
      const ctx = cv.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#b90d14';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 74px Arial, sans-serif';
      ctx.fillText('SILAT MOTION', 72, 205);
      ctx.font = '400 36px Arial, sans-serif';
      ctx.fillText('ANALISIS TENDANGAN', 72, 270);
      ctx.fillText('PENCAK SILAT', 72, 320);
      ctx.globalAlpha = 0.18;
      ctx.font = '900 210px Arial, sans-serif';
      ctx.fillText('S', 735, 430);
      ctx.globalAlpha = 1;
      return new THREE.CanvasTexture(cv);
    };
    const sideBrandTexture = makeSideBrand();
    if (sideBrandTexture) {
      sideBrandTexture.colorSpace = THREE.SRGBColorSpace;
      const sideBrandMat = new THREE.MeshBasicMaterial({ map: sideBrandTexture, side: THREE.DoubleSide });
      const sideBrandLeft = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.26), sideBrandMat);
      sideBrandLeft.position.set(-4.46, 1.55, -0.95);
      sideBrandLeft.rotation.y = Math.PI / 2;
      room.add(sideBrandLeft);

      const sideBrandRight = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.26), sideBrandMat.clone());
      sideBrandRight.position.set(4.46, 1.55, -0.95);
      sideBrandRight.rotation.y = -Math.PI / 2;
      room.add(sideBrandRight);
    }

    // Panel identitas UPI. Logo dan teks dibuat pada canvas agar tajam dan konsisten.
    const makeLogoCanvas = (logoSrc: string) => {
      const cv = document.createElement('canvas');
      cv.width = 1600;
      cv.height = 620;
      const ctx = cv.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#222831';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#c81018';
      ctx.fillRect(0, 0, cv.width, 18);
      ctx.fillRect(0, cv.height - 18, cv.width, 18);

      const texture = new THREE.CanvasTexture(cv);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 95, 135, 350, 350);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 82px Arial, sans-serif';
        ctx.fillText('UNIVERSITAS', 535, 245);
        ctx.fillText('PENDIDIKAN', 535, 345);
        ctx.fillText('INDONESIA', 535, 445);
        ctx.fillStyle = '#e3e7ec';
        ctx.fillRect(535, 475, 700, 7);
        texture.needsUpdate = true;
      };
      img.src = logoSrc;
      return texture;
    };

    const logoTexture = makeLogoCanvas('/upi-logo.png');
    if (logoTexture) {
      const logoMat = new THREE.MeshBasicMaterial({ map: logoTexture, side: THREE.DoubleSide });

      const backLogo = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 1.26), logoMat);
      backLogo.position.set(0, 1.68, -3.27);
      room.add(backLogo);

      // Logo sisi depan juga dibuat terang supaya orbit 180° tetap informatif.
      const frontLogo = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 1.26), logoMat.clone());
      frontLogo.position.set(0, 1.68, 3.08);
      frontLogo.rotation.y = Math.PI;
      room.add(frontLogo);
    }

    // Plafon gelap dengan softbox putih; cahaya membuat mannequin putih tetap terbaca.
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.10, 7.0), wallMat);
    ceiling.position.set(0, 4.15, -0.15);
    room.add(ceiling);

    [-3.1, 0, 3.1].forEach((x) => {
      const softbox = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 1.05), lightMat);
      softbox.position.set(x, 4.04, -0.25);
      room.add(softbox);
      const area = new THREE.RectAreaLight(0xffffff, 7.0, 1.65, 1.05);
      area.position.set(x, 3.85, -0.25);
      area.rotation.x = 0;
      room.add(area);
    });

    // Key/fill/rim lights dari seluruh arah. Ini penting agar atlet tidak tenggelam
    // ketika pengguna memutar studio ke belakang.
    const addAreaLight = (x: number, y: number, z: number, intensity: number, rotY: number) => {
      const area = new THREE.RectAreaLight(0xffffff, intensity, 4.5, 3.0);
      area.position.set(x, y, z);
      area.rotation.y = rotY;
      room.add(area);
    };
    addAreaLight(0, 2.4, 2.8, 6.5, Math.PI);
    addAreaLight(0, 2.4, -2.8, 6.5, 0);
    addAreaLight(-3.8, 2.0, 0, 4.0, Math.PI / 2);
    addAreaLight(3.8, 2.0, 0, 4.0, -Math.PI / 2);

    // Lampu merah tipis sebagai aksen studio, bukan sebagai sumber utama pencahayaan.
    [-3.95, 3.95].forEach((x) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 3.0, 0.045), redMat);
      strip.position.set(x, 1.5, -3.22);
      room.add(strip);
    });

    return room;
  }, []);

  // Inisialisasi Engine Three.js
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || videoWidth || 640;
    const height = containerRef.current.clientHeight || videoHeight || 360;

    const scene = new THREE.Scene();
    // Latar Belakang Hitam Pekat Ruang Lab Biomekanika
    scene.background = new THREE.Color(0xe5e7eb);
    sceneRef.current = scene;

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);
    worldGroupRef.current = worldGroup;

    // Studio biomekanika yang lebih terasa seperti ruangan nyata.
    const studioRoom = buildStudioRoom();
    worldGroup.add(studioRoom);

    // Grid lantai tetap dipertahankan sebagai acuan pengukuran.
    const gridFloor = new THREE.GridHelper(7.8, 26, 0x475569, 0x243244);
    gridFloor.position.set(0, -0.99, -0.15);
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current = renderer;

    // Pencahayaan
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.5);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    const dirLightFront = new THREE.DirectionalLight(0xffffff, 3.2);
    dirLightFront.position.set(2, 5, 5);
    dirLightFront.castShadow = true;
    dirLightFront.shadow.mapSize.set(1024, 1024);
    scene.add(dirLightFront);

    const dirLightBack = new THREE.DirectionalLight(0xffd5d5, 2.0);
    dirLightBack.position.set(-3, 3, -4);
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
  }, [buildTargetPad, buildStudioRoom, videoHeight, videoWidth]);

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
    onZoomChange?.(1);
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

    </div>
  );
};