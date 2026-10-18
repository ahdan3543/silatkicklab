import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  FileText,
  Zap,
  Target,
  Clock,
  Activity,
  Award,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { LoadingState } from '../components/ui/LoadingState';
import { ValidationPanel } from '../features/analysis/ValidationPanel';
import { AnalysisSession, Athlete } from '../types';
import { PoseAnalysisResult } from '../types/pose';
import { SpeedAnalysisResult } from '../types/speed';
import { TargetDefinition, AccuracyAnalysisResult } from '../types/accuracy';
import { SessionQualityReport } from '../types/validation';
import { sessionService } from '../services/sessionService';
import { athleteService } from '../services/athleteService';
import { poseStorageService } from '../services/videoAnalysis/poseStorageService';
import { speedStorageService } from '../services/speed/speedStorageService';
import { accuracyStorageService } from '../services/accuracy/accuracyStorageService';
import { validationService } from '../services/validation/validationService';
import {
  sessionSummaryEngine,
  SessionAggregatedSummary,
  MergedAttemptResult,
} from '../services/result/sessionSummaryEngine';

// Grafik hasil utama: 4 grafik besar yang tetap terbaca di desktop maupun HP.
const ResultCharts: React.FC<{
  attempts: MergedAttemptResult[];
  speedUnit: string;
}> = ({ attempts, speedUnit }) => {
  const chartW = 640;
  const chartH = 300;
  const pad = { top: 34, right: 44, bottom: 46, left: 54 };
  const plotW = chartW - pad.left - pad.right;
  const plotH = chartH - pad.top - pad.bottom;
  const valid = (v: number | null | undefined) => typeof v === 'number' && Number.isFinite(v) && v > 0;

  const BarChart: React.FC<{
    title: string;
    subtitle: string;
    unit: string;
    values: number[];
    secondaryValues: number[];
    labels: string[];
    barColor: string;
    secondaryColor: string;
    secondaryUnit: string;
    valueFormatter?: (v: number) => string;
    secondaryFormatter?: (v: number) => string;
    showSecondary?: boolean;
  }> = ({ title, subtitle, unit, values, secondaryValues, labels, barColor, secondaryColor, secondaryUnit, valueFormatter = (v) => v.toFixed(2), secondaryFormatter = (v) => v.toFixed(2), showSecondary = true }) => {
    const primary = values.filter(valid);
    const secondary = showSecondary ? secondaryValues.filter(valid) : [];
    const maxPrimary = Math.max(1, ...(primary.length ? primary : [1])) * 1.18;
    const minTime = secondary.length ? Math.min(...secondary) : 0;
    const maxTime = secondary.length ? Math.max(...secondary) : 1;
    const timeRange = Math.max(maxTime - minTime, 0.001);
    const xStep = plotW / Math.max(values.length, 1);
    const primaryY = (v:number) => pad.top + plotH - (v/maxPrimary)*plotH;
    // Waktu sengaja memakai skala visual terbalik: waktu lebih kecil = bar lebih tinggi.
    const timeScore = (v:number) => secondary.length === 1 ? 1 : (maxTime-v)/timeRange;
    const timeY = (v:number) => pad.top + plotH - timeScore(v)*plotH;

    return (
      <div className="result-big-chart">
        <div className="result-chart-heading">
          <div><h3>{title}</h3><p>{subtitle}</p></div>
          <span>{unit}</span>
        </div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="result-chart-svg" role="img" aria-label={title}>
          {[0,.25,.5,.75,1].map(t => { const y=pad.top+plotH-t*plotH; return <line key={t} x1={pad.left} y1={y} x2={chartW-pad.right} y2={y} stroke="#E2E8F0" strokeDasharray="4 4"/>; })}
          <line x1={pad.left} y1={pad.top+plotH} x2={chartW-pad.right} y2={pad.top+plotH} stroke="#CBD5E1" strokeWidth="1.5"/>
          <text x={pad.left-9} y={pad.top+4} fill={barColor} fontSize="10" textAnchor="end">{maxPrimary.toFixed(1)}</text>
          <text x={chartW-pad.right+8} y={pad.top+4} fill={secondaryColor} fontSize="10">{secondary.length ? secondaryFormatter(minTime) : '--'}</text>
          <text x={chartW-pad.right+8} y={pad.top+plotH+4} fill={secondaryColor} fontSize="10">{secondary.length ? secondaryFormatter(maxTime) : '--'}</text>
          {showSecondary && <text x={chartW-pad.right} y={pad.top-10} fill={secondaryColor} fontSize="11" textAnchor="end" fontWeight="700">Waktu lebih cepat ↑</text>}
          {values.map((v,i)=>{
            const cx=pad.left+i*xStep+xStep/2;
            const primaryW=Math.min(42,xStep*.26);
            const secondaryW=Math.min(42,xStep*.26);
            const pv=valid(v); const tv=valid(secondaryValues[i]);
            const py=pv?primaryY(v):pad.top+plotH;
            const ty=tv?timeY(secondaryValues[i]):pad.top+plotH;
            return <g key={labels[i] || i}>
              {pv && <rect x={cx-primaryW-4} y={py} width={primaryW} height={pad.top+plotH-py} rx="5" fill={barColor}/>} 
              {showSecondary && tv && <rect x={cx+4} y={ty} width={secondaryW} height={pad.top+plotH-ty} rx="5" fill={secondaryColor}/>} 
              <text x={cx-primaryW/2-4} y={pv?py-8:pad.top+plotH-8} fill={barColor} fontSize="12" textAnchor="middle" fontWeight="800">{pv?valueFormatter(v):'--'}</text>
              <text x={cx+secondaryW/2+4} y={tv?ty-8:pad.top+plotH-8} fill={secondaryColor} fontSize="12" textAnchor="middle" fontWeight="800">{showSecondary && tv?secondaryFormatter(secondaryValues[i]):''}</text>
              <text x={cx} y={chartH-24} fill="#334155" fontSize="12" textAnchor="middle" fontWeight="700">{labels[i]}</text>
            </g>;
          })}
        </svg>
        <div className="result-chart-legend"><span><i className="legend-maroon"/> Kecepatan ({speedUnit})</span>{showSecondary && <span><i className="legend-blue"/> Waktu ({secondaryUnit})</span>}</div>
      </div>
    );
  };

  const ComboChart: React.FC = () => {
    const speedValues = attempts.map(a => a.peakSpeed || 0);
    const accValues = attempts.map(a => {
      const r = a.accuracyResult;
      if (!r) return 0;
      return typeof r.score === 'number' ? r.score : r.finalResult === 'hit' ? 100 : 0;
    });
    const maxSpeed = Math.max(1, ...speedValues) * 1.18;
    const barW = 34;
    const groupW = plotW / Math.max(attempts.length,1);
    const speedY = (v:number) => pad.top + plotH - (v/maxSpeed)*plotH;
    const accY = (v:number) => pad.top + plotH - (v/100)*plotH;
    return <div className="result-big-chart">
      <div className="result-chart-heading">
        <div><h3>Kecepatan Puncak & Akurasi</h3><p>Kecepatan maksimum dibandingkan ketepatan terhadap target</p></div>
        <span>{speedUnit} · %</span>
      </div>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="result-chart-svg" role="img" aria-label="Kecepatan puncak dan akurasi">
        {[0,.25,.5,.75,1].map(t => { const y=pad.top+plotH-t*plotH; return <line key={t} x1={pad.left} y1={y} x2={chartW-pad.right} y2={y} stroke="#E2E8F0" strokeDasharray="4 4"/>; })}
        <line x1={pad.left} y1={pad.top+plotH} x2={chartW-pad.right} y2={pad.top+plotH} stroke="#CBD5E1" strokeWidth="1.5"/>
        {[0,.25,.5,.75,1].map(t => <text key={`l${t}`} x={pad.left-9} y={pad.top+plotH-t*plotH+4} fill="#800000" fontSize="10" textAnchor="end">{(maxSpeed*t).toFixed(1)}</text>)}
        {[0,25,50,75,100].map(v => <text key={`r${v}`} x={chartW-pad.right+9} y={pad.top+plotH-(v/100)*plotH+4} fill="#059669" fontSize="10">{v}%</text>)}
        {attempts.map((a,i)=>{
          const cx=pad.left+i*groupW+groupW/2;
          const sv=a.peakSpeed||0; const av=accValues[i];
          const sy=speedY(sv); const ay=accY(av);
          return <g key={a.attemptId}>
            {sv>0 && <rect x={cx-barW-4} y={sy} width={barW} height={pad.top+plotH-sy} rx="5" fill="#800000"/>}
            {a.accuracyResult && <rect x={cx+4} y={ay} width={barW} height={pad.top+plotH-ay} rx="5" fill="#10B981"/>}
            <text x={cx-barW/2-4} y={sy-7} fill="#800000" fontSize="12" textAnchor="middle" fontWeight="800">{sv>0?sv.toFixed(1):'--'}</text>
            {a.accuracyResult && <text x={cx+barW/2+4} y={ay-7} fill="#059669" fontSize="12" textAnchor="middle" fontWeight="800">{av.toFixed(0)}%</text>}
            <text x={cx} y={chartH-24} fill="#334155" fontSize="12" textAnchor="middle" fontWeight="700">P#{a.attemptNumber}</text>
          </g>
        })}
      </svg>
      <div className="result-chart-legend"><span><i className="legend-maroon"/> Kecepatan Puncak ({speedUnit})</span><span><i className="legend-green"/> Akurasi (%)</span></div>
    </div>;
  };

  return <section className="result-charts-section">
    <div className="result-charts-title"><div><h2>Grafik Hasil Utama</h2><p>Perbandingan kecepatan, waktu, puncak, dan akurasi pada 5 percobaan</p></div><span>HASIL UTAMA</span></div>
    <div className="result-charts-grid">
      <BarChart title="Kecepatan Fase & Waktu" subtitle="Start → Impact · kecepatan rata-rata + durasi fase" unit={`${speedUnit} · s`} values={attempts.map(a=>a.averageSpeed||0)} secondaryValues={attempts.map(a=>a.kickDuration||0)} labels={attempts.map(a=>`P#${a.attemptNumber}`)} barColor="#800000" secondaryColor="#2563EB" secondaryUnit="s" valueFormatter={v=>v.toFixed(2)} secondaryFormatter={v=>v.toFixed(2)} />
      <BarChart title="Kecepatan Siklus & Waktu" subtitle="Start → Recovery · kecepatan rata-rata + durasi siklus" unit={`${speedUnit} · s`} values={attempts.map(a=>a.fullCycleAverageSpeed||0)} secondaryValues={attempts.map(a=>a.fullCycleDuration||0)} labels={attempts.map(a=>`P#${a.attemptNumber}`)} barColor="#0F766E" secondaryColor="#7C3AED" secondaryUnit="s" valueFormatter={v=>v.toFixed(2)} secondaryFormatter={v=>v.toFixed(2)} />
      <ComboChart />
      <BarChart title="Simpangan Titik Impact" subtitle="Jarak titik impact aktual terhadap pusat target" unit="cm" values={attempts.map(a=>a.distanceToTargetCm||0)} secondaryValues={[]} labels={attempts.map(a=>`P#${a.attemptNumber}`)} barColor="#F43F5E" secondaryColor="#F43F5E" secondaryUnit="" showSecondary={false} valueFormatter={v=>v.toFixed(1)} />
    </div>
    <div className="result-time-note">Waktu ditampilkan sebagai informasi durasi pada tiap percobaan. Untuk pembacaan visual, durasi yang lebih singkat diposisikan lebih tinggi (lebih cepat = lebih baik).</div>
  </section>;
};

