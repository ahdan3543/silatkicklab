/**
 * ARCHITECTURE PLACEHOLDER:
 * Modul analisis akurasi tendangan (koordinat impak vs target center)
 */
export const accuracyService = {
  computeAccuracyScore: (targetDeviationCm: number) => {
    return Math.max(0, 100 - targetDeviationCm * 2);
  },
};