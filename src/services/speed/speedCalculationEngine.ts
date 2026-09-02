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

    // 3. Moving Average Smoothing ringan (Window = 3)
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
   * Deteksi otomatis fase tendangan berbasis:
   * Phase-Aware Impact Detection & Earliest Valid Maximum Extension
   */
  autoDetectPhases: (
    trajectory: FrameTrajectoryPoint[]
  ): { startFrame: number; extensionFrame: number; impactFrame: number; recoveryFrame: number } => {
    if (trajectory.length === 0) {
      return { startFrame: 1, extensionFrame: 1, impactFrame: 1, recoveryFrame: 1 };
    }

    const validPoints = trajectory.filter((p) => p.rawX > 0);
    if (validPoints.length < 5) {
      return { startFrame: 1, extensionFrame: 1, impactFrame: 1, recoveryFrame: 1 };
    }

    // 1. Tentukan Titik Awal Atlet di Lantai
    const initialPoint = validPoints[0];

    // 2. Tentukan Arah Horizontal Tendangan (Kiri = -1, Kanan = 1)
    const midSlice = validPoints.slice(
      Math.floor(validPoints.length * 0.3),
      Math.floor(validPoints.length * 0.7)
    );
    const avgMidX =
      midSlice.length > 0
        ? midSlice.reduce((sum, p) => sum + p.rawX, 0) / midSlice.length
        : initialPoint.rawX;
    const kickDirection = avgMidX < initialPoint.rawX ? -1 : 1;

    // 3. Hitung forwardReach & kneeAngle per frame
    const reachData = trajectory.map((p) => {
      if (p.rawX <= 0) return { reach: 0, angle: p.kneeAngle };
      const reach = (p.rawX - initialPoint.rawX) * kickDirection;
      return { reach: Math.max(0, reach), angle: p.kneeAngle };
    });

    const maxForwardReach = Math.max(...reachData.map((d) => d.reach), 1);

    // Smoothing ringan (window = 3) pada sudut lutut untuk meredam noise kamera
    const smoothedAngles = trajectory.map((_, i) => {
      const slice = trajectory.slice(Math.max(0, i - 1), Math.min(trajectory.length, i + 2));
      const valid = slice.filter((p) => p.rawX > 0);
      return valid.length > 0
        ? valid.reduce((acc, p) => acc + p.kneeAngle, 0) / valid.length
        : trajectory[i].kneeAngle;
    });

    // 4. Deteksi Puncak Kecepatan Tendangan untuk Acuan Siklus
    let peakSpeedIdx = 0;
    let maxSpeed = 0;
    for (let i = 0; i < trajectory.length; i++) {
      if (trajectory[i].smoothedVelocityPxS > maxSpeed) {
        maxSpeed = trajectory[i].smoothedVelocityPxS;
        peakSpeedIdx = i;
      }
    }

    // 5. Deteksi Kick Start (frame sebelum peak saat kecepatan mulai melonjak)
    let startIdx = Math.max(0, peakSpeedIdx - 1);
    for (let i = peakSpeedIdx - 1; i >= 0; i--) {
      if (trajectory[i].smoothedVelocityPxS < KICK_START_VELOCITY_THRESHOLD) {
        startIdx = i;
        break;
      }
    }

    // 6. Deteksi Extension Start (frame setelah kick start saat lutut mulai membuka > 110° dan bergerak maju)
    let extensionIdx = Math.max(startIdx, peakSpeedIdx - 4);
    for (let i = startIdx; i < trajectory.length; i++) {
      if (smoothedAngles[i] > 110 && reachData[i].reach / maxForwardReach >= 0.35) {
        extensionIdx = i;
        break;
      }
    }

    // 7. Cari Kandidat Impact Hanya SETELAH Extension Dimulai
    let impactIdx = -1;

    // Prioritas 1: Earliest Valid Peak pada kondisi Ideal (kneeAngle >= 150°, normalizedReach >= 0.85)
    for (let i = extensionIdx; i < trajectory.length; i++) {
      const normReach = reachData[i].reach / maxForwardReach;
      const angle = smoothedAngles[i];

      if (angle >= 150 && normReach >= 0.85) {
        impactIdx = i;
        break;
      }
    }

    // Prioritas 2: Jika sudut ekstrem 150° tidak tercapai, cari pada ambang valid (kneeAngle >= 140°, normalizedReach >= 0.80)
    if (impactIdx === -1) {
      for (let i = extensionIdx; i < trajectory.length; i++) {
        const normReach = reachData[i].reach / maxForwardReach;
        const angle = smoothedAngles[i];

        if (angle >= 140 && normReach >= 0.80) {
          impactIdx = i;
          break;
        }
      }
    }

    // Fallback: Kombinasi reach dan angle terbaik sebelum terjadi recovery jelas
    if (impactIdx === -1) {
      let maxScore = -Infinity;
      let fallbackIdx = extensionIdx;

      for (let i = extensionIdx; i < trajectory.length; i++) {
        const normReach = reachData[i].reach / maxForwardReach;
        const angle = smoothedAngles[i];

        if (angle < 120 && i > extensionIdx + 3) continue;

        const score = normReach * 1.5 + (angle / 180) * 2.0;
        if (score > maxScore) {
          maxScore = score;
          fallbackIdx = i;
        }
      }
      impactIdx = fallbackIdx;
    }

    if (impactIdx < extensionIdx) {
      impactIdx = extensionIdx;
    }

    // 8. Deteksi Recovery (SETELAH impact saat lutut mulai ditekuk kembali atau reach menurun drastis)
    let recoveryIdx = Math.min(trajectory.length - 1, impactIdx + 6);
    for (let i = impactIdx + 1; i < trajectory.length; i++) {
      const angleDrop = smoothedAngles[i] < smoothedAngles[impactIdx] - 15;
      const reachDrop = reachData[i].reach < reachData[impactIdx].reach * 0.9;
      const veloDrop = trajectory[i].smoothedVelocityPxS < KICK_START_VELOCITY_THRESHOLD;

      if ((angleDrop || reachDrop) && veloDrop) {
        recoveryIdx = i;
        break;
      }
    }

    const startFrame = trajectory[startIdx]?.frameNumber || 1;
    const extensionFrame = trajectory[extensionIdx]?.frameNumber || startFrame;
    const impactFrame = trajectory[impactIdx]?.frameNumber || trajectory.length;
    const recoveryFrame = trajectory[recoveryIdx]?.frameNumber || impactFrame;

    // Debug logging ramah browser (tanpa ketergantungan process.env Node.js)
    if (typeof window !== 'undefined') {
      console.debug('[Impact Detection]', {
        impactFrame,
        impactKneeAngle: Math.round(smoothedAngles[impactIdx] || 0),
        impactForwardReach: Math.round(reachData[impactIdx]?.reach || 0),
        normalizedReach: Number(((reachData[impactIdx]?.reach || 0) / maxForwardReach).toFixed(2)),
        extensionFrame,
        recoveryFrame,
      });
    }

    return {
      startFrame,
      extensionFrame,
      impactFrame,
      recoveryFrame,
    };
  },

  /**
   * Menghitung seluruh metrik kecepatan berdasarkan interval Kick Start -> Impact
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

    // Peak Speed & Average Speed
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