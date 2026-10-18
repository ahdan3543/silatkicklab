import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target as TargetIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  HelpCircle,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { VideoCard } from '../features/video/VideoCard';
import { UploadConfirmModal } from '../features/video/UploadConfirmModal';
import { TargetSetupModal } from '../features/analysis/TargetSetupModal';
import { AnalysisSession, Athlete, Video } from '../types';
import { SpeedAnalysisResult } from '../types/speed';
import { TargetDefinition, AccuracyAnalysisResult } from '../types/accuracy';
import { sessionService } from '../services/sessionService';
import { athleteService } from '../services/athleteService';
import { speedStorageService } from '../services/speed/speedStorageService';
import { accuracyStorageService } from '../services/accuracy/accuracyStorageService';
import { videoStorageService } from '../services/videoStorageService';
import { formatDate } from '../utils/formatters';


// Grafik hasil utama sesi: empat visualisasi yang fokus pada parameter yang benar-benar
// dibutuhkan untuk membaca performa tendangan. Waktu memakai skala terbalik sehingga
// waktu yang lebih kecil (lebih cepat) secara visual berada lebih tinggi.
const SessionResultCharts: React.FC<{
  attempts: AnalysisSession['attempts'];
  speedResults: { [videoId: string]: SpeedAnalysisResult };
  accuracyResults: { [videoId: string]: AccuracyAnalysisResult };
}> = ({ attempts, speedResults, accuracyResults }) => {
  const getCycleSpeed = (r: SpeedAnalysisResult) => {
    if (!r.metersPerPixel || !r.trajectory?.length || r.kickStartTimestamp == null || r.recoveryTimestamp == null) return null;
    if (r.recoveryTimestamp <= r.kickStartTimestamp) return null;
    const pts = r.trajectory.filter(p => p.timestamp >= r.kickStartTimestamp! && p.timestamp <= r.recoveryTimestamp!);
    if (pts.length < 2) return null;
    let pathPx = 0;
    for (let i = 1; i < pts.length; i++) {
      pathPx += Math.hypot(pts[i].rawX - pts[i - 1].rawX, pts[i].rawY - pts[i - 1].rawY);
    }
    const duration = r.recoveryTimestamp - r.kickStartTimestamp;
    return duration > 0 ? (pathPx * r.metersPerPixel) / duration : null;
  };

  const getPhaseTime = (r: SpeedAnalysisResult) =>
    r.kickStartTimestamp != null && r.impactTimestamp != null && r.impactTimestamp > r.kickStartTimestamp
      ? r.impactTimestamp - r.kickStartTimestamp : null;

  const getCycleTime = (r: SpeedAnalysisResult) =>
    r.kickStartTimestamp != null && r.recoveryTimestamp != null && r.recoveryTimestamp > r.kickStartTimestamp
      ? r.recoveryTimestamp - r.kickStartTimestamp : null;

  type ChartMode = 'phase' | 'cycle' | 'peakAccuracy' | 'deviation';
  const charts: { mode: ChartMode; title: string; subtitle: string }[] = [
    { mode: 'phase', title: 'Kecepatan Fase & Waktu', subtitle: 'Start → Impact · kecepatan dan waktu fase' },
    { mode: 'cycle', title: 'Kecepatan Siklus & Waktu', subtitle: 'Start → Recovery · kecepatan dan waktu siklus' },
    { mode: 'peakAccuracy', title: 'Kecepatan Puncak & Akurasi', subtitle: 'Kecepatan maksimum dibandingkan hasil bidikan' },
    { mode: 'deviation', title: 'Simpangan Titik Impact', subtitle: 'Jarak titik impact aktual terhadap pusat target' },
  ];

  const Chart: React.FC<{ mode: ChartMode; title: string; subtitle: string }> = ({ mode, title, subtitle }) => {
    const values = attempts.map(att => {
      const r = att.video ? speedResults[att.video.id] : undefined;
      const a = att.video ? accuracyResults[att.video.id] : undefined;
      if (mode === 'phase') return { speed: r?.averageSpeedMetersPerSecond ?? null, time: r ? getPhaseTime(r) : null };
      if (mode === 'cycle') return { speed: r ? getCycleSpeed(r) : null, time: r ? getCycleTime(r) : null };
      if (mode === 'peakAccuracy') return {
        speed: r?.peakSpeedMetersPerSecond ?? null,
        accuracy: a?.finalResult === 'hit' ? 100 : a?.finalResult === 'miss' ? 0 : null,
        status: a?.finalResult ?? null,
      };
      return { deviation: a?.distanceCentimeters ?? null, hit: a?.finalResult === 'hit' };
    });

    const width = 980;
    const height = 450;
    const pad = { top: 58, right: mode === 'deviation' ? 54 : 78, bottom: 78, left: 70 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const groupW = plotW / Math.max(attempts.length, 1);
    const baseline = height - pad.bottom;

    const speedValues = values.map(v => 'speed' in v ? v.speed : null).filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);
    const deviationValues = values.map(v => 'deviation' in v ? v.deviation : null).filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);
    const maxSpeed = Math.max(5, Math.ceil((speedValues.length ? Math.max(...speedValues) : 5) * 1.18 * 10) / 10);
    const maxDeviation = Math.max(10, Math.ceil((deviationValues.length ? Math.max(...deviationValues) : 10) * 1.25 * 10) / 10);

    const times = values.map(v => 'time' in v ? v.time : null);
    const validTimes = times.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
    const minTime = validTimes.length ? Math.min(...validTimes) : 0;
    const maxTime = validTimes.length ? Math.max(...validTimes) : 1;
    const timeRange = Math.max(maxTime - minTime, 0.01);

    // Waktu menggunakan skala terbalik: nilai waktu terkecil menghasilkan bar tertinggi.
    const getTimeHeight = (t: number) => ((maxTime - t) / timeRange) * plotH;
    const getSpeedY = (v: number) => baseline - (Math.min(v, maxSpeed) / maxSpeed) * plotH;
    const getDeviationY = (v: number) => baseline - (Math.min(v, maxDeviation) / maxDeviation) * plotH;
    const getAccuracyY = (v: number) => baseline - (v / 100) * plotH;

    const ticks = [0, 0.5, 1].map(ratio => ratio);

    return (
      <div className="rounded-2xl border border-dark-border bg-white p-5 sm:p-6 shadow-xs min-w-0">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-dark">{title}</h3>
            <p className="text-xs sm:text-sm text-dark-secondary mt-1">{subtitle}</p>
          </div>
          <span className="shrink-0 text-[10px] sm:text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 border border-dark-border">
            {mode === 'deviation' ? 'cm' : mode === 'peakAccuracy' ? 'm/s · %' : 'm/s · s'}
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[350px] sm:h-[390px] overflow-visible" preserveAspectRatio="xMidYMid meet">
          {ticks.map((ratio, i) => {
            const y = pad.top + plotH * ratio;
            const speedTick = maxSpeed * (1 - ratio);
            return (
              <g key={`grid-${i}`}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={i === 2 ? '#CBD5E1' : '#E2E8F0'} strokeDasharray={i === 2 ? undefined : '5 5'} />
                <text x={pad.left - 12} y={y + 5} fill="#64748B" fontSize="13" textAnchor="end" fontWeight="600">
                  {mode === 'deviation' ? (maxDeviation * (1 - ratio)).toFixed(1) : mode === 'peakAccuracy' || mode === 'phase' || mode === 'cycle' ? speedTick.toFixed(1) : ''}
                </text>
              </g>
            );
          })}

          {(mode === 'phase' || mode === 'cycle') && validTimes.length > 0 && (
            <g>
              <text x={width - pad.right + 12} y={pad.top + 4} fill="#2563EB" fontSize="12" fontWeight="800">Waktu lebih cepat ↑</text>
              <text x={width - pad.right + 12} y={pad.top + 21} fill="#64748B" fontSize="11" fontWeight="600">{minTime.toFixed(2)} s</text>
              <text x={width - pad.right + 12} y={baseline + 4} fill="#64748B" fontSize="11" fontWeight="600">{maxTime.toFixed(2)} s</text>
            </g>
          )}

          {mode === 'peakAccuracy' && (
            <g>
              <line x1={width - pad.right + 2} y1={pad.top} x2={width - pad.right + 2} y2={baseline} stroke="#CBD5E1" />
              <text x={width - pad.right + 14} y={pad.top + 4} fill="#059669" fontSize="12" fontWeight="800">Akurasi</text>
              <text x={width - pad.right + 14} y={pad.top + 21} fill="#64748B" fontSize="11" fontWeight="600">100%</text>
              <text x={width - pad.right + 14} y={baseline + 4} fill="#64748B" fontSize="11" fontWeight="600">0%</text>
            </g>
          )}

          {attempts.map((att, idx) => {
            const v: any = values[idx];
            const cx = pad.left + idx * groupW + groupW / 2;
            const isGrouped = mode === 'phase' || mode === 'cycle' || mode === 'peakAccuracy';
            const barW = isGrouped ? Math.min(48, groupW * 0.24) : Math.min(64, groupW * 0.34);
            const gap = isGrouped ? Math.min(10, groupW * 0.045) : 0;
            const speedX = cx - barW - gap / 2;
            const secondX = cx + gap / 2;

            if (mode === 'phase' || mode === 'cycle') {
              const speed = v.speed;
              const time = v.time;
              const speedY = typeof speed === 'number' ? getSpeedY(speed) : baseline;
              const speedH = typeof speed === 'number' ? Math.max(5, baseline - speedY) : 0;
              const timeH = typeof time === 'number' ? Math.max(7, getTimeHeight(time)) : 0;
              const timeY = baseline - timeH;
              return (
                <g key={att.id}>
                  {speedH > 0 && <rect x={speedX} y={speedY} width={barW} height={speedH} rx="6" fill="#800000" />}
                  {timeH > 0 && <rect x={secondX} y={timeY} width={barW} height={timeH} rx="6" fill="#2563EB" />}
                  {typeof speed === 'number' && <text x={speedX + barW / 2} y={Math.max(22, speedY - 9)} fill="#800000" fontSize="14" textAnchor="middle" fontWeight="800">{speed.toFixed(2)}</text>}
                  {typeof time === 'number' && <text x={secondX + barW / 2} y={Math.max(22, timeY - 9)} fill="#2563EB" fontSize="14" textAnchor="middle" fontWeight="800">{time.toFixed(2)} s</text>}
                  <text x={speedX + barW / 2} y={height - 39} fill="#800000" fontSize="11" textAnchor="middle" fontWeight="800">m/s</text>
                  <text x={secondX + barW / 2} y={height - 39} fill="#2563EB" fontSize="11" textAnchor="middle" fontWeight="800">waktu</text>
                  <text x={cx} y={height - 14} fill="#334155" fontSize="13" textAnchor="middle" fontWeight="800">P#{att.attemptNumber}</text>
                </g>
              );
            }

            if (mode === 'peakAccuracy') {
              const speed = v.speed;
              const accuracy = v.accuracy;
              const speedY = typeof speed === 'number' ? getSpeedY(speed) : baseline;
              const speedH = typeof speed === 'number' ? Math.max(5, baseline - speedY) : 0;
              const accH = typeof accuracy === 'number' ? Math.max(7, (accuracy / 100) * plotH) : 0;
              const accY = baseline - accH;
              const hit = v.status === 'hit';
              const accFill = hit ? '#10B981' : '#F43F5E';
              return (
                <g key={att.id}>
                  {speedH > 0 && <rect x={speedX} y={speedY} width={barW} height={speedH} rx="6" fill="#800000" />}
                  {accH > 0 && <rect x={secondX} y={accY} width={barW} height={accH} rx="6" fill={accFill} />}
                  {typeof speed === 'number' && <text x={speedX + barW / 2} y={Math.max(22, speedY - 9)} fill="#800000" fontSize="14" textAnchor="middle" fontWeight="800">{speed.toFixed(2)}</text>}
                  {typeof accuracy === 'number' && <text x={secondX + barW / 2} y={Math.max(22, accY - 9)} fill={accFill} fontSize="14" textAnchor="middle" fontWeight="800">{accuracy}%</text>}
                  <text x={speedX + barW / 2} y={height - 39} fill="#800000" fontSize="11" textAnchor="middle" fontWeight="800">m/s</text>
                  <text x={secondX + barW / 2} y={height - 39} fill={accFill} fontSize="11" textAnchor="middle" fontWeight="800">{hit ? 'HIT' : v.status === 'miss' ? 'MISS' : '—'}</text>
                  <text x={cx} y={height - 14} fill="#334155" fontSize="13" textAnchor="middle" fontWeight="800">P#{att.attemptNumber}</text>
                </g>
              );
            }

            const deviation = v.deviation;
            const y = typeof deviation === 'number' ? getDeviationY(deviation) : baseline;
            const h = typeof deviation === 'number' ? Math.max(5, baseline - y) : 0;
            const hit = v.hit;
            const fill = hit ? '#10B981' : '#F43F5E';
            return (
              <g key={att.id}>
                {h > 0 && <rect x={cx - barW / 2} y={y} width={barW} height={h} rx="6" fill={fill} />}
                {typeof deviation === 'number' && <text x={cx} y={Math.max(22, y - 10)} fill={fill} fontSize="14" textAnchor="middle" fontWeight="800">{deviation.toFixed(1)} cm</text>}
                <text x={cx} y={height - 39} fill={fill} fontSize="11" textAnchor="middle" fontWeight="800">{hit ? 'HIT' : 'MISS'}</text>
                <text x={cx} y={height - 14} fill="#334155" fontSize="13" textAnchor="middle" fontWeight="800">P#{att.attemptNumber}</text>
              </g>
            );
          })}
        </svg>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 border-t border-dark-border/60 text-xs sm:text-sm font-semibold text-dark-secondary">
          {mode !== 'deviation' && <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#800000]" /> Kecepatan (m/s)</span>}
          {(mode === 'phase' || mode === 'cycle') && <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#2563EB]" /> Waktu (s) · makin kecil makin cepat</span>}
          {mode === 'peakAccuracy' && <><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#10B981]" /> Akurasi HIT</span><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#F43F5E]" /> Akurasi MISS</span></>}
          {mode === 'deviation' && <><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#10B981]" /> HIT</span><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#F43F5E]" /> MISS</span></>}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="font-bold text-dark text-xl sm:text-2xl">Grafik Hasil Analisis</h2>
          <p className="text-sm text-dark-secondary mt-1">Perbandingan kecepatan, waktu, kecepatan puncak, dan akurasi pada 5 percobaan</p>
        </div>
        <span className="shrink-0 text-[10px] sm:text-xs font-mono font-bold text-[#800000] bg-[#800000]/10 border border-[#800000]/20 px-2.5 py-1.5 rounded-lg">Hasil utama</span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {charts.map(chart => <Chart key={chart.mode} {...chart} />)}
      </div>
    </Card>
  );
};

export const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [speedResults, setSpeedResults] = useState<{ [videoId: string]: SpeedAnalysisResult }>({});
  const [target, setTarget] = useState<TargetDefinition | null>(null);
  const [accuracyResults, setAccuracyResults] = useState<{ [videoId: string]: AccuracyAnalysisResult }>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState<boolean>(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState<boolean>(false);

  const [replaceTarget, setReplaceTarget] = useState<{ attemptId: string; file: File } | null>(null);
  const [deleteTargetAttemptId, setDeleteTargetAttemptId] = useState<string | null>(null);

  const fetchSessionAndData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const sessionData = await sessionService.getSessionById(id);
      if (sessionData) {
        setSession(sessionData);
        const [athleteData, targetData] = await Promise.all([
          athleteService.getAthleteById(sessionData.athleteId),
          accuracyStorageService.getTargetBySessionId(id),
        ]);

        if (athleteData) setAthlete(athleteData);
        if (targetData) setTarget(targetData);

        const spdMap: { [videoId: string]: SpeedAnalysisResult } = {};
        const accMap: { [videoId: string]: AccuracyAnalysisResult } = {};

        for (const att of sessionData.attempts) {
          if (att.video && att.video.id) {
            const [spd, acc] = await Promise.all([
              speedStorageService.getSpeedResultByVideoId(att.video.id),
              accuracyStorageService.getAccuracyResultByVideoId(att.video.id),
            ]);
            if (spd) spdMap[att.video.id] = spd;
            if (acc) {
              accMap[att.video.id] = acc;
            }
          }
        }

        setSpeedResults(spdMap);
        setAccuracyResults(accMap);
      }
    } catch (err) {
      console.error('Gagal mengambil detail sesi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndData();
  }, [id]);

  if (loading) {
    return <LoadingState message="Memuat detail sesi..." />;
  }

  if (!session) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-dark-secondary text-sm">Sesi analisis tidak ditemukan.</p>
        <Button onClick={() => navigate('/analisis')}>Kembali ke Daftar Sesi</Button>
      </div>
    );
  }

  const handleUploadSuccess = async (
    attemptId: string,
    metadata: Omit<Video, 'id'>,
    blob: Blob
  ) => {
    const videoId = `vid-${Date.now()}`;
    const videoPayload: Video = {
      ...metadata,
      id: videoId,
    };

    await videoStorageService.saveVideoBlob(attemptId, blob);
    await videoStorageService.saveVideoBlob(videoId, blob);

    const updated = await sessionService.updateAttemptVideo(session.id, attemptId, videoPayload, blob);
    if (updated) {
      setSession(updated);
    }
    await fetchSessionAndData();
  };

  const handleConfirmReplace = async () => {
    if (!replaceTarget) return;
    const { attemptId, file } = replaceTarget;

    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    const tempUrl = URL.createObjectURL(file);
    tempVideo.src = tempUrl;

    tempVideo.onloadedmetadata = async () => {
      URL.revokeObjectURL(tempUrl);
      const videoId = `vid-${Date.now()}`;
      const videoPayload: Video = {
        id: videoId,
        attemptId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'video/mp4',
        durationSeconds: tempVideo.duration || 0,
        uploadedAt: new Date().toISOString(),
        status: 'ready',
      };

      await videoStorageService.saveVideoBlob(attemptId, file);
      await videoStorageService.saveVideoBlob(videoId, file);

      const updated = await sessionService.updateAttemptVideo(
        session.id,
        attemptId,
        videoPayload,
        file
      );
      if (updated) {
        setSession(updated);
      }
      setReplaceTarget(null);
      await fetchSessionAndData();
    };
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetAttemptId) return;
    await videoStorageService.deleteVideoBlob(deleteTargetAttemptId);
    await sessionService.removeAttemptVideo(session.id, deleteTargetAttemptId);
    setDeleteTargetAttemptId(null);
    await fetchSessionAndData();
  };

  const accuracyResultsList = Object.values(accuracyResults);

  const checkHasValidVideo = (att: (typeof session.attempts)[0]) => {
    return Boolean(
      att.video && (att.video.fileUrl || att.video.fileName || (att.video as any).fileSize)
    );
  };

  // Helper menghitung durasi siklus penuh per percobaan
  const getCycleDuration = (attId: string, videoId?: string) => {
    if (!videoId || !speedResults[videoId]) return '-';
    const res = speedResults[videoId];
    const fps = res.fps || 60;

    if (res.recoveryFrame && res.kickStartFrame && res.recoveryFrame > res.kickStartFrame) {
      const sec = (res.recoveryFrame - res.kickStartFrame) / fps;
      return `${sec.toFixed(2)} s`;
    }
    if (res.impactFrame && res.kickStartFrame && res.impactFrame > res.kickStartFrame) {
      const sec = (res.impactFrame - res.kickStartFrame) / fps;
      return `${sec.toFixed(2)} s`;
    }
    return '-';
  };

  return (
    <div className="w-full space-y-4 pb-16">
      {/* 1. HEADER BAR (FULL WIDTH) */}
      <div className="session-detail-toolbar w-full flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-dark-border shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/analisis')}
            className="p-2 rounded-xl bg-slate-50 border border-dark-border text-dark-secondary hover:text-dark hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-dark truncate">
                {session.sessionCode}
              </h1>
              <div>
                <Badge variant={session.status === 'Selesai' ? 'success' : 'neutral'}>
                  {session.status}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-dark-secondary truncate">
              {athlete ? athlete.name : session.athleteName} • Kaki {session.kickingLeg}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            icon={<TargetIcon size={13} />}
            onClick={() => setIsTargetModalOpen(true)}
          >
            {target ? 'Target Siap' : 'Atur Target'}
          </Button>
        </div>
      </div>

      {/* 2. INFO ATLET & SESI */}
      <Card className="w-full p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-dark-secondary text-xs block">Atlet</span>
            <span className="font-bold text-dark truncate block mt-1">{athlete ? athlete.name : session.athleteName}</span>
            <span className="font-mono text-[11px] text-dark-secondary">{athlete ? athlete.athleteCode : '-'}</span>
          </div>
          <div>
            <span className="text-dark-secondary text-xs block">Tanggal Sesi</span>
            <span className="font-bold text-dark block mt-1">{formatDate(session.date)}</span>
          </div>
          <div>
            <span className="text-dark-secondary text-xs block">Kaki Uji</span>
            <span className="font-bold text-[#800000] block mt-1">Kaki {session.kickingLeg}</span>
          </div>
          <div>
            <span className="text-dark-secondary text-xs block">Target Bidik</span>
            <span className={`font-bold block mt-1 ${target ? 'text-emerald-700' : 'text-amber-700'}`}>{target ? 'Terkalibrasi' : 'Belum Ada'}</span>
          </div>
        </div>
      </Card>

      {/* 3. GRID 5 PERCOBAAN TENDANGAN */}
      <div className="w-full space-y-2">
        <h2 className="text-xs font-bold text-dark uppercase tracking-wider px-1">
          Rekaman 5 Percobaan
        </h2>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {session.attempts.map((att) => {
            const hasVideo = checkHasValidVideo(att);

            return (
              <div key={att.id} className="attempt-card flex flex-col space-y-2 bg-white p-2.5 rounded-xl border border-dark-border/80 shadow-xs">
                <VideoCard
                  attempt={att}
                  onUploadSuccess={handleUploadSuccess}
                  onDeleteVideo={async () => {
                    await videoStorageService.deleteVideoBlob(att.id);
                    if (att.video) await videoStorageService.deleteVideoBlob(att.video.id);
                    await sessionService.removeAttemptVideo(session.id, att.id);
                    fetchSessionAndData();
                  }}
                  onAskReplace={(attemptId, file) => setReplaceTarget({ attemptId, file })}
                  onAskDelete={(attemptId) => setDeleteTargetAttemptId(attemptId)}
                  onOpenAnalysis={hasVideo ? () => navigate(`/analisis/${session.id}/attempt/${att.id}`) : undefined}
                />

                {hasVideo && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full text-xs h-8 font-semibold"
                    icon={<Zap size={12} />}
                    onClick={() => navigate(`/analisis/${session.id}/attempt/${att.id}`)}
                  >
                    Analisis #{att.attemptNumber}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. REKAP PARAMETER — ringkas, tanpa kolom waktu yang dobel */}
      <Card className="w-full p-0 overflow-hidden border-dark-border/80 shadow-xs">
        <div className="px-4 py-3 border-b border-dark-border/60 bg-slate-50/50 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-dark">Rekapitulasi Parameter Kinematika & Biomekanika</h2>
            <p className="text-[10px] text-dark-secondary mt-0.5">Kecepatan, waktu, akurasi, dan status setiap percobaan</p>
          </div>
          <span className="hidden sm:inline text-[10px] text-dark-secondary font-mono">5 Percobaan</span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs text-dark">
            <thead className="bg-slate-50 border-b border-dark-border text-[10px] uppercase font-semibold text-dark-secondary">
              <tr>
                <th className="px-4 py-3">Percobaan</th>
                <th className="px-4 py-3">Start → Impact</th>
                <th className="px-4 py-3">Siklus Penuh</th>
                <th className="px-4 py-3">Kecepatan Puncak</th>
                <th className="px-4 py-3">Deviasi Sasaran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/50">
              {session.attempts.map(att => {
                const hasVideo = checkHasValidVideo(att);
                const spd = hasVideo && att.video ? speedResults[att.video.id] : null;
                const acc = hasVideo && att.video ? accuracyResults[att.video.id] : null;
                const phaseTime = spd?.kickStartTimestamp != null && spd?.impactTimestamp != null && spd.impactTimestamp > spd.kickStartTimestamp ? spd.impactTimestamp - spd.kickStartTimestamp : null;
                const cycleTime = spd?.kickStartTimestamp != null && spd?.recoveryTimestamp != null && spd.recoveryTimestamp > spd.kickStartTimestamp ? spd.recoveryTimestamp - spd.kickStartTimestamp : null;
                const cycleSpeed = spd ? (() => {
                  if (!spd.metersPerPixel || !spd.trajectory?.length || spd.kickStartTimestamp == null || spd.recoveryTimestamp == null || spd.recoveryTimestamp <= spd.kickStartTimestamp) return null;
                  const pts = spd.trajectory.filter(p => p.timestamp >= spd.kickStartTimestamp! && p.timestamp <= spd.recoveryTimestamp!);
                  if (pts.length < 2) return null;
                  let pathPx = 0;
                  for (let i=1;i<pts.length;i++) pathPx += Math.hypot(pts[i].rawX-pts[i-1].rawX, pts[i].rawY-pts[i-1].rawY);
                  return (pathPx * spd.metersPerPixel) / (spd.recoveryTimestamp - spd.kickStartTimestamp);
                })() : null;
                const hit = acc?.finalResult === 'hit', miss = acc?.finalResult === 'miss', invalid = acc?.finalResult === 'invalid';
                return <tr key={att.id} className="hover:bg-slate-50 transition-colors align-middle">
                  <td className="px-4 py-3 font-bold"><span className="inline-flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-slate-100 border border-dark-border flex items-center justify-center text-[10px] font-mono">{att.attemptNumber}</span>#{att.attemptNumber}</span></td>
                  <td className="px-4 py-3"><div className="font-mono font-bold text-[#800000]">{spd?.averageSpeedMetersPerSecond ? `${spd.averageSpeedMetersPerSecond.toFixed(2)} m/s` : '-'}</div><div className="text-[9px] text-dark-secondary mt-0.5">{phaseTime != null ? `${phaseTime.toFixed(2)} s` : 'waktu belum tersedia'}</div></td>
                  <td className="px-4 py-3"><div className="font-mono font-bold text-sky-700">{cycleSpeed ? `${cycleSpeed.toFixed(2)} m/s` : '-'}</div><div className="text-[9px] text-dark-secondary mt-0.5">{cycleTime != null ? `${cycleTime.toFixed(2)} s` : 'durasi belum tersedia'}</div></td>
                  <td className="px-4 py-3 font-mono font-bold text-[#800000]">{spd ? `${spd.peakSpeedMetersPerSecond.toFixed(2)} m/s` : '-'}</td>
                  <td className="px-4 py-3 font-mono font-medium">{acc?.distanceCentimeters != null ? `${acc.distanceCentimeters.toFixed(1)} cm` : acc?.distancePixels != null ? `${acc.distancePixels.toFixed(1)} px` : '-'}</td>
                  <td className="px-4 py-3">{hit && <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px]"><CheckCircle2 size={12}/> HIT</span>}{miss && <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold text-[10px]"><XCircle size={12}/> MISS</span>}{invalid && <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[10px]"><AlertCircle size={12}/> INVALID</span>}{!acc && <span className="text-dark-secondary text-[10px]">Belum Ada</span>}</td>
                  <td className="px-4 py-3 text-right">{hasVideo ? <button onClick={()=>navigate(`/analisis/${session.id}/attempt/${att.id}`)} className="font-semibold text-[#800000] hover:underline inline-flex items-center gap-0.5 text-[11px]">Review <ArrowUpRight size={12}/></button> : <span className="text-dark-secondary">-</span>}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. GRAFIK HASIL UTAMA */}
      <SessionResultCharts attempts={session.attempts} speedResults={speedResults} accuracyResults={accuracyResults} />

      {/* 6. GLOSARIUM */}
      <div className="w-full bg-slate-900 text-white rounded-xl border border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsGlossaryOpen(!isGlossaryOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            <HelpCircle size={15} className="text-amber-300" />
            Panduan & Definisi Protokol Pengujian Pencak Silat
          </span>
          {isGlossaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isGlossaryOpen && (
          <div className="p-4 pt-1 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="font-bold text-sky-400 flex items-center gap-1 text-[11px]">
                <Clock size={12} /> Durasi Siklus Penuh
              </span>
              <p className="text-[11px] text-slate-300">
                Waktu tempuh dari posisi pasang awal, perkenaan sasaran, hingga kaki tumpu kembali ke lantai (detik).
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                <Zap size={12} /> Kecepatan Puncak
              </span>
              <p className="text-[11px] text-slate-300">
                Lecutan linear tertinggi ujung kaki sesaat sebelum perkenaan (m/s).
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                <TargetIcon size={12} /> Deviasi Sasaran
              </span>
              <p className="text-[11px] text-slate-300">
                Jarak Euclidean simpangan titik impak ke titik tengah target sasaran (cm).
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                <CheckCircle2 size={12} /> Evaluasi Bidik
              </span>
              <p className="text-[11px] text-slate-300">
                Status HIT jika perkenaan berada di dalam radius toleransi sasaran.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TargetSetupModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        sessionId={session.id}
        videoElement={null}
        videoWidth={640}
        videoHeight={360}
        onSaveTarget={async (newTarget: TargetDefinition) => {
          setTarget(newTarget);
          await accuracyStorageService.saveTarget(newTarget);
          fetchSessionAndData();
        }}
        existingTarget={target}
      />

      <UploadConfirmModal
        isOpen={Boolean(replaceTarget)}
        onClose={() => setReplaceTarget(null)}
        onConfirm={handleConfirmReplace}
        title="Konfirmasi Ganti Video"
        message={`Video yang tersimpan pada percobaan ini akan digantikan dengan file "${replaceTarget?.file.name}". Lanjutkan proses?`}
        confirmLabel="Ganti Video"
      />

      <UploadConfirmModal
        isOpen={Boolean(deleteTargetAttemptId)}
        onClose={() => setDeleteTargetAttemptId(null)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Hapus Video"
        message="Apakah Anda yakin ingin menghapus file video pada percobaan ini?"
        confirmLabel="Hapus Video"
        variant="danger"
      />
    </div>
  );
};