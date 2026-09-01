import React, { useEffect, useRef } from 'react';
import { FrameTrajectoryPoint } from '../../types/speed';

interface TrajectoryOverlayProps {
  trajectory: FrameTrajectoryPoint[];
  currentFrame: number;
  kickStartFrame: number;
  impactFrame: number;
  videoWidth: number;
  videoHeight: number;
}

export const TrajectoryOverlay: React.FC<TrajectoryOverlayProps> = ({
  videoWidth,
  videoHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Bersihkan canvas agar tidak ada garis jejak yang menutupi video
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [videoWidth, videoHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={videoWidth || 640}
      height={videoHeight || 360}
      className="absolute inset-0 w-full h-full pointer-events-none object-contain z-15"
    />
  );
};