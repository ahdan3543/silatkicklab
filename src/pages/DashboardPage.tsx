import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Activity,
  Video,
  Plus,
  ArrowUpRight,
  Target,
  Zap,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Athlete, AnalysisSession } from '../types';
import { athleteService } from '../services/athleteService';
import { sessionService } from '../services/sessionService';
import { formatDate, formatSpeed, formatAccuracy } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      const [athleteList, sessionList] = await Promise.all([
        athleteService.getAllAthletes(),
        sessionService.getAllSessions(),
      ]);
      setAthletes(athleteList);
      setSessions(sessionList);
    };
    loadDashboardData();
  }, []);

  const totalAthletes = athletes.length;
  const totalSessions = sessions.length;
  
  // Menghitung jumlah video yang benar-benar tersimpan di sistem
  const totalVideos = sessions.reduce(
    (acc, ses) =>
      acc + ses.attempts.filter((att) => att.video || att.status === 'Video Tersedia').length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-dark via-primary to-primary-light rounded-2xl p-6 text-white shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded bg-accent text-slate-900 font-semibold text-[11px] uppercase tracking-wider mb-2">
            Riset Monitoring Pemulihan
          </span>
          <h2 className="text-xl font-bold">Evaluasi Tendangan Depan Atlet Silat</h2>
          <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed">
            Sistem analisis biomekanika komparatif 5 percobaan tendangan untuk validasi kesiapan atlet pasca-cedera kembali ke arena pertandingan.
          </p>
        </div>
        <Button
          variant="accent"
          icon={<Plus size={16} />}
          onClick={() => navigate('/analisis')}
        >
          Sesi Analisis Baru
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-dark-secondary">Total Atlet Terdaftar</p>
            <h3 className="text-2xl font-bold text-dark mt-0.5">{totalAthletes}</h3>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5 mt-0.5">
              <span>Sumber Data Terintegrasi</span>
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-accent/15 text-accent-dark rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-dark-secondary">Total Sesi Analisis</p>
            <h3 className="text-2xl font-bold text-dark mt-0.5">{totalSessions}</h3>
            <p className="text-[11px] text-dark-secondary mt-0.5">Sesi 5x Tendangan</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-800 rounded-xl">
            <Video size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-dark-secondary">Total Video Tersedia</p>
            <h3 className="text-2xl font-bold text-dark mt-0.5">{totalVideos}</h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Video Siap Dianalisis</p>
          </div>
        </Card>
      </div>

      {/* Performance Overview & Quick Session Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {sessions.length > 0 && (
            <Card
              title="Analisis Terbaru: 5 Percobaan Tendangan"
              subtitle={`Sesi: ${sessions[0].sessionCode} — Atlet: ${sessions[0].athleteName}`}
              headerAction={<Badge variant="success">Status: Selesai</Badge>}
            >
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-4">
                {sessions[0].attempts.map((att) => (
                  <div
                    key={att.id}
                    className="bg-slate-50 border border-dark-border p-3 rounded-lg text-center"
                  >
                    <p className="text-[11px] font-semibold text-dark-secondary uppercase">
                      Percobaan #{att.attemptNumber}
                    </p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {att.result ? formatAccuracy(att.result.accuracy.score) : '-'}
                    </p>
                    <p className="text-[11px] text-dark-secondary font-mono mt-0.5">
                      {att.result ? formatSpeed(att.result.speed.peakVelocityMs) : '-'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/15 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary text-white">
                    <Target size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-dark">Rata-Rata Performa Sesi</p>
                    <p className="text-xs text-dark-secondary">
                      Akurasi: <b>{formatAccuracy(sessions[0].summary?.avgAccuracyScore || 0)}</b> | Kecepatan Puncak: <b>{formatSpeed(sessions[0].summary?.avgPeakVelocityMs || 0)}</b>
                    </p>
                  </div>
                </div>
                <Badge variant="primary">{sessions[0].summary?.overallRating}</Badge>
              </div>
            </Card>
          )}

          <Card title="Riwayat Aktivitas Analisis">
            <Table headers={['Kode Sesi', 'Nama Atlet', 'Tanggal', 'Kaki', 'Status', 'Aksi']}>
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-xs text-dark">{session.sessionCode}</td>
                  <td className="px-4 py-3 font-medium text-dark">{session.athleteName}</td>
                  <td className="px-4 py-3 text-xs text-dark-secondary">{formatDate(session.date)}</td>
                  <td className="px-4 py-3 text-xs">{session.kickingLeg}</td>
                  <td className="px-4 py-3">
                    <Badge variant={session.status === 'Completed' || session.status === 'Selesai' ? 'success' : 'warning'}>
                      {session.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/analisis/${session.id}`)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Detail <ArrowUpRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Indikator Kelayakan Pasca Cedera" subtitle="Target Standar Klinis">
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-dark-border">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                  <Target size={16} />
                  <span>Akurasi Sasaran Minimal</span>
                </div>
                <p className="text-lg font-bold text-dark mt-1">&ge; 85.0%</p>
                <p className="text-[11px] text-dark-secondary mt-0.5">
                  Deviasi impak sasaran target tendangan depan &le; 3 cm.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-dark-border">
                <div className="flex items-center gap-2 text-accent-dark font-semibold text-xs">
                  <Zap size={16} />
                  <span>Kecepatan Tendangan</span>
                </div>
                <p className="text-lg font-bold text-dark mt-1">&ge; 13.0 m/s</p>
                <p className="text-[11px] text-dark-secondary mt-0.5">
                  Waktu ekstensi tungkai pasca chamber &le; 120 ms.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="text-xs font-semibold text-emerald-800">Protokol Evaluasi</h4>
                <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                  Setiap sesi wajib terdiri dari 5 percobaan berturut-turut untuk melihat konsistensi dan indeks kelelahan atlet.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};