import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { AnalysisSession } from '../types';
import { sessionService } from '../services/sessionService';
import { speedStorageService } from '../services/speed/speedStorageService';
import { accuracyStorageService } from '../services/accuracy/accuracyStorageService';
import { sessionSummaryEngine } from '../services/result/sessionSummaryEngine';
import { formatDate } from '../utils/formatters';
import { ArrowUpRight, Award } from 'lucide-react';

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [sessionSummaries, setSessionSummaries] = useState<{ [id: string]: { accuracy: number | null; peakSpeed: number | null; unit: string } }>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        const sessionList = await sessionService.getAllSessions();
        setSessions(sessionList);

        const summaryMap: { [id: string]: { accuracy: number | null; peakSpeed: number | null; unit: string } } = {};

        for (const ses of sessionList) {
          const spdMap: { [vid: string]: any } = {};
          const accMap: { [vid: string]: any } = {};

          for (const att of ses.attempts) {
            if (att.video) {
              const [s, a] = await Promise.all([
                speedStorageService.getSpeedResultByVideoId(att.video.id),
                accuracyStorageService.getAccuracyResultByVideoId(att.video.id),
              ]);
              if (s) spdMap[att.video.id] = s;
              if (a) accMap[att.video.id] = a;
            }
          }

          const res = sessionSummaryEngine.aggregateSessionResults(ses.attempts, spdMap, accMap);
          summaryMap[ses.id] = {
            accuracy: res.accuracyPercentage,
            peakSpeed: res.sessionPeakSpeed,
            unit: res.speedUnit,
          };
        }

        setSessionSummaries(summaryMap);
      } catch (err) {
        console.error('Gagal memuat hasil evaluasi:', err);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-dark">Hasil Analisis & Komparasi Sesi</h2>
        <p className="text-xs text-dark-secondary">
          Daftar rekapitulasi data akurasi dan kecepatan tendangan depan atlet pencak silat
        </p>
      </div>

      <Card>
        {loading ? (
          <LoadingState message="Memuat daftar hasil sesi..." />
        ) : sessions.length > 0 ? (
          <Table headers={['Kode Sesi', 'Nama Atlet', 'Tanggal', 'Kaki Uji', 'Akurasi Sesi', 'Peak Speed Sesi', 'Aksi']}>
            {sessions.map((ses) => {
              const smry = sessionSummaries[ses.id];
              return (
                <tr key={ses.id} className="text-xs hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-dark">{ses.sessionCode}</td>
                  <td className="px-4 py-3 font-medium text-dark">{ses.athleteName}</td>
                  <td className="px-4 py-3 text-dark-secondary">{formatDate(ses.date)}</td>
                  <td className="px-4 py-3">{ses.kickingLeg}</td>
                  <td className="px-4 py-3 font-mono font-bold text-dark">
                    {smry?.accuracy !== null && smry?.accuracy !== undefined
                      ? `${smry.accuracy.toFixed(1)}%`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-primary">
                    {smry?.peakSpeed !== null && smry?.peakSpeed !== undefined
                      ? `${smry.peakSpeed.toFixed(2)} ${smry.unit}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/hasil/${ses.id}`)}
                      className="font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Buka Komparasi <ArrowUpRight size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState
            title="Belum ada sesi analisis"
            description="Buat sesi analisis baru untuk mulai mengevaluasi performa atlet."
            icon={<Award size={24} />}
          />
        )}
      </Card>
    </div>
  );
};