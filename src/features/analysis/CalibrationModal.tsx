import React, { useState, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CalibrationData } from '../../types/speed';
import { Check } from 'lucide-react';

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
  const [points, setPoints] = useState<{ x: number; y: number }[]>(
    existingCalibration
      ? [existingCalibration.pointA, existingCalibration.pointB]
      : []
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render snapshot video saat modal terbuka
  React.useEffect(() => {
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

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (points.length >= 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    setPoints([...points, { x: clickX, y: clickY }]);
  };

  const handleReset = () => {
    setPoints([]);
  };

  const calculateCalibration = (): CalibrationData | null => {
    if (points.length < 2 || realDistance <= 0) return null;

    const pA = points[0];
    const pB = points[1];

    const dx = (pB.x - pA.x) * (videoWidth || 640);
    const dy = (pB.y - pA.y) * (videoHeight || 360);
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);

    if (pixelDistance === 0) return null;

    const metersPerPixel = realDistance / pixelDistance;

    return {
      pointA: pA,
      pointB: pB,
      pixelDistance,
      realDistanceMeters: realDistance,
      metersPerPixel,
      createdAt: new Date().toISOString(),
    };
  };

  const handleSave = () => {
    const calib = calculateCalibration();
    if (calib) {
      onSaveCalibration(calib);
      onClose();
    }
  };

  const calibResult = calculateCalibration();

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
            disabled={points.length < 2 || realDistance <= 0}
            onClick={handleSave}
            icon={<Check size={16} />}
          >
            Terapkan Kalibrasi
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 leading-relaxed">
          <b>Petunjuk:</b> Klik 2 titik pada objek referensi di video (misal: penggaris, sabuk, atau target yang diketahui panjang fisiknya) untuk mengonversi pixel menjadi satuan meter fisik nyata (m/s).
        </div>

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

        {/* Video Frame Canvas Selector */}
        <div
          ref={containerRef}
          onClick={handleImageClick}
          className="relative aspect-video bg-black rounded-lg overflow-hidden cursor-crosshair border border-dark-border select-none"
        >
          <canvas ref={canvasRef} className="w-full h-full object-contain pointer-events-none" />

          {/* SVG Overlay Garis Kalibrasi */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={`${p.x * 100}%`}
                cy={`${p.y * 100}%`}
                r="6"
                fill="#800000"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            ))}
            {points.length === 2 && (
              <line
                x1={`${points[0].x * 100}%`}
                y1={`${points[0].y * 100}%`}
                x2={`${points[1].x * 100}%`}
                y2={`${points[1].y * 100}%`}
                stroke="#F59E0B"
                strokeWidth="3"
                strokeDasharray="4"
              />
            )}
          </svg>
        </div>

        {calibResult && (
          <div className="p-3 bg-slate-50 border border-dark-border rounded-lg space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-dark-secondary">Jarak Terukur:</span>
              <span className="font-bold text-dark">{calibResult.pixelDistance.toFixed(1)} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-secondary">Skala Konversi:</span>
              <span className="font-bold text-primary">{calibResult.metersPerPixel.toFixed(5)} m/pixel</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};