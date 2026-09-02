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
import { AccuracyDistanceChart } from '../features/analysis/AccuracyDistanceChart';
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

// Komponen Grafik Kecepatan Murni Performa (Tanpa Garis Batas Acuan)
const ModernSpeedComparisonChart: React.FC<{
  attempts: MergedAttemptResult[];
  speedUnit: string;
}> = ({ attempts, speedUnit }) => {
  const height = 180;
  const width = 500;
  const padding = { top: 30, right: 25, bottom: 35, left: 45 };

  // Filter outlier frame glitch
  const normalSpeeds = attempts
    .map((a) => a.peakSpeed || 0)
    .filter((v) => v > 0 && v < 35);

  const benchmarkMax = normalSpeeds.length > 0 ? Math.max(...normalSpeeds) : 15;
  const maxVal = Math.max(16, Math.min(25, Math.ceil(benchmarkMax * 1.2)));

  const getY = (val: number) => {
    const clampedVal = Math.min(val, maxVal);
    return (
      height -
      padding.bottom -
      (clampedVal / maxVal) * (height - padding.top - padding.bottom)
    );
  };

  return (
    <div className="w-full bg-white border border-dark-border rounded-2xl shadow-xs p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-dark-border/60">
        <div>
          <h3 className="font-bold text-dark text-sm">
            Distribusi Kecepatan per Percobaan
          </h3>
          <p className="text-xs text-dark-secondary mt-0.5">
            Pengukuran kecepatan puncak dan rata-rata ekstensi tendangan
          </p>
        </div>
        <span className="font-mono font-bold text-[#800000] bg-[#800000]/10 border border-[#800000]/20 px-2.5 py-1 rounded-lg text-xs">
          Satuan: {speedUnit}
        </span>
      </div>

      <div className="w-full aspect-[16/9] max-h-[220px] relative my-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Garis Grid Horizontal Atas */}
          <line
            x1={padding.left}
            y1={getY(maxVal)}
            x2={width - padding.right}
            y2={getY(maxVal)}
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={padding.left - 8}
            y={getY(maxVal) + 3}
            fill="#94A3B8"
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
          >
            {maxVal}
          </text>

          {/* Garis Grid Tengah */}
          <line
            x1={padding.left}
            y1={getY(maxVal / 2)}
            x2={width - padding.right}
            y2={getY(maxVal / 2)}
            stroke="#F1F5F9"
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={getY(maxVal / 2) + 3}
            fill="#94A3B8"
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
          >
            {(maxVal / 2).toFixed(0)}
          </text>

          {/* Sumbu X Bawah */}
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

          {/* Render Batang Percobaan */}
          {attempts.map((att, idx) => {
            const totalGroups = attempts.length || 5;
            const groupWidth = (width - padding.left - padding.right) / totalGroups;
            const startX = padding.left + idx * groupWidth;

            const barWidth = 16;
            const peakX = startX + groupWidth / 2 - barWidth - 2;
            const avgX = startX + groupWidth / 2 + 2;

            const peakVal = att.peakSpeed || 0;
            const isExtreme = peakVal > maxVal;
            const pY = getY(peakVal);
            const pHeight = Math.max(3, height - padding.bottom - pY);

            const avgVal = att.averageSpeed || 0;
            const aY = getY(avgVal);
            const aHeight = Math.max(3, height - padding.bottom - aY);

            return (
              <g key={att.attemptId || idx}>
                {/* Batang Peak Speed (Maroon) */}
                <rect
                  x={peakX}
                  y={pY}
                  width={barWidth}
                  height={peakVal > 0 ? pHeight : 0}
                  rx="3"
                  fill={isExtreme ? '#DC2626' : '#800000'}
                  className="transition-all hover:opacity-90"
                />

                {/* Batang Avg Speed (Gold) */}
                <rect
                  x={avgX}
                  y={aY}
                  width={barWidth}
                  height={avgVal > 0 ? aHeight : 0}
                  rx="3"
                  fill="#FACC15"
                  className="transition-all hover:opacity-90"
                />

                {/* Label Angka Peak Speed */}
                {att.peakSpeed !== null && att.peakSpeed !== undefined && (
                  <text
                    x={peakX + barWidth / 2}
                    y={pY - 4}
                    fill={isExtreme ? '#DC2626' : '#800000'}
                    fontSize={isExtreme ? '8' : '8.5'}
                    textAnchor="middle"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {isExtreme ? `! ${att.peakSpeed.toFixed(1)}` : att.peakSpeed.toFixed(1)}
                  </text>
                )}

                {/* Label P# Percobaan */}
                <text
                  x={startX + groupWidth / 2}
                  y={height - 18}
                  fill="#64748B"
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  P#{att.attemptNumber || idx + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend Bawah */}
      <div className="flex items-center justify-center gap-6 text-xs font-medium text-dark-secondary pt-3 border-t border-dark-border/60">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#800000] inline-block" /> Kecepatan Puncak (Peak)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#FACC15] inline-block" /> Kecepatan Rata-Rata
        </span>
      </div>
    </div>
  );
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
      <div className="relative overflow-hidden bg-gradient-to-r from-[#700000] via-[#800000] to-[#991B1B] rounded-2xl p-5 text-white shadow-md">
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

          <div className="flex items-center gap-2 shrink-0">
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

      {/* 3. Kartu KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-600 shadow-sm">
          <span className="text-[11px] font-semibold text-dark-secondary uppercase tracking-wider block">
            Akurasi (Hit Rate)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-mono text-emerald-800">
              {summary?.accuracyPercentage !== null && summary?.accuracyPercentage !== undefined
                ? `${summary.accuracyPercentage.toFixed(1)}%`
                : '--'}
            </h3>
            <span className="text-xs font-bold text-emerald-700">
              {summary ? `${summary.hitsCount}/${summary.validAttempts} HIT` : ''}
            </span>
          </div>
          <p className="text-[11px] text-dark-secondary mt-1">
            {summary?.hitsCount || 0} tepat sasaran dari {summary?.validAttempts || 0} percobaan
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#800000] shadow-sm">
          <span className="text-[11px] font-semibold text-dark-secondary uppercase tracking-wider block">
            Peak Speed Sesi
          </span>
          <div className="mt-1">
            <h3 className="text-2xl font-black font-mono text-[#800000]">
              {summary?.sessionPeakSpeed !== null && summary?.sessionPeakSpeed !== undefined
                ? `${summary.sessionPeakSpeed.toFixed(2)} ${summary.speedUnit}`
                : '--'}
            </h3>
          </div>
          <p className="text-[11px] text-dark-secondary mt-1">Kecepatan tertinggi tercapai</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#FACC15] shadow-sm">
          <span className="text-[11px] font-semibold text-dark-secondary uppercase tracking-wider block">
            Avg Speed Sesi
          </span>
          <div className="mt-1">
            <h3 className="text-2xl font-black font-mono text-dark">
              {summary?.sessionAverageSpeed !== null && summary?.sessionAverageSpeed !== undefined
                ? `${summary.sessionAverageSpeed.toFixed(2)} ${summary.speedUnit}`
                : '--'}
            </h3>
          </div>
          <p className="text-[11px] text-dark-secondary mt-1">Fase ekstensi tungkai</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-slate-400 shadow-sm">
          <span className="text-[11px] font-semibold text-dark-secondary uppercase tracking-wider block">
            Durasi Rata-Rata
          </span>
          <div className="mt-1">
            <h3 className="text-2xl font-black font-mono text-dark">
              {summary?.sessionAverageDuration !== null && summary?.sessionAverageDuration !== undefined
                ? `${summary.sessionAverageDuration.toFixed(2)} s`
                : '--'}
            </h3>
          </div>
          <p className="text-[11px] text-dark-secondary mt-1">Start ke Impact</p>
        </Card>
      </div>

      {/* 4. Tabel 5 Percobaan Lengkap */}
      <Card
        title="Rekapitulasi 5 Percobaan Tendangan Depan"
        subtitle="Perbandingan Parameter Kecepatan dan Akurasi"
      >
        <Table
          headers={[
            'PERCOBAAN',
            'DURASI',
            'PEAK SPEED',
            'AVG SPEED',
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
                <td className="px-4 py-3 font-mono text-dark">
                  {att.kickDuration ? `${att.kickDuration.toFixed(2)} s` : '-'}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-[#800000]">
                  {att.peakSpeed !== null ? `${att.peakSpeed.toFixed(2)} ${att.speedUnit}` : '-'}
                </td>
                <td className="px-4 py-3 font-mono text-dark">
                  {att.averageSpeed !== null ? `${att.averageSpeed.toFixed(2)} ${att.speedUnit}` : '-'}
                </td>
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
      </Card>

      {/* 5. Grafik Komparasi Bersih Sejajar (Card ganda sudah dilepas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-stretch">
        {summary && (
          <ModernSpeedComparisonChart
            attempts={summary.attempts}
            speedUnit={summary.speedUnit}
          />
        )}
        <AccuracyDistanceChart results={accuracyResultsList} />
      </div>
    </div>
  );
};