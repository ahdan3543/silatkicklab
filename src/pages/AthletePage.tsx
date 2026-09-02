import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Users,
  Activity,
  LayoutGrid,
  List,
  AlertCircle,
  Award,
  Footprints,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { Athlete, AnalysisSession } from '../types';
import { athleteService } from '../services/athleteService';
import { sessionService } from '../services/sessionService';
import { AthleteFormModal } from '../features/athlete/AthleteFormModal';
import { AthleteDetailModal } from '../features/athlete/AthleteDetailModal';

export const AthletePage: React.FC = () => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tampilan: 'grid' untuk kartu profil, 'table' untuk daftar tabel
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [injuredLegFilter, setInjuredLegFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedAthleteForEdit, setSelectedAthleteForEdit] = useState<Athlete | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [selectedAthleteForDetail, setSelectedAthleteForDetail] = useState<Athlete | null>(null);

  const [athleteToDelete, setAthleteToDelete] = useState<Athlete | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [athleteData, sessionData] = await Promise.all([
        athleteService.getAllAthletes(),
        sessionService.getAllSessions(),
      ]);
      setAthletes(athleteData || []);
      setSessions(sessionData || []);
    } catch (error) {
      console.error('Gagal memuat data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter & Search Logic
  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      const matchSearch =
        athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        athlete.athleteCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchLeg =
        injuredLegFilter === 'all' || athlete.dominantLeg === injuredLegFilter;

      const matchStatus =
        statusFilter === 'all' || athlete.status === statusFilter;

      return matchSearch && matchLeg && matchStatus;
    });
  }, [athletes, searchTerm, injuredLegFilter, statusFilter]);

  // Statistik Cepat untuk Mini Strip
  const activeCount = useMemo(() => athletes.filter((a) => a.status === 'Aktif').length, [athletes]);
  const rightLegCount = useMemo(() => athletes.filter((a) => a.dominantLeg === 'Kanan').length, [athletes]);
  const leftLegCount = useMemo(() => athletes.filter((a) => a.dominantLeg === 'Kiri').length, [athletes]);

  const handleOpenAdd = () => {
    setSelectedAthleteForEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (athlete: Athlete) => {
    setSelectedAthleteForEdit(athlete);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (athlete: Athlete) => {
    setSelectedAthleteForDetail(athlete);
    setIsDetailOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!athleteToDelete) return;

    const hasSessions = sessions.some((s) => s.athleteId === athleteToDelete.id);

    if (hasSessions) {
      await athleteService.updateAthlete(athleteToDelete.id, { status: 'Tidak Aktif' });
      alert(
        `Atlet ${athleteToDelete.name} memiliki riwayat sesi analisis, status dialihkan menjadi "Tidak Aktif" agar integritas data sesi tetap terjaga.`
      );
    } else {
      await athleteService.deleteAthlete(athleteToDelete.id);
    }

    setAthleteToDelete(null);
    loadData();
  };

  const getAthleteSessionCount = (athleteId: string): number => {
    return sessions.filter((s) => s.athleteId === athleteId).length;
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (name.slice(0, 2) || 'AT').toUpperCase();
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
                Manajemen Subjek Penelitian
              </span>
              <span className="text-[11px] text-white/70 font-mono">SILAT MOTION</span>
            </div>

            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Data Atlet Pasca Cedera
            </h1>
            <p className="text-xs text-white/85 max-w-xl leading-relaxed">
              Pusat profil atlet dan pemantauan kondisi kaki yang mengalami cedera dalam protokol uji tendangan depan UPI.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-black text-xs rounded-xl shadow transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Tambah Atlet Baru</span>
          </button>
        </div>
      </div>

      {/* 2. MINI METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-[#800000] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-dark-secondary">Total Subjek Terdaftar</span>
              <h3 className="text-2xl font-black font-mono text-dark mt-1">{athletes.length}</h3>
              <p className="text-[11px] text-[#800000] font-medium mt-0.5">Database terintegrasi</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#800000] text-white shadow-sm">
              <Users size={18} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-dark-secondary">Status Atlet Aktif</span>
              <h3 className="text-2xl font-black font-mono text-dark mt-1">{activeCount}</h3>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Sedang dalam program pemulihan</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Activity size={18} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#FACC15] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-dark-secondary">Distribusi Kaki Cedera</span>
              <h3 className="text-2xl font-black font-mono text-dark mt-1">
                {rightLegCount} <span className="text-xs font-sans text-dark-secondary font-normal">Kanan</span> / {leftLegCount} <span className="text-xs font-sans text-dark-secondary font-normal">Kiri</span>
              </h3>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">Fokus pemantauan rehabilitasi</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#800000] text-[#FACC15] shadow-sm">
              <Footprints size={18} />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. KONTEN UTAMA */}
      <Card className="p-4 sm:p-6 space-y-5">
        {/* Search, Filter & Switcher Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 pb-4 border-b border-dark-border/60">
          <div className="w-full lg:flex-1 relative">
            <Search className="absolute left-3.5 top-3 text-dark-secondary" size={16} />
            <input
              type="text"
              placeholder="Cari nama atau kode atlet (mis: Ahdan, PS-001)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-dark-border rounded-xl text-dark placeholder:text-dark-secondary/60 focus:outline-none focus:bg-white focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/10 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
            <div className="w-full sm:w-48">
              <Select
                value={injuredLegFilter}
                onChange={(e) => setInjuredLegFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Kaki Cedera' },
                  { value: 'Kanan', label: 'Cedera Kaki Kanan' },
                  { value: 'Kiri', label: 'Cedera Kaki Kiri' },
                ]}
              />
            </div>

            <div className="w-full sm:w-40">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Status' },
                  { value: 'Aktif', label: 'Status Aktif' },
                  { value: 'Tidak Aktif', label: 'Tidak Aktif' },
                ]}
              />
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-dark-border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[#800000] text-white shadow-xs'
                    : 'text-dark-secondary hover:text-dark'
                }`}
                title="Tampilan Kartu Profil"
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

        {/* Konten Atlet */}
        {loading ? (
          <LoadingState message="Memuat daftar atlet..." />
        ) : filteredAthletes.length > 0 ? (
          viewMode === 'grid' ? (
            /* MODE 1: GRID KARTU PROFIL ATLET */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAthletes.map((a) => {
                const sessionCount = getAthleteSessionCount(a.id);
                return (
                  <div
                    key={a.id}
                    className="relative bg-white border border-dark-border hover:border-[#800000]/40 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#800000] to-[#500000] text-white font-black flex items-center justify-center text-sm shadow-sm ring-2 ring-[#FACC15]/40 shrink-0">
                            {getInitials(a.name)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-dark text-sm leading-tight truncate group-hover:text-[#800000] transition-colors">
                              {a.name}
                            </h4>
                            <span className="font-mono text-[11px] text-[#800000] font-bold block mt-0.5">
                              {a.athleteCode}
                            </span>
                          </div>
                        </div>

                        <Badge variant={a.status === 'Aktif' ? 'success' : 'neutral'}>
                          {a.status}
                        </Badge>
                      </div>

                      {/* Info Spesifikasi Atlet & Kaki Cedera */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-dark-border/60 text-xs">
                        <div className="p-2 rounded-lg bg-slate-50 border border-dark-border/40">
                          <span className="text-[10px] text-dark-secondary block">Kategori / Gender</span>
                          <span className="font-semibold text-dark truncate block mt-0.5">
                            {a.gender} • {a.age} th
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/70">
                          <span className="text-[10px] text-amber-800 font-medium block">Kaki yang Cedera</span>
                          <span className="font-bold text-amber-900 block mt-0.5 flex items-center gap-1">
                            <Footprints size={12} className="text-amber-700" /> Kaki {a.dominantLeg}
                          </span>
                        </div>
                      </div>

                      {/* Baris Status Riwayat Sesi */}
                      <div className="mt-2.5 p-2 rounded-lg bg-[#800000]/5 border border-[#800000]/10 flex items-center justify-between text-xs">
                        <span className="text-dark-secondary text-[11px] flex items-center gap-1">
                          <Activity size={12} className="text-[#800000]" /> Riwayat Uji Pemulihan
                        </span>
                        <span className="font-mono font-bold text-[#800000]">
                          {sessionCount} Sesi Analisis
                        </span>
                      </div>
                    </div>

                    {/* Footer Tombol Aksi */}
                    <div className="flex items-center justify-between pt-3 mt-4 border-t border-dark-border/60">
                      <button
                        onClick={() => handleOpenDetail(a)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#800000] hover:text-[#500000] transition-colors"
                      >
                        <Eye size={14} /> Lihat Profil
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(a)}
                          title="Edit Data"
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-dark-secondary hover:text-[#800000] transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setAthleteToDelete(a)}
                          title="Hapus / Nonaktifkan"
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-dark-secondary hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* MODE 2: TABEL KOMPAK */
            <Table
              headers={[
                'NO',
                'KODE ATLET',
                'NAMA ATLET',
                'GENDER',
                'USIA',
                'KAKI CEDERA',
                'TOTAL SESI',
                'STATUS',
                'AKSI',
              ]}
            >
              {filteredAthletes.map((a, index) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-xs text-dark-secondary font-mono font-medium">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-xs text-[#800000]">
                    {a.athleteCode}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#800000] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {getInitials(a.name)}
                      </div>
                      <span className="font-bold text-dark text-xs">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-dark">{a.gender}</td>
                  <td className="px-4 py-3 text-xs text-dark font-mono">{a.age} th</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                      <Footprints size={11} className="text-amber-700" /> {a.dominantLeg}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-dark">
                    {getAthleteSessionCount(a.id)} Sesi
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={a.status === 'Aktif' ? 'success' : 'neutral'}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenDetail(a)}
                        title="Lihat Detail"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-dark-secondary hover:text-[#800000] transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(a)}
                        title="Edit Data"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-dark-secondary hover:text-[#800000] transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setAthleteToDelete(a)}
                        title="Hapus / Nonaktifkan"
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
            title="Belum ada data atlet"
            description={
              searchTerm || injuredLegFilter !== 'all' || statusFilter !== 'all'
                ? 'Tidak ada atlet yang cocok dengan filter pencarian yang dipilih.'
                : 'Tambahkan atlet untuk mulai membuat sesi analisis.'
            }
            action={
              <Button icon={<Plus size={16} />} onClick={handleOpenAdd}>
                Tambah Atlet
              </Button>
            }
          />
        )}
      </Card>

      {/* Modal Form Tambah/Edit Atlet */}
      <AthleteFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadData}
        initialData={selectedAthleteForEdit}
      />

      {/* Modal Detail Atlet */}
      <AthleteDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        athlete={selectedAthleteForDetail}
        sessions={sessions}
      />

      {/* Modal Konfirmasi Hapus */}
      <Modal
        isOpen={Boolean(athleteToDelete)}
        onClose={() => setAthleteToDelete(null)}
        title="Konfirmasi Tindakan Data Atlet"
        footer={
          <>
            <Button variant="outline" onClick={() => setAthleteToDelete(null)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleDeleteConfirm}>
              Ya, Proses
            </Button>
          </>
        }
      >
        <div className="text-xs text-dark space-y-2.5 leading-relaxed">
          <p>
            Apakah Anda yakin ingin menghapus data atlet <b>{athleteToDelete?.name}</b> (
            {athleteToDelete?.athleteCode})?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              <b>Catatan Keamanan Data:</b> Jika atlet sudah memiliki sesi analisis terkait, sistem
              akan mengalihkan status menjadi <b>Tidak Aktif</b> guna mencegah rusaknya relasi data
              penelitian.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};