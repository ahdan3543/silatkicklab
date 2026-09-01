export const KICK_START_VELOCITY_THRESHOLD = 80; // px/s
export const MIN_LANDMARK_CONFIDENCE = 0.4;

export interface CalibrationData {
  pointA: { x: number; y: number }; // Normalized (0-1)
  pointB: { x: number; y: number }; // Normalized (0-1)
  pixelDistance: number;
  realDistanceMeters: number;
  metersPerPixel: number;
  createdAt: string;
}

export interface FrameTrajectoryPoint {
  frameNumber: number;
  timestamp: number;
  rawX: number; // Pixels
  rawY: number; // Pixels
  kneeAngle: number; // Derajat
  rawVelocityPxS: number;
  smoothedVelocityPxS: number;
  rawVelocityMs: number | null;
  smoothedVelocityMs: number | null;
  confidence: number;
}

export interface SpeedAnalysisResult {
  id: string;
  videoId: string;
  attemptId: string;
  trackingPoint: 'RIGHT_ANKLE' | 'LEFT_ANKLE' | 'RIGHT_FOOT' | 'LEFT_FOOT';

  // Event Markers
  kickStartFrame: number;
  extensionStartFrame: number;
  impactFrame: number;
  recoveryFrame: number;

  kickStartTimestamp: number;
  extensionStartTimestamp: number;
  impactTimestamp: number;
  recoveryTimestamp: number;

  kickDuration: number; // Detik (Impact - Start)

  // Pixel Metrics
  footDisplacementPixels: number;
  peakSpeedPixelsPerSecond: number;
  averageSpeedPixelsPerSecond: number;

  // Physical Calibration
  calibrationAvailable: boolean;
  calibration?: CalibrationData;
  metersPerPixel: number | null;

  // Physical Metrics (Hanya ada jika terkalibrasi)
  footDisplacementMeters: number | null;
  peakSpeedMetersPerSecond: number | null;
  averageSpeedMetersPerSecond: number | null;

  detectionMethod: 'automatic' | 'manual-corrected';
  trajectory: FrameTrajectoryPoint[];
  confidence: number | null;
  status: 'completed' | 'draft';
  createdAt: string;
}