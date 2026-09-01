import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { AthletePage } from './pages/AthletePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { VideoAnalysisView } from './features/analysis/VideoAnalysisView';
import { ResultPage } from './pages/ResultPage';
import { SessionResultPage } from './pages/SessionResultPage';
import { AnalysisReportPage } from './pages/AnalysisReportPage';
import { ReportPage } from './pages/ReportPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="atlet" element={<AthletePage />} />
          <Route path="analisis" element={<AnalysisPage />} />
          <Route path="analisis/:id" element={<SessionDetailPage />} />
          <Route path="analisis/:sessionId/attempt/:attemptId" element={<VideoAnalysisView />} />
          <Route path="hasil" element={<ResultPage />} />
          <Route path="hasil/:sessionId" element={<SessionResultPage />} />
          <Route path="analisis/:sessionId/hasil" element={<SessionResultPage />} />
          <Route path="analisis/:sessionId/laporan" element={<AnalysisReportPage />} />
          <Route path="laporan" element={<ReportPage />} />
          <Route path="pengaturan" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;