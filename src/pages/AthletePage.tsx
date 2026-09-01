import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, Filter } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
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

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dominantLegFilter, setDominantLegFilter] = useState<string>('all');
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
      setAthletes(athleteData);
      setSessions(sessionData);
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
        dominantLegFilter === 'all' || athlete.dominantLeg === dominantLegFilter;

      const matchStatus =
        statusFilter === 'all' || athlete.status === statusFilter;

      return matchSearch && matchLeg && matchStatus;
    });
  }, [athletes, searchTerm, dominantLegFilter, statusFilter]);

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

    // Proteksi data: Cek apakah memiliki sesi analisis terkait
    const hasSessions = sessions.some((s) => s.athleteId === athleteToDelete.id);

    if (hasSessions) {
      // Jika memiliki sesi, lakukan safe non-aktifkan daripada hard delete
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

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-dark">Data Atlet</h2>
          <p className="text-xs text-dark-secondary">
            Kelola data atlet yang mengikuti proses monitoring dan evaluasi.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={handleOpenAdd}>
          Tambah Atlet
        </Button>
      </div>

      {/* Konten Utama */}
      <Card>
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center gap-3 pb-5 mb-5 border-b border-dark-border/60">
          <div className="w-full md:flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-dark-secondary" size={16} />
            <input
              type="text"
              placeholder="Cari nama atau kode atlet..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-dark-border rounded-lg text-dark placeholder:text-dark-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-1/2 md:w-44">
              <Select
                value={dominantLegFilter}
                onChange={(e) => setDominantLegFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Kaki Dominan' },
                  { value: 'Kanan', label: 'Kaki Kanan' },
                  { value: 'Kiri', label: 'Kaki Kiri' },
                ]}
              />
            </div>

            <div className="w-1/2 md:w-40">
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
          </div>
        </div>

        {/* Tabel Atlet */}
        {loading ? (
          <LoadingState message="Memuat daftar atlet..." />
        ) : filteredAthletes.length > 0 ? (
          <Table
            headers={[
              'No',
              'Kode Atlet',
              'Nama Atlet',
              'Jenis Kelamin',
              'Usia',
              'Kaki Dominan',
              'Jumlah Sesi',
              'Status',
              'Aksi',
            ]}
          >
            {filteredAthletes.map((a, index) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs text-dark-secondary font-medium">{index + 1}</td>
                <td className="px-4 py-3 font-mono font-medium text-xs text-dark">{a.athleteCode}</td>
                <td className="px-4 py-3 font-semibold text-dark">{a.name}</td>
                <td className="px-4 py-3 text-xs">{a.gender}</td>
                <td className="px-4 py-3 text-xs">{a.age} th</td>
                <td className="px-4 py-3 text-xs font-medium">{a.dominantLeg}</td>
                <td className="px-4 py-3 text-xs font-medium">
                  {getAthleteSessionCount(a.id)} Sesi
                </td>
                <td className="px-4 py-3">
                  <Badge variant={a.status === 'Aktif' ? 'success' : 'neutral'}>
                    {a.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenDetail(a)}
                      title="Lihat Detail"
                      className="p-1.5 rounded-md hover:bg-slate-100 text-dark-secondary hover:text-dark transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(a)}
                      title="Edit Data"
                      className="p-1.5 rounded-md hover:bg-slate-100 text-dark-secondary hover:text-primary transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setAthleteToDelete(a)}
                      title="Hapus / Nonaktifkan"
                      className="p-1.5 rounded-md hover:bg-red-50 text-dark-secondary hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            title="Belum ada data atlet"
            description={
              searchTerm || dominantLegFilter !== 'all' || statusFilter !== 'all'
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

      {/* Reusable Form Modal */}
      <AthleteFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadData}
        initialData={selectedAthleteForEdit}
      />

      {/* Detail Modal */}
      <AthleteDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        athlete={selectedAthleteForDetail}
        sessions={sessions}
      />

      {/* Konfirmasi Hapus Modal */}
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
        <div className="text-xs text-dark space-y-2 leading-relaxed">
          <p>
            Apakah Anda yakin ingin menghapus data atlet <b>{athleteToDelete?.name}</b> (
            {athleteToDelete?.athleteCode})?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <b>Catatan Keamanan Data:</b> Jika atlet sudah memiliki sesi analisis terkait, sistem
            akan mengalihkan status menjadi <b>Tidak Aktif</b> guna mencegah rusaknya relasi data
            penelitian.
          </div>
        </div>
      </Modal>
    </div>
  );
};