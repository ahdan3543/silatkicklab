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
  Award,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Athlete, AnalysisSession } from '../types';
import { athleteService } from '../services/athleteService';
import { sessionService } from '../services/sessionService';
import { formatDate } from '../utils/formatters';

interface SessionDataPoint {
  id: string;
  sessionCode: string;
  athleteName: string;
  accuracy: number;
  speed: number;
  status: 'Memenuhi' | 'Perlu Monitoring' | 'Belum Memenuhi';
  date: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [activeMetric, setActiveMetric] = useState<'speed' | 'accuracy'>('speed');
  const [hoveredPoint, setHoveredPoint] = useState<SessionDataPoint | null>(null);

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

  // 1. Ekstraksi Data Sesi Terurut Waktu
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

        const point: SessionDataPoint = {
          id: s.id,
          sessionCode: s.sessionCode || 'SES',
          athleteName: s.athleteName || 'Atlet',
          accuracy: Number(acc.toFixed(1)),
          speed: Number(spd.toFixed(1)),
          status,
          date: s.date,
        };

        return point;
      })
      .filter((item): item is SessionDataPoint => item !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

  // 3. Distribusi Status Evaluasi untuk Donut Ring
  const totalEvaluated = completedSessionsData.length;

  const statusCounts = useMemo(() => {
    const counts = { memenuhi: 0, monitoring: 0, belum: 0 };
    completedSessionsData.forEach((s) => {
      if (s.status === 'Memenuhi') counts.memenuhi++;
      else if (s.status === 'Perlu Monitoring') counts.monitoring++;
      else counts.belum++;
    });
    return counts;
  }, [completedSessionsData]);

  const statusPercentages = useMemo(() => {
    if (totalEvaluated === 0) return { memenuhi: 0, monitoring: 0, belum: 0 };
    return {
      memenuhi: Math.round((statusCounts.memenuhi / totalEvaluated) * 100),
      monitoring: Math.round((statusCounts.monitoring / totalEvaluated) * 100),
      belum: Math.round((statusCounts.belum / totalEvaluated) * 100),
    };
  }, [statusCounts, totalEvaluated]);

  // Perhitungan Keliling Donut Ring SVG (r = 38, Keliling ≈ 238.76)
  const donutMetrics = useMemo(() => {
    const circumference = 238.76;
    const pMemenuhi = statusPercentages.memenuhi;
    const pMonitoring = statusPercentages.monitoring;

    const strokeMemenuhi = (pMemenuhi / 100) * circumference;
    const strokeMonitoring = (pMonitoring / 100) * circumference;
    const strokeBelum = Math.max(0, circumference - strokeMemenuhi - strokeMonitoring);

    const rotMonitoring = (pMemenuhi / 100) * 360 - 90;
    const rotBelum = ((pMemenuhi + pMonitoring) / 100) * 360 - 90;

    return {
      circumference,
      strokeMemenuhi,
      strokeMonitoring,
      strokeBelum,
      rotMonitoring,
      rotBelum,
    };
  }, [statusPercentages]);

  // 4. Perhitungan Koordinat Smooth Curve (Bézier Path)
  const chartCoordinates = useMemo(() => {
    if (completedSessionsData.length === 0) return null;

    const width = 560;
    const height = 210;
    const padding = { top: 35, right: 30, bottom: 40, left: 45 };

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const values = completedSessionsData.map((d) =>
      activeMetric === 'speed' ? d.speed : d.accuracy
    );

    const minVal = activeMetric === 'speed' ? 0 : 50;
    const maxVal = activeMetric === 'speed' ? Math.max(...values, 20) : 100;

    const points = completedSessionsData.map((d, index) => {
      const x =
        completedSessionsData.length === 1
          ? padding.left + plotWidth / 2
          : padding.left + (index / (completedSessionsData.length - 1)) * plotWidth;

      const val = activeMetric === 'speed' ? d.speed : d.accuracy;
      const y = padding.top + plotHeight - ((val - minVal) / (maxVal - minVal)) * plotHeight;

      return { x, y, data: d, val };
    });

    // Membuat Spline Curve Halus
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const cpX1 = current.x + (next.x - current.x) / 2;
      const cpY1 = current.y;
      const cpX2 = current.x + (next.x - current.x) / 2;
      const cpY2 = next.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const baseY = height - padding.bottom;
    const areaPath = `${linePath} L ${lastPt.x} ${baseY} L ${firstPt.x} ${baseY} Z`;

    // Garis Batas Referensi Klinis (13 m/s atau 85%)
    const targetVal = activeMetric === 'speed' ? 13.0 : 85;
    const targetY =
      padding.top + plotHeight - ((targetVal - minVal) / (maxVal - minVal)) * plotHeight;

    return { points, linePath, areaPath, targetY, baseY, padding, width, height, minVal, maxVal };
  }, [completedSessionsData, activeMetric]);

  // Riwayat Sesi untuk Tabel
  const recentSessions = useMemo(() => {
    return [...sessions].reverse().slice(0, 6);
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* 1. HEADER MERAH MAROON UPI */}
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

      {/* 3. ROW: MODERN SMOOTH AREA CHART & DONUT PROGRESS RING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAFIK AREA BERGELOMBANG (8 Kolom) */}
        <div className="lg:col-span-8">
          <Card
            title="Tren Biomekanika Tendangan"
            subtitle="Kurva fluktuasi peningkatan performa atlet antar sesi uji pasca-cedera"
            className="h-full flex flex-col justify-between"
          >
            <div className="pt-2 pb-1 space-y-3">
              {/* Header Mini Metric ala Referensi UI */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-dark-secondary font-medium">
                    {activeMetric === 'speed' ? 'Rata-rata Kecepatan Impak' : 'Rata-rata Presisi Akurasi'}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <h4 className="text-2xl font-black font-mono text-[#800000]">
                      {activeMetric === 'speed'
                        ? avgSpeed !== null ? `${avgSpeed} m/s` : '--'
                        : avgAccuracy !== null ? `${avgAccuracy}%` : '--'}
                    </h4>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                      Standar Klinis: {activeMetric === 'speed' ? '≥ 13.0 m/s' : '≥ 85%'}
                    </span>
                  </div>
                </div>

                {/* Filter Tab Switcher (Kecepatan vs Akurasi) */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-dark-border/60 text-xs font-semibold">
                  <button
                    onClick={() => setActiveMetric('speed')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeMetric === 'speed'
                        ? 'bg-[#800000] text-white shadow-xs'
                        : 'text-dark-secondary hover:text-dark'
                    }`}
                  >
                    Kecepatan (m/s)
                  </button>
                  <button
                    onClick={() => setActiveMetric('accuracy')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeMetric === 'accuracy'
                        ? 'bg-[#800000] text-white shadow-xs'
                        : 'text-dark-secondary hover:text-dark'
                    }`}
                  >
                    Akurasi (%)
                  </button>
                </div>
              </div>

              {/* Area SVG Chart Bergelombang */}
              {chartCoordinates ? (
                <div className="w-full aspect-[16/8] max-h-[280px] relative bg-slate-50/50 border border-slate-100 rounded-2xl p-3 overflow-visible">
                  <svg viewBox={`0 0 ${chartCoordinates.width} ${chartCoordinates.height}`} className="w-full h-full overflow-visible">
                    <defs>
                      {/* Gradient Maroon UPI */}
                      <linearGradient id="maroonSplineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#800000" stopOpacity="0.4" />
                        <stop offset="65%" stopColor="#800000" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#800000" stopOpacity="0.0" />
                      </linearGradient>

                      {/* Drop Shadow untuk Garis Kurva */}
                      <filter id="splineShadow" x="-10%" y="-10%" width="120%" height="130%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#800000" floodOpacity="0.25" />
                      </filter>
                    </defs>

                    {/* Garis Horizontal Grid */}
                    <line x1={chartCoordinates.padding.left} y1="35" x2="530" y2="35" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1={chartCoordinates.padding.left} y1="85" x2="530" y2="85" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1={chartCoordinates.padding.left} y1="135" x2="530" y2="135" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1={chartCoordinates.padding.left} y1={chartCoordinates.baseY} x2="530" y2={chartCoordinates.baseY} stroke="#CBD5E1" strokeWidth="1.5" />

                    {/* Garis Standar Target Referensi Klinis */}
                    <line
                      x1={chartCoordinates.padding.left}
                      y1={chartCoordinates.targetY}
                      x2="530"
                      y2={chartCoordinates.targetY}
                      stroke="#FACC15"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text x="530" y={chartCoordinates.targetY - 5} textAnchor="end" fill="#A16207" fontSize="9" fontWeight="bold">
                      Standar Acuan {activeMetric === 'speed' ? '≥13.0 m/s' : '≥85%'}
                    </text>

                    {/* Label Sumbu Y */}
                    <text x="36" y="38" fill="#94A3B8" fontSize="9" textAnchor="end" fontFamily="monospace">
                      {activeMetric === 'speed' ? '20' : '100%'}
                    </text>
                    <text x="36" y="105" fill="#94A3B8" fontSize="9" textAnchor="end" fontFamily="monospace">
                      {activeMetric === 'speed' ? '10' : '75%'}
                    </text>
                    <text x="36" y={chartCoordinates.baseY + 3} fill="#94A3B8" fontSize="9" textAnchor="end" fontFamily="monospace">
                      {activeMetric === 'speed' ? '0' : '50%'}
                    </text>

                    {/* 1. Kurva Area Bergradasi */}
                    <path d={chartCoordinates.areaPath} fill="url(#maroonSplineGradient)" />

                    {/* 2. Garis Kurva Stroke Halus */}
                    <path
                      d={chartCoordinates.linePath}
                      fill="none"
                      stroke="#800000"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      filter="url(#splineShadow)"
                    />

                    {/* 3. Titik Data Interaktif & Label Sumbu X */}
                    {chartCoordinates.points.map((pt, idx) => {
                      const isHovered = hoveredPoint?.id === pt.data.id;
                      return (
                        <g key={pt.data.id} className="cursor-pointer">
                          {/* Label Sesi di Bawah */}
                          <text
                            x={pt.x}
                            y={chartCoordinates.baseY + 18}
                            fill="#64748B"
                            fontSize="9.5"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {pt.data.sessionCode}
                          </text>

                          {/* Garis vertikal indikator jika di-hover */}
                          {isHovered && (
                            <line
                              x1={pt.x}
                              y1={pt.y}
                              x2={pt.x}
                              y2={chartCoordinates.baseY}
                              stroke="#800000"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          )}

                          {/* Titik Lingkaran */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6 : 4.5}
                            fill={isHovered ? '#FACC15' : '#800000'}
                            stroke="#FFFFFF"
                            strokeWidth="2.5"
                            onMouseEnter={() => setHoveredPoint(pt.data)}
                            onMouseLeave={() => setHoveredPoint(null)}
                            className="transition-all"
                          />
                        </g>
                      );
                    })}

                    {/* 4. FLOATING TOOLTIP BADGE (Persis Referensi UI) */}
                    {hoveredPoint && (() => {
                      const activePt = chartCoordinates.points.find((p) => p.data.id === hoveredPoint.id);
                      if (!activePt) return null;

                      const tooltipY = Math.max(18, activePt.y - 28);
                      const displayVal =
                        activeMetric === 'speed'
                          ? `${hoveredPoint.speed} m/s`
                          : `${hoveredPoint.accuracy}%`;

                      return (
                        <g transform={`translate(${activePt.x}, ${tooltipY})`}>
                          <rect x="-34" y="-12" width="68" height="24" rx="7" fill="#1E293B" className="shadow-lg" />
                          <text x="0" y="4" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                            {displayVal}
                          </text>
                        </g>
                      );
                    })()}
                  </svg>

                  {/* Keterangan Titik Terpilih */}
                  {hoveredPoint && (
                    <div className="absolute bottom-2 right-3 text-[11px] font-mono text-dark-secondary bg-white/90 px-2.5 py-1 rounded-lg border border-dark-border/60 shadow-xs">
                      {hoveredPoint.athleteName} ({hoveredPoint.sessionCode}) — Status: <span className="font-bold text-[#800000]">{hoveredPoint.status}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center space-y-2 border border-dashed border-dark-border rounded-xl">
                  <TrendingUp size={32} className="mx-auto text-[#800000]/40" />
                  <h4 className="text-sm font-bold text-dark">Belum Ada Data Tren Sesi</h4>
                  <p className="text-xs text-dark-secondary max-w-sm mx-auto">
                    Kurva tren akan otomatis terbentuk setelah beberapa sesi uji tendangan diinput ke sistem.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* DONUT PROGRESS RING & STATUS EVALUASI (4 Kolom) */}
        <div className="lg:col-span-4">
          <Card
            title="Rasio Kelayakan Atlet"
            subtitle="Distribusi kesiapan klinis berdasarkan standar acuan riset"
            className="h-full flex flex-col justify-between"
          >
            <div className="flex flex-col items-center justify-center py-2 space-y-4">
              {/* Donut Ring SVG */}
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Lingkaran Background Ring */}
                  <circle cx="50" cy="50" r="38" stroke="#F1F5F9" strokeWidth="9" fill="none" />

                  {/* Segmen 1: Memenuhi (Emerald Green) */}
                  {donutMetrics.strokeMemenuhi > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#10B981"
                      strokeWidth="9"
                      strokeDasharray={`${donutMetrics.strokeMemenuhi} ${donutMetrics.circumference}`}
                      strokeLinecap="round"
                      fill="none"
                      transform="rotate(-90 50 50)"
                    />
                  )}

                  {/* Segmen 2: Monitoring (Kuning Gold UPI) */}
                  {donutMetrics.strokeMonitoring > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#FACC15"
                      strokeWidth="9"
                      strokeDasharray={`${donutMetrics.strokeMonitoring} ${donutMetrics.circumference}`}
                      strokeLinecap="round"
                      fill="none"
                      transform={`rotate(${donutMetrics.rotMonitoring} 50 50)`}
                    />
                  )}

                  {/* Segmen 3: Belum Memenuhi (Maroon UPI) */}
                  {donutMetrics.strokeBelum > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#800000"
                      strokeWidth="9"
                      strokeDasharray={`${donutMetrics.strokeBelum} ${donutMetrics.circumference}`}
                      strokeLinecap="round"
                      fill="none"
                      transform={`rotate(${donutMetrics.rotBelum} 50 50)`}
                    />
                  )}
                </svg>

                {/* Teks di Tengah Donut */}
                <div className="absolute text-center space-y-0.5 pointer-events-none">
                  <span className="text-[9.5px] uppercase tracking-wider text-dark-secondary font-bold block">
                    Kesiapan Atlet
                  </span>
                  <span className="text-2xl font-black font-mono text-dark block">
                    {totalEvaluated > 0 ? `${statusPercentages.memenuhi}%` : '--'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block">
                    {statusCounts.memenuhi} dari {totalEvaluated} Sesi
                  </span>
                </div>
              </div>

              {/* Legend Status ala UI Referensi */}
              <div className="w-full space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-dark font-semibold">
                    <span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Memenuhi Standar
                  </span>
                  <span className="font-mono font-bold text-dark">{statusPercentages.memenuhi}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-dark font-semibold">
                    <span className="w-3 h-1.5 rounded-full bg-[#FACC15] inline-block" />
                    Perlu Monitoring
                  </span>
                  <span className="font-mono font-bold text-dark">{statusPercentages.monitoring}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-dark font-semibold">
                    <span className="w-3 h-1.5 rounded-full bg-[#800000] inline-block" />
                    Belum Memenuhi
                  </span>
                  <span className="font-mono font-bold text-dark">{statusPercentages.belum}%</span>
                </div>
              </div>

              <p className="text-[11px] text-dark-secondary text-center pt-1 leading-tight">
                Standar: Akurasi $\ge 85\%$ dan Kecepatan $\ge 13.0$ m/s.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. ROW: DISTRIBUSI AKURASI, PENCAPAIAN KECEPATAN & STANDAR EVALUASI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Distribusi Akurasi" subtitle="Ambang batas sasaran target (≥85%)">
          {totalEvaluated > 0 ? (
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-700">Akurasi ≥ 85% (Tepat)</span>
                  <span className="font-mono">
                    {Math.round((completedSessionsData.filter((s) => s.accuracy >= 85).length / totalEvaluated) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full"
                    style={{
                      width: `${(completedSessionsData.filter((s) => s.accuracy >= 85).length / totalEvaluated) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-dark-secondary block mt-1 font-mono">
                  {completedSessionsData.filter((s) => s.accuracy >= 85).length} dari {totalEvaluated} sesi
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-700">Akurasi &lt; 85% (Meleset)</span>
                  <span className="font-mono">
                    {Math.round((completedSessionsData.filter((s) => s.accuracy < 85).length / totalEvaluated) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-2.5 rounded-full"
                    style={{
                      width: `${(completedSessionsData.filter((s) => s.accuracy < 85).length / totalEvaluated) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-dark-secondary block mt-1 font-mono">
                  {completedSessionsData.filter((s) => s.accuracy < 85).length} dari {totalEvaluated} sesi
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
          {totalEvaluated > 0 ? (
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#800000] font-bold">Kecepatan ≥ 13.0 m/s</span>
                  <span className="font-mono font-bold text-[#800000]">
                    {Math.round((completedSessionsData.filter((s) => s.speed >= 13.0).length / totalEvaluated) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#800000] h-2.5 rounded-full"
                    style={{
                      width: `${(completedSessionsData.filter((s) => s.speed >= 13.0).length / totalEvaluated) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-dark-secondary block mt-1 font-mono">
                  {completedSessionsData.filter((s) => s.speed >= 13.0).length} dari {totalEvaluated} sesi
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Kecepatan &lt; 13.0 m/s</span>
                  <span className="font-mono">
                    {Math.round((completedSessionsData.filter((s) => s.speed < 13.0).length / totalEvaluated) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-300 h-2.5 rounded-full"
                    style={{
                      width: `${(completedSessionsData.filter((s) => s.speed < 13.0).length / totalEvaluated) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-dark-secondary block mt-1 font-mono">
                  {completedSessionsData.filter((s) => s.speed < 13.0).length} dari {totalEvaluated} sesi
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