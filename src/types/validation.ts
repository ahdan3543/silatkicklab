export type ValidationStatus = 'VALID' | 'WARNING' | 'INCOMPLETE' | 'ERROR';
export type FinalQualityStatus = 'READY' | 'WARNING' | 'INCOMPLETE' | 'ERROR';

export type ValidationCategory =
  | 'ATHLETE'
  | 'SESSION'
  | 'VIDEO'
  | 'POSE'
  | 'SPEED'
  | 'TARGET'
  | 'ACCURACY'
  | 'CONSISTENCY';

export type ValidationErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'ATHLETE_NOT_FOUND'
  | 'ATTEMPT_COUNT_INVALID'
  | 'ATTEMPT_DUPLICATE'
  | 'VIDEO_MISSING'
  | 'VIDEO_INVALID'
  | 'POSE_MISSING'
  | 'POSE_FRAMES_INVALID'
  | 'TRACKING_POINT_MISSING'
  | 'IMPACT_FRAME_MISSING'
  | 'IMPACT_FRAME_INVALID'
  | 'CALIBRATION_MISSING'
  | 'TARGET_MISSING'
  | 'TARGET_COORDINATES_INVALID'
  | 'SPEED_INVALID'
  | 'ACCURACY_INVALID'
  | 'RESULT_MISMATCH';

export interface ValidationItem {
  id: string;
  category: ValidationCategory;
  status: ValidationStatus;
  code?: ValidationErrorCode;
  message: string;
  attemptNumber?: number;
  attemptId?: string;
  details?: string;
}

export interface CategoryStatusSummary {
  category: ValidationCategory;
  title: string;
  status: ValidationStatus;
  message: string;
  validCount: number;
  totalRequired: number;
}

export interface SessionQualityReport {
  sessionId: string;
  overallStatus: FinalQualityStatus;
  isReadyForReport: boolean;
  completenessPercentage: number;
  items: ValidationItem[];
  categories: CategoryStatusSummary[];
  counts: {
    videoCount: number;
    poseCount: number;
    speedCount: number;
    accuracyCount: number;
    calibrationCount: number;
    totalAttempts: number;
  };
}