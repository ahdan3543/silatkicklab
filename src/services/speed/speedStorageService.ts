import { SpeedAnalysisResult } from '../../types/speed';
import { openDB } from '../videoStorageService';

const SPEED_STORE_NAME = 'speed_analysis_results';

export const speedStorageService = {
  saveSpeedResult: async (result: SpeedAnalysisResult): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SPEED_STORE_NAME, 'readwrite');
      const store = tx.objectStore(SPEED_STORE_NAME);
      const request = store.put(result);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getSpeedResultByVideoId: async (videoId: string): Promise<SpeedAnalysisResult | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SPEED_STORE_NAME, 'readonly');
      const store = tx.objectStore(SPEED_STORE_NAME);
      const request = store.get(videoId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  deleteSpeedResultByVideoId: async (videoId: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SPEED_STORE_NAME, 'readwrite');
      const store = tx.objectStore(SPEED_STORE_NAME);
      const request = store.delete(videoId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};