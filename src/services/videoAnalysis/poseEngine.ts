import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { FramePose, PoseLandmark, POSE_LANDMARKS } from '../../types/pose';

const MEDIAPIPE_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_ASSET_PATH = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let landmarkerInstance: PoseLandmarker | null = null;
let isInitializing = false;

const landmarkNames = Object.entries(POSE_LANDMARKS).reduce<Record<number, string>>((acc, [name, idx]) => {
  acc[idx] = name;
  return acc;
}, {});

export const poseEngine = {
  initEngine: async (): Promise<PoseLandmarker> => {
    if (landmarkerInstance) return landmarkerInstance;
    if (isInitializing) {
      while (isInitializing) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (landmarkerInstance) return landmarkerInstance;
    }

    try {
      isInitializing = true;
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);
      landmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE', // Mode IMAGE memastikan setiap frame yang di-seek dievaluasi tanpa error timestamp
        numPoses: 1,
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });
      return landmarkerInstance;
    } finally {
      isInitializing = false;
    }
  },

  detectFrame: (
    landmarker: PoseLandmarker,
    videoElement: HTMLVideoElement,
    timestampMs: number,
    frameNumber: number
  ): FramePose => {
    let rawResult: PoseLandmarkerResult | null = null;
    try {
      rawResult = landmarker.detect(videoElement);
    } catch (err) {
      console.warn('Deteksi frame gagal:', err);
      return {
        frameNumber,
        timestamp: timestampMs / 1000,
        detected: false,
        confidence: 0,
        landmarks: [],
      };
    }

    if (!rawResult || !rawResult.landmarks || rawResult.landmarks.length === 0) {
      return {
        frameNumber,
        timestamp: timestampMs / 1000,
        detected: false,
        confidence: 0,
        landmarks: [],
      };
    }

    const firstPose = rawResult.landmarks[0];
    let totalVisibility = 0;

    const landmarks: PoseLandmark[] = firstPose.map((lm, index) => {
      const vis = lm.visibility ?? 1.0;
      totalVisibility += vis;
      return {
        index,
        name: landmarkNames[index] || `LANDMARK_${index}`,
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: vis,
      };
    });

    const avgConfidence = landmarks.length > 0 ? totalVisibility / landmarks.length : 0;

    return {
      frameNumber,
      timestamp: timestampMs / 1000,
      detected: true,
      confidence: avgConfidence,
      landmarks,
    };
  },
};