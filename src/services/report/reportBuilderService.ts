// src/services/report/reportBuilderService.ts
import { sessionService } from '../sessionService';
import { athleteService } from '../athleteService';
import { accuracyStorageService } from '../accuracy/accuracyStorageService';
import { poseStorageService } from '../videoAnalysis/poseStorageService';
import { speedStorageService } from '../speed/speedStorageService';
import { validationService } from '../validation/validationService';
import { sessionSummaryEngine } from '../result/sessionSummaryEngine';
import { AnalysisReport } from '../../types/report';
import { PoseAnalysisResult } from '../../types/pose';
import { SpeedAnalysisResult } from '../../types/speed';
import { AccuracyAnalysisResult } from '../../types/accuracy';

export const reportBuilderService = {
  buildReport: async (sessionId: string): Promise<AnalysisReport | null> => {
    const session = await sessionService.getSessionById(sessionId);
    if (!session) return null;

    const [athlete, target] = await Promise.all([
      athleteService.getAthleteById(session.athleteId),
      accuracyStorageService.getTargetBySessionId(sessionId),
    ]);

    const poseMap: { [videoId: string]: PoseAnalysisResult } = {};
    const speedMap: { [videoId: string]: SpeedAnalysisResult } = {};
    const accuracyMap: { [videoId: string]: AccuracyAnalysisResult } = {};

    for (const att of session.attempts || []) {
      if (att.video) {
        const [p, s, a] = await Promise.all([
          poseStorageService.getPoseResultByVideoId(att.video.id),
          speedStorageService.getSpeedResultByVideoId(att.video.id),
          accuracyStorageService.getAccuracyResultByVideoId(att.video.id),
        ]);
        if (p) poseMap[att.video.id] = p;
        if (s) speedMap[att.video.id] = s;
        if (a) accuracyMap[att.video.id] = a;
      }
    }

    const summary = sessionSummaryEngine.aggregateSessionResults(
      session.attempts || [],
      speedMap,
      accuracyMap
    );

    const qualityReport = validationService.validateSessionQuality(
      session,
      athlete || null,
      target || null,
      poseMap,
      speedMap,
      accuracyMap
    );

    // Ambil catatan observasi yang tersimpan di localStorage (jika ada)
    const savedNotes = localStorage.getItem(`report_notes_${sessionId}`) || '';

    return {
      sessionId: session.id,
      athleteId: session.athleteId,
      generatedAt: new Date().toISOString(),
      reportVersion: '1.0',
      athlete: athlete || null,
      session,
      target: target || null,
      summary,
      qualityReport,
      userNotes: savedNotes,
    };
  },

  saveNotes: (sessionId: string, notes: string): void => {
    localStorage.setItem(`report_notes_${sessionId}`, notes);
  },
};