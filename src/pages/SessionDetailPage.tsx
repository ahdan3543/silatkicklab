import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target as TargetIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart2,
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
import { AccuracyDistanceChart } from '../features/analysis/AccuracyDistanceChart';
import { TargetSetupModal } from '../features/analysis/TargetSetupModal';
import { AnalysisSession, Athlete, Video, MAX_ATTEMPTS } from '../types';
import { SpeedAnalysisResult } from '../types/speed';
import { TargetDefinition, AccuracyAnalysisResult, SessionAccuracySummary } from '../types/accuracy';
import { sessionService } from '../services/sessionService';
import { athleteService } from '../services/athleteService';
import { speedStorageService } from '../services/speed/speedStorageService';
import { accuracyStorageService } from '../services/accuracy/accuracyStorageService';
import { accuracyCalculationEngine } from '../services/accuracy/accuracyCalculationEngine';
import { videoStorageService } from '../services/videoStorageService';
import { formatDate } from '../utils/formatters';

// Komponen Grafik Durasi Siklus Penuh (Full Kick Cycle: Start -> Impact -> Recovery)
const SessionDurationBarChart: React.FC<{
  attempts: AnalysisSession['attempts'];
  speedResults: { [videoId: string]: SpeedAnalysisResult };
}> = ({ attempts, speedResults }) => {
  const height = 180;
  const width = 500;
  const padding = { top: 30, right: 25, bottom: 35, left: 45 };

  // Hitung durasi siklus penuh (detik) untuk setiap percobaan
  const cycleData = attempts.map((att) => {
    if (!att.video || !speedResults[att.video.id]) {
      return { duration: 0, peakSpeed: 0, label: '-' };
    }
    const res = speedResults[att.video.id];
    const fps = 30;

    let durationSec = 0;
    // 1. Jika fase recovery ada (siklus penuh)
    if (res.recoveryFrame && res.kickStartFrame && res.recoveryFrame > res.kickStartFrame) {
      durationSec = (res.recoveryFrame - res.kickStartFrame) / fps;
    } else if (res.impactFrame && res.kickStartFrame && res.impactFrame > res.kickStartFrame) {
      // Fallback jika belum set recovery: hitung fase serang
      durationSec = (res.impactFrame - res.kickStartFrame) / fps;
    } else if ((res as any).durationSeconds) {
      durationSec = (res as any).durationSeconds;
    }

    const spd = res.calibrationAvailable && res.peakSpeedMetersPerSecond
      ? res.peakSpeedMetersPerSecond
      : 0;

    return {
      duration: durationSec,
      peakSpeed: spd,
      label: durationSec > 0 ? `${durationSec.toFixed(2)}s` : '-',
    };
  });

  const validDurations = cycleData.map((d) => d.duration).filter((v) => v > 0);
  const maxBenchmark = validDurations.length > 0 ? Math.max(...validDurations) : 1.5;
  const maxVal = Math.max(1.5, Math.ceil(maxBenchmark * 1.3 * 10) / 10);

  const getY = (val: number) => {
    const clampedVal = Math.min(val, maxVal);
    return (
      height -
      padding.bottom -
      (clampedVal / maxVal) * (height - padding.top - padding.bottom)
    );
  };

  return (
    <div className="w-full bg-white border border-dark-border rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-dark-border/60">
        <div>
          <h3 className="font-bold text-dark text-xs sm:text-sm">
            Durasi Siklus Tendangan (Full Cycle)
          </h3>
          <p className="text-[11px] text-dark-secondary">
            Waktu total: angkat kaki &rarr; benturan target &rarr; kembali ke posisi semula
          </p>
        </div>
        <span className="font-mono font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-[11px]">
          Detik (s)
        </span>
      </div>

      <div className="w-full aspect-[16/9] max-h-[200px] relative my-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Garis Grid Y Atas */}
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
            {maxVal.toFixed(1)}s
          </text>

          {/* Garis Grid Y Tengah */}
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
            {(maxVal / 2).toFixed(1)}s
          </text>

          {/* Garis Sumbu X */}
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

          {attempts.map((att, idx) => {
            const totalGroups = attempts.length || 5;
            const groupWidth = (width - padding.left - padding.right) / totalGroups;
            const barWidth = 24;
            const x = padding.left + idx * groupWidth + (groupWidth - barWidth) / 2;

            const data = cycleData[idx];
            const bY = getY(data.duration);
            const bHeight = Math.max(4, height - padding.bottom - bY);

            return (
              <g key={att.id}>
                {data.duration > 0 && (
                  <rect
                    x={x}
                    y={bY}
                    width={barWidth}
                    height={bHeight}
                    rx="3"
                    fill="#0284C7"
                    className="transition-all hover:opacity-90"
                  />
                )}

                {/* Nilai Durasi */}
                <text
                  x={x + barWidth / 2}
                  y={data.duration > 0 ? bY - 4 : height - padding.bottom - 8}
                  fill={data.duration > 0 ? '#0369A1' : '#94A3B8'}
                  fontSize="8.5"
                  textAnchor="middle"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {data.label}
                </text>

                {/* Label Percobaan */}
                <text
                  x={x + barWidth / 2}
                  y={height - 18}
                  fill="#64748B"
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  P#{att.attemptNumber}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-center gap-6 text-[11px] font-medium text-dark-secondary pt-2.5 border-t border-dark-border/60">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#0284C7] inline-block" /> Durasi Siklus Penuh (s)
        </span>
      </div>
    </div>
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
  const [accuracySummary, setAccuracySummary] = useState<SessionAccuracySummary | null>(null);

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
        const accList: AccuracyAnalysisResult[] = [];

        for (const att of sessionData.attempts) {
          if (att.video && att.video.id) {
            const [spd, acc] = await Promise.all([
              speedStorageService.getSpeedResultByVideoId(att.video.id),
              accuracyStorageService.getAccuracyResultByVideoId(att.video.id),
            ]);
            if (spd) spdMap[att.video.id] = spd;
            if (acc) {
              accMap[att.video.id] = acc;
              accList.push(acc);
            }
          }
        }

        setSpeedResults(spdMap);
        setAccuracyResults(accMap);
        if (accList.length > 0) {
          setAccuracySummary(accuracyCalculationEngine.computeSessionSummary(accList));
        }
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
    const fps = 30;

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
      <div className="w-full flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-dark-border shadow-xs">
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
            variant="primary"
            size="sm"
            className="h-8 px-3 text-xs"
            icon={<BarChart2 size={13} />}
            onClick={() => navigate(`/hasil/${session.id}`)}
          >
            Komparasi
          </Button>
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

      {/* 2. STATS & INFO TERPADU (FULL WIDTH) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-300">
              Akurasi Sesi
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded">
              {accuracySummary ? `${accuracySummary.hitsCount}/${accuracySummary.validAttempts} HIT` : '-'}
            </span>
          </div>

          <div className="my-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-black font-mono tracking-tight text-white">
              {accuracySummary?.accuracyPercentage !== null && accuracySummary?.accuracyPercentage !== undefined
                ? `${accuracySummary.accuracyPercentage.toFixed(1)}%`
                : '-'}
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              ({accuracySummary?.validAttempts || 0}/{MAX_ATTEMPTS} Valid)
            </span>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
            <span>Rerata Deviasi</span>
            <span className="text-white font-mono font-bold">
              {accuracySummary?.averageDistanceCm ? `${accuracySummary.averageDistanceCm.toFixed(1)} cm` : '-'}
            </span>
          </div>
        </Card>

        <Card className="md:col-span-2 p-4 flex flex-col justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-dark-secondary text-[11px] block">Atlet</span>
              <span className="font-bold text-dark truncate block mt-0.5">
                {athlete ? athlete.name : session.athleteName}
              </span>
              <span className="font-mono text-[10px] text-dark-secondary">
                {athlete ? athlete.athleteCode : '-'}
              </span>
            </div>

            <div>
              <span className="text-dark-secondary text-[11px] block">Tanggal Sesi</span>
              <span className="font-bold text-dark block mt-0.5">
                {formatDate(session.date)}
              </span>
            </div>

            <div>
              <span className="text-dark-secondary text-[11px] block">Kaki Uji</span>
              <span className="font-bold text-[#800000] block mt-0.5">
                Kaki {session.kickingLeg}
              </span>
            </div>

            <div>
              <span className="text-dark-secondary text-[11px] block">Target Bidik</span>
              <span className={`font-bold block mt-0.5 ${target ? 'text-emerald-700' : 'text-amber-700'}`}>
                {target ? 'Terkalibrasi' : 'Belum Ada'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. GRID 5 PERCOBAAN TENDANGAN */}
      <div className="w-full space-y-2">
        <h2 className="text-xs font-bold text-dark uppercase tracking-wider px-1">
          Rekaman 5 Percobaan
        </h2>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {session.attempts.map((att) => {
            const hasVideo = checkHasValidVideo(att);

            return (
              <div key={att.id} className="flex flex-col space-y-2 bg-white p-2.5 rounded-xl border border-dark-border/80 shadow-xs">
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

      {/* 4. TABEL REKAPITULASI PARAMETER KINEMATIKA LENGKAP */}
      <Card className="w-full p-0 overflow-hidden border-dark-border/80 shadow-xs">
        <div className="px-4 py-3 border-b border-dark-border/60 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-dark">
            Rekapitulasi Parameter Kinematika & Biomekanika
          </h2>
          <span className="text-[11px] text-dark-secondary font-mono">Full Cycle & Accuracy</span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs text-dark">
            <thead className="bg-slate-50 border-b border-dark-border text-[11px] uppercase font-semibold text-dark-secondary">
              <tr>
                <th className="px-4 py-3">Percobaan</th>
                <th className="px-4 py-3">Durasi Siklus Penuh</th>
                <th className="px-4 py-3">Kecepatan Puncak</th>
                <th className="px-4 py-3">Deviasi Sasaran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/50">
              {session.attempts.map((att) => {
                const hasVideo = checkHasValidVideo(att);
                const spd = hasVideo && att.video ? speedResults[att.video.id] : null;
                const acc = hasVideo && att.video ? accuracyResults[att.video.id] : null;

                const isHit = acc?.finalResult === 'hit';
                const isMiss = acc?.finalResult === 'miss';
                const isInvalid = acc?.finalResult === 'invalid';

                return (
                  <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-dark flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 border border-dark-border flex items-center justify-center text-[10px] font-mono">
                        {att.attemptNumber}
                      </span>
                      <span>#{att.attemptNumber}</span>
                    </td>

                    {/* Kolom Durasi Siklus Penuh (Detik) */}
                    <td className="px-4 py-3 font-mono font-bold text-sky-700">
                      {hasVideo ? getCycleDuration(att.id, att.video?.id) : '-'}
                    </td>

                    {/* Kolom Kecepatan Puncak */}
                    <td className="px-4 py-3 font-mono font-bold text-[#800000]">
                      {spd ? (
                        spd.calibrationAvailable && spd.peakSpeedMetersPerSecond ? (
                          <span>{spd.peakSpeedMetersPerSecond.toFixed(1)} <span className="text-[10px] font-normal text-dark-secondary">m/s</span></span>
                        ) : (
                          <span>{spd.peakSpeedPixelsPerSecond.toFixed(0)} <span className="text-[10px] font-normal text-dark-secondary">px/s</span></span>
                        )
                      ) : (
                        <span className="text-dark-secondary font-normal">-</span>
                      )}
                    </td>

                    {/* Kolom Deviasi Sasaran */}
                    <td className="px-4 py-3 font-mono text-dark font-medium">
                      {acc ? (
                        acc.distanceCentimeters !== null && acc.distanceCentimeters !== undefined ? (
                          <span className="font-semibold">{acc.distanceCentimeters.toFixed(1)} cm</span>
                        ) : (
                          <span className="text-dark-secondary">{acc.distancePixels?.toFixed(1)} px</span>
                        )
                      ) : (
                        <span className="text-dark-secondary">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isHit && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px]">
                          <CheckCircle2 size={12} /> HIT
                        </span>
                      )}
                      {isMiss && (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold text-[10px]">
                          <XCircle size={12} /> MISS
                        </span>
                      )}
                      {isInvalid && (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                          <AlertCircle size={12} /> INVALID
                        </span>
                      )}
                      {!acc && <span className="text-dark-secondary text-[10px]">Belum Ada</span>}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {hasVideo ? (
                        <button
                          onClick={() => navigate(`/analisis/${session.id}/attempt/${att.id}`)}
                          className="font-semibold text-[#800000] hover:underline inline-flex items-center gap-0.5 text-[11px]"
                        >
                          Review <ArrowUpRight size={12} />
                        </button>
                      ) : (
                        <span className="text-dark-secondary">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. VISUALISASI DUA GRAFIK (GRAFIK 1: DURASI SIKLUS PENUH, GRAFIK 2: SIMPANGAN TARGET) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <SessionDurationBarChart
          attempts={session.attempts}
          speedResults={speedResults}
        />
        <AccuracyDistanceChart results={accuracyResultsList} />
      </div>

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