export const SessionResultPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [target, setTarget] = useState<TargetDefinition | null>(null);
  const [summary, setSummary] = useState<SessionAggregatedSummary | null>(null);
  const [qualityReport, setQualityReport] = useState<SessionQualityReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadSessionResults = async () => {
      if (!sessionId) return;
      try {
        setLoading(true);
        const ses = await sessionService.getSessionById(sessionId);
        if (!ses) return;
        setSession(ses);

        const [ath, tar] = await Promise.all([
          athleteService.getAthleteById(ses.athleteId),
          accuracyStorageService.getTargetBySessionId(sessionId),
        ]);

        if (ath) setAthlete(ath);
        if (tar) setTarget(tar);

        const poseMap: { [videoId: string]: PoseAnalysisResult } = {};
        const spdMap: { [videoId: string]: SpeedAnalysisResult } = {};
        const accMap: { [videoId: string]: AccuracyAnalysisResult } = {};

        for (const att of ses.attempts) {
          if (att.video) {
            const [p, s, a] = await Promise.all([
              poseStorageService.getPoseResultByVideoId(att.video.id),
              speedStorageService.getSpeedResultByVideoId(att.video.id),
              accuracyStorageService.getAccuracyResultByVideoId(att.video.id),
            ]);
            if (p) poseMap[att.video.id] = p;
            if (s) spdMap[att.video.id] = s;
            if (a) accMap[att.video.id] = a;
          }
        }

        const aggregated = sessionSummaryEngine.aggregateSessionResults(
          ses.attempts,
          spdMap,
          accMap
        );
        setSummary(aggregated);

        const validationRes = validationService.validateSessionQuality(
          ses,
          ath || null,
          tar || null,
          poseMap,
          spdMap,
          accMap
        );
        setQualityReport(validationRes);
      } catch (err) {
        console.error('Gagal memuat halaman hasil sesi:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSessionResults();
  }, [sessionId]);

  const accuracyResultsList: AccuracyAnalysisResult[] = useMemo(() => {
    return summary
      ? summary.attempts
          .map((a) => a.accuracyResult)
          .filter((r): r is AccuracyAnalysisResult => r !== null)
      : [];
  }, [summary]);

  if (loading) {
    return <LoadingState message="Menghitung rekapitulasi data hasil dan validasi sistem..." />;
  }

  if (!session) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-dark-secondary text-sm">Sesi analisis tidak ditemukan.</p>
        <Button onClick={() => navigate('/hasil')}>Kembali ke Daftar Hasil</Button>
      </div>
    );
  }

  return (
    <div id="analysis-report" className="space-y-5 pb-24 md:pb-8">
      {/* 1. Header Hero Maroon UPI */}
      <div className="result-page-hero relative overflow-hidden bg-gradient-to-r from-[#700000] via-[#800000] to-[#991B1B] rounded-2xl p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/analisis/${session.id}`)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
              title="Kembali ke Ruang Analisis"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FACC15] text-[#700000] text-[10px] font-black uppercase tracking-wider">
                  <Award size={12} className="stroke-[2.5]" />
                  Hasil Evaluasi Sesi
                </span>
                <span className="font-mono text-xs text-white/70">{session.sessionCode}</span>
              </div>
              <h1 className="text-lg md:text-xl font-black text-white mt-1">
                Rekapitulasi Evaluasi 5 Percobaan
              </h1>
              <p className="text-xs text-white/80">
                Subjek: <b>{athlete?.name || session.athleteName}</b> • Kaki Uji: <b>Tendangan {session.kickingLeg}</b>
              </p>
            </div>
          </div>

          <div className="result-hero-actions flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
              icon={<ArrowUpRight size={14} />}
              onClick={() => navigate(`/analisis/${session.id}`)}
            >
              Ruang Analisis
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-bold border-none text-xs"
              icon={<FileText size={14} />}
              onClick={() => navigate(`/analisis/${session.id}/laporan`)}
            >
              Cetak Laporan PDF
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Panel Validasi Sistem */}
      <ValidationPanel qualityReport={qualityReport} />

      {/* 3. Ringkasan 3 Parameter Kecepatan */}
      <div className="result-kpi-grid grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-[#800000] shadow-sm">
          <span className="text-[11px] font-semibold text-dark-secondary uppercase tracking-wider block">Kecepatan Puncak</span>
          <h3 className="text-2xl font-black font-mono text-[#800000] mt-1">{summary?.sessionPeakSpeed != null ? `${summary.sessionPeakSpeed.toFixed(2)} ${summary.speedUnit}` : '--'}</h3>
          <p className="text-[10px] text-dark-secondary mt-1">Maksimum yang tercatat selama gerakan</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-sky-500 shadow-sm">
          <span className="text-[11px] font-semibold text-dark-secondary uppercase tracking-wider block">Kecepatan Rata-rata Fase Tendangan</span>
          <h3 className="text-2xl font-black font-mono text-dark mt-1">{summary?.sessionAverageSpeed != null ? `${summary.sessionAverageSpeed.toFixed(2)} ${summary.speedUnit}` : '--'}</h3>
          <p className="text-[10px] text-dark-secondary mt-1"><span className="font-mono font-semibold text-dark">{summary?.sessionAverageDuration != null ? `${summary.sessionAverageDuration.toFixed(2)} s` : '--'}</span> · waktu Start → Impact</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-teal-600 shadow-sm">
          <span className="text-[11px] font-semibold text-dark-secondary uppercase tracking-wider block">Kecepatan Rata-rata Siklus Penuh</span>
          <h3 className="text-2xl font-black font-mono text-teal-800 mt-1">{summary?.sessionFullCycleAverageSpeed != null ? `${summary.sessionFullCycleAverageSpeed.toFixed(2)} ${summary.speedUnit}` : '--'}</h3>
          <p className="text-[10px] text-dark-secondary mt-1"><span className="font-mono font-semibold text-dark">{summary?.attempts.filter(a => a.fullCycleDuration != null).length ? `${(summary.attempts.filter(a => a.fullCycleDuration != null).reduce((sum,a) => sum + (a.fullCycleDuration || 0), 0) / summary.attempts.filter(a => a.fullCycleDuration != null).length).toFixed(2)} s` : '--'}</span> · durasi Start → Recovery</p>
        </Card>
      </div>

      {/* 4. Tabel 5 Percobaan Lengkap */}
      <Card
        title="Rekapitulasi 5 Percobaan Tendangan Depan"
        subtitle="Perbandingan Parameter Kecepatan dan Akurasi"
      >
        <div className="result-table-mobile-scroll">
        <Table
          headers={[
            'PERCOBAAN',
            'FASE START–IMPACT',
            'SIKLUS PENUH',
            'PUNCAK',
            'DEVIASI TARGET',
            'STATUS',
            'METODE',
            'AKSI',
          ]}
        >
          {summary?.attempts.map((att) => {
            const isHit = att.status === 'HIT';
            const isMiss = att.status === 'MISS';
            const isInvalid = att.status === 'INVALID';

            return (
              <tr key={att.attemptId} className="text-xs hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-bold text-dark">
                  Percobaan #{att.attemptNumber}
                </td>
                <td className="px-4 py-3 font-mono text-dark">{att.averageSpeed !== null ? <><div>{att.averageSpeed.toFixed(2)} {att.speedUnit}</div><div className="text-[9px] text-dark-secondary font-sans mt-0.5">{att.kickDuration != null ? `${att.kickDuration.toFixed(2)} s` : '--'} · waktu fase</div></> : '-'}</td>
                <td className="px-4 py-3 font-mono text-dark">{att.fullCycleAverageSpeed !== null ? <><div>{att.fullCycleAverageSpeed.toFixed(2)} {att.speedUnit}</div><div className="text-[9px] text-dark-secondary font-sans mt-0.5">{att.fullCycleDuration != null ? `${att.fullCycleDuration.toFixed(2)} s` : '--'} · durasi siklus</div></> : '-'}</td>
                <td className="px-4 py-3 font-mono font-bold text-[#800000]">{att.peakSpeed !== null ? `${att.peakSpeed.toFixed(2)} ${att.speedUnit}` : '-'}</td>
                <td className="px-4 py-3 font-mono text-dark">
                  {att.distanceToTargetCm !== null ? `${att.distanceToTargetCm.toFixed(1)} cm` : '-'}
                </td>
                <td className="px-4 py-3">
                  {isHit && (
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[11px]">
                      <CheckCircle2 size={12} className="text-emerald-600" /> HIT
                    </span>
                  )}
                  {isMiss && (
                    <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold text-[11px]">
                      <XCircle size={12} className="text-rose-600" /> MISS
                    </span>
                  )}
                  {isInvalid && (
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold text-[11px]">
                      <AlertCircle size={12} className="text-amber-600" /> INVALID
                    </span>
                  )}
                  {att.status === 'BELUM_DIANALISIS' && (
                    <span className="text-dark-secondary text-[11px]">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[11px] text-dark-secondary">
                  {att.isManualCorrected ? 'Manual Corrected' : 'Otomatis'}
                </td>
                <td className="px-4 py-3">
                  {att.hasVideo ? (
                    <button
                      onClick={() => navigate(`/analisis/${session.id}/attempt/${att.attemptId}`)}
                      className="font-bold text-[#800000] hover:underline inline-flex items-center gap-1"
                    >
                      Review <ArrowUpRight size={12} />
                    </button>
                  ) : (
                    <span className="text-dark-secondary text-[11px]">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
        </div>
      </Card>

      {/* 5. Grafik hasil utama — 4 grafik besar, tidak ada grafik durasi terpisah. */}
      {summary && (
        <ResultCharts
          attempts={summary.attempts}
          speedUnit={summary.speedUnit}
        />
      )}
    </div>
  );
};