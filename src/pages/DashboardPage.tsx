import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Film,
  Target,
  Zap,
  Plus,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Award,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Athlete, AnalysisSession } from '../types';
import { athleteService } from '../services/athleteService';
import { sessionService } from '../services/sessionService';
import { formatDate } from '../utils/formatters';

interface ScatterPoint {
  id: string;
  sessionId: string;
  sessionCode: string;
  athleteName: string;
  accuracy: number;
  speed: number;
  status: 'Memenuhi' | 'Perlu Monitoring' | 'Belum Memenuhi';
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<ScatterPoint | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [athleteList, sessionList] = await Promise.all([
          athleteService.getAllAthletes(),
          sessionService.getAllSessions(),
        ]);
        setAthletes(athleteList || []);
        setSessions(sessionList || []);
      } catch (err) {
        console.error('Gagal memuat data dashboard:', err);
      }
    };
    loadDashboardData();
  }, []);

  // 1. Ekstraksi Data Sesi
  const completedSessionsData = useMemo(() => {
    return sessions
      .map((s) => {
        const acc = s.summary?.avgAccuracyScore ?? s.summary?.accuracyPercentage ?? null;
        const spd = s.summary?.avgPeakVelocityMs ?? s.summary?.avgSpeedMetersPerSecond ?? null;

        if (acc === null || spd === null || isNaN(acc) || isNaN(spd) || acc === 0 || spd === 0) {
          return null;
        }

        let status: 'Memenuhi' | 'Perlu Monitoring' | 'Belum Memenuhi' = 'Belum Memenuhi';
        if (acc >= 85 && spd >= 13.0) {
          status = 'Memenuhi';
        } else if (acc >= 85 || spd >= 13.0) {
          status = 'Perlu Monitoring';
        }

        const point: ScatterPoint = {
          id: s.id,
          sessionId: s.id,
          sessionCode: s.sessionCode || 'SES',
          athleteName: s.athleteName || 'Atlet',
          accuracy: Number(acc.toFixed(1)),
          speed: Number(spd.toFixed(1)),
          status,
        };

        return point;
      })
      .filter((item): item is ScatterPoint => item !== null);
  }, [sessions]);

  // 2. Agregasi KPI
  const totalAthletesCount = athletes.length;
  const totalSessionsCount = sessions.length;

  const avgAccuracy = useMemo(() => {
    if (completedSessionsData.length === 0) return null;
    const total = completedSessionsData.reduce((acc, curr) => acc + curr.accuracy, 0);
    return (total / completedSessionsData.length).toFixed(1);
  }, [completedSessionsData]);

  const avgSpeed = useMemo(() => {
    if (completedSessionsData.length === 0) return null;
    const total = completedSessionsData.reduce((acc, curr) => acc + curr.speed, 0);
    return (total / completedSessionsData.length).toFixed(1);
  }, [completedSessionsData]);

  // 3. Distribusi Status Evaluasi
  const statusCounts = useMemo(() => {
    const counts = { memenuhi: 0, monitoring: 0, belum: 0 };
    completedSessionsData.forEach((s) => {
      if (s.status === 'Memenuhi') counts.memenuhi++;
      else if (s.status === 'Perlu Monitoring') counts.monitoring++;
      else counts.belum++;
    });
    return counts;
  }, [completedSessionsData]);

  const totalEvaluated = completedSessionsData.length;

  // 4. Distribusi Akurasi
  const accuracyDistribution = useMemo(() => {
    if (totalEvaluated === 0) return null;
    const passCount = completedSessionsData.filter((s) => s.accuracy >= 85).length;
    const passPct = Math.round((passCount / totalEvaluated) * 100);
    return {
      passCount,
      failCount: totalEvaluated - passCount,
      passPct,
      failPct: 100 - passPct,
    };
  }, [completedSessionsData, totalEvaluated]);

  // 5. Pencapaian Kecepatan
  const speedDistribution = useMemo(() => {
    if (totalEvaluated === 0) return null;
    const passCount = completedSessionsData.filter((s) => s.speed >= 13.0).length;
    const passPct = Math.round((passCount / totalEvaluated) * 100);
    return {
      passCount,
      failCount: totalEvaluated - passCount,
      passPct,
      failPct: 100 - passPct,
    };
  }, [completedSessionsData, totalEvaluated]);

  // Riwayat Sesi
  const recentSessions = useMemo(() => {
    return [...sessions].reverse().slice(0, 6);
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* 1. HEADER MERAH MAROON UPI DENGAN BRAND SILAT MOTION */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#700000] via-[#800000] to-[#991B1B] rounded-2xl p-5 text-white shadow-md">
        <div className="absolute -right-8 -top-12 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-36 -bottom-16 w-36 h-36 rounded-full bg-[#FACC15]/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FACC15] text-[#700000] text-[10px] font-black uppercase tracking-wider shadow-sm">
                <Award size={12} className="stroke-[2.5]" />
                Riset Biomekanika UPI
              </span>
              <span className="text-[11px] text-white/70 font-mono">SILAT MOTION v2.0</span>
            </div>

            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Dashboard Monitoring & Evaluasi
            </h1>
            <p className="text-xs text-white/85 max-w-xl leading-relaxed">
              Sistem overview agregat akurasi sasaran dan kecepatan impak tendangan depan atlet pencak silat pasca-cedera.
            </p>
          </div>

          <button
            onClick={() => navigate('/analisis')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-black text-xs rounded-xl shadow transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Sesi Analisis Baru</span>
          </button>
        </div>
      </div>

      {/* 2. STATISTICAL CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-t-4 border-t-[#800000] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-secondary">Total Atlet</span>
            <div className="p-2.5 rounded-xl bg-[#800000] text-white shadow-sm">
              <Users size={17} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-mono text-dark">
              {totalAthletesCount > 0 ? totalAthletesCount : '--'}
            </h3>
            <p className="text-[11px] text-[#800000] font-semibold mt-0.5">
              {totalAthletesCount > 0 ? 'Atlet binaan terdaftar' : 'Belum ada atlet'}
            </p>
          </div>
        </Card>

        <Card className="p-4 border-t-4 border-t-[#800000] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-secondary">Total Sesi Analisis</span>
            <div className="p-2.5 rounded-xl bg-[#800000] text-white shadow-sm">
              <Film size={17} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-mono text-dark">
              {totalSessionsCount > 0 ? totalSessionsCount : '--'}
            </h3>
            <p className="text-[11px] text-dark-secondary mt-0.5">
              {totalSessionsCount > 0 ? 'Protokol 5x percobaan' : 'Belum ada sesi'}
            </p>
          </div>
        </Card>

        <Card className="p-4 border-t-4 border-t-[#800000] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-secondary">Rata-rata Akurasi</span>
            <div className="p-2.5 rounded-xl bg-[#800000] text-white shadow-sm">
              <Target size={17} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-mono text-[#800000]">
              {avgAccuracy !== null ? `${avgAccuracy}%` : '--'}
            </h3>
            <p className="text-[11px] text-dark-secondary mt-0.5">
              {avgAccuracy !== null ? `Dari ${totalEvaluated} sesi tervalidasi` : 'Belum ada hasil analisis'}
            </p>
          </div>
        </Card>

        <Card className="p-4 border-t-4 border-t-[#800000] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-secondary">Rata-rata Kecepatan</span>
            <div className="p-2.5 rounded-xl bg-[#800000] text-[#FACC15] shadow-sm">
              <Zap size={17} className="fill-[#FACC15]" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black font-mono text-dark">
              {avgSpeed !== null ? `${avgSpeed} m/s` : '--'}
            </h3>
            <p className="text-[11px] text-dark-secondary mt-0.5">
              {avgSpeed !== null ? `Dari ${totalEvaluated} sesi tervalidasi` : 'Belum ada hasil analisis'}
            </p>
          </div>
        </Card>
      </div>

      {/* 3. ROW: SCATTER CHART & STATUS EVALUASI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card
            title="Hubungan Akurasi & Kecepatan"
            subtitle="Distribusi performa tendangan terhadap garis referensi standar kelayakan klinis"
            className="h-full flex flex-col justify-between"
          >
            {completedSessionsData.length > 0 ? (
              <div className="relative pt-2 pb-1">
                <div className="w-full aspect-[16/9] max-h-[340px] bg-slate-50 border border-slate-200 rounded-xl p-3 relative overflow-hidden">
                  <svg viewBox="0 0 500 280" className="w-full h-full overflow-visible">
                    <line x1="50" y1="20" x2="50" y2="240" stroke="#CBD5E1" strokeWidth="1" />
                    <line x1="50" y1="240" x2="480" y2="240" stroke="#CBD5E1" strokeWidth="1" />

                    <rect x="340" y="20" width="140" height="120" fill="rgba(128, 0, 0, 0.05)" />

                    <line
                      x1="340"
                      y1="20"
                      x2="340"
                      y2="240"
                      stroke="#800000"
                      strokeWidth="1.5"
                      strokeDasharray="4"
                    />
                    <text x="342" y="32" fill="#800000" fontSize="9" fontWeight="bold">
                      Standar Akurasi ≥85%
                    </text>

                    <line
                      x1="50"
                      y1="140"
                      x2="480"
                      y2="140"
                      stroke="#EAB308"
                      strokeWidth="1.5"
                      strokeDasharray="4"
                    />
                    <text x="55" y="135" fill="#A16207" fontSize="9" fontWeight="bold">
                      Standar Kecepatan ≥13.0 m/s
                    </text>

                    <text x="240" y="265" textAnchor="middle" fill="#64748B" fontSize="10" fontWeight="bold">
                      Akurasi (%) →
                    </text>
                    <text
                      x="-130"
                      y="25"
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize="10"
                      fontWeight="bold"
                      transform="rotate(-90)"
                    >
                      Kecepatan (m/s) →
                    </text>

                    {completedSessionsData.map((pt) => {
                      const cx = 50 + (Math.max(50, Math.min(100, pt.accuracy)) - 50) * (430 / 50);
                      const cy = 240 - (Math.max(5, Math.min(20, pt.speed)) - 5) * (220 / 15);

                      return (
                        <g
                          key={pt.id}
                          className="cursor-pointer transition-transform hover:scale-125"
                          onMouseEnter={() => setActiveTooltip(pt)}
                          onMouseLeave={() => setActiveTooltip(null)}
                        >
                          <circle cx={cx} cy={cy} r="6" fill="#800000" stroke="#FFFFFF" strokeWidth="2" />
                        </g>
                      );
                    })}
                  </svg>

                  {activeTooltip && (
                    <div className="absolute top-4 right-4 bg-[#700000]/95 backdrop-blur-sm text-white p-3 rounded-xl border border-white/20 shadow-xl text-xs space-y-1 pointer-events-none">
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
                        {activeTooltip.athleteName}
                      </p>
                      <p className="font-mono text-[11px] text-white/80">
                        Sesi: {activeTooltip.sessionCode}
                      </p>
                      <div className="pt-1 border-t border-white/20 flex items-center gap-3 font-mono">
                        <span>Akurasi: <b>{activeTooltip.accuracy}%</b></span>
                        <span>Kecepatan: <b>{activeTooltip.speed} m/s</b></span>
                      </div>
                      <p className="text-[10px] font-bold text-[#FACC15] pt-0.5">
                        Status: {activeTooltip.status}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-6 mt-3 text-xs text-dark-secondary">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#800000] inline-block" />
                    Titik Data Atlet (SILAT MOTION)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-[#800000] border-t border-dashed border-[#800000] inline-block" />
                    Batas Minimum Akurasi (85%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-yellow-500 border-t border-dashed border-yellow-500 inline-block" />
                    Batas Minimum Kecepatan (13 m/s)
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-2 border border-dashed border-dark-border rounded-xl">
                <TrendingUp size={32} className="mx-auto text-[#800000]/40" />
                <h4 className="text-sm font-bold text-dark">Belum Ada Data Performa</h4>
                <p className="text-xs text-dark-secondary max-w-sm mx-auto">
                  Data korelasi akurasi dan kecepatan akan otomatis muncul setelah sesi analisis selesai diproses.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card
            title="Status Evaluasi Atlet"
            subtitle="Klasifikasi kesiapan tanding berdasarkan standar klinis"
            className="h-full flex flex-col justify-between"
          >
            <div className="space-y-4 py-1">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Memenuhi Standar
                  </span>
                  <span className="text-sm font-black font-mono text-emerald-900">
                    {statusCounts.memenuhi} Sesi
                  </span>
                </div>
                <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${totalEvaluated > 0 ? (statusCounts.memenuhi / totalEvaluated) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle size={16} className="text-amber-600" />
                    Perlu Monitoring
                  </span>
                  <span className="text-sm font-black font-mono text-amber-900">
                    {statusCounts.monitoring} Sesi
                  </span>
                </div>
                <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${totalEvaluated > 0 ? (statusCounts.monitoring / totalEvaluated) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                    <XCircle size={16} className="text-rose-600" />
                    Belum Memenuhi
                  </span>
                  <span className="text-sm font-black font-mono text-rose-900">
                    {statusCounts.belum} Sesi
                  </span>
                </div>
                <div className="w-full bg-rose-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${totalEvaluated > 0 ? (statusCounts.belum / totalEvaluated) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-dark-secondary mt-2">
              Evaluasi diukur komparatif pada Akurasi $\ge 85\%$ dan Kecepatan $\ge 13.0$ m/s.
            </p>
          </Card>
        </div>
      </div>

      {/* 4. ROW: DISTRIBUSI AKURASI, PENCAPAIAN KECEPATAN & STANDAR EVALUASI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Distribusi Akurasi" subtitle="Ambang batas sasaran target (≥85%)">
          {accuracyDistribution ? (
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-700">Akurasi ≥ 85% (Tepat)</span>
                  <span className="font-mono">{accuracyDistribution.passPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full"
                    style={{ width: `${accuracyDistribution.passPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-dark-secondary block mt-1 font-mono">
                  {accuracyDistribution.passCount} dari {totalEvaluated} sesi
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-700">Akurasi &lt; 85% (Meleset)</span>
                  <span className="font-mono">{accuracyDistribution.failPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-2.5 rounded-full"
                    style={{ width: `${accuracyDistribution.failPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-dark-secondary block mt-1 font-mono">
                  {accuracyDistribution.failCount} dari {totalEvaluated} sesi
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-dark-secondary">
              Belum ada data akurasi tervalidasi.
            </div>
          )}
        </Card>

        <Card title="Pencapaian Kecepatan" subtitle="Ambang batas kecepatan impak (≥13.0 m/s)">
          {speedDistribution ? (
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#800000] font-bold">Kecepatan ≥ 13.0 m/s</span>
                  <span className="font-mono font-bold text-[#800000]">{speedDistribution.passPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#800000] h-2.5 rounded-full"
                    style={{ width: `${speedDistribution.passPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-dark-secondary block mt-1 font-mono">
                  {speedDistribution.passCount} dari {totalEvaluated} sesi
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Kecepatan &lt; 13.0 m/s</span>
                  <span className="font-mono">{speedDistribution.failPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-300 h-2.5 rounded-full"
                    style={{ width: `${speedDistribution.failPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-dark-secondary block mt-1 font-mono">
                  {speedDistribution.failCount} dari {totalEvaluated} sesi
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-dark-secondary">
              Belum ada data kecepatan tervalidasi.
            </div>
          )}
        </Card>

        <Card title="Standar Evaluasi" subtitle="Acuan protokol klinis pemulihan atlet">
          <div className="space-y-2.5 pt-1 text-xs">
            <div className="p-2.5 bg-slate-50 border-l-4 border-l-[#800000] border border-dark-border rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-dark block">Akurasi Sasaran</span>
                <span className="text-[11px] text-dark-secondary">Deviasi impak sasaran</span>
              </div>
              <div className="text-right font-mono font-bold text-dark">
                <span>≥ 85%</span>
                <span className="block text-[10px] font-normal text-slate-500">≤ 3.0 cm</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border-l-4 border-l-[#FACC15] border border-dark-border rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-dark block">Kecepatan Tendangan</span>
                <span className="text-[11px] text-dark-secondary">Waktu ekstensi tungkai</span>
              </div>
              <div className="text-right font-mono font-bold text-dark">
                <span>≥ 13.0 m/s</span>
                <span className="block text-[10px] font-normal text-slate-500">≤ 120 ms</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border-l-4 border-l-[#800000] border border-dark-border rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-dark block">Jumlah Percobaan</span>
                <span className="text-[11px] text-dark-secondary">Protokol konsistensi</span>
              </div>
              <div className="text-right font-mono font-bold text-[#800000]">
                <span>5x Tendangan</span>
                <span className="block text-[10px] font-normal text-slate-500">per sesi uji</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. RIWAYAT SESI ANALISIS */}
      <Card
        title="Riwayat Sesi Analisis"
        subtitle="Daftar aktivitas analisis rekaman video tendangan terkini"
        headerAction={
          <button
            onClick={() => navigate('/laporan')}
            className="text-xs font-bold text-[#800000] hover:text-[#5a0000] hover:underline flex items-center gap-1 transition-colors"
          >
            Lihat Semua <ArrowRight size={13} />
          </button>
        }
      >
        {recentSessions.length > 0 ? (
          <Table
            headers={[
              'KODE SESI',
              'ATLET',
              'TANGGAL',
              'KAKI',
              'AKURASI',
              'KECEPATAN',
              'STATUS',
              'AKSI',
            ]}
          >
            {recentSessions.map((session) => {
              const acc =
                session.summary?.avgAccuracyScore ?? session.summary?.accuracyPercentage ?? null;
              const spd =
                session.summary?.avgPeakVelocityMs ?? session.summary?.avgSpeedMetersPerSecond ?? null;

              let evalStatus = 'Belum Dianalisis';
              let badgeVariant: 'success' | 'warning' | 'neutral' = 'neutral';

              if (acc !== null && spd !== null && acc > 0 && spd > 0) {
                if (acc >= 85 && spd >= 13.0) {
                  evalStatus = 'Memenuhi';
                  badgeVariant = 'success';
                } else if (acc >= 85 || spd >= 13.0) {
                  evalStatus = 'Monitoring';
                  badgeVariant = 'warning';
                } else {
                  evalStatus = 'Belum Memenuhi';
                  badgeVariant = 'neutral';
                }
              }

              return (
                <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-xs text-[#800000]">
                    {session.sessionCode}
                  </td>
                  <td className="px-4 py-3 font-semibold text-dark text-xs">
                    {session.athleteName}
                  </td>
                  <td className="px-4 py-3 text-xs text-dark-secondary">
                    {formatDate(session.date)}
                  </td>
                  <td className="px-4 py-3 text-xs text-dark font-mono">
                    {session.kickingLeg}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold">
                    {acc !== null && acc > 0 ? `${acc.toFixed(1)}%` : '--'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold">
                    {spd !== null && spd > 0 ? `${spd.toFixed(1)} m/s` : '--'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={badgeVariant}>{evalStatus}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/analisis/${session.id}`)}
                      className="text-xs font-bold text-[#800000] hover:text-[#5a0000] hover:underline flex items-center gap-1 transition-colors"
                    >
                      Detail <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <div className="py-12 text-center text-xs text-dark-secondary">
            Belum ada sesi analisis yang dibuat. Klik tombol &quot;Sesi Analisis Baru&quot; untuk memulai.
          </div>
        )}
      </Card>
    </div>
  );
};