import React from 'react';
import { AccuracyAnalysisResult } from '../../types/accuracy';

interface AccuracyDistanceChartProps {
  results: AccuracyAnalysisResult[];
}

export const AccuracyDistanceChart: React.FC<AccuracyDistanceChartProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <div className="h-full min-h-[300px] flex items-center justify-center text-xs text-dark-secondary border-2 border-dashed border-dark-border rounded-2xl bg-slate-50/50 font-medium">
        Belum ada data akurasi untuk ditampilkan pada grafik ini.
      </div>
    );
  }

  const height = 180;
  const width = 500;
  const padding = { top: 30, right: 25, bottom: 35, left: 45 };

  const distances = results.map((r) =>
    r.distanceCentimeters !== null && r.distanceCentimeters !== undefined
      ? r.distanceCentimeters
      : 0
  );

  const maxDataVal = Math.max(...distances, 6);
  const maxScaleVal = Math.ceil(maxDataVal * 1.25);

  const getY = (val: number) =>
    height - padding.bottom - (val / maxScaleVal) * (height - padding.top - padding.bottom);

  return (
    <div className="w-full bg-white border border-dark-border rounded-2xl shadow-xs p-5 flex flex-col justify-between h-full">
      {/* Header Bersih Tanpa Target Acuan */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-dark-border/60">
        <div>
          <h3 className="font-bold text-dark text-sm">
            Simpangan Jarak ke Titik Sasaran
          </h3>
          <p className="text-xs text-dark-secondary mt-0.5">
            Pengukuran jarak impak aktual terhadap pusat target
          </p>
        </div>
        <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
          Satuan: cm
        </span>
      </div>

      {/* Area SVG Canvas */}
      <div className="w-full aspect-[16/9] max-h-[220px] relative my-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Garis Grid Y Atas */}
          <line
            x1={padding.left}
            y1={getY(maxScaleVal)}
            x2={width - padding.right}
            y2={getY(maxScaleVal)}
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={padding.left - 8}
            y={getY(maxScaleVal) + 3}
            fill="#94A3B8"
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
          >
            {maxScaleVal.toFixed(0)}
          </text>

          {/* Garis Grid Y Tengah */}
          <line
            x1={padding.left}
            y1={getY(maxScaleVal / 2)}
            x2={width - padding.right}
            y2={getY(maxScaleVal / 2)}
            stroke="#F1F5F9"
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={getY(maxScaleVal / 2) + 3}
            fill="#94A3B8"
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
          >
            {(maxScaleVal / 2).toFixed(1)}
          </text>

          {/* Garis Sumbu X Bawah */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
          <text
            x={padding.left - 8}
            y={height - padding.bottom + 3}
            fill="#94A3B8"
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
          >
            0
          </text>

          {/* Batang Data Percobaan */}
          {results.map((r, idx) => {
            const totalBars = results.length || 5;
            const groupWidth = (width - padding.left - padding.right) / totalBars;
            const barWidth = 24;
            const x = padding.left + idx * groupWidth + (groupWidth - barWidth) / 2;

            const distVal =
              r.distanceCentimeters !== null && r.distanceCentimeters !== undefined
                ? r.distanceCentimeters
                : 0;

            const isAnalyzed = r.finalResult === 'hit' || r.finalResult === 'miss';
            const isHit = r.finalResult === 'hit';
            const y = isAnalyzed ? getY(distVal) : height - padding.bottom;
            const barHeight = height - padding.bottom - y;

            // Memakai warna netral/fungsional
            const barColor = isHit ? '#10B981' : '#F43F5E';

            return (
              <g key={r.attemptId || idx}>
                {/* Batang Bar */}
                {isAnalyzed && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(3, barHeight)}
                    rx="3"
                    fill={barColor}
                    className="transition-all hover:opacity-90"
                  />
                )}

                {/* Angka Nilai Jarak */}
                {isAnalyzed ? (
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    fill={barColor}
                    fontSize="9"
                    textAnchor="middle"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {distVal.toFixed(1)} cm
                  </text>
                ) : (
                  <text
                    x={x + barWidth / 2}
                    y={height - padding.bottom - 8}
                    fill="#94A3B8"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    -
                  </text>
                )}

                {/* Label P# Percobaan */}
                <text
                  x={x + barWidth / 2}
                  y={height - 18}
                  fill="#64748B"
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  P#{idx + 1}
                </text>

                {/* Status Bawah */}
                <text
                  x={x + barWidth / 2}
                  y={height - 6}
                  fill={isHit ? '#059669' : r.finalResult === 'miss' ? '#E11D48' : '#94A3B8'}
                  fontSize="8"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {isHit ? 'HIT' : r.finalResult === 'miss' ? 'MISS' : 'BELUM'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend Bawah */}
      <div className="flex items-center justify-center gap-6 text-xs font-medium text-dark-secondary pt-3 border-t border-dark-border/60">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> HIT (Tepat Target)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> MISS (Deviasi Luar Target)
        </span>
      </div>
    </div>
  );
};