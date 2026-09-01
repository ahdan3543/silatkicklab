import { TargetDefinition, AccuracyAnalysisResult } from '../../types/accuracy';
import { openDB } from '../videoStorageService';

const TARGET_STORE_NAME = 'target_definitions';
const ACCURACY_STORE_NAME = 'accuracy_analysis_results';

export const accuracyStorageService = {
  // Target Operations
  saveTarget: async (target: TargetDefinition): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TARGET_STORE_NAME, 'readwrite');
      const store = tx.objectStore(TARGET_STORE_NAME);
      const request = store.put(target);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getTargetBySessionId: async (sessionId: string): Promise<TargetDefinition | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TARGET_STORE_NAME, 'readonly');
      const store = tx.objectStore(TARGET_STORE_NAME);
      const request = store.get(sessionId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  // Accuracy Result Operations
  saveAccuracyResult: async (result: AccuracyAnalysisResult): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ACCURACY_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ACCURACY_STORE_NAME);
      const request = store.put(result);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getAccuracyResultByVideoId: async (videoId: string): Promise<AccuracyAnalysisResult | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ACCURACY_STORE_NAME, 'readonly');
      const store = tx.objectStore(ACCURACY_STORE_NAME);
      const request = store.get(videoId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },
};