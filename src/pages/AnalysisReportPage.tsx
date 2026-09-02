import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { reportBuilderService } from '../services/report/reportBuilderService';
import { AnalysisReport } from '../types/report';
import { formatDate } from '../utils/formatters';
import { MergedAttemptResult } from '../services/result/sessionSummaryEngine';

// Logo UPI Resmi dari Google Drive dengan Fallback Vektor
const UpiLogo: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#800000" stroke="#F59E0B" strokeWidth="3" />
        <circle cx="50" cy="50" r="38" fill="#FFFFFF" />
        <path d="M50 16 L58 34 L78 36 L64 50 L68 70 L50 60 L32 70 L36 50 L22 36 L42 34 Z" fill="#800000" />
        <circle cx="50" cy="50" r="13" fill="#F59E0B" />
        <circle cx="50" cy="50" r="9" fill="#800000" />
        <text x="50" y="86" fontSize="9" fontWeight="900" fill="#FFFFFF" textAnchor="middle" fontFamily="sans-serif">UPI</text>
      </svg>
    );
  }

  return (
    <img
      src="https://lh3.googleusercontent.com/d/196_EpzcqTAhpRq7lb-e3dITxelXnpxmR"
      alt="Logo Universitas Pendidikan Indonesia"
      onError={() => setHasError(true)}
      className={`${className} object-contain shrink-0`}
      loading="eager"
    />
  );
};

