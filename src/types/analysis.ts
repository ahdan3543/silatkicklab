export type AnalysisStatus = 'not_started' | 'processing' | 'completed' | 'failed';

export interface KickAccuracyDetail {
  score: number; // 0 - 100%
  targetDeviationCm: number; // Jarak deviasi dari sasaran ideal
  impactHeightCm: number; // Ketinggian titik benturan
  isHitTarget: boolean;
}

export interface KickSpeedDetail {
  peakVelocityMs: number; // m/s
  impactVelocityMs: number; // m/s
  timeToImpactMs: number; // ms
  chamberToExtensionTimeMs: number; // Waktu dari lipatan kaki ke tendangan lurus
}

export interface AnalysisResult {
  id: string;
  attemptId: string;
  accuracy: KickAccuracyDetail;
  speed: KickSpeedDetail;
  analysisStatus: AnalysisStatus;
  analyzedAt?: string;
  keyframeTimestamps?: {
    chamber: number;
    extension: number;
    impact: number;
    retraction: number;
  };
}