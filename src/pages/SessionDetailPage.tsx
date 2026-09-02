import React, { useState, useEffect } from 'react';
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

    // Simpan ke storage Blob IndexedDB dengan ID attempt dan ID video agar sinkron
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

      // Pastikan Blob file disimpan ke IndexedDB
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
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-8">
      {/* Header Bar Mobile & Desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 md:p-0 rounded-xl md:rounded-none border md:border-none border-dark-border">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/analisis')}
            className="p-2 rounded-lg bg-white border border-dark-border text-dark-secondary hover:text-dark hover:bg-slate-50 transition-colors shadow-subtle shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-xl font-bold text-dark truncate">{session.sessionCode}</h2>
              <Badge variant={session.status === 'Selesai' ? 'success' : 'neutral'}>{session.status}</Badge>
            </div>
            <p className="text-[11px] text-dark-secondary truncate">
              Tendangan Depan • {athlete ? athlete.name : session.athleteName}
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

      {/* Grid Informasi Atlet & Summary Akurasi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="md:col-span-2 p-3.5 md:p-4">
          <div className="grid grid-cols-2 gap-2.5 text-xs">
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
                <Calendar size={12} /> Tanggal
              </span>
              <span className="font-bold text-dark block mt-0.5">
                {formatDate(session.date)}
              </span>
            </div>

            <div>
              <span className="text-dark-secondary flex items-center gap-1 text-[11px]">
                <Shield size={12} /> Kaki Uji
              </span>
              <span className="font-bold text-primary block mt-0.5">
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

        {/* Ringkasan Akurasi Box */}
        <Card className="flex flex-col justify-between p-3.5 md:p-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-dark-secondary uppercase tracking-wider">
                Akurasi Sesi
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
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
            Avg Deviasi:{' '}
            <b className="text-dark font-mono font-semibold">
              {accuracySummary?.averageDistanceCm ? `${accuracySummary.averageDistanceCm.toFixed(1)} cm` : '-'}
            </b>
          </p>
        </Card>
      </div>

      {/* 1. VERSI MOBILE: CARD LIST 5 PERCOBAAN (Layar HP < md) */}
      <div className="block md:hidden space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-dark px-1">
          Rekap 5 Percobaan
        </h3>

        {session.attempts.map((att) => {
          const spd = att.video && att.video.id ? speedResults[att.video.id] : null;
          const acc = att.video && att.video.id ? accuracyResults[att.video.id] : null;

          const isHit = acc?.finalResult === 'hit';
          const isMiss = acc?.finalResult === 'miss';
          const isInvalid = acc?.finalResult === 'invalid';

          return (
            <div
              key={att.id}
              className="bg-white border border-dark-border rounded-xl p-3 shadow-xs space-y-2 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-dark">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[11px]">
                    {att.attemptNumber}
                  </span>
                  <span>Percobaan #{att.attemptNumber}</span>
                </div>

                {isHit && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px]">
                    <CheckCircle2 size={12} /> HIT
                  </span>
                )}
                {isMiss && (
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded font-bold text-[10px]">
                    <XCircle size={12} /> MISS
                  </span>
                )}
                {isInvalid && (
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold text-[10px]">
                    <AlertCircle size={12} /> INVALID
                  </span>
                )}
                {!acc && <span className="text-[10px] text-slate-400">Belum Dianalisis</span>}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-dark-secondary block text-[10px]">Kecepatan Puncak</span>
                  <span className="font-bold text-primary text-xs">
                    {spd ? (
                      spd.peakSpeedMetersPerSecond ? `${spd.peakSpeedMetersPerSecond.toFixed(2)} m/s` : `${spd.peakSpeedPixelsPerSecond.toFixed(0)} px/s`
                    ) : '-'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-dark-secondary block text-[10px]">Jarak Simpangan</span>
                  <span className="font-bold text-dark text-xs">
                    {acc?.distanceCentimeters !== null && acc?.distanceCentimeters !== undefined
                      ? `${acc.distanceCentimeters.toFixed(1)} cm`
                      : '-'}
                  </span>
                </div>
              </div>

              {att.video && (
                <button
                  onClick={() => navigate(`/analisis/${session.id}/attempt/${att.id}`)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-dark font-semibold rounded-lg text-center flex items-center justify-center gap-1 text-xs transition-colors"
                >
                  Buka Detail Analisis <ArrowUpRight size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. VERSI DESKTOP: TABEL LEBAR LENGKAP (Layar >= md) */}
      <Card
        className="hidden md:block"
        title="Rekapitulasi 5 Percobaan Tendangan"
        subtitle="Data pengukuran kecepatan puncak, simpangan titik sasaran, dan akurasi tiap percobaan"
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-dark">
            <thead className="bg-slate-50 border-b border-dark-border text-xs uppercase font-semibold text-dark-secondary tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Percobaan</th>
                <th className="px-5 py-3.5">Impact Frame</th>
                <th className="px-5 py-3.5">Kecepatan Puncak</th>
                <th className="px-5 py-3.5">Jarak ke Target</th>
                <th className="px-5 py-3.5">Status Akurasi</th>
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
                      {spd ? (
                        <span className="bg-slate-100 px-2 py-1 rounded border border-dark-border">
                          Frame {spd.impactFrame}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-primary text-base">
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
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold text-xs">
                          <CheckCircle2 size={14} /> HIT
                        </span>
                      )}
                      {isMiss && (
                        <span className="inline-flex items-center gap-1.5 text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-bold text-xs">
                          <XCircle size={14} /> MISS
                        </span>
                      )}
                      {isInvalid && (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold text-xs">
                          <AlertCircle size={14} /> INVALID
                        </span>
                      )}
                      {!acc && <span className="text-dark-secondary text-xs">Belum Dianalisis</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {att.video ? (
                        <button
                          onClick={() => navigate(`/analisis/${session.id}/attempt/${att.id}`)}
                          className="font-bold text-primary hover:text-primary-dark hover:underline inline-flex items-center gap-1 text-xs bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 transition-all"
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

      {/* Grafik Deviasi Sasaran */}
      <Card title="Grafik Deviasi Jarak Sasaran (cm)" subtitle="Target Konsistensi Deviasi ≤ 3.0 cm untuk Atlet Pasca Cedera">
        <AccuracyDistanceChart results={accuracyResultsList} />
      </Card>

      {/* Section 5 Video Cards (Grid Mobile 1 kolom / Desktop 5 kolom) */}
      <div>
        <h3 className="text-xs md:text-sm font-bold text-dark uppercase tracking-wider mb-3 px-1">
          Manajemen 5 Video Percobaan
        </h3>

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