// Komponen Grafik Ringkas Terpadu
const UnifiedPerformanceChart: React.FC<{
  attempts: MergedAttemptResult[];
  speedUnit: string;
  distUnit: string;
}> = ({ attempts, speedUnit, distUnit }) => {
  const height = 155;
  const width = 760;
  const padding = { top: 22, right: 30, bottom: 32, left: 50 };

  const peakSpeeds = (attempts || []).map((a) => a?.peakSpeed || 0);
  const distances = (attempts || []).map((a) => a?.distanceToTargetCm || 0);

  const maxSpeed = Math.max(...peakSpeeds, 10) * 1.25;
  const maxDist = Math.max(...distances, 10) * 1.25;

  const getSpeedY = (val: number) =>
    height - padding.bottom - (val / maxSpeed) * (height - padding.top - padding.bottom);

  return (
    <div className="w-full bg-slate-900 rounded-lg p-3 text-white font-mono">
      <div className="flex items-center justify-between text-[11px] pb-1.5 mb-1.5 border-b border-slate-800">
        <span className="font-bold text-slate-100">
          Grafik Evaluasi Performa 5 Percobaan
        </span>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-primary rounded-sm inline-block" /> Kecepatan Puncak ({speedUnit})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-400 rounded-sm inline-block" /> Deviasi Sasaran ({distUnit})
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible">
        <line
          x1={padding.left}
          y1={getSpeedY(maxSpeed / 2)}
          x2={width - padding.right}
          y2={getSpeedY(maxSpeed / 2)}
          stroke="#334155"
          strokeDasharray="3 3"
        />
        <text
          x={padding.left - 6}
          y={getSpeedY(maxSpeed / 2) + 3}
          fill="#64748B"
          fontSize="8.5"
          textAnchor="end"
        >
          {(maxSpeed / 2).toFixed(1)}
        </text>

        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#475569"
        />
        <text
          x={padding.left - 6}
          y={height - padding.bottom + 3}
          fill="#64748B"
          fontSize="8.5"
          textAnchor="end"
        >
          0
        </text>

        {(attempts || []).map((att, idx) => {
          const totalGroups = attempts.length || 5;
          const groupWidth = (width - padding.left - padding.right) / totalGroups;
          const startX = padding.left + idx * groupWidth;

          const barWidth = 22;
          const speedX = startX + groupWidth / 2 - barWidth - 3;
          const distX = startX + groupWidth / 2 + 3;

          const sY = getSpeedY(att?.peakSpeed || 0);
          const sHeight = Math.max(2, height - padding.bottom - sY);

          const dVal = att?.distanceToTargetCm || 0;
          const dY =
            height - padding.bottom - (dVal / maxDist) * (height - padding.top - padding.bottom);
          const dHeight = Math.max(2, height - padding.bottom - dY);

          return (
            <g key={att?.attemptId || idx}>
              <rect
                x={speedX}
                y={sY}
                width={barWidth}
                height={att?.peakSpeed ? sHeight : 0}
                rx="2"
                fill="#800000"
              />
              {att?.peakSpeed !== null && att?.peakSpeed !== undefined && (
                <text
                  x={speedX + barWidth / 2}
                  y={sY - 3}
                  fill="#FFFFFF"
                  fontSize="8.5"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {att.peakSpeed.toFixed(1)}
                </text>
              )}

              <rect
                x={distX}
                y={dY}
                width={barWidth}
                height={att?.distanceToTargetCm ? dHeight : 0}
                rx="2"
                fill="#F59E0B"
              />
              {att?.distanceToTargetCm !== null && att?.distanceToTargetCm !== undefined && (
                <text
                  x={distX + barWidth / 2}
                  y={dY - 3}
                  fill="#FDE68A"
                  fontSize="8.5"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {att.distanceToTargetCm.toFixed(1)}
                </text>
              )}

              <text
                x={startX + groupWidth / 2}
                y={height - 14}
                fill="#F1F5F9"
                fontSize="9.5"
                textAnchor="middle"
                fontWeight="bold"
              >
                P#{att?.attemptNumber || idx + 1}
              </text>
              <text
                x={startX + groupWidth / 2}
                y={height - 3}
                fill={att?.status === 'HIT' ? '#34D399' : att?.status === 'MISS' ? '#F87171' : '#94A3B8'}
                fontSize="8"
                textAnchor="middle"
                fontWeight="bold"
              >
                {att?.status || '-'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const AnalysisReportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [saveNoteSuccess, setSaveNoteSuccess] = useState<boolean>(false);

  const loadReportData = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const data = await reportBuilderService.buildReport(sessionId);
      setReport(data);
      if (data) {
        setNotes(data.userNotes || '');
      }
    } catch (err) {
      console.error('Gagal menyusun laporan analisis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [sessionId]);

  const handleSaveNotes = () => {
    if (!sessionId) return;
    reportBuilderService.saveNotes(sessionId, notes);
    setSaveNoteSuccess(true);
    setTimeout(() => setSaveNoteSuccess(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingState message="Menyiapkan lembar laporan penelitian..." />;
  }

  if (!report || !report.session) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <p className="text-dark-secondary text-sm">Data laporan analisis tidak ditemukan.</p>
        <Button onClick={() => navigate('/hasil')}>Kembali ke Daftar Hasil</Button>
      </div>
    );
  }

  const { session, athlete, summary, target } = report;
  const isCalibrated = summary?.isCalibrated ?? false;
  const speedUnit = summary?.speedUnit || 'px/s';
  const distUnit = isCalibrated ? 'cm' : 'px';
  const athleteDisplayName = athlete?.name || (session as any)?.athleteName || 'Muhammad Ahdan Haqqin';
  const athleteCodeDisplay = athlete?.athleteCode || (session as any)?.athleteCode || 'PS-UPI-001';
  const dominantLegDisplay = athlete?.dominantLeg || session?.kickingLeg || 'Kanan';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-8 font-sans text-dark print:p-0 print:m-0 print:max-w-none">
      {/* Top Action Bar */}
      <div className="print:hidden flex items-center justify-between gap-4 bg-white p-3 border border-dark-border rounded-xl shadow-sm">
        <Button
          variant="outline"
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate(`/analisis/${sessionId}/hasil`)}
        >
          Kembali ke Hasil Komparasi
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCw size={15} />}
            onClick={loadReportData}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Printer size={15} />}
            onClick={handlePrint}
          >
            Cetak / Simpan PDF
          </Button>
        </div>
      </div>

      {/* LEMBAR LAPORAN RESMI */}
      <div className="bg-white border border-dark-border rounded-xl shadow-sm p-6 sm:p-7 space-y-3.5 print:border-none print:shadow-none print:p-0 print:space-y-3">
        
        {/* 1. KOP LAPORAN RESMI + LOGO UPI */}
        <div className="border-b-2 border-dark pb-3 flex items-center justify-between gap-4">
          <div className="shrink-0">
            <UpiLogo className="w-16 h-16" />
          </div>
          <div className="flex-1 text-center">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-dark-secondary">
              Universitas Pendidikan Indonesia
            </h2>
            <h1 className="text-xl font-black uppercase tracking-wider text-dark leading-tight">
              SILAT MOTION
            </h1>
            <p className="text-[10.5px] font-semibold text-dark-secondary">
              Sistem Monitoring & Evaluasi Tendangan Depan Atlet Pencak Silat
            </p>
            <p className="text-[9.5px] text-dark-secondary italic leading-tight">
              “Pengembangan Sistem Berbasis Web untuk Analisis Akurasi dan Kecepatan Tendangan Depan Atlet Pencak Silat Pasca Cedera”
            </p>
          </div>
          <div className="shrink-0 text-right font-mono text-[9px] text-dark-secondary">
            <span className="block font-bold text-dark text-xs">LEMBAR HASIL</span>
            <span>{formatDate(session.date)}</span>
          </div>
        </div>

        {/* 2. IDENTITAS ATLET & SESI */}
        <div className="grid grid-cols-2 gap-3 text-xs border border-dark-border rounded-lg p-2.5 bg-slate-50/50">
          <div className="space-y-0.5">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-dark-secondary">Nama Atlet</span>
              <span className="col-span-2 font-bold text-dark">: {athleteDisplayName}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-dark-secondary">Kode Atlet</span>
              <span className="col-span-2 font-mono text-dark">: {athleteCodeDisplay}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-dark-secondary">Kaki Dominan</span>
              <span className="col-span-2 text-dark">: {dominantLegDisplay}</span>
            </div>
          </div>

          <div className="space-y-0.5 border-l border-dark-border/60 pl-3">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-dark-secondary">Kode Sesi</span>
              <span className="col-span-2 font-mono font-bold text-dark">: {session.sessionCode}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-dark-secondary">Kaki Uji</span>
              <span className="col-span-2 font-semibold text-primary">: Tendangan {session.kickingLeg}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-dark-secondary">Protokol Uji</span>
              <span className="col-span-2 text-dark">: 5 Percobaan Tendangan Depan</span>
            </div>
          </div>
        </div>

        {/* 3. EXECUTIVE SUMMARY */}
        <div className="grid grid-cols-4 gap-2.5 text-center">
          <div className="p-2 border border-dark-border rounded-lg bg-slate-50">
            <span className="text-[9.5px] uppercase font-bold text-dark-secondary block">Akurasi Sasaran</span>
            <span className="text-xl font-bold font-mono text-dark mt-0.5 block">
              {summary?.accuracyPercentage !== null && summary?.accuracyPercentage !== undefined
                ? `${summary.accuracyPercentage.toFixed(1)}%`
                : '-'}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold font-mono">
              {summary?.hitsCount || 0} / {summary?.validAttempts || 0} HIT
            </span>
          </div>

          <div className="p-2 border border-dark-border rounded-lg bg-slate-50">
            <span className="text-[9.5px] uppercase font-bold text-dark-secondary block">Peak Speed Sesi</span>
            <span className="text-xl font-bold font-mono text-primary mt-0.5 block">
              {summary?.sessionPeakSpeed !== null && summary?.sessionPeakSpeed !== undefined
                ? `${summary.sessionPeakSpeed.toFixed(2)}`
                : '-'}
            </span>
            <span className="text-[9.5px] text-dark-secondary font-mono">{speedUnit}</span>
          </div>

          <div className="p-2 border border-dark-border rounded-lg bg-slate-50">
            <span className="text-[9.5px] uppercase font-bold text-dark-secondary block">Avg Speed Sesi</span>
            <span className="text-xl font-bold font-mono text-dark mt-0.5 block">
              {summary?.sessionAverageSpeed !== null && summary?.sessionAverageSpeed !== undefined
                ? `${summary.sessionAverageSpeed.toFixed(2)}`
                : '-'}
            </span>
            <span className="text-[9.5px] text-dark-secondary font-mono">{speedUnit}</span>
          </div>

          <div className="p-2 border border-dark-border rounded-lg bg-slate-50">
            <span className="text-[9.5px] uppercase font-bold text-dark-secondary block">Avg Durasi Kick</span>
            <span className="text-xl font-bold font-mono text-dark mt-0.5 block">
              {summary?.sessionAverageDuration !== null && summary?.sessionAverageDuration !== undefined
                ? `${summary.sessionAverageDuration.toFixed(2)} s`
                : '-'}
            </span>
            <span className="text-[9.5px] text-dark-secondary">Start ke Impact</span>
          </div>
        </div>

        {/* 4. TABEL 5 PERCOBAAN */}
        <div>
          <div className="overflow-hidden rounded-lg border border-dark-border">
            <table className="w-full text-xs divide-y divide-dark-border text-left">
              <thead className="bg-slate-100 font-bold uppercase text-[10px] text-dark">
                <tr>
                  <th className="px-3 py-1.5">Percobaan</th>
                  <th className="px-3 py-1.5">Durasi</th>
                  <th className="px-3 py-1.5">Peak Speed</th>
                  <th className="px-3 py-1.5">Avg Speed</th>
                  <th className="px-3 py-1.5">Simpangan Target</th>
                  <th className="px-3 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border bg-white font-mono">
                {(summary?.attempts || []).map((att) => (
                  <tr key={att.attemptId} className="text-dark">
                    <td className="px-3 py-1.5 font-bold">Percobaan #{att.attemptNumber}</td>
                    <td className="px-3 py-1.5">{att.kickDuration ? `${att.kickDuration.toFixed(2)} s` : '-'}</td>
                    <td className="px-3 py-1.5 font-bold text-primary">
                      {att.peakSpeed !== null ? `${att.peakSpeed.toFixed(2)} ${speedUnit}` : '-'}
                    </td>
                    <td className="px-3 py-1.5">
                      {att.averageSpeed !== null ? `${att.averageSpeed.toFixed(2)} ${speedUnit}` : '-'}
                    </td>
                    <td className="px-3 py-1.5">
                      {att.distanceToTargetCm !== null
                        ? `${att.distanceToTargetCm.toFixed(1)} ${distUnit}`
                        : '-'}
                    </td>
                    <td className="px-3 py-1.5">
                      {att.status === 'HIT' && (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <CheckCircle2 size={12} /> HIT
                        </span>
                      )}
                      {att.status === 'MISS' && (
                        <span className="inline-flex items-center gap-1 font-bold text-red-700">
                          <XCircle size={12} /> MISS
                        </span>
                      )}
                      {att.status === 'INVALID' && (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                          <AlertCircle size={12} /> INVALID
                        </span>
                      )}
                      {att.status === 'BELUM_DIANALISIS' && <span className="text-dark-secondary">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. GRAFIK TERPADU */}
        {summary && (
          <UnifiedPerformanceChart
            attempts={summary.attempts}
            speedUnit={speedUnit}
            distUnit={distUnit}
          />
        )}

        {/* 6. SPESIFIKASI SASARAN & KINEMATIKA */}
        <div className="grid grid-cols-2 gap-2.5 text-[10.5px]">
          <div className="p-2 border border-dark-border rounded-lg bg-slate-50/60 space-y-1">
            <h4 className="font-bold uppercase tracking-wider text-dark text-[10px] border-b border-dark-border/60 pb-0.5">
              Spesifikasi Sasaran & Skala
            </h4>
            <div className="flex justify-between">
              <span className="text-dark-secondary">Tipe Target</span>
              <span className="font-semibold">{target ? 'Circle Planar Target' : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-secondary">Radius Toleransi Target</span>
              <span className="font-mono font-bold">
                {target ? `${(target.radiusNormalized * 100).toFixed(1)}% frame` : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-secondary">Status Kalibrasi Fisik</span>
              <span className={`font-mono font-bold ${isCalibrated ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isCalibrated ? 'Terkalibrasi Skala Dunia Nyata' : 'Pixel-Space (Belum Dikalibrasi)'}
              </span>
            </div>
          </div>

          <div className="p-2 border border-dark-border rounded-lg bg-slate-50/60 space-y-1">
            <h4 className="font-bold uppercase tracking-wider text-dark text-[10px] border-b border-dark-border/60 pb-0.5">
              Karakteristik Kinematika Sesi
            </h4>
            <div className="flex justify-between">
              <span className="text-dark-secondary">Rentang Peak Speed</span>
              <span className="font-mono font-bold">
                {summary?.minPeakSpeed !== null && summary?.minPeakSpeed !== undefined && summary?.maxPeakSpeed !== null && summary?.maxPeakSpeed !== undefined
                  ? `${summary.minPeakSpeed.toFixed(2)} – ${summary.maxPeakSpeed.toFixed(2)} ${speedUnit}`
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-secondary">Rentang Simpangan Sasaran</span>
              <span className="font-mono font-bold">
                {summary?.minDistanceCm !== null && summary?.minDistanceCm !== undefined && summary?.maxDistanceCm !== null && summary?.maxDistanceCm !== undefined
                  ? `${summary.minDistanceCm.toFixed(1)} – ${summary.maxDistanceCm.toFixed(1)} ${distUnit}`
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-secondary">Tracking Point Utama</span>
              <span className="font-semibold">Ankle / Foot Landmark (Max Extension)</span>
            </div>
          </div>
        </div>

        {/* 7. CATATAN & TANDA TANGAN */}
        <div className="grid grid-cols-2 gap-4 text-xs pt-1">
          <div className="space-y-1">
            <h4 className="font-bold uppercase tracking-wider text-dark text-[10.5px]">
              Catatan Evaluator
            </h4>
            <div className="print:hidden space-y-1">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tulis catatan evaluasi..."
                rows={2}
                className="w-full p-1.5 border border-dark-border rounded-lg focus:outline-none focus:border-primary text-xs"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {saveNoteSuccess ? '✓ Tersimpan' : ''}
                </span>
                <Button size="sm" variant="secondary" icon={<Save size={12} />} onClick={handleSaveNotes}>
                  Simpan
                </Button>
              </div>
            </div>
            <div className="hidden print:block p-2 border border-dark-border rounded-lg bg-slate-50 italic text-dark min-h-[46px]">
              {notes ? notes : 'Tidak ada catatan khusus.'}
            </div>
          </div>

          <div className="flex flex-col justify-end text-right pr-2">
            <p className="text-[10.5px] text-dark-secondary">Bandung, {formatDate(session.date)}</p>
            <p className="text-[10.5px] font-bold text-dark mt-0.5">Tim Penilai / Evaluator Riset</p>
            <div className="h-9" />
            <p className="text-xs font-bold text-dark underline">( .................................................... )</p>
          </div>
        </div>

        {/* 8. FOOTER DENGAN IDENTITAS SILAT MOTION */}
        <div className="border-t border-dark-border pt-1.5 flex items-center justify-between text-[9px] text-dark-secondary font-mono">
          <span>SILAT MOTION • Versi Laporan {report.reportVersion}</span>
          <span>Dicetak: {new Date().toLocaleString('id-ID')}</span>
        </div>

      </div>
    </div>
  );
};