export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export const POSE_CONNECTIONS: [number, number][] = [
  // Torso & Bahu
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Lengan Kiri
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  // Lengan Kanan
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
  // Tungkai Kiri (Kaki Kiri)
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Tungkai Kanan (Kaki Kanan)
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

export interface PoseLandmark {
  index: number;
  name: string;
  x: number; // Normalized (0 - 1)
  y: number; // Normalized (0 - 1)
  z: number;
  visibility: number; // Confidence (0 - 1)
}

export interface FramePose {
  frameNumber: number;
  timestamp: number; // dalam detik
  detected: boolean;
  landmarks: PoseLandmark[];
  confidence: number;
}

export type PoseAnalysisStatus = 'idle' | 'loading_model' | 'processing' | 'completed' | 'cancelled' | 'failed';

export interface PoseAnalysisResult {
  id: string;
  videoId: string;
  attemptId: string;
  status: PoseAnalysisStatus;
  fps: number;
  fpsSource: 'exact' | 'estimated';
  durationSeconds: number;
  totalFrames: number;
  processedFrames: number;
  framesWithPoseCount: number;
  avgConfidence: number;
  frames: FramePose[];
  createdAt: string;
}