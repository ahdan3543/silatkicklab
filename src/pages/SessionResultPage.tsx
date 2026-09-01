import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  Shield,
  Activity,
  Zap,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  FileText,
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
import { formatDate } from '../utils/formatters';

// Komponen Inline Speed Chart
const InlineSpeedChart: React.FC<{ attempts: MergedAttemptResult[]; speedUnit: string }> = ({
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
              <rect
                x={peakX}
                y={pY}
                width={barWidth}
                height={att.peakSpeed ? pHeight : 0}
                rx="2"
                fill="#800000"
              />
              <rect
                x={avgX}
                y={aY}
                width={barWidth}
                height={att.averageSpeed ? aHeight : 0}
                rx="2"
                fill="#F59E0B"
              />
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

  const accuracyResultsList: AccuracyAnalysisResult[] = summary
    ? summary.attempts
        .map((a) => a.accuracyResult)
        .filter((r): r is AccuracyAnalysisResult => r !== null)
    : [];

  return (
    <div id="analysis-report" className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/analisis/${session.id}`)}
            className="p-2 rounded-lg bg-white border border-dark-border text-dark-secondary hover:text-dark hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-dark">Hasil Analisis & Komparasi 5 Percobaan</h2>
              <Badge variant={summary && summary.validAttempts === 5 ? 'success' : 'neutral'}>
                {summary ? `${summary.validAttempts} / 5 Valid Attempts` : '-'}
              </Badge>
            </div>
            <p className="text-xs text-dark-secondary">
              Sesi: {session.sessionCode} • Atlet: {athlete?.name || session.athleteName} (Kaki: {session.kickingLeg})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowUpRight size={15} />}
            onClick={() => navigate(`/analisis/${session.id}`)}
          >
            Manajemen Video
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<FileText size={15} />}
            onClick={() => navigate(`/analisis/${session.id}/laporan`)}
          >
            Lihat Laporan Penelitian (Report)
          </Button>
        </div>
      </div>

      {/* Panel Status Validasi */}
      <ValidationPanel qualityReport={qualityReport} />

      {/* 4 Kartu Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-dark-secondary uppercase tracking-wider block">
              Akurasi Sasaran (Hit Rate)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-dark font-mono">
                {summary?.accuracyPercentage !== null && summary?.accuracyPercentage !== undefined
                  ? `${summary.accuracyPercentage.toFixed(1)}%`
                  : '-'}
              </h3>
              <span className="text-xs font-medium text-emerald-600">
                {summary ? `${summary.hitsCount} / ${summary.validAttempts} HIT` : ''}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-dark-secondary mt-2 pt-2 border-t border-dark-border/60">
            {summary?.invalidAttempts ? `${summary.invalidAttempts} percobaan tidak valid` : 'Seluruh data valid'}
          </p>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-dark-secondary uppercase tracking-wider block">
              Kecepatan Puncak Sesi
            </span>
            <div className="mt-1">
              <h3 className="text-3xl font-bold text-primary font-mono">
                {summary?.sessionPeakSpeed !== null && summary?.sessionPeakSpeed !== undefined
                  ? `${summary.sessionPeakSpeed.toFixed(2)} ${summary.speedUnit}`
                  : '-'}
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-dark-secondary mt-2 pt-2 border-t border-dark-border/60">
            {summary?.isCalibrated ? 'Nilai tertinggi dari percobaan valid' : 'Belum dikalibrasi (px/s)'}
          </p>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-dark-secondary uppercase tracking-wider block">
              Kecepatan Rata-Rata Sesi
            </span>
            <div className="mt-1">
              <h3 className="text-3xl font-bold text-dark font-mono">
                {summary?.sessionAverageSpeed !== null && summary?.sessionAverageSpeed !== undefined
                  ? `${summary.sessionAverageSpeed.toFixed(2)} ${summary.speedUnit}`
                  : '-'}
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-dark-secondary mt-2 pt-2 border-t border-dark-border/60">
            Rata-rata kecepatan fase ekstensi
          </p>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-dark-secondary uppercase tracking-wider block">
              Durasi Tendangan Rata-Rata
            </span>
            <div className="mt-1">
              <h3 className="text-3xl font-bold text-dark font-mono">
                {summary?.sessionAverageDuration !== null && summary?.sessionAverageDuration !== undefined
                  ? `${summary.sessionAverageDuration.toFixed(2)} s`
                  : '-'}
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-dark-secondary mt-2 pt-2 border-t border-dark-border/60">
            Waktu reaksi Start ke Impact
          </p>
        </Card>
      </div>

      {/* Tabel 5 Percobaan */}
      <Card title="Rekapitulasi 5 Percobaan Tendangan Depan" subtitle="Perbandingan Parameter Kecepatan dan Akurasi">
        <Table headers={['Percobaan', 'Durasi', 'Peak Speed', 'Avg Speed', 'Deviasi Target', 'Status', 'Metode', 'Aksi']}>
          {summary?.attempts.map((att) => {
            const isHit = att.status === 'HIT';
            const isMiss = att.status === 'MISS';
            const isInvalid = att.status === 'INVALID';

            return (
              <tr key={att.attemptId} className="text-xs hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-dark">
                  Percobaan #{att.attemptNumber}
                </td>
                <td className="px-4 py-3 font-mono text-dark">
                  {att.kickDuration ? `${att.kickDuration.toFixed(2)} s` : '-'}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-primary">
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
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                      <CheckCircle2 size={12} /> HIT
                    </span>
                  )}
                  {isMiss && (
                    <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                      <XCircle size={12} /> MISS
                    </span>
                  )}
                  {isInvalid && (
                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                      <AlertCircle size={12} /> INVALID
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
                      className="font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Review <ArrowUpRight size={13} />
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

      {/* Grafik */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {summary && (
          <InlineSpeedChart
            attempts={summary.attempts}
            speedUnit={summary.speedUnit}
          />
        )}
        <Card title="Deviasi Jarak ke Pusat Sasaran (cm)" subtitle="Target Konsistensi Deviasi ≤ 3.0 cm">
          <AccuracyDistanceChart results={accuracyResultsList} />
        </Card>
      </div>
    </div>
  );
};