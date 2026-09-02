import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  Shield,
  Zap,
  Target as TargetIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart2,
  ArrowUpRight,
  HelpCircle,
  Clock,
  Activity,
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

// Komponen Grafik Kecepatan Khusus Halaman Detail Sesi (Tanpa Garis Acuan Buatan)
const SessionSpeedBarChart: React.FC<{
  attempts: AnalysisSession['attempts'];
  speedResults: { [videoId: string]: SpeedAnalysisResult };
}> = ({ attempts, speedResults }) => {
  const height = 180;
  const width = 500;
  const padding = { top: 30, right: 25, bottom: 35, left: 45 };

  const values = attempts.map((att) => {
    if (!att.video || !speedResults[att.video.id]) return 0;
    const res = speedResults[att.video.id];
    return res.calibrationAvailable && res.peakSpeedMetersPerSecond
      ? res.peakSpeedMetersPerSecond
      : 0;
  });

  const validValues = values.filter((v) => v > 0 && v < 35);
  const benchmarkMax = validValues.length > 0 ? Math.max(...validValues) : 15;
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
            Pengukuran kecepatan puncak tendangan
          </p>
        </div>
        <span className="font-mono font-bold text-[#800000] bg-[#800000]/10 border border-[#800000]/20 px-2.5 py-1 rounded-lg text-xs">
          Satuan: m/s
        </span>
      </div>

      <div className="w-full aspect-[16/9] max-h-[220px] relative my-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
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

            const spdData = att.video ? speedResults[att.video.id] : null;
            const val =
              spdData?.calibrationAvailable && spdData?.peakSpeedMetersPerSecond
                ? spdData.peakSpeedMetersPerSecond
                : 0;

            const isExtreme = val > maxVal;
            const bY = getY(val);
            const bHeight = Math.max(3, height - padding.bottom - bY);

            return (
              <g key={att.id}>
                {val > 0 && (
                  <rect
                    x={x}
                    y={bY}
                    width={barWidth}
                    height={bHeight}
                    rx="3"
                    fill={isExtreme ? '#DC2626' : '#800000'}
                    className="transition-all hover:opacity-90"
                  />
                )}

                {val > 0 ? (
                  <text
                    x={x + barWidth / 2}
                    y={bY - 4}
                    fill={isExtreme ? '#DC2626' : '#800000'}
                    fontSize="9"
                    textAnchor="middle"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {isExtreme ? `! ${val.toFixed(1)}` : `${val.toFixed(1)} m/s`}
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

      <div className="flex items-center justify-center gap-6 text-xs font-medium text-dark-secondary pt-3 border-t border-dark-border/60">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#800000] inline-block" /> Kecepatan Puncak (Peak Speed)
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

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 1. HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-dark-border shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analisis')}
            className="p-2 rounded-xl bg-slate-50 border border-dark-border text-dark-secondary hover:text-dark hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-xl font-bold text-dark truncate">
                {session.sessionCode}
              </h2>
              <Badge variant={session.status === 'Selesai' ? 'success' : 'neutral'}>
                {session.status}
              </Badge>
            </div>
            <p className="text-xs text-dark-secondary truncate mt-0.5">
              Tendangan Depan • {athlete ? athlete.name : session.athleteName} (Kaki {session.kickingLeg})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="primary"
            size="sm"
            className="flex-1 sm:flex-none justify-center text-xs"
            icon={<BarChart2 size={14} />}
            onClick={() => navigate(`/hasil/${session.id}`)}
          >
            Hasil Komparasi
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none justify-center text-xs"
            icon={<TargetIcon size={14} />}
            onClick={() => setIsTargetModalOpen(true)}
          >
            {target ? 'Target Siap' : 'Atur Target'}
          </Button>
        </div>
      </div>

      {/* 2. INFORMASI ATLET & SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 p-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-dark-secondary flex items-center gap-1 text-[11px]">
                <User size={12} /> Nama Atlet
              </span>
              <span className="font-bold text-dark truncate block mt-0.5">
                {athlete ? athlete.name : session.athleteName}
              </span>
              <span className="font-mono text-[10px] text-dark-secondary">
                {athlete ? athlete.athleteCode : '-'}
              </span>
            </div>

            <div>
              <span className="text-dark-secondary flex items-center gap-1 text-[11px]">
                <Calendar size={12} /> Tanggal Sesi
              </span>
              <span className="font-bold text-dark block mt-0.5">
                {formatDate(session.date)}
              </span>
            </div>

            <div>
              <span className="text-dark-secondary flex items-center gap-1 text-[11px]">
                <Shield size={12} /> Kaki Uji
              </span>
              <span className="font-bold text-[#800000] block mt-0.5">
                Tendangan {session.kickingLeg}
              </span>
            </div>

            <div>
              <span className="text-dark-secondary text-[11px] block">Target Sasaran</span>
              <span className={`font-bold block mt-0.5 ${target ? 'text-emerald-700' : 'text-amber-700'}`}>
                {target ? 'Terkalibrasi' : 'Belum Diatur'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-dark-secondary uppercase tracking-wider">
                Akurasi Sesi
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                {accuracySummary ? `${accuracySummary.hitsCount}/${accuracySummary.validAttempts} HIT` : '-'}
              </span>
            </div>

            <div className="mt-1 flex items-baseline gap-2">
              <h3 className="text-2xl md:text-3xl font-bold text-dark font-mono">
                {accuracySummary?.accuracyPercentage !== null && accuracySummary?.accuracyPercentage !== undefined
                  ? `${accuracySummary.accuracyPercentage.toFixed(1)}%`
                  : '-'}
              </h3>
              <span className="text-[11px] text-dark-secondary font-medium">
                ({accuracySummary?.validAttempts || 0}/{MAX_ATTEMPTS} Valid)
              </span>
            </div>
          </div>

          <p className="text-[11px] text-dark-secondary mt-1.5 pt-1.5 border-t border-dark-border/60">
            Rata-rata Simpangan:{' '}
            <b className="text-dark font-mono font-semibold">
              {accuracySummary?.averageDistanceCm ? `${accuracySummary.averageDistanceCm.toFixed(1)} cm` : '-'}
            </b>
          </p>
        </Card>
      </div>

      {/* 3. MANAJEMEN UPLOAD 5 VIDEO PERCOBAAN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs md:text-sm font-bold text-dark uppercase tracking-wider">
            1. Rekaman Video 5 Percobaan
          </h3>
          <span className="text-xs text-dark-secondary">
            Unggah rekaman video 5 kali tendangan depan atlet
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {session.attempts.map((att) => (
            <div key={att.id} className="flex flex-col space-y-2">
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
              />

              {att.video && (
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full text-xs"
                  icon={<Zap size={13} />}
                  onClick={() => navigate(`/analisis/${session.id}/attempt/${att.id}`)}
                >
                  Buka Analisis #{att.attemptNumber}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. TABEL REKAPITULASI 5 PERCOBAAN */}
      <Card
        title="2. Rekapitulasi Data Hasil Pengukuran"
        subtitle="Rincian parameter kinematika dan presisi sasaran per percobaan"
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-dark">
            <thead className="bg-slate-50 border-b border-dark-border text-xs uppercase font-semibold text-dark-secondary tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Percobaan</th>
                <th className="px-5 py-3.5">
                  <span className="flex items-center gap-1">
                    Impact Frame
                    <span title="Frame video saat ujung kaki membentur sasaran target">
                      <HelpCircle size={12} className="text-slate-400" />
                    </span>
                  </span>
                </th>
                <th className="px-5 py-3.5">
                  <span className="flex items-center gap-1">
                    Kecepatan Puncak
                    <span title="Kecepatan lecutan maksimal kaki sesaat sebelum menyentuh target">
                      <HelpCircle size={12} className="text-slate-400" />
                    </span>
                  </span>
                </th>
                <th className="px-5 py-3.5">
                  <span className="flex items-center gap-1">
                    Jarak Sasaran
                    <span title="Jarak simpangan meleset dari titik pusat target">
                      <HelpCircle size={12} className="text-slate-400" />
                    </span>
                  </span>
                </th>
                <th className="px-5 py-3.5">
                  <span className="flex items-center gap-1">
                    Status Sasaran
                    <span title="HIT jika titik perkenaan berada di dalam bidang target">
                      <HelpCircle size={12} className="text-slate-400" />
                    </span>
                  </span>
                </th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/60">
              {session.attempts.map((att) => {
                const spd = att.video && att.video.id ? speedResults[att.video.id] : null;
                const acc = att.video && att.video.id ? accuracyResults[att.video.id] : null;

                const isHit = acc?.finalResult === 'hit';
                const isMiss = acc?.finalResult === 'miss';
                const isInvalid = acc?.finalResult === 'invalid';

                return (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-bold text-dark flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 border border-dark-border flex items-center justify-center text-xs font-mono">
                        {att.attemptNumber}
                      </span>
                      <span>Percobaan #{att.attemptNumber}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-dark-secondary text-xs">
                      {spd && spd.impactFrame !== undefined && spd.impactFrame !== null ? (
                        <span className="bg-slate-100 px-2 py-1 rounded border border-dark-border font-semibold text-dark">
                          Frame {spd.impactFrame}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-[#800000] text-sm">
                      {spd ? (
                        spd.calibrationAvailable && spd.peakSpeedMetersPerSecond !== null && spd.peakSpeedMetersPerSecond !== undefined ? (
                          <span>{spd.peakSpeedMetersPerSecond.toFixed(2)} <span className="text-xs font-normal text-dark-secondary">m/s</span></span>
                        ) : (
                          <span>{spd.peakSpeedPixelsPerSecond.toFixed(0)} <span className="text-xs font-normal text-dark-secondary">px/s</span></span>
                        )
                      ) : (
                        <span className="text-dark-secondary text-xs font-normal">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-dark font-medium">
                      {acc ? (
                        acc.distanceCentimeters !== null && acc.distanceCentimeters !== undefined ? (
                          <span className="text-sm font-semibold">{acc.distanceCentimeters.toFixed(1)} cm</span>
                        ) : (
                          <span className="text-xs text-dark-secondary">{acc.distancePixels?.toFixed(1)} px</span>
                        )
                      ) : (
                        <span className="text-dark-secondary text-xs">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {isHit && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold text-xs">
                          <CheckCircle2 size={14} className="text-emerald-600" /> HIT
                        </span>
                      )}
                      {isMiss && (
                        <span className="inline-flex items-center gap-1.5 text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full font-bold text-xs">
                          <XCircle size={14} className="text-rose-600" /> MISS
                        </span>
                      )}
                      {isInvalid && (
                        <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold text-xs">
                          <AlertCircle size={14} className="text-amber-600" /> INVALID
                        </span>
                      )}
                      {!acc && <span className="text-dark-secondary text-xs">Belum Dianalisis</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {att.video ? (
                        <button
                          onClick={() => navigate(`/analisis/${session.id}/attempt/${att.id}`)}
                          className="font-bold text-[#800000] hover:underline inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[#800000]/20 bg-[#800000]/5 transition-all"
                        >
                          Review <ArrowUpRight size={13} />
                        </button>
                      ) : (
                        <span className="text-dark-secondary text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. DUA GRAFIK SEJAJAR: KECEPATAN & SIMPANGAN SASARAN */}
      <div className="space-y-2">
        <h3 className="text-xs md:text-sm font-bold text-dark uppercase tracking-wider px-1">
          3. Visualisasi Hasil Pengukuran
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-stretch">
          <SessionSpeedBarChart
            attempts={session.attempts}
            speedResults={speedResults}
          />
          <AccuracyDistanceChart results={accuracyResultsList} />
        </div>
      </div>

      {/* 6. GLOSARIUM KETERANGAN METRIK BIOMEKANIKA DI PALING BAWAH */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-md border border-slate-800">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#800000]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#FACC15]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#800000] text-[#FACC15] flex items-center justify-center font-bold shadow-xs">
                <HelpCircle size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  Glosarium & Panduan Metrik Kinematika
                  <span className="text-[10px] font-mono bg-[#FACC15] text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Biomekanika
                  </span>
                </h4>
                <p className="text-xs text-white/60">
                  Penjelasan parameter uji tendangan depan pencak silat pasca-cedera
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-white/40 self-start sm:self-auto">
              SILAT MOTION Protocol
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            {/* 1. Durasi */}
            <div className="relative overflow-hidden bg-white/5 hover:bg-white/[0.08] transition-all border border-white/10 rounded-2xl p-4 flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Clock size={14} className="text-[#FACC15]" /> Durasi Gerak
                  </span>
                  <span className="text-[10px] font-mono text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
                    Waktu (s)
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Waktu aktif sejak tungkai mulai diangkat hingga ujung kaki membentur sasaran. Durasi singkat mengindikasikan kelancaran fase serang tanpa hambatan ragu.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/50">
                <span>Formula</span>
                <span className="text-white/80 font-bold">Δt = Impact - Start</span>
              </div>
            </div>

            {/* 2. Peak Speed */}
            <div className="relative overflow-hidden bg-white/5 hover:bg-white/[0.08] transition-all border border-white/10 rounded-2xl p-4 flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Zap size={14} className="text-[#FACC15]" /> Peak Speed
                  </span>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded font-bold">
                    Kecepatan (m/s)
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Kecepatan linear tertinggi pergelangan kaki tepat menjelang benturan sasaran. Mencerminkan daya ledak otot ekstensi tungkai pasca-rehabilitasi.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/50">
                <span>Karakteristik</span>
                <span className="text-[#FACC15] font-bold">Lecutan Maksimal</span>
              </div>
            </div>

            {/* 3. Simpangan Target */}
            <div className="relative overflow-hidden bg-white/5 hover:bg-white/[0.08] transition-all border border-white/10 rounded-2xl p-4 flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <TargetIcon size={14} className="text-rose-400" /> Simpangan Sasaran
                  </span>
                  <span className="text-[10px] font-mono text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
                    Jarak (cm)
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Deviasi jarak linear titik benturan kaki terhadap pusat target bidik. Semakin kecil nilainya, semakin presisi kontrol motorik tungkai atlet.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/50">
                <span>Pengukuran</span>
                <span className="text-white/80 font-bold">Jarak Euclidean (d)</span>
              </div>
            </div>

            {/* 4. Status Akurasi */}
            <div className="relative overflow-hidden bg-white/5 hover:bg-white/[0.08] transition-all border border-white/10 rounded-2xl p-4 flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <CheckCircle2 size={14} className="text-emerald-400" /> Status Akurasi
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded font-bold">
                    HIT / MISS
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  <b className="text-emerald-400">HIT</b> jika impak masuk dalam radius target yang ditentukan. <b className="text-rose-400">MISS</b> jika meleset ke luar bidang sasaran.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/50">
                <span>Kriteria</span>
                <span className="text-emerald-400 font-bold">Presisi Target</span>
              </div>
            </div>
          </div>
        </div>
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