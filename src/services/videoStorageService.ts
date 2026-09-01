const DB_NAME = 'silat_kick_db';
const STORE_NAME = 'attempt_videos';
const POSE_STORE_NAME = 'pose_analysis_results';
const SPEED_STORE_NAME = 'speed_analysis_results';
const TARGET_STORE_NAME = 'target_definitions';
const ACCURACY_STORE_NAME = 'accuracy_analysis_results';
const DB_VERSION = 4; // Dinaikkan untuk store target & accuracy

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'attemptId' });
      }
      if (!db.objectStoreNames.contains(POSE_STORE_NAME)) {
        db.createObjectStore(POSE_STORE_NAME, { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains(SPEED_STORE_NAME)) {
        db.createObjectStore(SPEED_STORE_NAME, { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains(TARGET_STORE_NAME)) {
        db.createObjectStore(TARGET_STORE_NAME, { keyPath: 'sessionId' });
      }
      if (!db.objectStoreNames.contains(ACCURACY_STORE_NAME)) {
        db.createObjectStore(ACCURACY_STORE_NAME, { keyPath: 'videoId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const videoStorageService = {
  saveVideoBlob: async (attemptId: string, file: Blob): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ attemptId, blob: file });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getVideoBlob: async (attemptId: string): Promise<Blob | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(attemptId);
      request.onsuccess = () => resolve(request.result ? request.result.blob : null);
      request.onerror = () => reject(request.error);
    });
  },

  deleteVideoBlob: async (attemptId: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(attemptId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};