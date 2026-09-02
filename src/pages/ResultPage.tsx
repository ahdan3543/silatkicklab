import React, { useState, useEffect, useMemo } from 'react';
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
import {
  ArrowRight,
  Award,
  Calendar,
  Activity,
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LayoutGrid,
  List,
  Footprints,
  Plus,
  BarChart3,
} from 'lucide-react';

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [sessionSummaries, setSessionSummaries] = useState<{
    [id: string]: { accuracy: number | null; peakSpeed: number | null; unit: string };
  }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        const sessionList = await sessionService.getAllSessions();
        setSessions(sessionList || []);

        const summaryMap: {
          [id: string]: { accuracy: number | null; peakSpeed: number | null; unit: string };
        } = {};

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

  // Evaluasi Status Klinis per Sesi
  const getClinicalStatus = (acc: number | null, spd: number | null) => {
    if (acc === null || spd === null || isNaN(acc) || isNaN(spd)) return null;
    if (acc >= 85 && spd >= 13.0) return 'Memenuhi';
    if (acc >= 85 || spd >= 13.0) return 'Monitoring';
    return 'Belum Memenuhi';
  };

  // Ringkasan Cepat KPI
  const stats = useMemo(() => {
    const validSessions = sessions.filter((s) => {
      const smry = sessionSummaries[s.id];
      return smry && smry.accuracy !== null && smry.peakSpeed !== null;
    });

    const passedCount = validSessions.filter((s) => {
      const smry = sessionSummaries[s.id];
      return (smry?.accuracy || 0) >= 85 && (smry?.peakSpeed || 0) >= 13.0;
    }).length;

    const avgAccuracy =
      validSessions.length > 0
        ? (
            validSessions.reduce((sum, s) => sum + (sessionSummaries[s.id]?.accuracy || 0), 0) /
            validSessions.length
          ).toFixed(1)
        : null;

    return {
      total: sessions.length,
      passedCount,
      avgAccuracy,
    };
  }, [sessions, sessionSummaries]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER HERO SILAT MOTION */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#700000] via-[#800000] to-[#991B1B] rounded-2xl p-5 text-white shadow-md">
        <div className="absolute -right-8 -top-12 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-36 -bottom-16 w-36 h-36 rounded-full bg-[#FACC15]/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FACC15] text-[#700000] text-[10px] font-black uppercase tracking-wider shadow-sm">
                <Award size={12} className="stroke-[2.5]" />
                Rekapitulasi Evaluasi Klinis
              </span>
              <span className="text-[11px] text-white/70 font-mono">SILAT MOTION</span>
            </div>

            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Hasil Analisis & Komparasi Sesi
            </h1>
            <p className="text-xs text-white/85 max-w-xl leading-relaxed">
              Daftar rekapitulasi data akurasi dan kecepatan impak tendangan depan atlet pencak silat pasca-cedera.
            </p>
          </div>

          <button
            onClick={() => navigate('/analisis')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-black text-xs rounded-xl shadow transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Mulai Analisis Baru</span>
          </button>
        </div>
      </div>

      {/* 2. MINI METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-[#800000] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-dark-secondary">Total Sesi Terkomparasi</span>
              <h3 className="text-2xl font-black font-mono text-dark mt-1">{stats.total}</h3>
              <p className="text-[11px] text-[#800000] font-medium mt-0.5">Seluruh sesi tercatat</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#800000] text-white shadow-sm">
              <BarChart3 size={18} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-dark-secondary">Memenuhi Standar Kelayakan</span>
              <h3 className="text-2xl font-black font-mono text-dark mt-1">
                {stats.passedCount}{' '}
                <span className="text-xs font-sans text-dark-secondary font-normal">Sesi</span>
              </h3>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Akurasi ≥85% & Kecepatan ≥13 m/s</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#FACC15] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-dark-secondary">Rata-rata Akurasi Sesi</span>
              <h3 className="text-2xl font-black font-mono text-dark mt-1">
                {stats.avgAccuracy ? `${stats.avgAccuracy}%` : '--'}
              </h3>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">Ambang target minimal 85%</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#800000] text-[#FACC15] shadow-sm">
              <Target size={18} />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. KONTEN UTAMA */}
      <Card className="p-4 sm:p-6 space-y-5">
        {/* Header Toolbar & Switcher */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-dark-border/60">
          <div>
            <h3 className="text-sm font-bold text-dark">Daftar Rekapitulasi Sesi Analisis</h3>
            <p className="text-[11px] text-dark-secondary">
              Pilih sesi untuk membuka laporan komparatif 5 percobaan tendangan
            </p>
          </div>

          {/* Switcher Tampilan Grid / Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-dark-border shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#800000] text-white shadow-xs'
                  : 'text-dark-secondary hover:text-dark'
              }`}
              title="Tampilan Kartu Sesi"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-[#800000] text-white shadow-xs'
                  : 'text-dark-secondary hover:text-dark'
              }`}
              title="Tampilan Tabel Kompak"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Menyusun rekapitulasi komparasi sesi..." />
        ) : sessions.length > 0 ? (
          viewMode === 'grid' ? (
            /* MODE 1: GRID KARTU KOMPARASI (MODERN & INFORMATIF) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sessions.map((ses) => {
                const smry = sessionSummaries[ses.id];
                const clinStatus = getClinicalStatus(smry?.accuracy, smry?.peakSpeed);

                return (
                  <div
                    key={ses.id}
                    className="relative bg-white border border-dark-border hover:border-[#800000]/40 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Header Kartu: Kode Sesi & Status Klinis */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-dark-border/60">
                        <div>
                          <span className="font-mono text-xs font-black text-[#800000] tracking-wide block">
                            {ses.sessionCode}
                          </span>
                          <span className="text-[11px] text-dark-secondary flex items-center gap-1 mt-0.5">
                            <Calendar size={12} /> {formatDate(ses.date)}
                          </span>
                        </div>

                        {clinStatus === 'Memenuhi' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                            <CheckCircle2 size={11} className="text-emerald-600" /> Memenuhi
                          </span>
                        )}
                        {clinStatus === 'Monitoring' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200">
                            <AlertTriangle size={11} className="text-amber-600" /> Monitoring
                          </span>
                        )}
                        {clinStatus === 'Belum Memenuhi' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-900 text-[10px] font-bold border border-rose-200">
                            <XCircle size={11} className="text-rose-600" /> Belum Lolos
                          </span>
                        )}
                        {!clinStatus && (
                          <Badge variant="neutral">{ses.status || 'Draft'}</Badge>
                        )}
                      </div>

                      {/* Detail Atlet & Kaki Uji */}
                      <div className="mt-3 space-y-2">
                        <div>
                          <span className="text-[10px] text-dark-secondary block uppercase tracking-wider font-semibold">
                            Nama Atlet
                          </span>
                          <h4 className="font-bold text-dark text-sm leading-tight truncate group-hover:text-[#800000] transition-colors">
                            {ses.athleteName}
                          </h4>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 border border-dark-border/50 flex items-center justify-between text-xs">
                          <span className="text-dark-secondary flex items-center gap-1 font-medium">
                            <Footprints size={13} className="text-[#800000]" /> Kaki Uji
                          </span>
                          <span className="font-bold text-[#800000] bg-[#800000]/10 px-2 py-0.5 rounded-md text-[11px]">
                            Tendangan {ses.kickingLeg}
                          </span>
                        </div>

                        {/* Nilai Akurasi & Kecepatan */}
                        <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-dark-border/60">
                            <span className="text-[10px] font-sans text-dark-secondary flex items-center gap-1">
                              <Target size={12} className="text-emerald-700" /> Akurasi
                            </span>
                            <span className="font-bold text-dark text-sm block mt-1">
                              {smry?.accuracy !== null && smry?.accuracy !== undefined
                                ? `${smry.accuracy.toFixed(1)}%`
                                : '--'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-dark-border/60">
                            <span className="text-[10px] font-sans text-dark-secondary flex items-center gap-1">
                              <Activity size={12} className="text-[#800000]" /> Peak Speed
                            </span>
                            <span className="font-bold text-[#800000] text-sm block mt-1">
                              {smry?.peakSpeed !== null && smry?.peakSpeed !== undefined
                                ? `${smry.peakSpeed.toFixed(2)} ${smry.unit}`
                                : '--'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Tombol Aksi */}
                    <div className="pt-3 mt-4 border-t border-dark-border/60">
                      <button
                        onClick={() => navigate(`/hasil/${ses.id}`)}
                        className="w-full py-2 bg-[#800000] hover:bg-[#600000] text-white font-bold rounded-xl text-center flex items-center justify-center gap-1.5 text-xs transition-colors shadow-xs"
                      >
                        <span>Buka Hasil Komparasi</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* MODE 2: TABEL KOMPAK */
            <Table
              headers={[
                'KODE SESI',
                'NAMA ATLET',
                'TANGGAL',
                'KAKI UJI',
                'AKURASI SESI',
                'PEAK SPEED SESI',
                'STATUS KLINIS',
                'AKSI',
              ]}
            >
              {sessions.map((ses) => {
                const smry = sessionSummaries[ses.id];
                const clinStatus = getClinicalStatus(smry?.accuracy, smry?.peakSpeed);

                return (
                  <tr key={ses.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-xs text-[#800000]">
                      {ses.sessionCode}
                    </td>
                    <td className="px-4 py-3 font-bold text-dark text-xs">{ses.athleteName}</td>
                    <td className="px-4 py-3 text-xs text-dark-secondary font-mono">
                      {formatDate(ses.date)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#800000] bg-[#800000]/10 px-2 py-0.5 rounded-md text-[11px]">
                        <Footprints size={11} /> {ses.kickingLeg}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-dark text-xs">
                      {smry?.accuracy !== null && smry?.accuracy !== undefined
                        ? `${smry.accuracy.toFixed(1)}%`
                        : '--'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#800000] text-xs">
                      {smry?.peakSpeed !== null && smry?.peakSpeed !== undefined
                        ? `${smry.peakSpeed.toFixed(2)} ${smry.unit}`
                        : '--'}
                    </td>
                    <td className="px-4 py-3">
                      {clinStatus === 'Memenuhi' && (
                        <Badge variant="success">Memenuhi</Badge>
                      )}
                      {clinStatus === 'Monitoring' && (
                        <Badge variant="warning">Monitoring</Badge>
                      )}
                      {clinStatus === 'Belum Memenuhi' && (
                        <Badge variant="neutral">Belum Lolos</Badge>
                      )}
                      {!clinStatus && <Badge variant="neutral">-</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/hasil/${ses.id}`)}
                        className="text-xs font-bold text-[#800000] hover:text-[#500000] hover:underline flex items-center gap-1 transition-colors"
                      >
                        Buka Komparasi <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )
        ) : (
          <EmptyState
            title="Belum ada sesi analisis"
            description="Buat sesi analisis baru untuk mulai mengevaluasi performa atlet."
            icon={<Award size={24} />}
            action={
              <Button icon={<Plus size={16} />} onClick={() => navigate('/analisis')}>
                Sesi Analisis Baru
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
};