export interface VideoMetadata {
  id: string;
  attemptId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSeconds: number;
  width?: number;
  height?: number;
  uploadedAt: string;
  blobUrl?: string;
  fileUrl?: string;
  status?: string;
}

export type Video = VideoMetadata;

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export const MAX_VIDEO_SIZE_MB = 100;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 30;