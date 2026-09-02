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
import { ArrowUpRight, Award, Calendar, Shield, Activity, Target } from 'lucide-react';

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
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-8">
      {/* Header Halaman */}
      <div className="bg-white p-3.5 md:p-0 rounded-xl md:rounded-none border md:border-none border-dark-border">
        <h2 className="text-base md:text-lg font-bold text-dark">Hasil Analisis & Komparasi Sesi</h2>
        <p className="text-[11px] md:text-xs text-dark-secondary mt-0.5">
          Daftar rekapitulasi data akurasi dan kecepatan tendangan depan atlet pencak silat
        </p>
      </div>

      {loading ? (
        <Card>
          <LoadingState message="Memuat daftar hasil sesi..." />
        </Card>
      ) : sessions.length > 0 ? (
        <>
          {/* 1. TAMPILAN MOBILE (Layar HP < md): Format Card List */}
          <div className="block md:hidden space-y-3">
            {sessions.map((ses) => {
              const smry = sessionSummaries[ses.id];
              return (
                <div
                  key={ses.id}
                  className="bg-white border border-dark-border rounded-xl p-3.5 shadow-xs space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-dark text-sm">{ses.sessionCode}</span>
                        <Badge variant={ses.status === 'Selesai' ? 'success' : 'neutral'}>
                          {ses.status || 'DRAFT'}
                        </Badge>
                      </div>
                      <span className="font-semibold text-slate-800 text-xs block mt-0.5">
                        {ses.athleteName}
                      </span>
                    </div>

                    <div className="text-right text-[11px] text-dark-secondary shrink-0">
                      <span className="flex items-center gap-1 justify-end">
                        <Calendar size={12} /> {formatDate(ses.date)}
                      </span>
                      <span className="flex items-center gap-1 justify-end mt-0.5 text-primary font-medium">
                        <Shield size={12} /> Kaki {ses.kickingLeg}
                      </span>
                    </div>
                  </div>

                  {/* Metrik Akurasi & Peak Speed */}
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                      <span className="text-dark-secondary block text-[10px] font-sans flex items-center gap-1">
                        <Target size={11} className="text-emerald-600" /> Akurasi Sesi
                      </span>
                      <span className="font-bold text-dark text-sm mt-0.5 block">
                        {smry?.accuracy !== null && smry?.accuracy !== undefined
                          ? `${smry.accuracy.toFixed(1)}%`
                          : '-'}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                      <span className="text-dark-secondary block text-[10px] font-sans flex items-center gap-1">
                        <Activity size={11} className="text-primary" /> Kecepatan Puncak
                      </span>
                      <span className="font-bold text-primary text-sm mt-0.5 block">
                        {smry?.peakSpeed !== null && smry?.peakSpeed !== undefined
                          ? `${smry.peakSpeed.toFixed(2)} ${smry.unit}`
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Buka Komparasi */}
                  <button
                    onClick={() => navigate(`/hasil/${ses.id}`)}
                    className="w-full py-2 bg-rose-900 hover:bg-rose-950 text-white font-semibold rounded-lg text-center flex items-center justify-center gap-1.5 text-xs transition-colors shadow-xs"
                  >
                    Buka Hasil Komparasi <ArrowUpRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* 2. TAMPILAN DESKTOP (Layar >= md): Tabel Lebar Tradisional */}
          <Card className="hidden md:block">
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
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState
            title="Belum ada sesi analisis"
            description="Buat sesi analisis baru untuk mulai mengevaluasi performa atlet."
            icon={<Award size={24} />}
          />
        </Card>
      )}
    </div>
  );
};