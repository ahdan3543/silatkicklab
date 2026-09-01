import { PoseAnalysisResult, POSE_LANDMARKS } from '../../types/pose';
import {
  CalibrationData,
  FrameTrajectoryPoint,
  SpeedAnalysisResult,
  KICK_START_VELOCITY_THRESHOLD,
  MIN_LANDMARK_CONFIDENCE,
} from '../../types/speed';

/**
 * Hitung sudut lutut menggunakan dot product vektor 2D
 */
export const calculateKneeAngle = (
  hip: { x: number; y: number },
  knee: { x: number; y: number },
  ankle: { x: number; y: number }
): number => {
  const v1 = { x: hip.x - knee.x, y: hip.y - knee.y };
  const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 180;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
};

export const speedCalculationEngine = {
  /**
   * Ekstraksi deret posisi dan kecepatan trajektori kaki
   */
  extractTrajectory: (
    poseResult: PoseAnalysisResult,
    dominantLeg: 'Kanan' | 'Kiri',
    videoWidth: number,
    videoHeight: number,
    calibration?: CalibrationData
  ): { trajectory: FrameTrajectoryPoint[]; trackingPoint: SpeedAnalysisResult['trackingPoint'] } => {
    const isRight = dominantLeg === 'Kanan';
    const ankleIdx = isRight ? POSE_LANDMARKS.RIGHT_ANKLE : POSE_LANDMARKS.LEFT_ANKLE;
    const footIdx = isRight ? POSE_LANDMARKS.RIGHT_FOOT_INDEX : POSE_LANDMARKS.LEFT_FOOT_INDEX;
    const kneeIdx = isRight ? POSE_LANDMARKS.RIGHT_KNEE : POSE_LANDMARKS.LEFT_KNEE;
    const hipIdx = isRight ? POSE_LANDMARKS.RIGHT_HIP : POSE_LANDMARKS.LEFT_HIP;

    const trackingPoint: SpeedAnalysisResult['trackingPoint'] = isRight ? 'RIGHT_FOOT' : 'LEFT_FOOT';
    const trajectory: FrameTrajectoryPoint[] = [];

    // 1. Ekstraksi koordinat dasar pixel
    for (let i = 0; i < poseResult.frames.length; i++) {
      const frame = poseResult.frames[i];
      if (!frame.detected || frame.landmarks.length === 0) {
        trajectory.push({
          frameNumber: frame.frameNumber,
          timestamp: frame.timestamp,
          rawX: 0,
          rawY: 0,
          kneeAngle: 180,
          rawVelocityPxS: 0,
          smoothedVelocityPxS: 0,
          rawVelocityMs: null,
          smoothedVelocityMs: null,
          confidence: 0,
        });
        continue;
      }

      const lms = frame.landmarks;
      const targetPoint = lms[footIdx]?.visibility > MIN_LANDMARK_CONFIDENCE ? lms[footIdx] : lms[ankleIdx];
      const kneePoint = lms[kneeIdx];
      const hipPoint = lms[hipIdx];

      const rawX = targetPoint ? targetPoint.x * videoWidth : 0;
      const rawY = targetPoint ? targetPoint.y * videoHeight : 0;

      let angle = 180;
      if (hipPoint && kneePoint && targetPoint) {
        angle = calculateKneeAngle(
          { x: hipPoint.x * videoWidth, y: hipPoint.y * videoHeight },
          { x: kneePoint.x * videoWidth, y: kneePoint.y * videoHeight },
          { x: targetPoint.x * videoWidth, y: targetPoint.y * videoHeight }
        );
      }

      trajectory.push({
        frameNumber: frame.frameNumber,
        timestamp: frame.timestamp,
        rawX,
        rawY,
        kneeAngle: angle,
        rawVelocityPxS: 0,
        smoothedVelocityPxS: 0,
        rawVelocityMs: null,
        smoothedVelocityMs: null,
        confidence: targetPoint ? targetPoint.visibility : 0,
      });
    }

    // 2. Hitung Raw Velocity (Euclidean Displacement / dt)
    for (let i = 1; i < trajectory.length; i++) {
      const prev = trajectory[i - 1];
      const curr = trajectory[i];
      const dt = curr.timestamp - prev.timestamp;

      if (dt > 0 && curr.rawX > 0 && prev.rawX > 0) {
        const dx = curr.rawX - prev.rawX;
        const dy = curr.rawY - prev.rawY;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        curr.rawVelocityPxS = distPx / dt;

        if (calibration && calibration.metersPerPixel > 0) {
          curr.rawVelocityMs = (distPx * calibration.metersPerPixel) / dt;
        }
      }
    }

    // 3. Moving Average Smoothing (Window = 3)
    for (let i = 0; i < trajectory.length; i++) {
      const windowPoints = trajectory.slice(Math.max(0, i - 1), Math.min(trajectory.length, i + 2));
      const validPoints = windowPoints.filter((p) => p.rawVelocityPxS > 0);

      if (validPoints.length > 0) {
        const sumPx = validPoints.reduce((acc, p) => acc + p.rawVelocityPxS, 0);
        trajectory[i].smoothedVelocityPxS = sumPx / validPoints.length;

        if (calibration && calibration.metersPerPixel > 0) {
          trajectory[i].smoothedVelocityMs = trajectory[i].smoothedVelocityPxS * calibration.metersPerPixel;
        }
      }
    }

    return { trajectory, trackingPoint };
  },

  /**
   * Deteksi otomatis fase tendangan
   */
  autoDetectPhases: (
    trajectory: FrameTrajectoryPoint[]
  ): { startFrame: number; extensionFrame: number; impactFrame: number; recoveryFrame: number } => {
    if (trajectory.length === 0) {
      return { startFrame: 1, extensionFrame: 1, impactFrame: 1, recoveryFrame: 1 };
    }

    // 1. Temukan Titik Ekstensi Maksimal (Impact / Puncak Displacement X & Jarak)
    let impactIdx = 0;
    let maxDist = 0;
    const initialPoint = trajectory.find((p) => p.rawX > 0) || trajectory[0];

    for (let i = 0; i < trajectory.length; i++) {
      const p = trajectory[i];
      if (p.rawX > 0) {
        const dist = Math.sqrt(Math.pow(p.rawX - initialPoint.rawX, 2) + Math.pow(p.rawY - initialPoint.rawY, 2));
        if (dist > maxDist) {
          maxDist = dist;
          impactIdx = i;
        }
      }
    }

    // 2. Temukan Kick Start (Frame sebelum impact saat kecepatan mulai melebihi ambang)
    let startIdx = Math.max(0, impactIdx - 1);
    for (let i = impactIdx - 1; i >= 0; i--) {
      if (trajectory[i].smoothedVelocityPxS < KICK_START_VELOCITY_THRESHOLD) {
        startIdx = i;
        break;
      }
    }

    // 3. Temukan Extension Start (Titik sudut lutut mulai terbuka di antara start dan impact)
    let extensionIdx = Math.floor((startIdx + impactIdx) / 2);
    for (let i = startIdx; i <= impactIdx; i++) {
      if (trajectory[i].kneeAngle > 110) {
        extensionIdx = i;
        break;
      }
    }

    // 4. Recovery Frame (Titik setelah impact saat kecepatan kembali normal/kaki ditarik)
    let recoveryIdx = Math.min(trajectory.length - 1, impactIdx + (impactIdx - startIdx));
    for (let i = impactIdx + 1; i < trajectory.length; i++) {
      if (trajectory[i].smoothedVelocityPxS < KICK_START_VELOCITY_THRESHOLD) {
        recoveryIdx = i;
        break;
      }
    }

    return {
      startFrame: trajectory[startIdx]?.frameNumber || 1,
      extensionFrame: trajectory[extensionIdx]?.frameNumber || 1,
      impactFrame: trajectory[impactIdx]?.frameNumber || trajectory.length,
      recoveryFrame: trajectory[recoveryIdx]?.frameNumber || trajectory.length,
    };
  },

  /**
   * Menghitung seluruh metrik kecepatan berdasarkan rentang interval Kick Start -> Impact
   */
  computeSpeedMetrics: (
    trajectory: FrameTrajectoryPoint[],
    startFrame: number,
    extensionFrame: number,
    impactFrame: number,
    recoveryFrame: number,
    calibration?: CalibrationData,
    method: 'automatic' | 'manual-corrected' = 'automatic'
  ): Omit<SpeedAnalysisResult, 'id' | 'videoId' | 'attemptId' | 'trackingPoint' | 'createdAt'> => {
    const startPoint = trajectory.find((p) => p.frameNumber === startFrame) || trajectory[0];
    const extPoint = trajectory.find((p) => p.frameNumber === extensionFrame) || startPoint;
    const impactPoint = trajectory.find((p) => p.frameNumber === impactFrame) || trajectory[trajectory.length - 1];
    const recPoint = trajectory.find((p) => p.frameNumber === recoveryFrame) || impactPoint;

    const kickDuration = Math.max(0.01, impactPoint.timestamp - startPoint.timestamp);

    // Filter interval gerakan tendangan utama
    const activeRange = trajectory.filter(
      (p) => p.frameNumber >= startFrame && p.frameNumber <= impactFrame
    );

    // Perpindahan Euclidean dari titik start ke titik impact
    const dx = impactPoint.rawX - startPoint.rawX;
    const dy = impactPoint.rawY - startPoint.rawY;
    const footDisplacementPixels = Math.sqrt(dx * dx + dy * dy);

    // Peak Speed & Average Speed (Pixels)
    let peakSpeedPixelsPerSecond = 0;
    for (const p of activeRange) {
      if (p.smoothedVelocityPxS > peakSpeedPixelsPerSecond) {
        peakSpeedPixelsPerSecond = p.smoothedVelocityPxS;
      }
    }
    const averageSpeedPixelsPerSecond = footDisplacementPixels / kickDuration;

    // Metrik Fisik (Hanya jika terkalibrasi)
    const isCalibrated = Boolean(calibration && calibration.metersPerPixel > 0);
    const mPerPx = isCalibrated ? calibration!.metersPerPixel : null;

    const footDisplacementMeters = isCalibrated ? footDisplacementPixels * mPerPx! : null;
    const peakSpeedMetersPerSecond = isCalibrated ? peakSpeedPixelsPerSecond * mPerPx! : null;
    const averageSpeedMetersPerSecond = isCalibrated ? footDisplacementMeters! / kickDuration : null;

    const avgConfidence =
      activeRange.length > 0
        ? activeRange.reduce((acc, p) => acc + p.confidence, 0) / activeRange.length
        : null;

    return {
      kickStartFrame: startFrame,
      extensionStartFrame: extensionFrame,
      impactFrame,
      recoveryFrame,
      kickStartTimestamp: startPoint.timestamp,
      extensionStartTimestamp: extPoint.timestamp,
      impactTimestamp: impactPoint.timestamp,
      recoveryTimestamp: recPoint.timestamp,
      kickDuration,
      footDisplacementPixels,
      peakSpeedPixelsPerSecond,
      averageSpeedPixelsPerSecond,
      calibrationAvailable: isCalibrated,
      calibration,
      metersPerPixel: mPerPx,
      footDisplacementMeters,
      peakSpeedMetersPerSecond,
      averageSpeedMetersPerSecond,
      detectionMethod: method,
      trajectory,
      confidence: avgConfidence,
      status: 'completed',
    };
  },
};