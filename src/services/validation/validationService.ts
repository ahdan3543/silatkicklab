import { AnalysisSession, Athlete, MAX_ATTEMPTS } from '../../types';
import { PoseAnalysisResult } from '../../types/pose';
import { SpeedAnalysisResult } from '../../types/speed';
import { TargetDefinition, AccuracyAnalysisResult } from '../../types/accuracy';
import {
  ValidationItem,
  CategoryStatusSummary,
  SessionQualityReport,
  FinalQualityStatus,
  ValidationStatus,
} from '../../types/validation';

export const validationService = {
  validateSessionQuality: (
    session: AnalysisSession | null,
    athlete: Athlete | null,
    target: TargetDefinition | null,
    poseMap: { [videoId: string]: PoseAnalysisResult },
    speedMap: { [videoId: string]: SpeedAnalysisResult },
    accuracyMap: { [videoId: string]: AccuracyAnalysisResult }
  ): SessionQualityReport => {
    const items: ValidationItem[] = [];

    if (!session) {
      items.push({
        id: 'val-ses-1',
        category: 'SESSION',
        status: 'ERROR',
        code: 'SESSION_NOT_FOUND',
        message: 'Data sesi analisis tidak ditemukan dalam sistem penyimpanan.',
      });
      return generateQualityReport('', items, 0, 0, 0, 0, 0);
    }

    if (!athlete) {
      items.push({
        id: 'val-ath-1',
        category: 'ATHLETE',
        status: 'ERROR',
        code: 'ATHLETE_NOT_FOUND',
        message: 'Profil atlet tidak ditemukan atau terputus relasinya.',
      });
    } else {
      items.push({
        id: 'val-ath-2',
        category: 'ATHLETE',
        status: 'VALID',
        message: `Profil atlet valid: ${athlete.name} (${athlete.athleteCode}) - Kaki Dominan: ${athlete.dominantLeg}`,
      });
    }

    if (!target) {
      items.push({
        id: 'val-tar-1',
        category: 'TARGET',
        status: 'WARNING',
        code: 'TARGET_MISSING',
        message: 'Target sasaran belum ditentukan untuk sesi ini.',
      });
    } else if (
      target.centerX < 0 ||
      target.centerX > 1 ||
      target.centerY < 0 ||
      target.centerY > 1 ||
      target.radiusNormalized <= 0
    ) {
      items.push({
        id: 'val-tar-2',
        category: 'TARGET',
        status: 'ERROR',
        code: 'TARGET_COORDINATES_INVALID',
        message: 'Koordinat target berada di luar batas normal frame video (0.0 - 1.0).',
      });
    } else {
      items.push({
        id: 'val-tar-3',
        category: 'TARGET',
        status: 'VALID',
        message: `Target sasaran terkalibrasi normal: Posisi (${(target.centerX * 100).toFixed(1)}%, ${(target.centerY * 100).toFixed(1)}%), Radius: ${(target.radiusNormalized * 100).toFixed(1)}%`,
      });
    }

    const attempts = session.attempts || [];
    const attemptNumbers = attempts.map((a) => a.attemptNumber);
    const hasDuplicates = new Set(attemptNumbers).size !== attemptNumbers.length;

    if (hasDuplicates) {
      items.push({
        id: 'val-att-dup',
        category: 'SESSION',
        status: 'ERROR',
        code: 'ATTEMPT_DUPLICATE',
        message: 'Ditemukan duplikasi nomor percobaan dalam sesi ini.',
      });
    }

    let videoCount = 0;
    let poseCount = 0;
    let speedCount = 0;
    let accuracyCount = 0;
    let calibrationCount = 0;

    for (const att of attempts) {
      const pNum = att.attemptNumber;
      const vid = att.video;

      if (!vid) {
        items.push({
          id: `val-vid-missing-${att.id}`,
          category: 'VIDEO',
          status: 'INCOMPLETE',
          code: 'VIDEO_MISSING',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: File video belum diunggah.`,
        });
        continue;
      }

      videoCount++;
      if (vid.durationSeconds <= 0 || vid.fileSize <= 0) {
        items.push({
          id: `val-vid-corrupt-${att.id}`,
          category: 'VIDEO',
          status: 'ERROR',
          code: 'VIDEO_INVALID',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Metadata video tidak valid.`,
        });
      } else {
        items.push({
          id: `val-vid-ok-${att.id}`,
          category: 'VIDEO',
          status: 'VALID',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Video valid (${vid.fileName}, ${vid.durationSeconds.toFixed(2)}s).`,
        });
      }

      const pose = poseMap[vid.id];
      const spd = speedMap[vid.id];
      const acc = accuracyMap[vid.id];

      if (spd && spd.attemptId !== att.id) {
        items.push({
          id: `val-con-spd-${att.id}`,
          category: 'CONSISTENCY',
          status: 'ERROR',
          code: 'RESULT_MISMATCH',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Relasi data kecepatan tidak cocok dengan ID percobaan.`,
        });
      }
      if (acc && acc.attemptId !== att.id) {
        items.push({
          id: `val-con-acc-${att.id}`,
          category: 'CONSISTENCY',
          status: 'ERROR',
          code: 'RESULT_MISMATCH',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Relasi data akurasi tidak cocok dengan ID percobaan.`,
        });
      }

      if (!pose) {
        items.push({
          id: `val-pose-missing-${att.id}`,
          category: 'POSE',
          status: 'INCOMPLETE',
          code: 'POSE_MISSING',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Pose landmark belum diekstraksi.`,
        });
      } else if (!pose.frames || pose.frames.length === 0 || pose.framesWithPoseCount === 0) {
        items.push({
          id: `val-pose-zero-${att.id}`,
          category: 'POSE',
          status: 'ERROR',
          code: 'POSE_FRAMES_INVALID',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Landmark tidak terdeteksi.`,
        });
      } else {
        poseCount++;
        items.push({
          id: `val-pose-ok-${att.id}`,
          category: 'POSE',
          status: 'VALID',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Pose valid (${pose.framesWithPoseCount} frame).`,
        });
      }

      if (!spd) {
        items.push({
          id: `val-spd-missing-${att.id}`,
          category: 'SPEED',
          status: 'INCOMPLETE',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Analisis kecepatan belum dijalankan.`,
        });
      } else {
        speedCount++;
        if (spd.kickStartFrame >= spd.impactFrame) {
          items.push({
            id: `val-spd-frame-inv-${att.id}`,
            category: 'SPEED',
            status: 'ERROR',
            code: 'IMPACT_FRAME_INVALID',
            attemptNumber: pNum,
            attemptId: att.id,
            message: `Percobaan #${pNum}: Start Frame >= Impact Frame.`,
          });
        } else if (spd.calibrationAvailable && spd.metersPerPixel) {
          calibrationCount++;
          items.push({
            id: `val-spd-calib-ok-${att.id}`,
            category: 'SPEED',
            status: 'VALID',
            attemptNumber: pNum,
            attemptId: att.id,
            message: `Percobaan #${pNum}: Terkalibrasi (${spd.peakSpeedMetersPerSecond?.toFixed(2)} m/s).`,
          });
        } else {
          items.push({
            id: `val-spd-uncalib-${att.id}`,
            category: 'SPEED',
            status: 'WARNING',
            code: 'CALIBRATION_MISSING',
            attemptNumber: pNum,
            attemptId: att.id,
            message: `Percobaan #${pNum}: Belum dikalibrasi skala meter (${spd.peakSpeedPixelsPerSecond.toFixed(0)} px/s).`,
          });
        }
      }

      if (!acc) {
        items.push({
          id: `val-acc-missing-${att.id}`,
          category: 'ACCURACY',
          status: 'INCOMPLETE',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Evaluasi akurasi belum diproses.`,
        });
      } else if (acc.finalResult === 'invalid') {
        items.push({
          id: `val-acc-inv-${att.id}`,
          category: 'ACCURACY',
          status: 'WARNING',
          code: 'ACCURACY_INVALID',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Posisi kaki impak tidak valid.`,
        });
      } else {
        accuracyCount++;
        items.push({
          id: `val-acc-ok-${att.id}`,
          category: 'ACCURACY',
          status: 'VALID',
          attemptNumber: pNum,
          attemptId: att.id,
          message: `Percobaan #${pNum}: Akurasi valid [${acc.finalResult.toUpperCase()}].`,
        });
      }
    }

    return generateQualityReport(
      session.id,
      items,
      videoCount,
      poseCount,
      speedCount,
      accuracyCount,
      calibrationCount
    );
  },
};

