import { AnalysisSession, SessionAttempt, SessionStatus, MAX_ATTEMPTS } from '../types';
import { mockSessions } from '../data/mockData';
import { VideoMetadata } from '../types/video';

const STORAGE_KEY = 'silat_motion_sessions';

const initializeAttempts = (sessionId: string): SessionAttempt[] => {
  return Array.from({ length: MAX_ATTEMPTS }, (_, idx) => ({
    id: `att-${sessionId}-${idx + 1}`,
    sessionId,
    attemptNumber: (idx + 1) as 1 | 2 | 3 | 4 | 5,
    videoId: null,
    video: null,
    resultId: null,
    status: 'Belum Diunggah',
    createdAt: new Date().toISOString(),
  }));
};

const determineSessionStatus = (attempts: SessionAttempt[]): SessionStatus => {
  const uploadedCount = attempts.filter((a) => !!a.video || a.status === 'Video Tersedia').length;
  if (uploadedCount === 0) return 'Draft';
  if (uploadedCount === MAX_ATTEMPTS) return 'Siap Dianalisis';
  return 'Berlangsung';
};

export const sessionService = {
  getAllSessions: async (): Promise<AnalysisSession[]> => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSessions));
      return mockSessions;
    }
    return JSON.parse(data);
  },

  getSessionById: async (id: string): Promise<AnalysisSession | null> => {
    const sessions = await sessionService.getAllSessions();
    return sessions.find((s) => s.id === id) || null;
  },

  getSessionsByAthleteId: async (athleteId: string): Promise<AnalysisSession[]> => {
    const sessions = await sessionService.getAllSessions();
    return sessions.filter((s) => s.athleteId === athleteId);
  },

  createSession: async (payload: {
    athleteId: string;
    athleteName?: string;
    athleteCode?: string;
    date: string;
    kickingLeg: 'Kanan' | 'Kiri';
    notes?: string;
  }): Promise<AnalysisSession> => {
    const sessions = await sessionService.getAllSessions();
    const newId = `ses-${Date.now()}`;
    const sessionCode = `SES-${payload.date.replace(/-/g, '')}-${String(sessions.length + 1).padStart(3, '0')}`;

    const newSession: AnalysisSession = {
      id: newId,
      sessionCode,
      athleteId: payload.athleteId,
      athleteName: payload.athleteName,
      athleteCode: payload.athleteCode,
      date: payload.date,
      kickingLeg: payload.kickingLeg,
      notes: payload.notes,
      status: 'Draft',
      attempts: initializeAttempts(newId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sessions.unshift(newSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return newSession;
  },

  updateSession: async (id: string, updates: Partial<AnalysisSession>): Promise<AnalysisSession> => {
    const sessions = await sessionService.getAllSessions();
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Sesi tidak ditemukan');

    const updated = {
      ...sessions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updated.attempts) {
      updated.status = determineSessionStatus(updated.attempts);
    }

    sessions[index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return updated;
  },

  updateAttemptVideo: async (
    sessionId: string,
    attemptId: string,
    metadata: VideoMetadata,
    _blob?: Blob
  ): Promise<AnalysisSession> => {
    const session = await sessionService.getSessionById(sessionId);
    if (!session) throw new Error('Sesi tidak ditemukan');

    const attemptIndex = session.attempts.findIndex((a) => a.id === attemptId);
    if (attemptIndex !== -1) {
      session.attempts[attemptIndex].video = metadata;
      session.attempts[attemptIndex].videoId = metadata.id;
      session.attempts[attemptIndex].status = 'Video Tersedia';
    }

    return await sessionService.updateSession(sessionId, { attempts: session.attempts });
  },

  deleteSession: async (id: string): Promise<void> => {
    const sessions = await sessionService.getAllSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  removeAttemptVideo: async (sessionId: string, attemptId: string): Promise<void> => {
    const session = await sessionService.getSessionById(sessionId);
    if (!session) return;

    const attemptIndex = session.attempts.findIndex((a) => a.id === attemptId);
    if (attemptIndex !== -1) {
      session.attempts[attemptIndex].video = null;
      session.attempts[attemptIndex].videoId = null;
      session.attempts[attemptIndex].status = 'Belum Diunggah';
      await sessionService.updateSession(sessionId, { attempts: session.attempts });
    }
  },
};