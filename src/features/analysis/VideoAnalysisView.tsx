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
  Target as TargetIcon,
  CheckCircle2,
  XCircle,
  Maximize2,
  Minimize2,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  TrendingUp,
  ZoomIn,
  ZoomOut,
  RotateCcw as ResetIcon,
  Move,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { PoseCanvasOverlay } from './PoseCanvasOverlay';
import { Pose3DOverlay } from './Pose3DOverlay';
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
import { formatDuration } from '../../utils/formatters';

export const VideoAnalysisView: React.FC = () => {
  const { sessionId, attemptId } = useParams<{ sessionId: string; attemptId: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const abortControllerRef = useRef<boolean>(false);
  const viewportRef = useRef<HTMLDivElement>(null);

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
  const [isExpandedView, setIsExpandedView] = useState<boolean>(false);

  // Zoom & Pan Lab States
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);

  // Accordion States
  const [isPhaseCorrectionOpen, setIsPhaseCorrectionOpen] = useState<boolean>(true);
  const [isChartOpen, setIsChartOpen] = useState<boolean>(true);

  // Visual Layer Controls
  const [showVideo, setShowVideo] = useState<boolean>(true);
  const [show3DMannequin, setShow3DMannequin] = useState<boolean>(true);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);

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
        console.error('Gagal memuat modul analisis:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();

    return () => {
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    };
  }, [sessionId, attemptId]);

  // 2. Sinkronisasi Pose
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

  // 3. Zoom & Pan Logic
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.3, 4));
  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.3, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel((prev) => Math.min(prev + 0.15, 4));
    } else {
      setZoomLevel((prev) => {
        const next = Math.max(prev - 0.15, 1);
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchDistanceRef.current;
      setZoomLevel((prev) => Math.min(Math.max(prev * factor, 1), 4));
      touchDistanceRef.current = dist;
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      setPanOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
    setIsDragging(false);
  };

  // 4. Eksekusi Analisis Kecepatan & Akurasi
  const triggerSpeedAndAccuracy = async (
    currentPose: PoseAnalysisResult,
    dominantLeg: 'Kanan' | 'Kiri',
    calibration?: CalibrationData,
    customPhases?: { start: number; ext: number; impact: number; rec: number },
    currentTarget?: TargetDefinition | null
  ) => {
    if (!attempt?.video || !sessionId) return;

    const activeTarget = currentTarget !== undefined ? currentTarget : target;
    const activeCalibration = calibration || speedResult?.calibration || undefined;

    const { trajectory, trackingPoint } = speedCalculationEngine.extractTrajectory(
      currentPose,
      dominantLeg,
      videoDims.width,
      videoDims.height,
      activeCalibration
    );

    let phases = customPhases
      ? {
          startFrame: customPhases.start,
          extensionFrame: customPhases.ext,
          impactFrame: customPhases.impact,
          recoveryFrame: customPhases.rec,
        }
      : speedCalculationEngine.autoDetectPhases(trajectory);

    const totalF = currentPose.totalFrames || 30;
    if (phases.startFrame >= phases.impactFrame) {
      phases = {
        startFrame: Math.max(1, Math.floor(totalF * 0.2)),
        extensionFrame: Math.floor(totalF * 0.45),
        impactFrame: Math.floor(totalF * 0.6),
        recoveryFrame: Math.min(totalF, Math.floor(totalF * 0.85)),
      };
    }

    const speedMetrics = speedCalculationEngine.computeSpeedMetrics(
      trajectory,
      phases.startFrame,
      phases.extensionFrame,
      phases.impactFrame,
      phases.recoveryFrame,
      activeCalibration,
      customPhases ? 'manual-corrected' : 'automatic'
    );

    const fullSpeedResult: SpeedAnalysisResult = {
      ...speedMetrics,
      id: `speed-${Date.now()}`,
      videoId: attempt.video.id,
      attemptId: attempt.id,
      trackingPoint,
      calibration: activeCalibration,
      calibrationAvailable: Boolean(activeCalibration),
      createdAt: new Date().toISOString(),
    };

    await speedStorageService.saveSpeedResult(fullSpeedResult);
    setSpeedResult(fullSpeedResult);

    if (activeTarget) {
      const calculatedAccuracy = accuracyCalculationEngine.calculateAccuracy(
        activeTarget,
        currentPose,
        fullSpeedResult,
        phases.impactFrame,
        activeCalibration,
        videoDims.width,
        videoDims.height,
        dominantLeg
      );

      if (customPhases) {
        calculatedAccuracy.evaluationMethod = 'manual-corrected';
      }

      await accuracyStorageService.saveAccuracyResult(calculatedAccuracy);
      setAccuracyResult(calculatedAccuracy);
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

      const existingCalib = speedResult?.calibration || (await speedStorageService.getSpeedResultByVideoId(attempt.video.id).then((r) => r?.calibration));

      await triggerSpeedAndAccuracy(
        finalPoseResult,
        athlete?.dominantLeg || 'Kanan',
        existingCalib || undefined
      );
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
      await triggerSpeedAndAccuracy(
        poseResult,
        athlete?.dominantLeg || 'Kanan',
        speedResult.calibration || undefined,
        {
          start: speedResult.kickStartFrame || 1,
          ext: speedResult.extensionStartFrame || 1,
          impact: speedResult.impactFrame,
          rec: speedResult.recoveryFrame || 1,
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

    triggerSpeedAndAccuracy(poseResult, athlete?.dominantLeg || 'Kanan', speedResult.calibration || undefined, {
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
      isManualCorrected: true,
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

  const handleJumpToFrame = (frameNum?: number) => {
    if (!videoRef.current || !frameNum) return;
    const t = (frameNum - 1) / 30;
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  // Helper 1: Kecepatan Puncak
  const renderPeakSpeedValue = () => {
    if (!speedResult) return '-';
    const msValue = (speedResult as any)?.peakSpeedMetersPerSecond ?? (speedResult as any)?.maxSpeed;
    if (msValue !== undefined && msValue !== null && !isNaN(Number(msValue)) && Number(msValue) > 0) {
      return `${Number(msValue).toFixed(1)} m/s`;
    }
    const pxValue = (speedResult as any)?.peakSpeedPixelsPerSecond;
    if (pxValue !== undefined && pxValue !== null && !isNaN(Number(pxValue))) {
      return `${Number(pxValue).toFixed(0)} px/s`;
    }
    return '-';
  };

  // Helper 2: Durasi Siklus Tendangan
  const renderKickDurationValue = () => {
    if (!speedResult) return '-';
    const fps = poseResult?.fps || 30;
    if (speedResult.recoveryFrame && speedResult.kickStartFrame && speedResult.recoveryFrame > speedResult.kickStartFrame) {
      return `${((speedResult.recoveryFrame - speedResult.kickStartFrame) / fps).toFixed(2)} s`;
    }
    if (speedResult.impactFrame && speedResult.kickStartFrame && speedResult.impactFrame > speedResult.kickStartFrame) {
      return `${((speedResult.impactFrame - speedResult.kickStartFrame) / fps).toFixed(2)} s`;
    }
    return '-';
  };

  if (loading) {
    return <LoadingState message="Memuat modul analisis..." />;
  }

  if (!session || !attempt || !attempt.video) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-slate-500 text-sm">Data video percobaan tidak ditemukan.</p>
        <Button onClick={() => navigate(`/analisis/${sessionId || ''}`)}>Kembali ke Detail Sesi</Button>
      </div>
    );
  }

  const hasValidPhases =
    speedResult?.kickStartFrame !== undefined &&
    speedResult?.impactFrame !== undefined &&
    speedResult.impactFrame > speedResult.kickStartFrame;

  const isAtStartFrame = hasValidPhases && currentFrameNum === speedResult?.kickStartFrame;
  const isAtImpactFrame = hasValidPhases && currentFrameNum === speedResult?.impactFrame;
  const isAtRecoveryFrame = hasValidPhases && currentFrameNum === speedResult?.recoveryFrame;

  // Sub-komponen Player & Kontrol (Mendukung Zoom & Pan)
  const renderVideoPlayerBlock = (isFullScreenMode: boolean = false) => (
    <div className={`space-y-2 select-none ${isFullScreenMode ? 'h-full flex flex-col justify-between' : ''}`}>
      {/* Area Kanvas Video yang dapat di-Zoom dan di-Pan */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-inner ${
          isFullScreenMode ? 'flex-1 w-full' : 'aspect-video'
        } ${zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      >
        {videoUrl ? (
          <div
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="w-full h-full relative flex items-center justify-center"
          >
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              className={`w-full h-full object-contain pointer-events-none ${
                showVideo ? 'opacity-100' : 'opacity-0'
              }`}
            />

            <Pose3DOverlay
              currentFramePose={currentFramePose}
              videoWidth={videoDims.width}
              videoHeight={videoDims.height}
              isImpactFrame={isAtImpactFrame}
              kickingLeg={session.kickingLeg}
              showMannequin={show3DMannequin}
            />

            {showSkeleton && (
              <PoseCanvasOverlay
                currentFramePose={currentFramePose}
                videoWidth={videoDims.width}
                videoHeight={videoDims.height}
              />
            )}

            <TargetOverlay
              target={target}
              accuracyResult={accuracyResult}
              videoWidth={videoDims.width}
              videoHeight={videoDims.height}
              isImpactFrame={isAtImpactFrame}
            />
          </div>
        ) : (
          <div className="text-slate-500 text-xs">Video tidak dapat dimuat</div>
        )}

        {/* Toolbar Zoom & Reset di Pojok Kiri Bawah Player */}
        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-white text-xs">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <span className="font-mono text-[10px] w-10 text-center font-bold">
            {(zoomLevel * 100).toFixed(0)}%
          </span>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          {zoomLevel > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 ml-1 hover:bg-white/20 rounded transition-colors text-amber-300"
              title="Reset Zoom"
            >
              <ResetIcon size={12} />
            </button>
          )}
        </div>

        {/* Floating Layer Controls di Kanan Atas */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-1.5 py-1 rounded-lg border border-white/10 z-30">
          <button
            type="button"
            onClick={() => setShowVideo(!showVideo)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              showVideo ? 'bg-white/25 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            Vid
          </button>
          <button
            type="button"
            onClick={() => setShow3DMannequin(!show3DMannequin)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors flex items-center gap-0.5 ${
              show3DMannequin ? 'bg-[#800000] text-amber-300' : 'text-white/50 hover:text-white'
            }`}
          >
            <Layers size={10} /> 3D
          </button>
          <button
            type="button"
            onClick={() => setShowSkeleton(!showSkeleton)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              showSkeleton ? 'bg-emerald-600/60 text-emerald-200' : 'text-white/50 hover:text-white'
            }`}
          >
            2D
          </button>
        </div>

        {/* Label Status Titik Gerak Melayang */}
        <div className="absolute top-2 left-2 z-30 flex items-center gap-1">
          {isAtStartFrame && (
            <span className="bg-sky-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-sky-400">
              ▶ START (KICK OFF)
            </span>
          )}
          {isAtImpactFrame && (
            <span className="bg-amber-500/90 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-sm border border-amber-300">
              ⚡ IMPAK SASARAN
            </span>
          )}
          {isAtRecoveryFrame && (
            <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-emerald-400">
              ✔ RECOVERY (KEMBALI)
            </span>
          )}
        </div>

        {analysisStatus === 'processing' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center text-white">
            <Activity size={32} className="text-accent animate-pulse mb-2" />
            <h4 className="text-xs sm:text-sm font-bold">Menganalisis Biomekanika...</h4>
            <p className="text-[11px] text-slate-300 mt-1 mb-3 font-mono">
              Frame {processedFramesCount} / {totalEstimatedFrames} ({progressPercent}%)
            </p>
            <div className="w-48 sm:w-64 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Kontrol Pemutar Bawah */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800 text-white space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            {formatDuration(currentTime)}
          </span>
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
          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            {formatDuration(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={handleTogglePlay}
              disabled={analysisStatus === 'processing'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              aria-label={isPlaying ? 'Jeda' : 'Putar'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => handleFrameStep('prev')}
              disabled={analysisStatus === 'processing' || isPlaying}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors text-[11px] flex items-center gap-0.5"
            >
              <ChevronLeft size={13} /> Frame
            </button>
            <button
              onClick={() => handleFrameStep('next')}
              disabled={analysisStatus === 'processing' || isPlaying}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors text-[11px] flex items-center gap-0.5"
            >
              Frame <ChevronRight size={13} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {hasValidPhases && speedResult?.kickStartFrame && (
              <button
                type="button"
                onClick={() => handleJumpToFrame(speedResult.kickStartFrame)}
                className="text-[10px] font-mono bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/40 px-2 py-1 rounded transition-colors"
              >
                Start: #{speedResult.kickStartFrame}
              </button>
            )}

            {hasValidPhases && speedResult?.impactFrame && (
              <button
                type="button"
                onClick={() => handleJumpToFrame(speedResult.impactFrame)}
                className="text-[10px] font-mono bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 px-2 py-1 rounded transition-colors"
              >
                Impak: #{speedResult.impactFrame}
              </button>
            )}

            {hasValidPhases && speedResult?.recoveryFrame && (
              <button
                type="button"
                onClick={() => handleJumpToFrame(speedResult.recoveryFrame)}
                className="text-[10px] font-mono bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded transition-colors"
              >
                Kembali: #{speedResult.recoveryFrame}
              </button>
            )}

            <div className="text-[10px] text-slate-300 font-mono bg-slate-800/80 px-2 py-1 rounded ml-1">
              #{currentFrameNum}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsExpandedView(!isExpandedView);
                handleResetZoom();
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={isExpandedView ? 'Perkecil' : 'Layar Penuh Lab'}
            >
              {isExpandedView ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-3 sm:space-y-4 pb-20 md:pb-8 px-2 sm:px-6">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate(`/analisis/${sessionId}`)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-bold text-slate-900 truncate">
              Percobaan #{attempt.attemptNumber}
              <span className="hidden sm:inline font-normal text-slate-500 ml-1.5">
                • {athlete?.name || session.athleteName}
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 truncate sm:hidden">
              {athlete?.name || session.athleteName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[11px]"
            icon={<TargetIcon size={13} />}
            onClick={() => setIsTargetSetupOpen(true)}
          >
            <span className="hidden sm:inline">Atur</span> Target
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[11px]"
            icon={<Ruler size={13} />}
            onClick={() => setIsCalibrationOpen(true)}
          >
            Kalibrasi
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5">
        {/* Sisi Kiri: Video Workspace */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-slate-950 p-1.5 sm:p-3 rounded-2xl border border-slate-900 shadow-sm">
            {renderVideoPlayerBlock(false)}
          </div>
        </div>

        {/* Sisi Kanan: Panel Hasil & Koreksi */}
        <div className="lg:col-span-5 space-y-3">
          {/* Card Hasil Evaluasi Utama */}
          {accuracyResult && target ? (
            <div
              className={`p-4 rounded-2xl border text-white shadow-subtle relative overflow-hidden ${
                accuracyResult.finalResult === 'hit'
                  ? 'bg-gradient-to-br from-emerald-800 to-emerald-600 border-emerald-500/80'
                  : 'bg-gradient-to-br from-rose-900 to-rose-700 border-rose-600/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {accuracyResult.finalResult === 'hit' ? (
                    <CheckCircle2 size={32} className="text-emerald-200 shrink-0" />
                  ) : (
                    <XCircle size={32} className="text-rose-200 shrink-0" />
                  )}
                  <div>
                    <span className="text-[10px] tracking-wider uppercase opacity-80 font-mono block">
                      Hasil Evaluasi
                    </span>
                    <h2 className="text-lg sm:text-2xl font-black tracking-tight">
                      {accuracyResult.finalResult === 'hit' ? 'SASARAN TEPAT (HIT)' : 'SASARAN MELESET (MISS)'}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleManualOverride}
                  className="text-[10px] bg-black/25 hover:bg-black/40 px-2 py-1 rounded-md transition-colors border border-white/20 shrink-0"
                >
                  Ubah: {accuracyResult.finalResult === 'hit' ? 'MISS' : 'HIT'}
                </button>
              </div>

              {/* 3 Parameter Kunci */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/15">
                <div>
                  <span className="text-[10px] opacity-80 block truncate">Deviasi</span>
                  <span className="text-base sm:text-xl font-black font-mono tracking-tight block">
                    {accuracyResult.distanceCentimeters !== null && accuracyResult.distanceCentimeters !== undefined
                      ? `${accuracyResult.distanceCentimeters.toFixed(1)} cm`
                      : `${accuracyResult.distancePixels?.toFixed(1)} px`}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] opacity-80 block truncate">Kecepatan Puncak</span>
                  <span className="text-base sm:text-xl font-black font-mono tracking-tight text-amber-200 block">
                    {renderPeakSpeedValue()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] opacity-80 block truncate">Durasi Tendangan</span>
                  <span className="text-base sm:text-xl font-black font-mono tracking-tight text-sky-200 block">
                    {renderKickDurationValue()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 border border-dashed border-slate-300 bg-white rounded-2xl text-center text-xs text-slate-500 space-y-2">
              <p>Target sasaran belum ditentukan untuk sesi ini.</p>
              <Button size="sm" icon={<TargetIcon size={14} />} onClick={() => setIsTargetSetupOpen(true)}>
                Atur Sasaran Sekarang
              </Button>
            </div>
          )}

          {/* Tombol Analisis Utama */}
          <Button
            className="w-full h-11 text-xs font-semibold shadow-sm"
            icon={poseResult ? <RotateCcw size={14} /> : <Zap size={14} />}
            onClick={runVideoPoseAnalysis}
            disabled={analysisStatus === 'processing'}
          >
            {poseResult ? 'Hitung Ulang Analisis Lengkap' : 'Mulai Analisis Video'}
          </Button>

          {/* Accordion 1: Koreksi Fase Tendangan Interaktif */}
          {speedResult && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setIsPhaseCorrectionOpen(!isPhaseCorrectionOpen)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders size={14} className="text-slate-500" />
                  Koreksi Titik Fase Gerak
                </span>
                {isPhaseCorrectionOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {isPhaseCorrectionOpen && (
                <div className="p-3.5 pt-1 space-y-3 text-xs border-t border-slate-100">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-sky-600">
                        1. Awal Angkat Kaki (Frame {speedResult.kickStartFrame || 1})
                      </span>
                      <span className="font-mono text-slate-700">{formatDuration(speedResult.kickStartTimestamp || 0)}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(1, (speedResult.impactFrame || 2) - 1)}
                      value={speedResult.kickStartFrame || 1}
                      onChange={(e) => handlePhaseChange('start', parseInt(e.target.value))}
                      className="w-full accent-sky-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-amber-700">
                        2. Benturan Sasaran (Frame {speedResult.impactFrame || 1})
                      </span>
                      <span className="font-mono text-slate-700">{formatDuration(speedResult.impactTimestamp || 0)}</span>
                    </div>
                    <input
                      type="range"
                      min={(speedResult.kickStartFrame || 1) + 1}
                      max={Math.max((speedResult.kickStartFrame || 1) + 2, (speedResult.recoveryFrame || 100) - 1)}
                      value={speedResult.impactFrame || 1}
                      onChange={(e) => handlePhaseChange('impact', parseInt(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-emerald-700">
                        3. Kembali Posisi Awal (Frame {speedResult.recoveryFrame || (speedResult.impactFrame || 1) + 10})
                      </span>
                      <span className="font-mono text-slate-700">
                        {formatDuration(speedResult.recoveryTimestamp || ((speedResult.recoveryFrame || 1) / 30))}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={(speedResult.impactFrame || 1) + 1}
                      max={poseResult?.totalFrames || 100}
                      value={speedResult.recoveryFrame || (speedResult.impactFrame || 1) + 10}
                      onChange={(e) => handlePhaseChange('rec', parseInt(e.target.value))}
                      className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accordion 2: Kurva Kecepatan Tendangan */}
          {speedResult && Array.isArray(speedResult.trajectory) && speedResult.trajectory.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setIsChartOpen(!isChartOpen)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-slate-500" />
                  Kurva Kecepatan Tendangan
                </span>
                {isChartOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {isChartOpen && (
                <div className="p-2 pt-0 border-t border-slate-100">
                  <VelocityChart
                    trajectory={speedResult.trajectory}
                    kickStartFrame={speedResult.kickStartFrame || 1}
                    impactFrame={speedResult.impactFrame || 1}
                    isCalibrated={Boolean(speedResult.calibrationAvailable)}
                    unit={speedResult.calibrationAvailable ? 'm/s' : 'px/s'}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL FULL-WINDOW LAB MODE (Bener-bener 100vw, 100vh se-layar penuh) */}
      {isExpandedView && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col justify-between w-screen h-screen overflow-hidden p-2 sm:p-4 animate-fadeIn">
          {/* Top Bar Lab */}
          <div className="flex items-center justify-between text-white pb-2 px-1 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-amber-300 flex items-center gap-1.5">
                <Move size={14} /> MODE LAB BIOMEKANIKA (FULLSCREEN)
              </span>
              <span className="hidden sm:inline text-xs text-slate-400">
                • Percobaan #{attempt.attemptNumber}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Gunakan scroll / pinch untuk Zoom, drag kursor untuk Pan
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsExpandedView(false);
                  handleResetZoom();
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs"
              >
                <X size={15} />
                <span className="hidden sm:inline">Tutup</span>
              </button>
            </div>
          </div>

          {/* Area Player Penuh */}
          <div className="flex-1 w-full my-2 overflow-hidden flex items-center justify-center">
            {renderVideoPlayerBlock(true)}
          </div>
        </div>
      )}

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
              start: speedResult.kickStartFrame || 1,
              ext: speedResult.extensionStartFrame || 1,
              impact: speedResult.impactFrame,
              rec: speedResult.recoveryFrame || 1,
            });
          }
        }}
        existingCalibration={speedResult?.calibration || undefined}
      />
    </div>
  );
};