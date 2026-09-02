import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { TargetDefinition, DEFAULT_TARGET_RADIUS_NORMALIZED } from '../../types/accuracy';
import {
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  MousePointer,
} from 'lucide-react';

interface TargetSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  videoElement: HTMLVideoElement | null;
  videoWidth: number;
  videoHeight: number;
  onSaveTarget?: (target: TargetDefinition) => void;
  onSave?: (target: TargetDefinition) => void;
  existingTarget?: TargetDefinition | null;
  initialTarget?: TargetDefinition | null;
}

export const TargetSetupModal: React.FC<TargetSetupModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  videoElement,
  videoWidth,
  videoHeight,
  onSaveTarget,
  onSave,
  existingTarget,
  initialTarget,
}) => {
  const activeTarget = existingTarget || initialTarget;

  const [center, setCenter] = useState<{ x: number; y: number }>({
    x: activeTarget?.centerX || 0.7,
    y: activeTarget?.centerY || 0.45,
  });
  const [radiusNorm, setRadiusNorm] = useState<number>(
    activeTarget?.radiusNormalized || DEFAULT_TARGET_RADIUS_NORMALIZED
  );

  // Zoom & Pan States
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState<boolean>(false);
  const [startDrag, setStartDrag] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasMovedDuringClick, setHasMovedDuringClick] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Render Frame Video ke Canvas
  useEffect(() => {
    if (isOpen && canvasRef.current && videoElement) {
      const canvas = canvasRef.current;
      canvas.width = videoWidth || 640;
      canvas.height = videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      }
    }
  }, [isOpen, videoElement, videoWidth, videoHeight]);

  // Reset Zoom saat Modal Dibuka
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      if (activeTarget) {
        setCenter({ x: activeTarget.centerX, y: activeTarget.centerY });
        setRadiusNorm(activeTarget.radiusNormalized);
      }
    }
  }, [isOpen, activeTarget]);

  // Handler Zoom Menggunakan Scroll Wheel Mouse
  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.25 : -0.25;

    setZoomLevel((prevZoom) => {
      const nextZoom = Math.max(1, Math.min(5, parseFloat((prevZoom + zoomDelta).toFixed(2))));
      if (nextZoom === 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return nextZoom;
    });
  };

  // Mouse & Touch Drag untuk Menggeser (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 || e.button === 1 || zoomLevel > 1) {
      setIsDraggingPan(true);
      setHasMovedDuringClick(false);
      setStartDrag({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingPan) {
      setHasMovedDuringClick(true);
      setPanOffset({
        x: e.clientX - startDrag.x,
        y: e.clientY - startDrag.y,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0 && !hasMovedDuringClick && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();

      const clickScreenX = (e.clientX - rect.left) / rect.width;
      const clickScreenY = (e.clientY - rect.top) / rect.height;

      const originalX = (clickScreenX - 0.5 - panOffset.x / rect.width) / zoomLevel + 0.5;
      const originalY = (clickScreenY - 0.5 - panOffset.y / rect.height) / zoomLevel + 0.5;

      setCenter({
        x: Math.max(0, Math.min(1, originalX)),
        y: Math.max(0, Math.min(1, originalY)),
      });
    }
    setIsDraggingPan(false);
  };

  // Touch Event Khusus Layar HP
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoomLevel > 1) {
      const touch = e.touches[0];
      setIsDraggingPan(true);
      setHasMovedDuringClick(false);
      setStartDrag({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDraggingPan && e.touches.length === 1) {
      const touch = e.touches[0];
      setHasMovedDuringClick(true);
      setPanOffset({
        x: touch.clientX - startDrag.x,
        y: touch.clientY - startDrag.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMovedDuringClick && viewportRef.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const rect = viewportRef.current.getBoundingClientRect();

      const clickScreenX = (touch.clientX - rect.left) / rect.width;
      const clickScreenY = (touch.clientY - rect.top) / rect.height;

      const originalX = (clickScreenX - 0.5 - panOffset.x / rect.width) / zoomLevel + 0.5;
      const originalY = (clickScreenY - 0.5 - panOffset.y / rect.height) / zoomLevel + 0.5;

      setCenter({
        x: Math.max(0, Math.min(1, originalX)),
        y: Math.max(0, Math.min(1, originalY)),
      });
    }
    setIsDraggingPan(false);
  };

  // Nudge Mikro Menggunakan Tombol Panah (Disesuaikan responsivitasnya)
  const handleNudge = (dx: number, dy: number) => {
    const step = 0.005;
    setCenter((prev) => ({
      x: Math.max(0, Math.min(1, prev.x + dx * step)),
      y: Math.max(0, Math.min(1, prev.y + dy * step)),
    }));
  };

  const handleSave = () => {
    const targetDef: TargetDefinition = {
      id: activeTarget?.id || `target-${Date.now()}`,
      sessionId,
      type: 'circle',
      centerX: center.x,
      centerY: center.y,
      radiusNormalized: radiusNorm,
      createdAt: activeTarget?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (onSaveTarget) onSaveTarget(targetDef);
    if (onSave) onSave(targetDef);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atur Target Sasaran Tendangan (Presisi)"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button size="sm" type="button" onClick={handleSave} icon={<Check size={16} />}>
            Simpan Target
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-4 text-xs max-w-2xl mx-auto">
        {/* Toolbar Zoom & Nudge Responsif */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 sm:p-2.5 bg-slate-50 border border-dark-border rounded-lg">
          {/* Kontrol Zoom */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-dark text-[11px]">Zoom:</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(5, z + 0.5))}
              disabled={zoomLevel >= 5}
              className="p-1.5 rounded-md bg-white border border-dark-border hover:bg-slate-100 text-dark disabled:opacity-40"
              title="Perbesar"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() =>
                setZoomLevel((z) => {
                  const next = Math.max(1, z - 0.5);
                  if (next === 1) setPanOffset({ x: 0, y: 0 });
                  return next;
                })
              }
              disabled={zoomLevel <= 1}
              className="p-1.5 rounded-md bg-white border border-dark-border hover:bg-slate-100 text-dark disabled:opacity-40"
              title="Perkecil"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded-md bg-white border border-dark-border hover:bg-slate-100 text-dark"
              title="Reset Zoom"
            >
              <RotateCcw size={14} />
            </button>
            <span className="font-mono font-bold text-primary ml-1 text-xs">{zoomLevel.toFixed(1)}x</span>
          </div>

          {/* D-Pad Penggeser Titik (Sangat berguna di layar sentuh HP) */}
          <div className="flex items-center gap-1">
            <span className="font-semibold text-dark text-[11px] mr-1">Geser Titik:</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleNudge(-1, 0)}
                className="p-1.5 sm:p-1 rounded bg-white border border-dark-border hover:bg-slate-100 active:bg-slate-200"
                title="Geser Kiri"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleNudge(0, -1)}
                  className="p-1.5 sm:p-1 rounded bg-white border border-dark-border hover:bg-slate-100 active:bg-slate-200"
                  title="Geser Atas"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0, 1)}
                  className="p-1.5 sm:p-1 rounded bg-white border border-dark-border hover:bg-slate-100 active:bg-slate-200"
                  title="Geser Bawah"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleNudge(1, 0)}
                className="p-1.5 sm:p-1 rounded bg-white border border-dark-border hover:bg-slate-100 active:bg-slate-200"
                title="Geser Kanan"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Slider Radius */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-dark">Ukuran Radius Sasaran:</span>
            <span className="font-mono font-bold text-primary">{(radiusNorm * 100).toFixed(1)}% Frame</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.2}
            step={0.002}
            value={radiusNorm}
            onChange={(e) => setRadiusNorm(parseFloat(e.target.value))}
            className="w-full accent-primary h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>

        {/* Viewport Interaktif Zoom & Touch/Mouse Pan */}
        <div
          ref={viewportRef}
          onWheel={handleWheelZoom}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
          className={`relative aspect-video bg-black rounded-xl overflow-hidden border border-dark-border select-none shadow-inner touch-none ${
            isDraggingPan ? 'cursor-grabbing' : zoomLevel > 1 ? 'cursor-grab' : 'cursor-crosshair'
          }`}
        >
          <div
            className="w-full h-full relative transition-transform duration-75"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
              transformOrigin: 'center center',
            }}
          >
            <canvas ref={canvasRef} className="w-full h-full object-contain pointer-events-none" />

            {/* Target Visualizer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <circle
                cx={`${center.x * 100}%`}
                cy={`${center.y * 100}%`}
                r={`${radiusNorm * 100}%`}
                fill="rgba(128, 0, 0, 0.25)"
                stroke="#800000"
                strokeWidth={2.5 / zoomLevel}
                strokeDasharray={`${4 / zoomLevel}`}
              />
              <circle
                cx={`${center.x * 100}%`}
                cy={`${center.y * 100}%`}
                r={4 / zoomLevel}
                fill="#800000"
                stroke="#FFFFFF"
                strokeWidth={1.5 / zoomLevel}
              />
              <line
                x1={`${(center.x - radiusNorm * 0.5) * 100}%`}
                y1={`${center.y * 100}%`}
                x2={`${(center.x + radiusNorm * 0.5) * 100}%`}
                y2={`${center.y * 100}%`}
                stroke="#800000"
                strokeWidth={1.5 / zoomLevel}
              />
              <line
                x1={`${center.x * 100}%`}
                y1={`${(center.y - radiusNorm * 0.5) * 100}%`}
                x2={`${center.x * 100}%`}
                y2={`${(center.y + radiusNorm * 0.5) * 100}%`}
                stroke="#800000"
                strokeWidth={1.5 / zoomLevel}
              />
            </svg>
          </div>
        </div>

        {/* Petunjuk Interaksi */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-dark-secondary text-[10px] sm:text-[11px] gap-1 px-1">
          <span className="flex items-center gap-1.5">
            <MousePointer size={12} className="text-primary shrink-0" />
            <span><b>Sentuh/Klik:</b> Taruh Titik • <b>Tombol Panah:</b> Geser Presisi</span>
          </span>
          <span className="font-mono text-dark font-semibold">
            X: {(center.x * 100).toFixed(1)}% | Y: {(center.y * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </Modal>
  );
};