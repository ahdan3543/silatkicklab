import React from 'react';
import { AccuracyAnalysisResult } from '../../types/accuracy';

interface AccuracyDistanceChartProps {
  results: AccuracyAnalysisResult[];
}

export const AccuracyDistanceChart: React.FC<AccuracyDistanceChartProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-dark-secondary border-2 border-dashed border-dark-border rounded-xl bg-slate-50/50 font-medium">
        Belum ada data akurasi untuk ditampilkan pada grafik ini.
      </div>
    );
  }

  const height = 240;
  const width = 800;
  const padding = { top: 35, right: 30, bottom: 45, left: 60 };

  // Ambil nilai jarak dalam cm
  const distances = results.map((r) =>
    r.distanceCentimeters !== null && r.distanceCentimeters !== undefined
      ? r.distanceCentimeters
      : 0
  );

  const maxDataVal = Math.max(...distances, 6);
  const maxScaleVal = Math.ceil(maxDataVal * 1.25);

  const getY = (val: number) =>
    height - padding.bottom - (val / maxScaleVal) * (height - padding.top - padding.bottom);

  const thresholdCm = 3.0; // Batas ideal deviasi klinis (<= 3.0 cm)
  const thresholdY = getY(thresholdCm);

  return (
    <div className="w-full bg-slate-900 rounded-xl p-6 text-white shadow-card">
      {/* Header Grafik */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-slate-800 gap-2 font-mono">
        <div>
          <h4 className="text-sm font-bold text-slate-100">
            Simpangan Jarak ke Pusat Sasaran per Percobaan
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Target Standar Pemulihan: Simpangan &le; 3,0 cm dari titik tengah
          </p>
        </div>
        <span className="text-xs bg-accent/20 text-accent border border-accent/30 px-3 py-1 rounded font-bold self-start sm:self-auto">
          Satuan: Centimeter (cm)
        </span>
      </div>

      {/* SVG Canvas Besar & Jelas */}
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 overflow-visible">
          {/* Garis Grid Y (Maksimal) */}
          <line
            x1={padding.left}
            y1={getY(maxScaleVal)}
            x2={width - padding.right}
            y2={getY(maxScaleVal)}
            stroke="#334155"
            strokeDasharray="3 3"
          />
          <text
            x={padding.left - 10}
            y={getY(maxScaleVal) + 4}
            fill="#94A3B8"
            fontSize="11"
            textAnchor="end"
            fontFamily="monospace"
          >
            {maxScaleVal.toFixed(1)}
          </text>

          {/* Garis Grid Y (Tengah) */}
          <line
            x1={padding.left}
            y1={getY(maxScaleVal / 2)}
            x2={width - padding.right}
            y2={getY(maxScaleVal / 2)}
            stroke="#334155"
            strokeDasharray="3 3"
          />
          <text
            x={padding.left - 10}
            y={getY(maxScaleVal / 2) + 4}
            fill="#94A3B8"
            fontSize="11"
            textAnchor="end"
            fontFamily="monospace"
          >
            {(maxScaleVal / 2).toFixed(1)}
          </text>

          {/* Garis Ambang Batas Toleransi Ideal (3.0 cm) */}
          <line
            x1={padding.left}
            y1={thresholdY}
            x2={width - padding.right}
            y2={thresholdY}
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <text
            x={width - padding.right}
            y={thresholdY - 6}
            fill="#F59E0B"
            fontSize="10"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="monospace"
          >
            Batas Toleransi: 3.0 cm
          </text>

          {/* Garis Dasar Nol (Sumbu X) */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#475569"
            strokeWidth="2"
          />
          <text
            x={padding.left - 10}
            y={height - padding.bottom + 4}
            fill="#94A3B8"
            fontSize="11"
            textAnchor="end"
            fontFamily="monospace"
          >
            0.0
          </text>

          {/* Batang Data Percobaan 1–5 */}
          {results.map((r, idx) => {
            const totalBars = 5;
            const availableWidth = width - padding.left - padding.right;
            const groupWidth = availableWidth / totalBars;
            const barWidth = 48;
            const x = padding.left + idx * groupWidth + (groupWidth - barWidth) / 2;

            const distVal =
              r.distanceCentimeters !== null && r.distanceCentimeters !== undefined
                ? r.distanceCentimeters
                : 0;

            const isAnalyzed = r.finalResult === 'hit' || r.finalResult === 'miss';
            const isHit = r.finalResult === 'hit';
            const y = isAnalyzed ? getY(distVal) : height - padding.bottom;
            const barHeight = height - padding.bottom - y;

            return (
              <g key={r.attemptId || idx}>
                {/* Batang Bar */}
                {isAnalyzed && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(4, barHeight)}
                    rx="5"
                    fill={isHit ? '#10B981' : '#EF4444'}
                    stroke={isHit ? '#34D399' : '#F87171'}
                    strokeWidth="1.5"
                  />
                )}

                {/* Angka Nilai Jarak di Atas Batang */}
                {isAnalyzed ? (
                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    fill="#FFFFFF"
                    fontSize="13"
                    textAnchor="middle"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {distVal.toFixed(1)} <tspan fontSize="9" fill="#94A3B8">cm</tspan>
                  </text>
                ) : (
                  <text
                    x={x + barWidth / 2}
                    y={height - padding.bottom - 12}
                    fill="#64748B"
                    fontSize="11"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    -
                  </text>
                )}

                {/* Label Bawah (P#1 - P#5) */}
                <text
                  x={x + barWidth / 2}
                  y={height - 18}
                  fill="#F8FAFC"
                  fontSize="12"
                  textAnchor="middle"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  P#{idx + 1}
                </text>

                {/* Status Bawah Badge */}
                <text
                  x={x + barWidth / 2}
                  y={height - 4}
                  fill={isHit ? '#34D399' : r.finalResult === 'miss' ? '#F87171' : '#64748B'}
                  fontSize="9"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {isHit ? 'HIT' : r.finalResult === 'miss' ? 'MISS' : 'BELUM'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Keterangan Status Warna */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-300 mt-4 border-t border-slate-800 pt-3">
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 bg-emerald-500 rounded inline-block" /> HIT (Memenuhi Sasaran)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 bg-red-500 rounded inline-block" /> MISS (Di Luar Sasaran)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-accent inline-block" /> Standar Deviasi (&le; 3,0 cm)
        </span>
      </div>
    </div>
  );
};