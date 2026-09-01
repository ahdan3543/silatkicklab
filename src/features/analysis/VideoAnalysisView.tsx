import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Activity,
  RotateCcw,
  Zap,
  Ruler,
  AlertTriangle,
  Target as TargetIcon,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';
import { PoseCanvasOverlay } from './PoseCanvasOverlay';
import { TrajectoryOverlay } from './TrajectoryOverlay';
import { TargetOverlay } from './TargetOverlay';
import { VelocityChart } from './VelocityChart';
import { CalibrationModal } from './CalibrationModal';
import { TargetSetupModal } from './TargetSetupModal';
import { AnalysisSession, Athlete, Attempt } from '../../types';
import { FramePose, PoseAnalysisResult, PoseAnalysisStatus } from '../../types/pose';
import { CalibrationData, SpeedAnalysisResult } from '../../types/speed';
import { TargetDefinition, AccuracyAnalysisResult } from '../../types/accuracy';
import { sessionService } from '../../services/sessionService';
import { athleteService } from '../../services/athleteService';
import { videoStorageService } from '../../services/videoStorageService';
import { poseEngine } from '../../services/videoAnalysis/poseEngine';
import { poseStorageService } from '../../services/videoAnalysis/poseStorageService';
import { speedStorageService } from '../../services/speed/speedStorageService';
import { speedCalculationEngine } from '../../services/speed/speedCalculationEngine';
import { accuracyStorageService } from '../../services/accuracy/accuracyStorageService';
import { accuracyCalculationEngine } from '../../services/accuracy/accuracyCalculationEngine';
import { formatDuration, formatFileSize } from '../../utils/formatters';

