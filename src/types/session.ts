import { VideoMetadata } from './video';

export type SessionStatus =
  | 'DRAFT'
  | 'Draft'
  | 'READY'
  | 'Siap Dianalisis'
  | 'Berlangsung'
  | 'Selesai'
  | 'Completed'
  | string;

export interface SessionAttempt {
  id: string;
  sessionId: string;
  attemptNumber: number | 1 | 2 | 3 | 4 | 5;
  videoId?: string | null;
  video?: VideoMetadata | null;
  status?: 'Belum Diunggah' | 'Video Tersedia' | 'Dianalisis' | string;
  resultId?: string | null;
  result?: any;
  createdAt?: string;
  updatedAt?: string;
}

export type Attempt = SessionAttempt;

export interface AnalysisSession {
  id: string;
  sessionCode: string;
  athleteId: string;
  athleteName?: string;
  athleteCode?: string;
  date: string;
  kickingLeg: 'Kanan' | 'Kiri';
  status?: SessionStatus;
  attempts: SessionAttempt[];
  summary?: any;
  createdAt: string;
  updatedAt: string;
}

export const MAX_ATTEMPTS = 5;