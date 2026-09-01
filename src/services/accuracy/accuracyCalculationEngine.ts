import {
  TargetDefinition,
  AccuracyAnalysisResult,
  AccuracyEvaluationResult,
} from '../../types/accuracy';
import { PoseAnalysisResult } from '../../types/pose';
import { SpeedAnalysisResult } from '../../types/speed';
import { CalibrationData } from '../../types/analysis';

export const accuracyCalculationEngine = {
  calculateAccuracy: (
    target: TargetDefinition,
    poseResult: PoseAnalysisResult,
    speedResult: SpeedAnalysisResult,
    calibration?: CalibrationData | null
  ): AccuracyAnalysisResult => {
    const impactFrameIndex = speedResult.impactFrame;
    const frame = poseResult.frames.find((f) => f.frameIndex === impactFrameIndex);

    if (!frame || !frame.keypoints || frame.keypoints.length === 0) {
      return {
        id: `acc-${Date.now()}`,
        attemptId: speedResult.attemptId,
        videoId: speedResult.videoId,
        targetId: target.id,
        impactFrameIndex,
        impactPoint: { x: 0, y: 0, normalizedX: 0, normalizedY: 0 },
        targetCenter: {
          x: target.centerX,
          y: target.centerY,
          normalizedX: target.centerX,
          normalizedY: target.centerY,
        },
        targetRadiusNormalized: target.radiusNormalized,
        targetRadiusPixels: target.radiusNormalized * 1000,
        distancePixels: 0,
        distanceCentimeters: null,
        distanceRatioToRadius: 0,
        autoResult: 'invalid',
        finalResult: 'invalid',
        isManualCorrected: false,
        analyzedAt: new Date().toISOString(),
      };
    }

    const footKeypoint = frame.keypoints.find(
      (k) =>
        k.name === 'right_ankle' ||
        k.name === 'left_ankle' ||
        k.name === 'right_foot_index' ||
        k.name === 'left_foot_index'
    ) || frame.keypoints[0];

    const footNormX = footKeypoint.x;
    const footNormY = footKeypoint.y;

    const dxNorm = footNormX - target.centerX;
    const dyNorm = footNormY - target.centerY;
    const distNorm = Math.sqrt(dxNorm * dxNorm + dyNorm * dyNorm);

    const isHit = distNorm <= target.radiusNormalized;
    const autoResult: AccuracyEvaluationResult = isHit ? 'hit' : 'miss';

    let distanceCm: number | null = null;
    if (calibration && calibration.metersPerPixel && calibration.pixelDistance > 0) {
      const distPx = distNorm * 1000;
      distanceCm = distPx * calibration.metersPerPixel * 100;
    }

    return {
      id: `acc-${Date.now()}`,
      attemptId: speedResult.attemptId,
      videoId: speedResult.videoId,
      targetId: target.id,
      impactFrameIndex,
      impactPoint: {
        x: footNormX * 1000,
        y: footNormY * 1000,
        normalizedX: footNormX,
        normalizedY: footNormY,
      },
      targetCenter: {
        x: target.centerX * 1000,
        y: target.centerY * 1000,
        normalizedX: target.centerX,
        normalizedY: target.centerY,
      },
      targetRadiusNormalized: target.radiusNormalized,
      targetRadiusPixels: target.radiusNormalized * 1000,
      distancePixels: distNorm * 1000,
      distanceCentimeters: distanceCm,
      distanceRatioToRadius: distNorm / (target.radiusNormalized || 1),
      autoResult,
      finalResult: autoResult,
      isManualCorrected: false,
      analyzedAt: new Date().toISOString(),
    };
  },
};