import {
  TargetDefinition,
  AccuracyAnalysisResult,
  AccuracyEvaluationResult,
  SessionAccuracySummary,
} from '../../types/accuracy';
import { PoseAnalysisResult } from '../../types/pose';
import { SpeedAnalysisResult } from '../../types/speed';
import { CalibrationData } from '../../types/analysis';

export const accuracyCalculationEngine = {
  calculateAccuracy: (
    target: TargetDefinition,
    poseResult: any,
    speedResult?: any,
    ...args: any[]
  ): AccuracyAnalysisResult => {
    const impactFrameIndex = speedResult?.impactFrame ?? (typeof args[0] === 'number' ? args[0] : 0);
    const calibration: CalibrationData | null =
      args.find((a) => a && (a.metersPerPixel || a.pixelDistance)) || null;

    const frames: any[] = poseResult?.frames || [];
    const frame = frames.find(
      (f) => f.frameIndex === impactFrameIndex || f.frameNumber === impactFrameIndex
    );

    const keypoints: any[] = frame?.keypoints || frame?.landmarks || [];

    if (!frame || keypoints.length === 0) {
      return {
        id: `acc-${Date.now()}`,
        attemptId: speedResult?.attemptId || '',
        videoId: speedResult?.videoId || '',
        targetId: target?.id || '',
        impactFrameIndex,
        impactPoint: { x: 0, y: 0, normalizedX: 0, normalizedY: 0 },
        impactFootPosition: { x: 0, y: 0 },
        targetCenter: {
          x: target?.centerX || 0,
          y: target?.centerY || 0,
          normalizedX: target?.centerX || 0,
          normalizedY: target?.centerY || 0,
        },
        targetRadiusNormalized: target?.radiusNormalized || 0.15,
        targetRadiusPixels: (target?.radiusNormalized || 0.15) * 1000,
        distancePixels: 0,
        distanceCentimeters: null,
        distanceRatioToRadius: 0,
        autoResult: 'invalid',
        finalResult: 'invalid',
        isManualCorrected: false,
        evaluationMethod: 'automatic',
        analyzedAt: new Date().toISOString(),
      };
    }

    const footKeypoint =
      keypoints.find(
        (k) =>
          k.name === 'right_ankle' ||
          k.name === 'left_ankle' ||
          k.name === 'right_foot_index' ||
          k.name === 'left_foot_index'
      ) || keypoints[0];

    const footNormX = footKeypoint?.x || 0;
    const footNormY = footKeypoint?.y || 0;

    const dxNorm = footNormX - (target?.centerX || 0);
    const dyNorm = footNormY - (target?.centerY || 0);
    const distNorm = Math.sqrt(dxNorm * dxNorm + dyNorm * dyNorm);

    const radius = target?.radiusNormalized || 0.15;
    const isHit = distNorm <= radius;
    const autoResult: AccuracyEvaluationResult = isHit ? 'hit' : 'miss';

    let distanceCm: number | null = null;
    if (calibration && calibration.metersPerPixel && calibration.pixelDistance > 0) {
      const distPx = distNorm * 1000;
      distanceCm = distPx * calibration.metersPerPixel * 100;
    }

    return {
      id: `acc-${Date.now()}`,
      attemptId: speedResult?.attemptId || '',
      videoId: speedResult?.videoId || '',
      targetId: target?.id || '',
      impactFrameIndex,
      impactPoint: {
        x: footNormX * 1000,
        y: footNormY * 1000,
        normalizedX: footNormX,
        normalizedY: footNormY,
      },
      impactFootPosition: {
        x: footNormX,
        y: footNormY,
      },
      targetCenter: {
        x: (target?.centerX || 0) * 1000,
        y: (target?.centerY || 0) * 1000,
        normalizedX: target?.centerX || 0,
        normalizedY: target?.centerY || 0,
      },
      targetRadiusNormalized: radius,
      targetRadiusPixels: radius * 1000,
      distancePixels: distNorm * 1000,
      distanceCentimeters: distanceCm,
      distanceRatioToRadius: distNorm / (radius || 1),
      autoResult,
      finalResult: autoResult,
      isManualCorrected: false,
      evaluationMethod: 'automatic',
      analyzedAt: new Date().toISOString(),
    };
  },

  evaluateAttemptAccuracy: (...args: any[]): AccuracyAnalysisResult => {
    return (accuracyCalculationEngine.calculateAccuracy as any)(...args);
  },

  computeSessionSummary: (results: AccuracyAnalysisResult[]): SessionAccuracySummary => {
    const validResults = (results || []).filter((r) => r && r.finalResult !== 'invalid');
    const hits = validResults.filter((r) => r.finalResult === 'hit').length;
    const misses = validResults.filter((r) => r.finalResult === 'miss').length;
    const validCount = validResults.length;
    const accPct = validCount > 0 ? (hits / validCount) * 100 : 0;

    const distances = validResults
      .map((r) => r.distanceCentimeters)
      .filter((d): d is number => d !== null && d !== undefined);
    const avgDist =
      distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : null;

    return {
      totalEvaluated: (results || []).length,
      hitsCount: hits,
      missesCount: misses,
      validAttempts: validCount,
      accuracyPercentage: accPct,
      averageDistanceCm: avgDist,
      avgDistanceCentimeters: avgDist,
    };
  },
};