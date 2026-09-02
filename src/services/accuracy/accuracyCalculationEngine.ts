import {
  TargetDefinition,
  AccuracyAnalysisResult,
  AccuracyEvaluationResult,
  SessionAccuracySummary,
} from '../../types/accuracy';
import { CalibrationData } from '../../types/analysis';

export const accuracyCalculationEngine = {
  calculateAccuracy: (
    target: any,
    poseResult: any,
    speedResult?: any,
    ...args: any[]
  ): AccuracyAnalysisResult => {
    // 1. Ekstraksi argumen fleksibel (kompatibel caller lama & baru)
    const impactFrameIndex: number =
      speedResult?.impactFrame ??
      (typeof args[0] === 'number' ? args[0] : 1);

    const calibration: CalibrationData | null =
      args.find((a) => a && (a.metersPerPixel || a.pixelDistance || a.pixelToMeterRatio)) || null;

    // Dimensi video aktual (fallback ke 1920x1080 hanya jika tidak dilewatkan)
    const videoWidth: number =
      typeof args[1] === 'number' && args[1] > 0
        ? args[1]
        : (typeof args[2] === 'number' && args[2] > 0 ? args[2] : 1920);

    const videoHeight: number =
      typeof args[2] === 'number' && args[2] > 0
        ? args[2]
        : (typeof args[3] === 'number' && args[3] > 0 ? args[3] : 1080);

    // Kaki dominan: pastikan strict mengacu pada kaki uji atlet
    const dominantLeg: 'Kanan' | 'Kiri' =
      args.find((a) => a === 'Kanan' || a === 'Kiri') ||
      (speedResult?.trackingPoint === 'LEFT_FOOT' ? 'Kiri' : 'Kanan');

    // 2. Ekstraksi Target Center & Radius
    const targetNormX =
      target?.xNormalized ??
      target?.centerNormalized?.x ??
      target?.targetCenter?.normalizedX ??
      target?.centerX ??
      target?.x ??
      0.5;

    const targetNormY =
      target?.yNormalized ??
      target?.centerNormalized?.y ??
      target?.targetCenter?.normalizedY ??
      target?.centerY ??
      target?.y ??
      0.5;

    const targetRadiusNorm =
      target?.radiusNormalized ??
      target?.radius ??
      target?.targetRadiusNormalized ??
      0.05;

    // Radius visual identik TargetOverlay: menggunakan Math.min(videoWidth, videoHeight)
    const minDimension = Math.min(videoWidth, videoHeight);
    const targetRadiusPixels = targetRadiusNorm * minDimension;

    // 3. Ambil Frame Pose pada Impact Frame Terpilih
    const frames: any[] = poseResult?.frames || [];
    let frame = frames.find(
      (f) => f.frameIndex === impactFrameIndex || f.frameNumber === impactFrameIndex
    );

    if (!frame && frames.length > 0) {
      frame = frames[impactFrameIndex - 1] || frames[0];
    }

    const keypoints: any[] = frame?.keypoints || frame?.landmarks || [];

    if (!frame || keypoints.length === 0) {
      return {
        id: `acc-${Date.now()}`,
        attemptId: speedResult?.attemptId || '',
        videoId: speedResult?.videoId || '',
        targetId: target?.id || '',
        impactFrameIndex,
        impactPoint: { x: 0, y: 0, normalizedX: 0, normalizedY: 0 },
        impactFootPosition: { x: 0, y: 0 },
        targetCenter: {
          x: targetNormX * videoWidth,
          y: targetNormY * videoHeight,
          normalizedX: targetNormX,
          normalizedY: targetNormY,
        },
        targetRadiusNormalized: targetRadiusNorm,
        targetRadiusPixels,
        distancePixels: 0,
        distanceCentimeters: null,
        distanceRatioToRadius: 0,
        autoResult: 'invalid',
        finalResult: 'invalid',
        isManualCorrected: false,
        evaluationMethod: 'automatic',
        analyzedAt: new Date().toISOString(),
      };
    }

    // 4. KUNCI LANDMARK: KAKI DOMINAN + FOOT INDEX (TOE)
    // MediaPipe: 32 = Right Foot Index, 28 = Right Ankle | 31 = Left Foot Index, 27 = Left Ankle
    const isRight = dominantLeg === 'Kanan';
    const primaryIndex = isRight ? 32 : 31;
    const fallbackIndex = isRight ? 28 : 27;

    const namedPrimary = isRight ? 'right_foot_index' : 'left_foot_index';
    const namedFallback = isRight ? 'right_ankle' : 'left_ankle';

    let chosenLandmark =
      keypoints[primaryIndex] ||
      keypoints.find((k: any) => k?.name === namedPrimary);

    // Validasi titik primary (foot index)
    const isPrimaryValid =
      chosenLandmark &&
      typeof chosenLandmark.x === 'number' &&
      typeof chosenLandmark.y === 'number' &&
      (chosenLandmark.visibility === undefined || chosenLandmark.visibility > 0.25);

    // Jika foot index tidak valid, gunakan ankle kaki dominan sebagai fallback
    if (!isPrimaryValid) {
      chosenLandmark =
        keypoints[fallbackIndex] ||
        keypoints.find((k: any) => k?.name === namedFallback);
    }

    // Jika titik kaki dominan sama sekali tidak terdeteksi, return invalid
    if (!chosenLandmark || typeof chosenLandmark.x !== 'number' || typeof chosenLandmark.y !== 'number') {
      return {
        id: `acc-${Date.now()}`,
        attemptId: speedResult?.attemptId || '',
        videoId: speedResult?.videoId || '',
        targetId: target?.id || '',
        impactFrameIndex,
        impactPoint: { x: 0, y: 0, normalizedX: 0, normalizedY: 0 },
        impactFootPosition: { x: 0, y: 0 },
        targetCenter: {
          x: targetNormX * videoWidth,
          y: targetNormY * videoHeight,
          normalizedX: targetNormX,
          normalizedY: targetNormY,
        },
        targetRadiusNormalized: targetRadiusNorm,
        targetRadiusPixels,
        distancePixels: 0,
        distanceCentimeters: null,
        distanceRatioToRadius: 0,
        autoResult: 'invalid',
        finalResult: 'invalid',
        isManualCorrected: false,
        evaluationMethod: 'automatic',
        analyzedAt: new Date().toISOString(),
      };
    }

    const footNormX = chosenLandmark.x;
    const footNormY = chosenLandmark.y;

    // 5. Hitung Deviasi Euclidean dalam Pixel Aktual Video
    const footPixelX = footNormX * videoWidth;
    const footPixelY = footNormY * videoHeight;

    const targetPixelX = targetNormX * videoWidth;
    const targetPixelY = targetNormY * videoHeight;

    const dxPx = footPixelX - targetPixelX;
    const dyPx = footPixelY - targetPixelY;
    const distancePixels = Math.hypot(dxPx, dyPx);

    // Toleransi kontak sol/sepatu: 15%
    const effectiveRadius = targetRadiusPixels * 1.15;
    const isHit = distancePixels <= effectiveRadius;
    const autoResult: AccuracyEvaluationResult = isHit ? 'hit' : 'miss';

    // 6. Konversi ke Centimeter
    let distanceCm: number | null = null;
    if (calibration) {
      if ((calibration as any).pixelToMeterRatio && (calibration as any).pixelToMeterRatio > 0) {
        distanceCm = (distancePixels / (calibration as any).pixelToMeterRatio) * 100;
      } else if (calibration.metersPerPixel && calibration.pixelDistance > 0) {
        distanceCm = distancePixels * calibration.metersPerPixel * 100;
      }
    }

    if (distanceCm === null || distanceCm === undefined || isNaN(distanceCm)) {
      // Fallback estimasi metrik real-world jika belum kalibrasi
      distanceCm = Number(((distancePixels / minDimension) * 180).toFixed(1));
    }

    return {
      id: `acc-${Date.now()}`,
      attemptId: speedResult?.attemptId || '',
      videoId: speedResult?.videoId || '',
      targetId: target?.id || '',
      impactFrameIndex,
      impactPoint: {
        x: footPixelX,
        y: footPixelY,
        normalizedX: footNormX,
        normalizedY: footNormY,
      },
      impactFootPosition: {
        x: footNormX,
        y: footNormY,
      },
      targetCenter: {
        x: targetPixelX,
        y: targetPixelY,
        normalizedX: targetNormX,
        normalizedY: targetNormY,
      },
      targetRadiusNormalized: targetRadiusNorm,
      targetRadiusPixels,
      distancePixels,
      distanceCentimeters: distanceCm,
      distanceRatioToRadius: targetRadiusPixels > 0 ? distancePixels / targetRadiusPixels : 0,
      autoResult,
      finalResult: autoResult,
      isManualCorrected: false,
      evaluationMethod: 'automatic',
      analyzedAt: new Date().toISOString(),
    };
  },

  evaluateAttemptAccuracy: (...args: any[]): AccuracyAnalysisResult => {
    // Menghubungkan secara aman apapun urutan parameter pemanggilan
    let target = args.find((a) => a && (a.radiusNormalized !== undefined || a.radius !== undefined || a.centerX !== undefined || a.xNormalized !== undefined));
    let poseResult = args.find((a) => a && Array.isArray(a.frames));
    let impactFrame = args.find((a) => typeof a === 'number' && a > 0 && a <= 1000);
    let calibration = args.find((a) => a && (a.metersPerPixel || a.pixelToMeterRatio || a.pixelDistance));
    let dominantLeg = args.find((a) => a === 'Kanan' || a === 'Kiri') || 'Kanan';

    // Cari dimensi video
    const numericArgs = args.filter((a) => typeof a === 'number');
    const width = numericArgs.find((n) => n >= 300 && n <= 7680) || 1920;
    const height = numericArgs.find((n) => n >= 200 && n !== width) || 1080;

    const speedResult = { impactFrame: impactFrame || 1 };

    return accuracyCalculationEngine.calculateAccuracy(
      target,
      poseResult,
      speedResult,
      impactFrame,
      calibration,
      width,
      height,
      dominantLeg
    );
  },

  computeSessionSummary: (results: AccuracyAnalysisResult[]): SessionAccuracySummary => {
    const validResults = (results || []).filter((r) => r && r.finalResult !== 'invalid');
    const hits = validResults.filter((r) => r.finalResult === 'hit').length;
    const misses = validResults.filter((r) => r.finalResult === 'miss').length;
    const validCount = validResults.length;
    const accPct = validCount > 0 ? (hits / validCount) * 100 : 0;

    const distances = validResults
      .map((r) => r.distanceCentimeters)
      .filter((d): d is number => d !== null && d !== undefined);
    const avgDist =
      distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : null;

    return {
      totalEvaluated: (results || []).length,
      hitsCount: hits,
      missesCount: misses,
      validAttempts: validCount,
      accuracyPercentage: accPct,
      averageDistanceCm: avgDist,
      avgDistanceCentimeters: avgDist,
    };
  },
};