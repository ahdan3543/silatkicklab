import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Activity,
  Trash2,
  ArrowRight,
  Film,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Award,
  Footprints,
  Calendar,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { AnalysisSession, Athlete, MAX_ATTEMPTS } from '../types';
import { sessionService } from '../services/sessionService';
import { athleteService } from '../services/athleteService';
import { SessionFormModal } from '../features/analysis/SessionFormModal';
import { formatDate } from '../utils/formatters';

export const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Mode Tampilan: 'grid' untuk Card interaktif, 'table' untuk daftar kompak
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [sessionToDelete, setSessionToDelete] = useState<AnalysisSession | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionList, athleteList] = await Promise.all([
        sessionService.getAllSessions(),
        athleteService.getAllAthletes(),
      ]);
      setSessions(sessionList || []);
      setAthletes(athleteList || []);
    } catch (err) {
      console.error('Gagal memuat sesi analisis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getAthleteCode = (athleteId: string): string => {
    const found = athletes.find((a) => a.id === athleteId);
    return found ? found.athleteCode : '-';
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const athleteCode = getAthleteCode(s.athleteId);
      const matchSearch =
        s.sessionCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.athleteName && s.athleteName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        athleteCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || s.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [sessions, searchTerm, statusFilter, athletes]);

  // Statistik Cepat untuk Mini Metric Strip
  const completedCount = useMemo(
    () => sessions.filter((s) => s.status === 'Selesai' || s.status === 'Completed').length,
    [sessions]
  );
  const ongoingCount = useMemo(
    () => sessions.filter((s) => s.status === 'Berlangsung' || s.status === 'Siap Dianalisis').length,
    [sessions]
  );

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    await sessionService.deleteSession(sessionToDelete.id);
    setSessionToDelete(null);
    loadData();
  };

  const getCompletedVideoCount = (session: AnalysisSession): number => {
    return session.attempts.filter(
      (att) => att.video || att.status === 'Video Tersedia' || att.status === 'Dianalisis'
    ).length;
  };

  const getStatusBadge = (status: AnalysisSession['status']) => {
    switch (status) {
      case 'Selesai':
      case 'Completed' as any:
        return <Badge variant="success">Selesai</Badge>;
      case 'Siap Dianalisis':
        return <Badge variant="info">Siap Dianalisis</Badge>;
      case 'Berlangsung':
        return <Badge variant="warning">Berlangsung</Badge>;
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER HERO SILAT MOTION */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#700000] via-[#800000] to-[#991B1B] rounded-2xl p-5 text-white shadow-md">
        <div className="absolute -right-8 -top-12 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-36 -bottom-16 w-36 h-36 rounded-full bg-[#FACC15]/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FACC15] text-[#700000] text-[10px] font-black uppercase tracking-wider shadow-sm">
                <Award size={12} className="stroke-[2.5]" />
                Protokol Uji Tendangan
              </span>
              <span className="text-[11px] text-white/70 font-mono">SILAT MOTION</span>
            </div>

            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Sesi Analisis Biomekanika
            </h1>
            <p className="text-xs text-white/85 max-w-xl leading-relaxed">
              Daftar sesi pengujian 5 percobaan tendangan depan untuk mengevaluasi presisi sasaran dan kecepatan atlet.
            </p>
          </div>

          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-black text-xs rounded-xl shadow transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Sesi Analisis Baru</span>
          </button>
        </div>
      </div>

      {/* 2. MINI METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-[#800000] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-dark-secondary">Total Sesi Terdaftar</span>
              <h3 className="text-2xl font-black font-mono text-dark mt-1">{sessions.length}</h3>
              <p className="text-[11px] text-[#800000] font-medium mt-0.5">Protokol 5x tendangan</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#800000] text-white shadow-sm">
              <Film size={18} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-dark-secondary">Sesi Selesai Dianalisis</span>
              <h3 className="text-2xl font-black font-mono text-dark mt-1">{completedCount}</h3>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Laporan siap dikomparasi</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-dark-secondary">Sesi Dalam Proses</span>
              <h3 className="text-2xl font-black font-mono text-dark mt-1">{ongoingCount}</h3>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">Menunggu kelengkapan video</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm">
              <Clock size={18} />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. KONTEN UTAMA */}
      <Card className="p-4 sm:p-6 space-y-5">
        {/* Search, Filter & Switcher Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-4 border-b border-dark-border/60">
          <div className="w-full md:flex-1 relative">
            <Search className="absolute left-3.5 top-3 text-dark-secondary" size={16} />
            <input
              type="text"
              placeholder="Cari kode sesi, nama atlet, atau kode atlet..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-dark-border rounded-xl text-dark placeholder:text-dark-secondary/60 focus:outline-none focus:bg-white focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/10 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Status' },
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Berlangsung', label: 'Berlangsung' },
                  { value: 'Siap Dianalisis', label: 'Siap Dianalisis' },
                  { value: 'Selesai', label: 'Selesai' },
                ]}
              />
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
        </div>

        {/* Daftar Sesi */}
        {loading ? (
          <LoadingState message="Memuat daftar sesi analisis..." />
        ) : filteredSessions.length > 0 ? (
          viewMode === 'grid' ? (
            /* MODE 1: GRID KARTU SESI ANALISIS (INTERAKTIF & MODERN) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSessions.map((s) => {
                const completedVideos = getCompletedVideoCount(s);
                const progressPct = Math.round((completedVideos / MAX_ATTEMPTS) * 100);
                const athCode = getAthleteCode(s.athleteId);

                return (
                  <div
                    key={s.id}
                    className="relative bg-white border border-dark-border hover:border-[#800000]/40 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Header Kartu: Kode Sesi & Status */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-dark-border/60">
                        <div>
                          <span className="font-mono text-xs font-black text-[#800000] tracking-wide block">
                            {s.sessionCode}
                          </span>
                          <span className="text-[11px] text-dark-secondary flex items-center gap-1 mt-0.5">
                            <Calendar size={12} /> {formatDate(s.date)}
                          </span>
                        </div>
                        {getStatusBadge(s.status)}
                      </div>

                      {/* Info Atlet & Kaki Uji */}
                      <div className="mt-3 space-y-2">
                        <div>
                          <span className="text-[10px] text-dark-secondary block uppercase tracking-wider font-semibold">
                            Atlet
                          </span>
                          <h4 className="font-bold text-dark text-sm leading-tight truncate group-hover:text-[#800000] transition-colors">
                            {s.athleteName}
                          </h4>
                          <span className="font-mono text-[11px] text-slate-500 font-medium">
                            Kode: {athCode}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-dark-border/50 flex items-center justify-between text-xs">
                          <span className="text-dark-secondary flex items-center gap-1.5 font-medium">
                            <Footprints size={14} className="text-[#800000]" /> Kaki Uji
                          </span>
                          <span className="font-bold text-[#800000] bg-[#800000]/10 px-2 py-0.5 rounded-md text-[11px]">
                            Tendangan {s.kickingLeg}
                          </span>
                        </div>

                        {/* Progress Bar 5 Percobaan */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-dark-secondary font-medium">Video Percobaan</span>
                            <span className="font-mono font-bold text-dark">
                              {completedVideos} / {MAX_ATTEMPTS}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#800000] h-2 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Kartu: Aksi */}
                    <div className="flex items-center justify-between pt-3 mt-4 border-t border-dark-border/60">
                      <button
                        onClick={() => navigate(`/analisis/${s.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#800000] hover:text-[#500000] transition-colors"
                      >
                        Buka Ruang Analisis <ArrowRight size={14} />
                      </button>

                      <button
                        onClick={() => setSessionToDelete(s)}
                        title="Hapus Sesi"
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-dark-secondary hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={14} />
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
                'KODE ATLET',
                'NAMA ATLET',
                'TANGGAL',
                'KAKI UJI',
                'JUMLAH PERCOBAAN',
                'STATUS',
                'AKSI',
              ]}
            >
              {filteredSessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-xs text-[#800000]">
                    {session.sessionCode}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-dark-secondary">
                    {getAthleteCode(session.athleteId)}
                  </td>
                  <td className="px-4 py-3 font-bold text-dark text-xs">
                    {session.athleteName}
                  </td>
                  <td className="px-4 py-3 text-xs text-dark-secondary font-mono">
                    {formatDate(session.date)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#800000] bg-[#800000]/10 px-2 py-0.5 rounded-md text-[11px]">
                      <Footprints size={11} /> {session.kickingLeg}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-dark">
                    {getCompletedVideoCount(session)} / {MAX_ATTEMPTS}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(session.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/analisis/${session.id}`)}
                        className="text-xs font-bold text-[#800000] hover:text-[#500000] hover:underline flex items-center gap-1 transition-colors"
                      >
                        Detail <ArrowRight size={12} />
                      </button>
                      <button
                        onClick={() => setSessionToDelete(session)}
                        title="Hapus Sesi"
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-dark-secondary hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )
        ) : (
          <EmptyState
            title="Belum ada sesi analisis"
            description={
              searchTerm || statusFilter !== 'all'
                ? 'Tidak ada sesi yang cocok dengan filter pencarian yang dipilih.'
                : 'Mulai sesi analisis baru untuk melakukan monitoring tendangan atlet.'
            }
            action={
              <Button icon={<Plus size={16} />} onClick={() => setIsFormOpen(true)}>
                Sesi Analisis Baru
              </Button>
            }
          />
        )}
      </Card>

      {/* Modal Form Buat Sesi Baru */}
      <SessionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={(newSessionId) => {
          loadData();
          navigate(`/analisis/${newSessionId}`);
        }}
      />

      {/* Modal Konfirmasi Hapus Sesi */}
      <Modal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        title="Konfirmasi Hapus Sesi Analisis"
        footer={
          <>
            <Button variant="outline" onClick={() => setSessionToDelete(null)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleDeleteConfirm}>
              Ya, Hapus Sesi
            </Button>
          </>
        }
      >
        <div className="text-xs text-dark space-y-2.5 leading-relaxed">
          <p>
            Apakah Anda yakin ingin menghapus sesi analisis <b>{sessionToDelete?.sessionCode}</b> untuk atlet <b>{sessionToDelete?.athleteName}</b>?
          </p>
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 leading-normal">
            <b>Peringatan:</b> Seluruh 5 data percobaan tendangan, trajektori, dan rekaman video yang terhubung dengan sesi ini akan terhapus permanen dari sistem.
          </div>
        </div>
      </Modal>
    </div>
  );
};