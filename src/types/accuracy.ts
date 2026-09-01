export type AccuracyEvaluationResult = 'hit' | 'miss' | 'invalid';

export interface TargetDefinition {
  id: string;
  sessionId: string;
  shape?: 'circle' | 'rectangle' | string;
  type?: 'circle' | 'rectangle' | string;
  centerX: number;
  centerY: number;
  radiusNormalized: number;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_TARGET_RADIUS_NORMALIZED = 0.15;

export interface AccuracyAnalysisResult {
  id: string;
  attemptId: string;
  videoId: string;
  targetId: string;
  impactFrameIndex: number;
  impactPoint: {
    x: number;
    y: number;
    normalizedX: number;
    normalizedY: number;
  };
  impactFootPosition?: {
    x: number;
    y: number;
  };
  targetCenter: {
    x: number;
    y: number;
    normalizedX: number;
    normalizedY: number;
  };
  targetRadiusNormalized: number;
  targetRadiusPixels: number;
  distancePixels: number;
  distanceCentimeters: number | null;
  distanceRatioToRadius: number;
  autoResult: AccuracyEvaluationResult;
  finalResult: AccuracyEvaluationResult;
  isManualCorrected: boolean;
  manualOverride?: AccuracyEvaluationResult | null;
  evaluationMethod?: 'automatic' | 'manual-corrected' | string;
  score?: number;
  analyzedAt: string;
}

export interface SessionAccuracySummary {
  totalEvaluated: number;
  hitsCount: number;
  missesCount: number;
  validAttempts: number;
  accuracyPercentage: number;
  averageDistanceCm?: number | null;
  avgDistanceCentimeters?: number | null;
}