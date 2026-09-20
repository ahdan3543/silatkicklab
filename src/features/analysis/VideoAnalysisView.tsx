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
  Box,
  Video as VideoCamIcon,
  ChevronDown,
  ChevronUp,
  Sliders,
  TrendingUp,
  ZoomIn,
  ZoomOut,
  RotateCcw as ResetIcon,
  Move,
  Orbit,
  RotateCw,
  Gauge,
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

  // Fitur Slow-Motion (Visual Playback Speed)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Mode Tampilan: 'video' (Video asli + 2D) atau '3d' (Manekin 3D + Black Canvas)
  const [viewMode, setViewMode] = useState<'video' | '3d'>('video');
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);

  // Zoom, Pan, & 3D Interactive States
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [interactionMode, setInteractionMode] = useState<'3d-orbit' | 'pan-zoom'>('3d-orbit');
  const [modelRotationY, setModelRotationY] = useState<number>(0);
  const touchDistanceRef = useRef<number | null>(null);

  // Accordion States
  const [isPhaseCorrectionOpen, setIsPhaseCorrectionOpen] = useState<boolean>(true);
  const [isChartOpen, setIsChartOpen] = useState<boolean>(true);

  // Pose Engine States (60 FPS)
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

  const activeFps = poseResult?.fps || 60;

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
      if (screen.orientation && 'unlock' in screen.orientation) {
        try {
          screen.orientation.unlock();
        } catch {}
      }
    };
  }, [sessionId, attemptId]);

  // 2. Sinkronisasi Pose & Playback Rate
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
        } else if (diff > minDiff && poseResult.frames[i].timestamp > t) {
          break;
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
    v.playbackRate = playbackSpeed;
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackSpeed(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // 3. Masuk dan Keluar Fullscreen + Lock Landscape di Smartphone
  const handleOpenFullscreenLandscape = async () => {
    setIsExpandedView(true);
    handleResetZoom();

    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if ((docEl as any).webkitRequestFullscreen) {
        await (docEl as any).webkitRequestFullscreen();
      }

      if (screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch (err) {
      console.log('Fullscreen landscape error:', err);
    }
  };

  const handleCloseFullscreen = async () => {
    setIsExpandedView(false);
    handleResetZoom();

    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }

      if (screen.orientation && 'unlock' in screen.orientation) {
        screen.orientation.unlock();
      }
    } catch (err) {
      console.log('Exit fullscreen error:', err);
    }
  };

  // 4. Zoom & Pan Logic
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
    setModelRotationY(0);
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
    if (interactionMode === '3d-orbit') return;
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1 || interactionMode === '3d-orbit') return;
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
    } else if (e.touches.length === 1 && interactionMode === 'pan-zoom' && zoomLevel > 1) {
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
    } else if (e.touches.length === 1 && isDragging && interactionMode === 'pan-zoom' && zoomLevel > 1) {
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

  // 5. Eksekusi Analisis Kecepatan & Akurasi
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

    const totalF = currentPose.totalFrames || 60;
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

      const fps = 60;
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

      const existingCalib =
        speedResult?.calibration ||
        (await speedStorageService.getSpeedResultByVideoId(attempt.video.id).then((r) => r?.calibration));

      await triggerSpeedAndAccuracy(
        finalPoseResult,
        athlete?.dominantLeg || 'Kanan',
        existingCalib || undefined
      );
      video.currentTime = 0;
    } catch (err) {
      console.error('Eksekusi analisis 60 FPS gagal:', err);
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
    const step = 1 / activeFps;
    const nextTime = direction === 'next' ? Math.min(duration, currentTime + step) : Math.max(0, currentTime - step);
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleJumpToFrame = (frameNum?: number) => {
    if (!videoRef.current || !frameNum) return;
    const t = (frameNum - 1) / activeFps;
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

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

  const renderKickDurationValue = () => {
    if (!speedResult) return '-';
    if (speedResult.recoveryFrame && speedResult.kickStartFrame && speedResult.recoveryFrame > speedResult.kickStartFrame) {
      return `${((speedResult.recoveryFrame - speedResult.kickStartFrame) / activeFps).toFixed(2)} s`;
    }
    if (speedResult.impactFrame && speedResult.kickStartFrame && speedResult.impactFrame > speedResult.kickStartFrame) {
      return `${((speedResult.impactFrame - speedResult.kickStartFrame) / activeFps).toFixed(2)} s`;
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

  // Sub-komponen Player & Kontrol
  const renderVideoPlayerBlock = (isFullScreenMode: boolean = false) => (
    <div className={`space-y-2 select-none w-full ${isFullScreenMode ? 'h-full flex flex-col justify-between' : ''}`}>
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative overflow-hidden bg-black flex items-center justify-center ${
          isFullScreenMode ? 'flex-1 w-full h-full rounded-none' : 'aspect-video rounded-xl shadow-inner'
        } ${interactionMode === 'pan-zoom' && zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
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
            {/* 1. LAYER VIDEO ASLI */}
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              className={`w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${
                viewMode === 'video' ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* 2. OVERLAY 2D SKELETON */}
            {viewMode === 'video' && (
              <>
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
              </>
            )}

            {/* 3. OVERLAY 3D LAB */}
            {viewMode === '3d' && (
              <div
                style={{
                  transform: `rotateY(${modelRotationY}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-out',
                }}
                className={`w-full h-full absolute inset-0 ${
                  interactionMode === '3d-orbit' ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
              >
                <Pose3DOverlay
                  currentFramePose={currentFramePose}
                  videoWidth={isFullScreenMode ? window.innerWidth : videoDims.width}
                  videoHeight={isFullScreenMode ? window.innerHeight : videoDims.height}
                  isImpactFrame={isAtImpactFrame}
                  kickingLeg={session.kickingLeg}
                  showMannequin={true}
                  target={target}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-slate-500 text-xs">Video tidak dapat dimuat</div>
        )}

        {/* Toolbar Interaktif Kiri Bawah (Hanya di mode 3D) */}
        {viewMode === '3d' && (
          <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/20 text-white text-xs shadow-lg">
            <button
              type="button"
              onClick={() => setInteractionMode(interactionMode === '3d-orbit' ? 'pan-zoom' : '3d-orbit')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                interactionMode === '3d-orbit'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title="Ganti Mode: Putar 3D atau Geser Layar"
            >
              {interactionMode === '3d-orbit' ? <Orbit size={12} /> : <Move size={12} />}
              <span>{interactionMode === '3d-orbit' ? 'Putar 3D' : 'Pan/Zoom'}</span>
            </button>

            <div className="h-4 w-[1px] bg-white/20 mx-0.5" />

            <button
              type="button"
              onClick={() => setModelRotationY((prev) => prev - 45)}
              className="p-1 hover:bg-white/20 rounded transition-colors text-amber-300"
              title="Putar 3D ke Kiri 45°"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={() => setModelRotationY((prev) => prev + 45)}
              className="p-1 hover:bg-white/20 rounded transition-colors text-amber-300"
              title="Putar 3D ke Kanan 45°"
            >
              <RotateCw size={13} />
            </button>

            <div className="h-4 w-[1px] bg-white/20 mx-0.5" />

            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <span className="font-mono text-[10px] w-9 text-center font-bold">
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

            {(zoomLevel > 1 || modelRotationY !== 0) && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 hover:bg-white/20 rounded transition-colors text-rose-400"
                title="Reset Zoom & Rotasi"
              >
                <ResetIcon size={12} />
              </button>
            )}
          </div>
        )}

        {/* Floating Mode Switcher di Kanan Atas */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/20 z-30">
          <button
            type="button"
            onClick={() => setViewMode('video')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'video'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <VideoCamIcon size={12} /> Video
          </button>

          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              viewMode === '3d'
                ? 'bg-[#800000] text-white shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Box size={12} /> 3D Lab
          </button>

          {viewMode === 'video' && (
            <>
              <div className="w-[1px] h-3.5 bg-white/20 mx-0.5" />
              <button
                type="button"
                onClick={() => setShowSkeleton(!showSkeleton)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors ${
                  showSkeleton ? 'bg-emerald-600 text-white font-bold' : 'text-white/50 hover:text-white'
                }`}
                title="Toggle Skeleton 2D"
              >
                2D
              </button>
            </>
          )}
        </div>

        {/* Status Indikator Fase */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1">
          {isAtStartFrame && (
            <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border border-sky-400">
              ▶ START (KICK OFF)
            </span>
          )}
          {isAtImpactFrame && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm border border-amber-300">
              ⚡ IMPAK SASARAN
            </span>
          )}
          {isAtRecoveryFrame && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border border-emerald-400">
              ✔ RECOVERY (KEMBALI)
            </span>
          )}
        </div>

        {analysisStatus === 'processing' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center text-white">
            <Activity size={32} className="text-accent animate-pulse mb-2" />
            <h4 className="text-xs sm:text-sm font-bold">Menganalisis Biomekanika (60 FPS)...</h4>
            <p className="text-[11px] text-slate-300 mt-1 mb-3 font-mono">
              Frame {processedFramesCount} / {totalEstimatedFrames} ({progressPercent}%)
            </p>
            <div className="w-48 sm:w-64 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Kontrol Pemutar Video Bawah */}
      <div className={`p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800 text-white space-y-2 ${isFullScreenMode ? 'mx-2 mb-2 sm:mx-4 sm:mb-4' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.005}
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

            {/* PENGATUR KECEPATAN SLOW MOTION */}
            <div className="flex items-center ml-1 bg-slate-800/90 border border-slate-700/80 rounded-lg p-0.5">
              <span className="px-1.5 text-slate-400 text-[10px] hidden sm:inline-flex items-center gap-0.5">
                <Gauge size={11} /> Speed:
              </span>
              {[0.25, 0.5, 1].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    playbackSpeed === rate
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Kecepatan Pemutaran ${rate}x`}
                >
                  {rate === 1 ? '1x' : `${rate}x`}
                </button>
              ))}
            </div>
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
              #{currentFrameNum} <span className="text-[8px] text-slate-500">({activeFps}fps)</span>
            </div>

            {/* Tombol Fullscreen Otomatis Landscape */}
            <button
              type="button"
              onClick={handleOpenFullscreenLandscape}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Layar Penuh Landscape"
            >
              <Maximize2 size={14} />
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
            {poseResult ? 'Hitung Ulang Analisis Lengkap (60 FPS)' : 'Mulai Analisis Video (60 FPS)'}
          </Button>

          {/* Accordion 1: Koreksi Titik Fase Gerak */}
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
                        3. Kembali Posisi Awal (Frame {speedResult.recoveryFrame || (speedResult.impactFrame || 1) + 20})
                      </span>
                      <span className="font-mono text-slate-700">
                        {formatDuration(speedResult.recoveryTimestamp || ((speedResult.recoveryFrame || 1) / activeFps))}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={(speedResult.impactFrame || 1) + 1}
                      max={poseResult?.totalFrames || 200}
                      value={speedResult.recoveryFrame || (speedResult.impactFrame || 1) + 20}
                      onChange={(e) => handlePhaseChange('rec', parseInt(e.target.value))}
                      className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accordion 2: Kurva Kecepatan */}
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

      {/* MODAL FULLSCREEN LANDSCAPE OTOMATIS */}
      {isExpandedView && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col justify-between w-screen h-screen overflow-hidden animate-fadeIn">
          <div className="flex items-center justify-between text-white py-2 px-3 sm:px-6 bg-black/90 border-b border-white/10 shrink-0 z-50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-amber-300 flex items-center gap-1.5">
                <Orbit size={15} className="text-amber-400" />
                OBSERVASI BIOMEKANIKA LANDSCAPE
              </span>
              <span className="hidden sm:inline text-xs text-slate-400 font-mono">
                [#{attempt.attemptNumber} - {session.sessionCode}]
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 hidden md:inline">
                Mode: <b className="text-amber-300 uppercase">{interactionMode === '3d-orbit' ? 'Putar 3D' : 'Pan & Zoom'}</b>
              </span>
              <button
                type="button"
                onClick={handleCloseFullscreen}
                className="p-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <X size={15} />
                <span>Tutup</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center bg-black">
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