export const VideoAnalysisView: React.FC = () => {
  const { sessionId, attemptId } = useParams<{ sessionId: string; attemptId: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const abortControllerRef = useRef<boolean>(false);

  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [videoDims, setVideoDims] = useState<{ width: number; height: number }>({ width: 640, height: 360 });

  // Pose Engine States
  const [analysisStatus, setAnalysisStatus] = useState<PoseAnalysisStatus>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [processedFramesCount, setProcessedFramesCount] = useState<number>(0);
  const [totalEstimatedFrames, setTotalEstimatedFrames] = useState<number>(0);
  const [poseResult, setPoseResult] = useState<PoseAnalysisResult | null>(null);
  const [currentFramePose, setCurrentFramePose] = useState<FramePose | null>(null);

  // Speed & Accuracy States
  const [speedResult, setSpeedResult] = useState<SpeedAnalysisResult | null>(null);
  const [target, setTarget] = useState<TargetDefinition | null>(null);
  const [accuracyResult, setAccuracyResult] = useState<AccuracyAnalysisResult | null>(null);

  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isTargetSetupOpen, setIsTargetSetupOpen] = useState<boolean>(false);
  const [currentFrameNum, setCurrentFrameNum] = useState<number>(1);

  // 1. Muat Sesi, Video, Pose, Speed, & Target Data
  useEffect(() => {
    let activeObjectUrl: string | null = null;

    const initData = async () => {
      if (!sessionId || !attemptId) return;
      try {
        setLoading(true);
        const ses = await sessionService.getSessionById(sessionId);
        if (!ses) return;
        setSession(ses);

        const ath = await athleteService.getAthleteById(ses.athleteId);
        if (ath) setAthlete(ath);

        const att = ses.attempts.find((a) => a.id === attemptId);
        if (att && att.video) {
          setAttempt(att);

          const [existingPose, existingSpeed, existingTarget, existingAccuracy, blob] = await Promise.all([
            poseStorageService.getPoseResultByVideoId(att.video.id),
            speedStorageService.getSpeedResultByVideoId(att.video.id),
            accuracyStorageService.getTargetBySessionId(sessionId),
            accuracyStorageService.getAccuracyResultByVideoId(att.video.id),
            videoStorageService.getVideoBlob(att.id),
          ]);

          if (existingPose) {
            setPoseResult(existingPose);
            setAnalysisStatus(existingPose.status);
          }
          if (existingSpeed) setSpeedResult(existingSpeed);
          if (existingTarget) setTarget(existingTarget);
          if (existingAccuracy) setAccuracyResult(existingAccuracy);

          if (blob) {
            activeObjectUrl = URL.createObjectURL(blob);
            setVideoUrl(activeObjectUrl);
          } else if (att.video.fileUrl) {
            setVideoUrl(att.video.fileUrl);
          }
        }
      } catch (err) {
        console.error('Gagal memuat view analisis:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();

    return () => {
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    };
  }, [sessionId, attemptId]);

  // 2. Sinkronisasi Pose Saat Video Diputar
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (poseResult && Array.isArray(poseResult.frames) && poseResult.frames.length > 0) {
      let closest = poseResult.frames[0];
      let minDiff = Math.abs(closest.timestamp - t);
      for (let i = 1; i < poseResult.frames.length; i++) {
        const diff = Math.abs(poseResult.frames[i].timestamp - t);
        if (diff < minDiff) {
          minDiff = diff;
          closest = poseResult.frames[i];
        }
      }
      setCurrentFramePose(closest);
      setCurrentFrameNum(closest.frameNumber || 1);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    setDuration(v.duration || 0);
    setVideoDims({ width: v.videoWidth || 640, height: v.videoHeight || 360 });
  };

  // 3. Eksekusi Analisis Kecepatan & Akurasi
  const triggerSpeedAndAccuracy = async (
    currentPose: PoseAnalysisResult,
    dominantLeg: 'Kanan' | 'Kiri',
    calibration?: CalibrationData,
    customPhases?: { start: number; ext: number; impact: number; rec: number },
    currentTarget?: TargetDefinition | null
  ) => {
    if (!attempt?.video || !sessionId) return;

    // Kalkulasi Kecepatan
    const { trajectory, trackingPoint } = speedCalculationEngine.extractTrajectory(
      currentPose,
      dominantLeg,
      videoDims.width,
      videoDims.height,
      calibration
    );

    const phases = customPhases
      ? {
          startFrame: customPhases.start,
          extensionFrame: customPhases.ext,
          impactFrame: customPhases.impact,
          recoveryFrame: customPhases.rec,
        }
      : speedCalculationEngine.autoDetectPhases(trajectory);

    const speedMetrics = speedCalculationEngine.computeSpeedMetrics(
      trajectory,
      phases.startFrame,
      phases.extensionFrame,
      phases.impactFrame,
      phases.recoveryFrame,
      calibration,
      customPhases ? 'manual-corrected' : 'automatic'
    );

    const fullSpeedResult: SpeedAnalysisResult = {
      ...speedMetrics,
      id: `speed-${Date.now()}`,
      videoId: attempt.video.id,
      attemptId: attempt.id,
      trackingPoint,
      createdAt: new Date().toISOString(),
    };

    await speedStorageService.saveSpeedResult(fullSpeedResult);
    setSpeedResult(fullSpeedResult);

    // Kalkulasi Akurasi
    const activeTarget = currentTarget !== undefined ? currentTarget : target;
    if (activeTarget) {
      const acc = accuracyCalculationEngine.evaluateAttemptAccuracy(
        attempt.video.id,
        attempt.id,
        sessionId,
        currentPose,
        phases.impactFrame,
        dominantLeg,
        activeTarget,
        videoDims.width,
        videoDims.height,
        calibration
      );
      await accuracyStorageService.saveAccuracyResult(acc);
      setAccuracyResult(acc);
    }
  };

  const runVideoPoseAnalysis = async () => {
    if (!videoRef.current || !attempt?.video) return;
    const video = videoRef.current;
    abortControllerRef.current = false;

    try {
      setAnalysisStatus('loading_model');
      const landmarker = await poseEngine.initEngine();

      setAnalysisStatus('processing');
      video.pause();
      setIsPlaying(false);

      const fps = 30;
      const videoDuration = video.duration || attempt.video.durationSeconds || 1;
      const frameInterval = 1 / fps;
      const totalFrames = Math.max(1, Math.floor(videoDuration * fps));
      setTotalEstimatedFrames(totalFrames);

      const extractedFrames: FramePose[] = [];
      let validPoseCount = 0;
      let sumConfidence = 0;

      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        if (abortControllerRef.current) {
          setAnalysisStatus('cancelled');
          return;
        }

        const seekTargetTime = frameIdx * frameInterval;
        video.currentTime = seekTargetTime;

        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        const framePose = poseEngine.detectFrame(landmarker, video, seekTargetTime * 1000, frameIdx + 1);
        extractedFrames.push(framePose);

        if (framePose.detected) {
          validPoseCount++;
          sumConfidence += framePose.confidence;
        }

        setProcessedFramesCount(frameIdx + 1);
        setProgressPercent(Math.round(((frameIdx + 1) / totalFrames) * 100));
        setCurrentFramePose(framePose);
      }

      const finalPoseResult: PoseAnalysisResult = {
        id: `pose-${Date.now()}`,
        videoId: attempt.video.id,
        attemptId: attempt.id,
        status: 'completed',
        fps,
        fpsSource: 'estimated',
        durationSeconds: videoDuration,
        totalFrames,
        processedFrames: extractedFrames.length,
        framesWithPoseCount: validPoseCount,
        avgConfidence: validPoseCount > 0 ? sumConfidence / validPoseCount : 0,
        frames: extractedFrames,
        createdAt: new Date().toISOString(),
      };

      await poseStorageService.savePoseResult(finalPoseResult);
      setPoseResult(finalPoseResult);
      setAnalysisStatus('completed');

      triggerSpeedAndAccuracy(finalPoseResult, athlete?.dominantLeg || 'Kanan');
      video.currentTime = 0;
    } catch (err) {
      console.error('Eksekusi gagal:', err);
      setAnalysisStatus('failed');
    }
  };

  const handleSaveTarget = async (newTarget: TargetDefinition) => {
    setTarget(newTarget);
    await accuracyStorageService.saveTarget(newTarget);
    if (poseResult && speedResult) {
      triggerSpeedAndAccuracy(
        poseResult,
        athlete?.dominantLeg || 'Kanan',
        speedResult.calibration,
        {
          start: speedResult.kickStartFrame,
          ext: speedResult.extensionStartFrame,
          impact: speedResult.impactFrame,
          rec: speedResult.recoveryFrame,
        },
        newTarget
      );
    }
  };

  const handlePhaseChange = (field: 'start' | 'ext' | 'impact' | 'rec', frameValue: number) => {
    if (!poseResult || !speedResult) return;
    const curStart = field === 'start' ? frameValue : speedResult.kickStartFrame || 1;
    const curExt = field === 'ext' ? frameValue : speedResult.extensionStartFrame || 1;
    const curImpact = field === 'impact' ? frameValue : speedResult.impactFrame || 1;
    const curRec = field === 'rec' ? frameValue : speedResult.recoveryFrame || 1;

    triggerSpeedAndAccuracy(poseResult, athlete?.dominantLeg || 'Kanan', speedResult.calibration, {
      start: curStart,
      ext: curExt,
      impact: curImpact,
      rec: curRec,
    });
  };

  const handleToggleManualOverride = async () => {
    if (!accuracyResult) return;
    const nextOverride = accuracyResult.finalResult === 'hit' ? 'miss' : 'hit';
    const updated: AccuracyAnalysisResult = {
      ...accuracyResult,
      manualOverride: nextOverride,
      finalResult: nextOverride,
      evaluationMethod: 'manual-corrected',
    };
    await accuracyStorageService.saveAccuracyResult(updated);
    setAccuracyResult(updated);
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const handleFrameStep = (direction: 'prev' | 'next') => {
    if (!videoRef.current) return;
    const step = 1 / 30;
    const nextTime = direction === 'next' ? Math.min(duration, currentTime + step) : Math.max(0, currentTime - step);
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  if (loading) {
    return <LoadingState message="Memuat modul analisis tendangan..." />;
  }

  if (!session || !attempt || !attempt.video) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-dark-secondary text-sm">Data video percobaan tidak ditemukan.</p>
        <Button onClick={() => navigate(`/analisis/${sessionId || ''}`)}>Kembali ke Detail Sesi</Button>
      </div>
    );
  }

  const isAtImpactFrame = currentFrameNum === (speedResult?.impactFrame || 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/analisis/${sessionId}`)}
            className="p-2 rounded-lg bg-white border border-dark-border text-dark-secondary hover:text-dark hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-dark">
                Analisis Akurasi & Kecepatan — Percobaan #{attempt.attemptNumber}
              </h2>
              {accuracyResult && (
                <Badge variant={accuracyResult.finalResult === 'hit' ? 'success' : accuracyResult.finalResult === 'miss' ? 'primary' : 'neutral'}>
                  {accuracyResult.finalResult === 'hit' ? 'TARGET HIT' : accuracyResult.finalResult === 'miss' ? 'TARGET MISS' : 'INVALID'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-dark-secondary">
              Sesi: {session.sessionCode} • Atlet: {athlete?.name || session.athleteName} (Kaki: {athlete?.dominantLeg || session.kickingLeg})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<TargetIcon size={15} />} onClick={() => setIsTargetSetupOpen(true)}>
            {target ? 'Ubah Posisi Target' : 'Atur Target Sasaran'}
          </Button>
          <Button variant="outline" icon={<Ruler size={15} />} onClick={() => setIsCalibrationOpen(true)}>
            Kalibrasi Skala
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Video & Canvas (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-4 bg-slate-950 border-slate-900 overflow-hidden">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    playsInline
                    preload="auto"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full h-full object-contain"
                  />
                  <PoseCanvasOverlay
                    currentFramePose={currentFramePose}
                    videoWidth={videoDims.width}
                    videoHeight={videoDims.height}
                  />
                  <TargetOverlay
                    target={target}
                    accuracyResult={accuracyResult}
                    videoWidth={videoDims.width}
                    videoHeight={videoDims.height}
                    isImpactFrame={isAtImpactFrame}
                  />
                </>
              ) : (
                <div className="text-slate-500 text-xs">Video tidak dapat dimuat</div>
              )}

              {analysisStatus === 'processing' && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center text-white">
                  <Activity size={36} className="text-accent animate-pulse mb-3" />
                  <h4 className="text-sm font-bold">Menganalisis Gerak Biomekanika...</h4>
                  <p className="text-xs text-slate-300 mt-1 mb-4">
                    Frame: {processedFramesCount} / {totalEstimatedFrames} ({progressPercent}%)
                  </p>
                  <div className="w-64 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-white space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-400">{formatDuration(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={analysisStatus === 'processing'}
                  className="flex-1 accent-accent h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] font-mono text-slate-400">{formatDuration(duration)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePlay}
                    disabled={analysisStatus === 'processing'}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    onClick={() => handleFrameStep('prev')}
                    disabled={analysisStatus === 'processing' || isPlaying}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors text-xs flex items-center gap-1"
                  >
                    <ChevronLeft size={14} /> Frame
                  </button>
                  <button
                    onClick={() => handleFrameStep('next')}
                    disabled={analysisStatus === 'processing' || isPlaying}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors text-xs flex items-center gap-1"
                  >
                    Frame <ChevronRight size={14} />
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Frame #{currentFrameNum} / {poseResult?.totalFrames || '-'} {isAtImpactFrame ? '● IMPACT FRAME' : ''}
                </div>
              </div>
            </div>
          </Card>

          {/* Grafik Kecepatan */}
          {speedResult && Array.isArray(speedResult.trajectory) && speedResult.trajectory.length > 0 && (
            <VelocityChart
              trajectory={speedResult.trajectory}
              kickStartFrame={speedResult.kickStartFrame || 1}
              impactFrame={speedResult.impactFrame || 1}
              isCalibrated={Boolean(speedResult.calibrationAvailable)}
              unit={speedResult.calibrationAvailable ? 'm/s' : 'px/s'}
            />
          )}
        </div>

        {/* Kolom Kanan: Panel Akurasi & Fase (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card Hasil Akurasi */}
          <Card title="Evaluasi Akurasi Sasaran" subtitle="Perbandingan Titik Impak vs Target Center">
            {accuracyResult && target ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border text-white shadow-subtle ${
                    accuracyResult.finalResult === 'hit'
                      ? 'bg-gradient-to-r from-emerald-800 to-emerald-600 border-emerald-500'
                      : 'bg-gradient-to-r from-primary-dark to-primary border-primary-light'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider uppercase opacity-90">
                      Status Evaluasi Akurasi
                    </span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">
                      {accuracyResult.evaluationMethod === 'manual-corrected' ? 'Manual Override' : 'Otomatis'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    {accuracyResult.finalResult === 'hit' ? (
                      <CheckCircle2 size={32} className="text-emerald-300" />
                    ) : (
                      <XCircle size={32} className="text-amber-300" />
                    )}
                    <div>
                      <h3 className="text-2xl font-bold">
                        {accuracyResult.finalResult === 'hit' ? 'SASARAN TEPAT (HIT)' : 'SASARAN MELESET (MISS)'}
                      </h3>
                      <p className="text-xs opacity-90 mt-0.5">
                        Deviasi dari pusat sasaran: <b>{accuracyResult.distanceCentimeters !== null ? `${accuracyResult.distanceCentimeters.toFixed(1)} cm` : `${accuracyResult.distancePixels?.toFixed(1)} px`}</b>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-dark-border rounded-lg">
                    <span className="text-dark-secondary block">Jarak Deviasi Impak</span>
                    <span className="text-base font-bold text-dark font-mono mt-0.5 block">
                      {accuracyResult.distanceCentimeters !== null
                        ? `${accuracyResult.distanceCentimeters.toFixed(1)} cm`
                        : `${accuracyResult.distancePixels?.toFixed(1)} px`}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-dark-border rounded-lg">
                    <span className="text-dark-secondary block">Batas Radius Sasaran</span>
                    <span className="text-base font-bold text-dark font-mono mt-0.5 block">
                      {(target.radiusNormalized * 100).toFixed(1)}% Frame
                    </span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleToggleManualOverride}>
                  Ubah Hasil Evaluasi ({accuracyResult.finalResult === 'hit' ? 'Jadikan MISS' : 'Jadikan HIT'})
                </Button>
              </div>
            ) : (
              <div className="p-6 border border-dashed border-dark-border rounded-lg text-center text-xs text-dark-secondary space-y-2">
                <p>Target sasaran belum ditentukan untuk sesi ini.</p>
                <Button size="sm" icon={<TargetIcon size={14} />} onClick={() => setIsTargetSetupOpen(true)}>
                  Atur Target Sekarang
                </Button>
              </div>
            )}
          </Card>

          {/* Card Deteksi & Koreksi Fase */}
          {speedResult && (
            <Card title="Koreksi Fase Tendangan" subtitle="Perubahan Impact Frame otomatis mengupdate Akurasi">
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-dark">Kick Start (Frame {speedResult.kickStartFrame || 1})</span>
                    <span className="font-mono text-dark-secondary">{formatDuration(speedResult.kickStartTimestamp || 0)}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, (speedResult.impactFrame || 2) - 1)}
                    value={speedResult.kickStartFrame || 1}
                    onChange={(e) => handlePhaseChange('start', parseInt(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-accent-dark">Estimated Impact (Frame {speedResult.impactFrame || 1})</span>
                    <span className="font-mono text-dark-secondary">{formatDuration(speedResult.impactTimestamp || 0)}</span>
                  </div>
                  <input
                    type="range"
                    min={(speedResult.kickStartFrame || 1) + 1}
                    max={poseResult?.totalFrames || 100}
                    value={speedResult.impactFrame || 1}
                    onChange={(e) => handlePhaseChange('impact', parseInt(e.target.value))}
                    className="w-full accent-accent h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </Card>
          )}

          <Button
            className="w-full"
            icon={poseResult ? <RotateCcw size={15} /> : <Zap size={15} />}
            onClick={runVideoPoseAnalysis}
            disabled={analysisStatus === 'processing'}
          >
            {poseResult ? 'Hitung Ulang Analisis Lengkap' : 'Mulai Analisis Video'}
          </Button>
        </div>
      </div>

      {/* Modals */}
      <TargetSetupModal
        isOpen={isTargetSetupOpen}
        onClose={() => setIsTargetSetupOpen(false)}
        sessionId={sessionId || ''}
        videoElement={videoRef.current}
        videoWidth={videoDims.width}
        videoHeight={videoDims.height}
        onSaveTarget={handleSaveTarget}
        existingTarget={target}
      />

      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        videoElement={videoRef.current}
        videoWidth={videoDims.width}
        videoHeight={videoDims.height}
        onSaveCalibration={(calib) => {
          if (poseResult && speedResult) {
            triggerSpeedAndAccuracy(poseResult, athlete?.dominantLeg || 'Kanan', calib, {
              start: speedResult.kickStartFrame,
              ext: speedResult.extensionStartFrame,
              impact: speedResult.impactFrame,
              rec: speedResult.recoveryFrame,
            });
          }
        }}
        existingCalibration={speedResult?.calibration}
      />
    </div>
  );
};