import React from 'react';
import { MergedAttemptResult } from '../../services/result/sessionSummaryEngine';

interface SpeedComparisonChartProps {
  attempts: MergedAttemptResult[];
  speedUnit: 'm/s' | 'px/s';
}

export const SpeedComparisonChart: React.FC<SpeedComparisonChartProps> = ({
  attempts,
  speedUnit,
}) => {
  const height = 150;
  const width = 500;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const peakValues = attempts.map((a) => a.peakSpeed || 0);
  const maxVal = Math.max(5, ...peakValues) * 1.25;

  const getY = (val: number) =>
    height - padding.bottom - (val / maxVal) * (height - padding.top - padding.bottom);

  return (
    <div className="w-full bg-slate-900 rounded-xl p-4 text-white">
      <div className="flex items-center justify-between text-xs mb-3 font-mono text-slate-400">
        <span className="font-semibold text-slate-200">Komparasi Kecepatan per Percobaan</span>
        <span>Satuan: <b className="text-accent">{speedUnit}</b></span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
        {/* Grid Line */}
        <line
          x1={padding.left}
          y1={getY(maxVal / 2)}
          x2={width - padding.right}
          y2={getY(maxVal / 2)}
          stroke="#334155"
          strokeDasharray="2"
        />
        <text x={padding.left - 6} y={getY(maxVal / 2) + 3} fill="#64748B" fontSize="9" textAnchor="end">
          {(maxVal / 2).toFixed(1)}
        </text>

        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#475569"
        />
        <text x={padding.left - 6} y={height - padding.bottom + 3} fill="#64748B" fontSize="9" textAnchor="end">
          0
        </text>

        {/* Grouped Bars per Attempt */}
        {attempts.map((att, idx) => {
          const totalGroups = attempts.length;
          const groupWidth = (width - padding.left - padding.right) / totalGroups;
          const startX = padding.left + idx * groupWidth;

          const barWidth = 14;
          const peakX = startX + groupWidth / 2 - barWidth - 2;
          const avgX = startX + groupWidth / 2 + 2;

          const pY = getY(att.peakSpeed || 0);
          const pHeight = Math.max(2, height - padding.bottom - pY);

          const aY = getY(att.averageSpeed || 0);
          const aHeight = Math.max(2, height - padding.bottom - aY);

          return (
            <g key={att.attemptId}>
              {/* Peak Bar */}
              <rect
                x={peakX}
                y={pY}
                width={barWidth}
                height={att.peakSpeed ? pHeight : 0}
                rx="2"
                fill="#800000"
              />

              {/* Avg Bar */}
              <rect
                x={avgX}
                y={aY}
                width={barWidth}
                height={att.averageSpeed ? aHeight : 0}
                rx="2"
                fill="#F59E0B"
              />

              {/* Value Label */}
              {att.peakSpeed !== null && (
                <text
                  x={peakX + barWidth / 2}
                  y={pY - 4}
                  fill="#FFFFFF"
                  fontSize="8"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {att.peakSpeed.toFixed(1)}
                </text>
              )}

              {/* Attempt X Label */}
              <text
                x={startX + groupWidth / 2}
                y={height - 10}
                fill="#94A3B8"
                fontSize="9"
                textAnchor="middle"
                fontFamily="monospace"
              >
                P#{att.attemptNumber}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[11px] font-mono text-slate-300 mt-2 border-t border-slate-800/80 pt-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-primary rounded-sm inline-block" /> Kecepatan Puncak (Peak)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-accent rounded-sm inline-block" /> Kecepatan Rata-Rata
        </span>
      </div>
    </div>
  );
};