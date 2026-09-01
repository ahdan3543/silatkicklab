import React, { useEffect, useRef } from 'react';
import { FramePose } from '../../types/pose';

interface PoseCanvasOverlayProps {
  currentFramePose?: FramePose | null;
  videoWidth: number;
  videoHeight: number;
}

// Koneksi sendi utama biomekanika (tanpa jari & wajah agar tidak mleyot/kusut)
const CLEAN_BODY_CONNECTIONS: [number, number][] = [
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Lengan Kiri
  [11, 13], [13, 15],
  // Lengan Kanan
  [12, 14], [14, 16],
  // Kaki Kiri
  [23, 25], [25, 27], [27, 31],
  // Kaki Kanan
  [24, 26], [26, 28], [28, 32],
];

export const PoseCanvasOverlay: React.FC<PoseCanvasOverlayProps> = ({
  currentFramePose,
  videoWidth,
  videoHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!currentFramePose || !currentFramePose.detected || !currentFramePose.landmarks) {
      return;
    }

    const { landmarks } = currentFramePose;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Gambar Garis Kerangka Tubuh (Cyan Neon Tegas)
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#00F2FE';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;

    for (const [startIdx, endIdx] of CLEAN_BODY_CONNECTIONS) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];

      if (p1 && p2 && (p1.visibility ?? 1) > 0.35 && (p2.visibility ?? 1) > 0.35) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    }

    // 2. Gambar Titik Sendi Utama
    const KEY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];
    for (const idx of KEY_JOINTS) {
      const lm = landmarks[idx];
      if (lm && (lm.visibility ?? 1) > 0.35) {
        const x = lm.x * w;
        const y = lm.y * h;

        // Lingkaran luar hitam
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Lingkaran sendi Cyan
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#00F2FE';
        ctx.fill();

        // Titik pusat putih
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    }
  }, [currentFramePose, videoWidth, videoHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={videoWidth || 640}
      height={videoHeight || 360}
      className="absolute inset-0 w-full h-full pointer-events-none object-contain z-10"
    />
  );
};