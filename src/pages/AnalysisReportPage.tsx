import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
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

// Logo UPI lokal untuk laporan PDF
const UpiLogo: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <img
    src="/upi-logo.png"
    alt="Logo Universitas Pendidikan Indonesia"
    className={`${className} object-contain shrink-0`}
    loading="eager"
  />
);

// Grafik laporan: 3 parameter kecepatan per percobaan, dibuat ringkas agar tetap muat di PDF.
const UnifiedPerformanceChart: React.FC<{
  attempts: MergedAttemptResult[];
  speedUnit: string;
  distUnit: string;
}> = ({ attempts, speedUnit }) => {
  const series = [
    { key: 'phase', label: 'Start → Impact', short: 'Fase tendangan', color: '#800000', get: (a: MergedAttemptResult) => a?.averageSpeed },
    { key: 'cycle', label: 'Siklus Penuh', short: 'Start → Recovery', color: '#0F766E', get: (a: MergedAttemptResult) => a?.fullCycleAverageSpeed },
    { key: 'peak', label: 'Kecepatan Puncak', short: 'Nilai maksimum', color: '#D4A017', get: (a: MergedAttemptResult) => a?.peakSpeed },
  ];

  const MiniChart: React.FC<{ item: typeof series[number] }> = ({ item }) => {
    const values = (attempts || []).map((a) => item.get(a) || 0).filter((v) => v > 0 && v < 35);
    const maxVal = Math.max(5, Math.ceil((values.length ? Math.max(...values) : 5) * 1.2));
    const width = 235, height = 105, left = 25, right = 8, top = 10, bottom = 22;
    const plotW = width-left-right, plotH = height-top-bottom;
    const getY = (v:number) => height-bottom-(Math.min(v,maxVal)/maxVal)*plotH;
    const groupW = plotW / Math.max(attempts.length,1);
    return <div className="border border-dark-border rounded-lg bg-white p-2">
      <div className="flex items-start justify-between gap-1">
        <div><div className="text-[9px] font-bold text-dark">{item.label}</div><div className="text-[7.5px] text-dark-secondary">{item.short}</div></div>
        <span className="text-[7.5px] font-mono font-bold">{speedUnit}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[100px] mt-1">
        <line x1={left} y1={top} x2={width-right} y2={top} stroke="#E2E8F0" strokeDasharray="3 3" />
        <line x1={left} y1={height-bottom} x2={width-right} y2={height-bottom} stroke="#CBD5E1" />
        <text x={left-4} y={top+3} fill="#94A3B8" fontSize="6.5" textAnchor="end">{maxVal}</text>
        <text x={left-4} y={height-bottom+3} fill="#94A3B8" fontSize="6.5" textAnchor="end">0</text>
        {(attempts || []).map((att,idx)=>{ const value=item.get(att)||0; const x=left+idx*groupW+groupW/2-6; const y=getY(value); const h=Math.max(0,height-bottom-y); return <g key={att?.attemptId||idx}>{value>0&&<><rect x={x} y={y} width="12" height={h} rx="2" fill={item.color}/><text x={x+6} y={y-3} fill={item.color} fontSize="6.5" textAnchor="middle" fontWeight="bold">{value.toFixed(1)}</text></>}<text x={left+idx*groupW+groupW/2} y={height-7} fill="#64748B" fontSize="6.5" textAnchor="middle">P#{att?.attemptNumber||idx+1}</text></g>; })}
      </svg>
    </div>;
  };

  return <div className="w-full bg-slate-50/70 border border-dark-border rounded-xl p-2.5 text-dark font-mono">
    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-dark-border/60">
      <div><span className="font-bold text-dark font-sans text-[10px]">Grafik 3 Parameter Kecepatan — 5 Percobaan</span><p className="text-[8px] text-dark-secondary font-sans mt-0.5">Fase Start–Impact, siklus penuh, dan kecepatan puncak</p></div>
      <span className="font-mono font-bold text-primary bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded text-[7.5px] shrink-0">Satuan: {speedUnit}</span>
    </div>
    <div className="grid grid-cols-3 gap-2">{series.map((item)=><MiniChart key={item.key} item={item}/>)}</div>
  </div>;
};

export const AnalysisReportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [saveNoteSuccess, setSaveNoteSuccess] = useState<boolean>(false);
  const reportRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadPdf = async () => {
    if (!reportRef.current || !report) return;
    try {
      const safeName = (athlete?.name || 'atlet').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await html2pdf().set({
        margin: 8,
        filename: `laporan-komparasi-${safeName}-${report.session.sessionCode}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(reportRef.current).save();
    } catch (error) {
      console.error('Gagal mengunduh PDF laporan:', error);
    }
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
  const speedUnit = summary?.speedUnit || 'm/s';
  const distUnit = isCalibrated ? 'cm' : 'px';
  const athleteDisplayName = athlete?.name || (session as any)?.athleteName || '-';
  const athleteCodeDisplay = athlete?.athleteCode || (session as any)?.athleteCode || '-';
  // Menggunakan label kaki yang cedera untuk riset biomekanika pasca-cedera
  const injuredLegDisplay = athlete?.injuredLeg || (session as any)?.injuredLeg || session?.kickingLeg || 'Kanan';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-8 font-sans text-dark print:p-0 print:m-0 print:max-w-none">
      {/* Top Action Bar */}
      <div className="report-actionbar print:hidden flex items-center justify-between gap-4 bg-white p-3 border border-dark-border rounded-xl shadow-sm">
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={15} />}
              onClick={handleDownloadPdf}
            >
              Download PDF
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
      </div>

      {/* LEMBAR LAPORAN RESMI */}
      <div ref={reportRef} className="official-report bg-white border border-dark-border rounded-xl shadow-sm p-6 sm:p-7 space-y-3.5 print:border-none print:shadow-none print:p-0 print:space-y-3">
        
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
              <span className="text-dark-secondary">Kaki yang Cedera</span>
              <span className="col-span-2 font-semibold text-[#800000]">: {injuredLegDisplay}</span>
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
            <span className="text-[9.5px] uppercase font-bold text-dark-secondary block">Kecepatan Puncak Sesi</span>
            <span className="text-xl font-bold font-mono text-primary mt-0.5 block">
              {summary?.sessionPeakSpeed !== null && summary?.sessionPeakSpeed !== undefined
                ? `${summary.sessionPeakSpeed.toFixed(2)}`
                : '-'}
            </span>
            <span className="text-[9.5px] text-dark-secondary font-mono">{speedUnit} • maksimum</span>
          </div>

          <div className="p-2 border border-dark-border rounded-lg bg-slate-50">
            <span className="text-[9.5px] uppercase font-bold text-dark-secondary block">Kecepatan Rata-rata Fase Tendangan</span>
            <span className="text-xl font-bold font-mono text-dark mt-0.5 block">
              {summary?.sessionAverageSpeed !== null && summary?.sessionAverageSpeed !== undefined
                ? `${summary.sessionAverageSpeed.toFixed(2)}`
                : '-'}
            </span>
            <span className="text-[9px] text-dark-secondary font-mono">{speedUnit} • {summary?.sessionAverageDuration != null ? `${summary.sessionAverageDuration.toFixed(2)} s` : '--'} durasi</span>
          </div>

          <div className="p-2 border border-dark-border rounded-lg bg-slate-50">
            <span className="text-[9.5px] uppercase font-bold text-dark-secondary block">Kecepatan Rata-rata Siklus Penuh</span>
            <span className="text-xl font-bold font-mono text-dark mt-0.5 block">
              {summary?.sessionFullCycleAverageSpeed !== null && summary?.sessionFullCycleAverageSpeed !== undefined
                ? `${summary.sessionFullCycleAverageSpeed.toFixed(2)}`
                : '-'}
            </span>
            <span className="text-[9px] text-dark-secondary font-mono">{speedUnit} • {summary?.attempts.filter(a => a.fullCycleDuration != null).length ? `${(summary.attempts.filter(a => a.fullCycleDuration != null).reduce((sum,a) => sum + (a.fullCycleDuration || 0), 0) / summary.attempts.filter(a => a.fullCycleDuration != null).length).toFixed(2)} s` : '--'} durasi</span>
          </div>

        </div>

        {/* 4. TABEL 5 PERCOBAAN */}
        <div>
          <div className="overflow-hidden rounded-lg border border-dark-border">
            <table className="w-full text-xs divide-y divide-dark-border text-left">
              <thead className="bg-slate-100 font-bold uppercase text-[10px] text-dark">
                <tr>
                  <th className="px-3 py-1.5">Percobaan</th>
                  <th className="px-3 py-1.5">Fase Start–Impact</th>
                  <th className="px-3 py-1.5">Siklus Penuh</th>
                  <th className="px-3 py-1.5">Puncak</th>
                  <th className="px-3 py-1.5">Simpangan Target</th>
                  <th className="px-3 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border bg-white font-mono">
                {(summary?.attempts || []).map((att) => (
                  <tr key={att.attemptId} className="text-dark">
                    <td className="px-3 py-1.5 font-bold">Percobaan #{att.attemptNumber}</td>
                    <td className="px-3 py-1.5"><div>{att.averageSpeed !== null ? `${att.averageSpeed.toFixed(2)} ${speedUnit}` : '-'}</div>{att.averageSpeed !== null && <div className="text-[8px] text-dark-secondary font-sans">{att.kickDuration != null ? `${att.kickDuration.toFixed(2)} s` : '--'}</div>}</td>
                    <td className="px-3 py-1.5"><div>{att.fullCycleAverageSpeed !== null ? `${att.fullCycleAverageSpeed.toFixed(2)} ${speedUnit}` : '-'}</div>{att.fullCycleAverageSpeed !== null && <div className="text-[8px] text-dark-secondary font-sans">{att.fullCycleDuration != null ? `${att.fullCycleDuration.toFixed(2)} s` : '--'}</div>}</td>
                    <td className="px-3 py-1.5 font-bold text-primary">{att.peakSpeed !== null ? `${att.peakSpeed.toFixed(2)} ${speedUnit}` : '-'}</td>
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

        {/* 5. GRAFIK CETAK TERPADU (SPORT LIGHT ACADEMIC) */}
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

        {/* 8. FOOTER RESMI SILAT MOTION */}
        <div className="border-t border-dark-border pt-1.5 flex items-center justify-between text-[9px] text-dark-secondary font-mono">
          <span>SILAT MOTION • Versi Laporan {report.reportVersion}</span>
          <span>Dicetak: {new Date().toLocaleString('id-ID')}</span>
        </div>

      </div>
    </div>
  );
};