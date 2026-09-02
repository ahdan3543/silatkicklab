import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CalibrationData } from '../../types/speed';
import { Check, ZoomIn, ZoomOut, Move, AlertCircle } from 'lucide-react';

interface Point {
  x: number; // Koordinat normalisasi (0 - 1) terhadap frame video asli
  y: number; // Koordinat normalisasi (0 - 1) terhadap frame video asli
}

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoElement: HTMLVideoElement | null;
  videoWidth: number;
  videoHeight: number;
  onSaveCalibration: (calib: CalibrationData) => void;
  existingCalibration?: CalibrationData | null;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  videoElement,
  videoWidth,
  videoHeight,
  onSaveCalibration,
  existingCalibration,
}) => {
  const [realDistance, setRealDistance] = useState<number>(
    existingCalibration?.realDistanceMeters || 1.0
  );
  const [points, setPoints] = useState<Point[]>([]);

  // State Zoom & Pan Viewport
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Inisialisasi frame video dan titik saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });

      if (existingCalibration?.pointA && existingCalibration?.pointB) {
        setPoints([existingCalibration.pointA, existingCalibration.pointB]);
      } else {
        setPoints([]);
      }

      if (existingCalibration?.realDistanceMeters) {
        setRealDistance(existingCalibration.realDistanceMeters);
      }

      const timer = setTimeout(() => {
        if (canvasRef.current && videoElement) {
          const canvas = canvasRef.current;
          canvas.width = videoWidth || 640;
          canvas.height = videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, videoElement, videoWidth, videoHeight, existingCalibration]);

  // Konversi dari Screen Client -> Normalized Video Coordinates (0 - 1)
  const getNormalizedCoordinates = useCallback(
    (clientX: number, clientY: number): Point | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();

      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      const containerWidth = rect.width;
      const containerHeight = rect.height;

      // Un-apply Pan dan Zoom
      const transformedX = (clickX - containerWidth / 2 - panOffset.x) / zoom + containerWidth / 2;
      const transformedY = (clickY - containerHeight / 2 - panOffset.y) / zoom + containerHeight / 2;

      const normX = Math.max(0, Math.min(1, transformedX / containerWidth));
      const normY = Math.max(0, Math.min(1, transformedY / containerHeight));

      return { x: normX, y: normY };
    },
    [zoom, panOffset]
  );

  // Konversi Normalized Video Coordinates -> Screen Pixel di dalam Viewport
  const getRenderCoordinates = useCallback(
    (pt: Point) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();

      const containerWidth = rect.width;
      const containerHeight = rect.height;

      const unscaledX = pt.x * containerWidth;
      const unscaledY = pt.y * containerHeight;

      const screenX = (unscaledX - containerWidth / 2) * zoom + containerWidth / 2 + panOffset.x;
      const screenY = (unscaledY - containerHeight / 2) * zoom + containerHeight / 2 + panOffset.y;

      return { x: screenX, y: screenY };
    },
    [zoom, panOffset]
  );

  // Zoom menggunakan Roda Mouse (Wheel Event) mengarah ke posisi kursor
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const containerWidth = rect.width;
    const containerHeight = rect.height;

    // Zoom delta sensitivitas halus
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.max(1, Math.min(4, Number((zoom * zoomFactor).toFixed(2))));

    if (newZoom === zoom) return;

    if (newZoom === 1) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    // Koreksi pan agar zoom fokus ke kursor mouse
    const scaleRatio = newZoom / zoom;
    const newPanX = cursorX - containerWidth / 2 - (cursorX - containerWidth / 2 - panOffset.x) * scaleRatio;
    const newPanY = cursorY - containerHeight / 2 - (cursorY - containerHeight / 2 - panOffset.y) * scaleRatio;

    const maxPan = 500 * (newZoom - 1);
    setZoom(newZoom);
    setPanOffset({
      x: Math.max(-maxPan, Math.min(maxPan, newPanX)),
      y: Math.max(-maxPan, Math.min(maxPan, newPanY)),
    });
  };

  // Pointer Handlers untuk Drag Endpoint & Pan
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.viewport-controls')) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // 1. Cek apakah mengklik Endpoint untuk di-drag
    if (points.length > 0) {
      for (let i = 0; i < points.length; i++) {
        const renderPt = getRenderCoordinates(points[i]);
        const dist = Math.hypot(clientX - renderPt.x, clientY - renderPt.y);
        if (dist <= 18) {
          setDraggedPointIndex(i);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    // 2. Tambah titik jika belum ada 2 titik
    if (points.length < 2) {
      const normPt = getNormalizedCoordinates(e.clientX, e.clientY);
      if (normPt) {
        setPoints((prev) => [...prev, normPt]);
      }
      return;
    }

    // 3. Pan saat zoom > 100%
    if (zoom > 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggedPointIndex !== null) {
      const normPt = getNormalizedCoordinates(e.clientX, e.clientY);
      if (normPt) {
        setPoints((prev) => {
          const updated = [...prev];
          updated[draggedPointIndex] = normPt;
          return updated;
        });
      }
      return;
    }

    if (isPanning) {
      const maxPan = 500 * (zoom - 1);
      const nextX = e.clientX - panStartRef.current.x;
      const nextY = e.clientY - panStartRef.current.y;
      setPanOffset({
        x: Math.max(-maxPan, Math.min(maxPan, nextX)),
        y: Math.max(-maxPan, Math.min(maxPan, nextY)),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggedPointIndex !== null) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setDraggedPointIndex(null);
    }
    if (isPanning) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsPanning(false);
    }
  };

  // Kontrol Zoom Tombol Manual
  const handleZoomChange = (delta: number) => {
    setZoom((prev) => {
      const next = Math.max(1, Math.min(4, Number((prev + delta).toFixed(2))));
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setPoints([]);
  };

  // Kalkulasi Skala
  const calculateCalibration = (): CalibrationData | null => {
    if (points.length < 2 || realDistance <= 0) return null;

    const pA = points[0];
    const pB = points[1];

    const dx = (pB.x - pA.x) * (videoWidth || 640);
    const dy = (pB.y - pA.y) * (videoHeight || 360);
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);

    if (pixelDistance < 5) return null;

    const metersPerPixel = realDistance / pixelDistance;

    return {
      pointA: pA,
      pointB: pB,
      pixelDistance,
      realDistanceMeters: realDistance,
      metersPerPixel,
      pixelToMeterRatio: Number((pixelDistance / realDistance).toFixed(2)),
      isCalibrated: true,
      createdAt: new Date().toISOString(),
    } as any;
  };

  const handleSave = () => {
    const calib = calculateCalibration();
    if (calib) {
      onSaveCalibration(calib);
      onClose();
    }
  };

  const calibResult = calculateCalibration();
  const renderPoints = points.map((p) => getRenderCoordinates(p));

  const midPoint =
    renderPoints.length === 2
      ? {
          x: (renderPoints[0].x + renderPoints[1].x) / 2,
          y: (renderPoints[0].y + renderPoints[1].y) / 2,
        }
      : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kalibrasi Skala Jarak (Pixel → Meter)"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            disabled={!calibResult}
            onClick={handleSave}
            icon={<Check size={16} />}
          >
            Terapkan Kalibrasi
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Petunjuk Pintar */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 leading-relaxed flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            <b>Petunjuk:</b>{' '}
            {points.length === 0
              ? 'Klik ujung pertama objek referensi pada video.'
              : points.length === 1
              ? 'Klik ujung kedua objek referensi untuk membentuk garis kalibrasi.'
              : 'Garis terbentuk. Drag endpoint (●) untuk mengatur posisi presisi.'}
            {' '}<b>Scroll mouse untuk Zoom in/out</b>, lalu geser video untuk mode Pan.
          </div>
        </div>

        {/* Input Objek Referensi & Reset */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <Input
            label="Panjang Objek Referensi Nyata (Meter) *"
            type="number"
            step="0.01"
            min="0.05"
            value={realDistance}
            onChange={(e) => setRealDistance(parseFloat(e.target.value) || 0)}
          />
          <Button variant="outline" size="sm" onClick={handleReset} className="h-9">
            Reset Titik ({points.length}/2)
          </Button>
        </div>

        {/* Viewport Video Interaktif */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`relative aspect-video bg-black rounded-lg overflow-hidden border border-dark-border select-none ${
            draggedPointIndex !== null
              ? 'cursor-grabbing'
              : isPanning
              ? 'cursor-move'
              : zoom > 1
              ? 'cursor-grab'
              : 'cursor-crosshair'
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* Canvas Snapshot Video dengan Dukungan Zoom & Pan */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          />

          {/* SVG Overlay Garis & Endpoint */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            {/* Garis Kalibrasi */}
            {renderPoints.length === 2 && (
              <>
                <line
                  x1={renderPoints[0].x}
                  y1={renderPoints[0].y}
                  x2={renderPoints[1].x}
                  y2={renderPoints[1].y}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line
                  x1={renderPoints[0].x}
                  y1={renderPoints[0].y}
                  x2={renderPoints[1].x}
                  y2={renderPoints[1].y}
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Label Jarak di Tengah Garis */}
            {midPoint && calibResult && (
              <g transform={`translate(${midPoint.x}, ${midPoint.y - 12})`}>
                <rect
                  x="-35"
                  y="-10"
                  width="70"
                  height="18"
                  rx="4"
                  fill="rgba(15, 23, 42, 0.85)"
                  stroke="#F59E0B"
                  strokeWidth="1"
                />
                <text
                  textAnchor="middle"
                  y="3"
                  className="fill-amber-300 font-mono text-[10px] font-bold"
                >
                  {realDistance.toFixed(2)} m
                </text>
              </g>
            )}

            {/* Endpoint Interaktif Kecil */}
            {renderPoints.map((p, idx) => (
              <g key={idx} transform={`translate(${p.x}, ${p.y})`}>
                <circle r="12" fill="transparent" />
                <circle r="5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
                <circle r="1.5" fill="#78350F" />
                <text
                  y="-8"
                  textAnchor="middle"
                  className="fill-white font-mono text-[9px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  {idx === 0 ? 'A' : 'B'}
                </text>
              </g>
            ))}
          </svg>

          {/* Kontrol Zoom & Pan Mengambang */}
          <div className="viewport-controls absolute top-2 right-2 flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm p-1 rounded-lg border border-slate-700 text-white shadow-md">
            <button
              type="button"
              onClick={() => handleZoomChange(-0.5)}
              disabled={zoom <= 1}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoomChange(0.5)}
              disabled={zoom >= 4}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <div className="w-px h-3 bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={handleResetView}
              className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded hover:bg-slate-800 transition-colors text-slate-300"
              title="Kembalikan zoom ke 100%"
            >
              Reset View
            </button>
          </div>

          {/* Indikator Pan Aktif */}
          {zoom > 1 && (
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10 text-white text-[9px] flex items-center gap-1 pointer-events-none">
              <Move size={10} className="text-amber-400" />
              Mode Pan Aktif
            </div>
          )}
        </div>

        {/* Panel Hasil Perhitungan Terukur */}
        {calibResult && (
          <div className="p-3 bg-slate-50 border border-dark-border rounded-lg space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-dark-secondary">Jarak Terukur:</span>
              <span className="font-bold text-dark">{calibResult.pixelDistance.toFixed(1)} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-secondary">Skala Konversi:</span>
              <span className="font-bold text-primary">
                {calibResult.metersPerPixel.toFixed(5)} m/pixel
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};