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
    const tX = target.centerX * w;
    const tY = target.centerY * h;
    const radius = target.radiusNormalized * w;

    // 1. Gambar Target Zone (Lingkaran Merah Hati dengan Fill Transparan)
    ctx.beginPath();
    ctx.arc(tX, tY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(128, 0, 0, 0.2)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#800000'; // Maroon
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Target Center Crosshair
    ctx.beginPath();
    ctx.arc(tX, tY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#800000';
    ctx.fill();

    // 2. Gambar Posisi Kaki Saat Impact (Jika di Frame Impact)
    if (isImpactFrame && accuracyResult && accuracyResult.impactFootPosition) {
      const fX = accuracyResult.impactFootPosition.x * w;
      const fY = accuracyResult.impactFootPosition.y * h;

      // Garis Deviasi (Penghubung Foot -> Target Center)
      ctx.beginPath();
      ctx.moveTo(fX, fY);
      ctx.lineTo(tX, tY);
      ctx.lineWidth = 2;
      ctx.strokeStyle = accuracyResult.finalResult === 'hit' ? '#10B981' : '#EF4444';
      ctx.stroke();

      // Foot Impact Marker (X)
      ctx.beginPath();
      ctx.arc(fX, fY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = accuracyResult.finalResult === 'hit' ? '#10B981' : '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
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