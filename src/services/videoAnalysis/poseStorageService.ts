import { PoseAnalysisResult } from '../../types/pose';
import { openDB } from '../videoStorageService';

const POSE_STORE_NAME = 'pose_analysis_results';

export const poseStorageService = {
  savePoseResult: async (result: PoseAnalysisResult): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(POSE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(POSE_STORE_NAME);
      const request = store.put(result);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getPoseResultByVideoId: async (videoId: string): Promise<PoseAnalysisResult | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(POSE_STORE_NAME, 'readonly');
      const store = tx.objectStore(POSE_STORE_NAME);
      const request = store.get(videoId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  deletePoseResultByVideoId: async (videoId: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(POSE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(POSE_STORE_NAME);
      const request = store.delete(videoId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};