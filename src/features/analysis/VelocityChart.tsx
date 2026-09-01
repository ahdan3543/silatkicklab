import React from 'react';
import { FrameTrajectoryPoint } from '../../types/speed';
import { formatDuration } from '../../utils/formatters';

interface VelocityChartProps {
  trajectory: FrameTrajectoryPoint[];
  kickStartFrame: number;
  impactFrame: number;
  isCalibrated: boolean;
  unit: 'm/s' | 'px/s';
}

export const VelocityChart: React.FC<VelocityChartProps> = ({
  trajectory,
  kickStartFrame,
  impactFrame,
  isCalibrated,
  unit,
}) => {
  if (!trajectory || trajectory.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-dark-secondary border border-dashed border-dark-border rounded-lg">
        Data kecepatan belum tersedia.
      </div>
    );
  }

  const height = 140;
  const width = 500;
  const padding = { top: 15, right: 15, bottom: 25, left: 40 };

  const values = trajectory.map((p) =>
    isCalibrated && p.smoothedVelocityMs !== null ? p.smoothedVelocityMs : p.smoothedVelocityPxS
  );

  const maxVal = Math.max(1, ...values) * 1.15;
  const minTime = trajectory[0].timestamp;
  const maxTime = trajectory[trajectory.length - 1].timestamp || 1;
  const timeSpan = Math.max(0.1, maxTime - minTime);

  const getX = (t: number) =>
    padding.left + ((t - minTime) / timeSpan) * (width - padding.left - padding.right);

  const getY = (v: number) =>
    height - padding.bottom - (v / maxVal) * (height - padding.top - padding.bottom);

  // Buat Path SVG
  const points = trajectory
    .map((p, idx) => {
      const v = isCalibrated && p.smoothedVelocityMs !== null ? p.smoothedVelocityMs : p.smoothedVelocityPxS;
      return `${idx === 0 ? 'M' : 'L'} ${getX(p.timestamp)} ${getY(v)}`;
    })
    .join(' ');

  const startPt = trajectory.find((p) => p.frameNumber === kickStartFrame);
  const impactPt = trajectory.find((p) => p.frameNumber === impactFrame);

  return (
    <div className="w-full bg-slate-900 rounded-lg p-3 text-white">
      <div className="flex items-center justify-between text-[11px] mb-1 font-mono text-slate-400">
        <span>Kurva Kecepatan vs Waktu</span>
        <span>Satuan: <b className="text-accent">{unit}</b></span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
        {/* Garis Grid Y */}
        <line
          x1={padding.left}
          y1={getY(maxVal / 2)}
          x2={width - padding.right}
          y2={getY(maxVal / 2)}
          stroke="#334155"
          strokeDasharray="2"
        />
        <text x={padding.left - 5} y={getY(maxVal / 2) + 3} fill="#64748B" fontSize="9" textAnchor="end">
          {(maxVal / 2).toFixed(1)}
        </text>

        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#475569"
        />
        <text x={padding.left - 5} y={height - padding.bottom + 3} fill="#64748B" fontSize="9" textAnchor="end">
          0
        </text>

        {/* Kurva Kecepatan */}
        <path d={points} fill="none" stroke="#00F2FE" strokeWidth="2.5" strokeLinecap="round" />

        {/* Marker Kick Start */}
        {startPt && (
          <g>
            <line
              x1={getX(startPt.timestamp)}
              y1={padding.top}
              x2={getX(startPt.timestamp)}
              y2={height - padding.bottom}
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeDasharray="3"
            />
            <circle cx={getX(startPt.timestamp)} cy={getY(0)} r="3" fill="#38BDF8" />
          </g>
        )}

        {/* Marker Impact */}
        {impactPt && (
          <g>
            <line
              x1={getX(impactPt.timestamp)}
              y1={padding.top}
              x2={getX(impactPt.timestamp)}
              y2={height - padding.bottom}
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="3"
            />
            <circle
              cx={getX(impactPt.timestamp)}
              cy={getY(isCalibrated ? impactPt.smoothedVelocityMs || 0 : impactPt.smoothedVelocityPxS)}
              r="4"
              fill="#F59E0B"
            />
          </g>
        )}
      </svg>

      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 px-2">
        <span className="text-sky-400">● Kick Start ({startPt ? formatDuration(startPt.timestamp) : '-'})</span>
        <span className="text-amber-400">● Impact / Max Ext ({impactPt ? formatDuration(impactPt.timestamp) : '-'})</span>
      </div>
    </div>
  );
};