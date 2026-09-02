import React, { useEffect, useRef } from 'react';
import { TargetDefinition, AccuracyAnalysisResult } from '../../types/accuracy';

interface TargetOverlayProps {
  target: TargetDefinition | null;
  accuracyResult: AccuracyAnalysisResult | null;
  videoWidth: number;
  videoHeight: number;
  isImpactFrame: boolean;
}

export const TargetOverlay: React.FC<TargetOverlayProps> = ({
  target,
  accuracyResult,
  videoWidth,
  videoHeight,
  isImpactFrame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!target) return;

    const w = canvas.width;
    const h = canvas.height;

    // Baca koordinat target secara fleksibel
    const rawX =
      (target as any).xNormalized ??
      (target as any).centerNormalized?.x ??
      (target as any).targetCenter?.normalizedX ??
      (target as any).centerX ??
      (target as any).x ??
      0.5;

    const rawY =
      (target as any).yNormalized ??
      (target as any).centerNormalized?.y ??
      (target as any).targetCenter?.normalizedY ??
      (target as any).centerY ??
      (target as any).y ??
      0.5;

    const rawRad =
      (target as any).radiusNormalized ??
      (target as any).radius ??
      (target as any).targetRadiusNormalized ??
      0.04;

    const tX = rawX <= 1.0 ? rawX * w : rawX;
    const tY = rawY <= 1.0 ? rawY * h : rawY;
    const radius = rawRad <= 1.0 ? rawRad * Math.min(w, h) : rawRad;

    // 1. Gambar Target Lingkaran Merah Maroon
    ctx.beginPath();
    ctx.arc(tX, tY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(128, 0, 0, 0.22)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#800000';
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Titik Pusat Target
    ctx.beginPath();
    ctx.arc(tX, tY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#800000';
    ctx.fill();

    // 2. Gambar Posisi Kaki & Garis Deviasi
    if (isImpactFrame && accuracyResult) {
      const footPos =
        (accuracyResult as any).impactCoordinates ||
        (accuracyResult as any).impactFootPosition ||
        (accuracyResult as any).impactPoint;

      if (footPos && typeof footPos.x === 'number' && typeof footPos.y === 'number') {
        const fX = footPos.x <= 1.0 ? footPos.x * w : footPos.x;
        const fY = footPos.y <= 1.0 ? footPos.y * h : footPos.y;

        const isHit = accuracyResult.finalResult === 'hit';

        // Garis penghubung kaki ke pusat sasaran
        ctx.beginPath();
        ctx.moveTo(fX, fY);
        ctx.lineTo(tX, tY);
        ctx.lineWidth = 2;
        ctx.strokeStyle = isHit ? '#10B981' : '#EF4444';
        ctx.stroke();

        // Titik kaki atlet
        ctx.beginPath();
        ctx.arc(fX, fY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = isHit ? '#10B981' : '#EF4444';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [target, accuracyResult, videoWidth, videoHeight, isImpactFrame]);

  return (
    <canvas
      ref={canvasRef}
      width={videoWidth || 640}
      height={videoHeight || 360}
      className="absolute inset-0 w-full h-full pointer-events-none object-contain z-20"
    />
  );
};