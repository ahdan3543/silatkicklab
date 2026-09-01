import { AnalysisSession, Athlete } from './index';
import { TargetDefinition } from './accuracy';
import { SessionAggregatedSummary } from '../services/result/sessionSummaryEngine';
import { SessionQualityReport } from './validation';

export interface AnalysisReport {
  sessionId: string;
  athleteId: string;
  generatedAt: string;
  reportVersion: string;
  athlete: Athlete | null;
  session: AnalysisSession;
  target: TargetDefinition | null;
  summary: SessionAggregatedSummary | null;
  qualityReport: SessionQualityReport | null;
  userNotes?: string;
}