const generateQualityReport = (
  sessionId: string,
  items: ValidationItem[],
  videoCount: number,
  poseCount: number,
  speedCount: number,
  accuracyCount: number,
  calibrationCount: number
): SessionQualityReport => {
  const hasError = items.some((i) => i.status === 'ERROR');
  const hasIncomplete = items.some((i) => i.status === 'INCOMPLETE');
  const hasWarning = items.some((i) => i.status === 'WARNING');

  let overallStatus: FinalQualityStatus = 'READY';
  if (hasError) overallStatus = 'ERROR';
  else if (hasIncomplete) overallStatus = 'INCOMPLETE';
  else if (hasWarning) overallStatus = 'WARNING';
  else overallStatus = 'READY';

  const totalRequiredSteps = MAX_ATTEMPTS * 4;
  const completedSteps = videoCount + poseCount + speedCount + accuracyCount;
  const completenessPercentage = Math.round((completedSteps / totalRequiredSteps) * 100);

  const getCategoryStatus = (cat: ValidationItem['category']): ValidationStatus => {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.some((i) => i.status === 'ERROR')) return 'ERROR';
    if (catItems.some((i) => i.status === 'INCOMPLETE')) return 'INCOMPLETE';
    if (catItems.some((i) => i.status === 'WARNING')) return 'WARNING';
    return 'VALID';
  };

  const categories: CategoryStatusSummary[] = [
    {
      category: 'ATHLETE',
      title: 'Data Atlet',
      status: getCategoryStatus('ATHLETE'),
      message: getCategoryStatus('ATHLETE') === 'VALID' ? 'Profil atlet lengkap' : 'Data atlet bermasalah',
      validCount: 1,
      totalRequired: 1,
    },
    {
      category: 'VIDEO',
      title: 'File Video 5x',
      status: getCategoryStatus('VIDEO'),
      message: `${videoCount}/${MAX_ATTEMPTS} Video tersedia`,
      validCount: videoCount,
      totalRequired: MAX_ATTEMPTS,
    },
    {
      category: 'POSE',
      title: 'Pose Landmark',
      status: getCategoryStatus('POSE'),
      message: `${poseCount}/${MAX_ATTEMPTS} Pose terekstraksi`,
      validCount: poseCount,
      totalRequired: MAX_ATTEMPTS,
    },
    {
      category: 'SPEED',
      title: 'Kecepatan & Fase',
      status: getCategoryStatus('SPEED'),
      message: `${speedCount}/${MAX_ATTEMPTS} Dianalisis (${calibrationCount} Terkalibrasi)`,
      validCount: speedCount,
      totalRequired: MAX_ATTEMPTS,
    },
    {
      category: 'TARGET',
      title: 'Target Sasaran',
      status: getCategoryStatus('TARGET'),
      message: getCategoryStatus('TARGET') === 'VALID' ? 'Sasaran terkalibrasi' : 'Target belum diatur',
      validCount: getCategoryStatus('TARGET') === 'VALID' ? 1 : 0,
      totalRequired: 1,
    },
    {
      category: 'ACCURACY',
      title: 'Akurasi Sasaran',
      status: getCategoryStatus('ACCURACY'),
      message: `${accuracyCount}/${MAX_ATTEMPTS} Percobaan tervalidasi`,
      validCount: accuracyCount,
      totalRequired: MAX_ATTEMPTS,
    },
    {
      category: 'CONSISTENCY',
      title: 'Konsistensi Relasi',
      status: getCategoryStatus('CONSISTENCY'),
      message: getCategoryStatus('CONSISTENCY') === 'VALID' ? 'Relasi ID terverifikasi' : 'Terjadi desinkronisasi data',
      validCount: 1,
      totalRequired: 1,
    },
  ];

  return {
    sessionId,
    overallStatus,
    isReadyForReport: overallStatus === 'READY',
    completenessPercentage,
    items,
    categories,
    counts: {
      videoCount,
      poseCount,
      speedCount,
      accuracyCount,
      calibrationCount,
      totalAttempts: MAX_ATTEMPTS,
    },
  };
};