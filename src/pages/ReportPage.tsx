import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  FileText,
  Footprints,
  Target,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
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

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [summaries, setSummaries] = useState<{
    [id: string]: { accuracy: number | null; peakSpeed: number | null; averageSpeed: number | null; unit: string };
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const sessionList = await sessionService.getAllSessions();
        setSessions(sessionList || []);

        const map: typeof summaries = {};
        for (const session of sessionList || []) {
          const speedMap: Record<string, any> = {};
          const accuracyMap: Record<string, any> = {};

          for (const attempt of session.attempts || []) {
            if (!attempt.video) continue;
            const [speed, accuracy] = await Promise.all([
              speedStorageService.getSpeedResultByVideoId(attempt.video.id),
              accuracyStorageService.getAccuracyResultByVideoId(attempt.video.id),
            ]);
            if (speed) speedMap[attempt.video.id] = speed;
            if (accuracy) accuracyMap[attempt.video.id] = accuracy;
          }

          const result = sessionSummaryEngine.aggregateSessionResults(
            session.attempts || [],
            speedMap,
            accuracyMap
          );

          map[session.id] = {
            accuracy: result.accuracyPercentage,
            peakSpeed: result.sessionPeakSpeed,
            averageSpeed: result.sessionAverageSpeed,
            unit: result.speedUnit || 'm/s',
          };
        }
        setSummaries(map);
      } catch (error) {
        console.error('Gagal memuat laporan komparasi:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const stats = useMemo(() => {
    const available = sessions.filter((session) => {
      const summary = summaries[session.id];
      return summary?.accuracy !== null && summary?.accuracy !== undefined;
    });

    const passed = available.filter((session) => {
      const summary = summaries[session.id];
      return (summary?.accuracy ?? 0) >= 85 && (summary?.peakSpeed ?? 0) >= 13;
    });

    const accuracyValues = available
      .map((session) => summaries[session.id]?.accuracy)
      .filter((value): value is number => typeof value === 'number');

    return {
      total: sessions.length,
      available: available.length,
      passed: passed.length,
      averageAccuracy: accuracyValues.length
        ? accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length
        : null,
    };
  }, [sessions, summaries]);

  const getStatus = (accuracy: number | null, speed: number | null) => {
    if (accuracy === null || speed === null) return null;
    if (accuracy >= 85 && speed >= 13) return 'Memenuhi';
    if (accuracy >= 85 || speed >= 13) return 'Monitoring';
    return 'Belum Memenuhi';
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6 pb-12">
      {/* Header mengikuti Beranda / Data Atlet / Analisis */}
      <section className="page-hero">
        <div className="page-hero-content">
          <h1 className="mt-5 text-[34px] sm:text-[43px] font-extrabold leading-none tracking-[-.045em] text-slate-900">
            Laporan <span className="text-[#a40000]">Komparasi</span>
          </h1>
          <p className="mt-4 max-w-[600px] text-[13px] sm:text-[15px] leading-relaxed text-slate-600">
            Kumpulan laporan hasil komparasi setiap sesi analisis. Pilih sesi untuk membuka ringkasan hasil dan mengunduh PDF laporan.
          </p>
        </div>
      </section>

      {/* Statistik mengikuti pola Data Atlet / Beranda */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="dashboard-stat bg-gradient-to-br from-rose-50 to-pink-100/80 border-rose-100">
          <span className="stat-icon bg-red-100 text-[#c00000]"><FileText size={25} /></span>
          <div><p>Total Laporan</p><strong>{stats.total}</strong><small>Setiap sesi komparasi</small></div>
        </div>
        <div className="dashboard-stat bg-gradient-to-br from-emerald-50 to-green-100/80 border-emerald-100">
          <span className="stat-icon bg-emerald-100 text-emerald-600"><CheckCircle2 size={25} /></span>
          <div><p>Laporan Tersedia</p><strong>{stats.available}</strong><small>Memiliki data hasil analisis</small></div>
        </div>
        <div className="dashboard-stat col-span-2 sm:col-span-1 bg-gradient-to-br from-violet-50 to-indigo-100/80 border-violet-100">
          <span className="stat-icon bg-violet-100 text-violet-600"><BarChart3 size={25} /></span>
          <div><p>Rata-rata Akurasi</p><strong>{stats.averageAccuracy !== null ? `${stats.averageAccuracy.toFixed(1)}%` : '--'}</strong><small>Dari sesi yang teranalisis</small></div>
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Daftar Laporan Komparasi</h2>
            <p className="mt-1 text-xs text-slate-500">Laporan dibuat berdasarkan hasil komparasi 5 percobaan pada setiap sesi.</p>
          </div>
          <span className="text-[10px] text-slate-400">{sessions.length} sesi</span>
        </div>

        {loading ? (
          <LoadingState message="Menyusun daftar laporan komparasi..." />
        ) : sessions.length === 0 ? (
          <EmptyState
            title="Belum ada laporan komparasi"
            description="Selesaikan sesi analisis terlebih dahulu untuk menghasilkan laporan komparasi."
            icon={<FileText size={24} />}
            action={<Button onClick={() => navigate('/analisis')}>Sesi Analisis Baru</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-5">
            {sessions.map((session) => {
              const summary = summaries[session.id];
              const status = getStatus(summary?.accuracy ?? null, summary?.peakSpeed ?? null);
              const attemptsAnalyzed = (session.attempts || []).filter((attempt) => !!attempt.video).length;

              return (
                <div
                  key={session.id}
                  className="report-list-card rounded-2xl border border-slate-100 bg-white p-5 hover:border-red-100 hover:shadow-[0_10px_28px_rgba(164,0,0,.07)] transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-[#a40000]">
                          <FileText size={12} /> LAPORAN KOMPARASI
                        </span>
                        {status === 'Memenuhi' && <Badge variant="success">Memenuhi</Badge>}
                        {status === 'Monitoring' && <Badge variant="warning">Monitoring</Badge>}
                        {status === 'Belum Memenuhi' && <Badge variant="neutral">Belum Lolos</Badge>}
                        {!status && <Badge variant="neutral">{session.status || 'Draft'}</Badge>}
                      </div>
                      <h3 className="mt-3 text-base sm:text-lg font-extrabold text-slate-900 truncate">{session.athleteName || 'Atlet'}</h3>
                      <p className="mt-1 text-[11px] text-slate-500 font-mono">{session.sessionCode}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center text-[#a40000] shrink-0">
                      <FileText size={22} />
                    </div>
                  </div>

                  <div className="report-mini-grid grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Calendar size={12} /> Tanggal</div>
                      <div className="mt-1 text-xs font-bold text-slate-800">{formatDate(session.date)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Footprints size={12} /> Kaki Uji</div>
                      <div className="mt-1 text-xs font-bold text-[#a40000]">{session.kickingLeg || '-'}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Target size={12} /> Akurasi</div>
                      <div className="mt-1 text-xs font-bold text-slate-800">{summary?.accuracy != null ? `${summary.accuracy.toFixed(1)}%` : '--'}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Activity size={12} /> Peak Speed</div>
                      <div className="mt-1 text-xs font-bold text-[#a40000]">{summary?.peakSpeed != null ? `${summary.peakSpeed.toFixed(2)} ${summary.unit}` : '--'}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-slate-500">
                    <span>{attemptsAnalyzed}/5 percobaan memiliki video</span>
                    {status === 'Memenuhi' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 size={12} /> Siap sebagai laporan</span>
                    ) : status === 'Monitoring' ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-bold"><AlertTriangle size={12} /> Perlu perhatian</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400"><XCircle size={12} /> Data belum lengkap</span>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => navigate(`/analisis/${session.id}/laporan`)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b40000] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#980000] transition-colors"
                    >
                      Buka Laporan <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
