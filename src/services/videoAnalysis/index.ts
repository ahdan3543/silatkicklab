/**
 * ARCHITECTURE PLACEHOLDER:
 * Modul ini disiapkan untuk algoritma ekstraksi frame, tracking pose (OpenPose/MediaPipe),
 * dan sinkronisasi 5 video percobaan pada task-task berikutnya.
 */
export const videoAnalysisService = {
  processVideoAttempt: async (attemptId: string, videoFile: File) => {
    console.log('Video pipeline ready for attempt:', attemptId, videoFile.name);
    return Promise.resolve({ status: 'queued' });
  },
};