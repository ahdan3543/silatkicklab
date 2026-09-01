import { Attempt, MAX_ATTEMPTS } from '../../types';
import { SpeedAnalysisResult } from '../../types/speed';
import { AccuracyAnalysisResult } from '../../types/accuracy';

export interface MergedAttemptResult {
  attemptNumber: 1 | 2 | 3 | 4 | 5;
  attemptId: string;
  videoId: string | null;
  hasVideo: boolean;
  speedResult: SpeedAnalysisResult | null;
  accuracyResult: AccuracyAnalysisResult | null;
  kickDuration: number | null;
  peakSpeed: number | null;
  averageSpeed: number | null;
  speedUnit: 'm/s' | 'px/s';
  distanceToTargetCm: number | null;
  status: 'HIT' | 'MISS' | 'INVALID' | 'BELUM_DIANALISIS';
  isManualCorrected: boolean;
}

export interface SessionAggregatedSummary {
  totalAttempts: number;
  analyzedAttempts: number;
  validAttempts: number;
  invalidAttempts: number;

  hitsCount: number;
  missesCount: number;
  accuracyPercentage: number | null;

  isCalibrated: boolean;
  speedUnit: 'm/s' | 'px/s';

  sessionPeakSpeed: number | null;
  sessionAverageSpeed: number | null;
  sessionAverageDuration: number | null;
  sessionAverageDistanceCm: number | null;

  minPeakSpeed: number | null;
  maxPeakSpeed: number | null;
  minDistanceCm: number | null;
  maxDistanceCm: number | null;

  attempts: MergedAttemptResult[];
}

export const sessionSummaryEngine = {
  aggregateSessionResults: (
    attempts: Attempt[],
    speedMap: { [videoId: string]: SpeedAnalysisResult },
    accuracyMap: { [videoId: string]: AccuracyAnalysisResult }
  ): SessionAggregatedSummary => {
    const sortedAttempts = [...attempts].sort((a, b) => a.attemptNumber - b.attemptNumber);

    const mergedList: MergedAttemptResult[] = sortedAttempts.map((att) => {
      const vidId = att.video?.id || null;
      const spd = vidId ? speedMap[vidId] || null : null;
      const acc = vidId ? accuracyMap[vidId] || null : null;

      let status: MergedAttemptResult['status'] = 'BELUM_DIANALISIS';
      if (!att.video) {
        status = 'BELUM_DIANALISIS';
      } else if (!spd && !acc) {
        status = 'BELUM_DIANALISIS';
      } else if (acc) {
        if (acc.finalResult === 'hit') status = 'HIT';
        else if (acc.finalResult === 'miss') status = 'MISS';
        else status = 'INVALID';
      } else if (spd) {
        status = 'INVALID'; // Ada speed tapi belum dievaluasi akurasi
      }

      const isCalibrated = Boolean(spd?.calibrationAvailable);
      const peakSpeed = spd
        ? isCalibrated && spd.peakSpeedMetersPerSecond !== null
          ? spd.peakSpeedMetersPerSecond
          : spd.peakSpeedPixelsPerSecond
        : null;

      const avgSpeed = spd
        ? isCalibrated && spd.averageSpeedMetersPerSecond !== null
          ? spd.averageSpeedMetersPerSecond
          : spd.averageSpeedPixelsPerSecond
        : null;

      const isManual = Boolean(
        spd?.detectionMethod === 'manual-corrected' ||
        acc?.evaluationMethod === 'manual-corrected'
      );

      return {
        attemptNumber: att.attemptNumber,
        attemptId: att.id,
        videoId: vidId,
        hasVideo: Boolean(att.video),
        speedResult: spd,
        accuracyResult: acc,
        kickDuration: spd?.kickDuration || null,
        peakSpeed,
        averageSpeed: avgSpeed,
        speedUnit: isCalibrated ? 'm/s' : 'px/s',
        distanceToTargetCm: acc?.distanceCentimeters || null,
        status,
        isManualCorrected: isManual,
      };
    });

    const analyzedAttempts = mergedList.filter((m) => m.status !== 'BELUM_DIANALISIS').length;
    const validAttemptsList = mergedList.filter((m) => m.status === 'HIT' || m.status === 'MISS');
    const validAttemptsCount = validAttemptsList.length;
    const invalidCount = mergedList.filter((m) => m.status === 'INVALID').length;

    const hitsCount = validAttemptsList.filter((m) => m.status === 'HIT').length;
    const missesCount = validAttemptsList.filter((m) => m.status === 'MISS').length;

    const accuracyPercentage =
      validAttemptsCount > 0 ? (hitsCount / validAttemptsCount) * 100 : null;

    // Satuan & Kalibrasi Sesi
    const isCalibrated = mergedList.some((m) => m.speedResult?.calibrationAvailable);
    const speedUnit: 'm/s' | 'px/s' = isCalibrated ? 'm/s' : 'px/s';

    // Perhitungan Kecepatan
    const peakSpeeds = validAttemptsList
      .map((m) => m.peakSpeed)
      .filter((v): v is number => typeof v === 'number');

    const avgSpeeds = validAttemptsList
      .map((m) => m.averageSpeed)
      .filter((v): v is number => typeof v === 'number');

    const durations = validAttemptsList
      .map((m) => m.kickDuration)
      .filter((v): v is number => typeof v === 'number');

    const distances = validAttemptsList
      .map((m) => m.distanceToTargetCm)
      .filter((v): v is number => typeof v === 'number');

    const sessionPeakSpeed = peakSpeeds.length > 0 ? Math.max(...peakSpeeds) : null;
    const minPeakSpeed = peakSpeeds.length > 0 ? Math.min(...peakSpeeds) : null;
    const maxPeakSpeed = sessionPeakSpeed;

    const sessionAverageSpeed =
      avgSpeeds.length > 0 ? avgSpeeds.reduce((a, b) => a + b, 0) / avgSpeeds.length : null;

    const sessionAverageDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

    const sessionAverageDistanceCm =
      distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : null;

    const minDistanceCm = distances.length > 0 ? Math.min(...distances) : null;
    const maxDistanceCm = distances.length > 0 ? Math.max(...distances) : null;

    return {
      totalAttempts: MAX_ATTEMPTS,
      analyzedAttempts,
      validAttempts: validAttemptsCount,
      invalidAttempts: invalidCount,
      hitsCount,
      missesCount,
      accuracyPercentage,
      isCalibrated,
      speedUnit,
      sessionPeakSpeed,
      sessionAverageSpeed,
      sessionAverageDuration,
      sessionAverageDistanceCm,
      minPeakSpeed,
      maxPeakSpeed,
      minDistanceCm,
      maxDistanceCm,
      attempts: mergedList,
    };
  },
};