import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Activity, Eye, Trash2, ArrowUpRight } from 'lucide-react';
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
      setSessions(sessionList);
      setAthletes(athleteList);
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

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    await sessionService.deleteSession(sessionToDelete.id);
    setSessionToDelete(null);
    loadData();
  };

  const getCompletedVideoCount = (session: AnalysisSession): number => {
    return session.attempts.filter((att) => att.video || att.status === 'Video Tersedia' || att.status === 'Dianalisis').length;
  };

  const getStatusBadge = (status: AnalysisSession['status']) => {
    switch (status) {
      case 'Selesai':
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-dark">Sesi Analisis</h2>
          <p className="text-xs text-dark-secondary">
            Kelola sesi monitoring dan evaluasi tendangan depan atlet.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setIsFormOpen(true)}>
          Sesi Analisis Baru
        </Button>
      </div>

      <Card>
        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row items-center gap-3 pb-5 mb-5 border-b border-dark-border/60">
          <div className="w-full md:flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-dark-secondary" size={16} />
            <input
              type="text"
              placeholder="Cari kode sesi, nama atlet, atau kode atlet..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-dark-border rounded-lg text-dark placeholder:text-dark-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full md:w-48">
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
        </div>

        {/* Tabel Sesi */}
        {loading ? (
          <LoadingState message="Memuat daftar sesi analisis..." />
        ) : filteredSessions.length > 0 ? (
          <Table headers={['Kode Sesi', 'Kode Atlet', 'Nama Atlet', 'Tanggal', 'Jumlah Percobaan', 'Status', 'Aksi']}>
            {filteredSessions.map((session) => (
              <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-xs text-dark">{session.sessionCode}</td>
                <td className="px-4 py-3 font-mono text-xs text-dark-secondary">{getAthleteCode(session.athleteId)}</td>
                <td className="px-4 py-3 font-medium text-dark">{session.athleteName}</td>
                <td className="px-4 py-3 text-xs text-dark-secondary">{formatDate(session.date)}</td>
                <td className="px-4 py-3 text-xs font-semibold text-dark">
                  {getCompletedVideoCount(session)} / {MAX_ATTEMPTS}
                </td>
                <td className="px-4 py-3">{getStatusBadge(session.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/analisis/${session.id}`)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Detail <ArrowUpRight size={13} />
                    </button>
                    <button
                      onClick={() => setSessionToDelete(session)}
                      title="Hapus Sesi"
                      className="p-1.5 rounded-md hover:bg-red-50 text-dark-secondary hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            title="Belum ada sesi analisis"
            description="Mulai sesi analisis baru untuk melakukan monitoring tendangan atlet."
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

      {/* Modal Konfirmasi Hapus */}
      <Modal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        title="Hapus Sesi Analisis"
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
        <div className="text-xs text-dark space-y-2 leading-relaxed">
          <p>
            Apakah Anda yakin ingin menghapus sesi analisis <b>{sessionToDelete?.sessionCode}</b> untuk atlet <b>{sessionToDelete?.athleteName}</b>?
          </p>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <b>Peringatan:</b> Seluruh 5 data percobaan tendangan dan rekaman yang terhubung dengan sesi ini akan terhapus.
          </div>
        </div>
      </Modal>
    </div>
  );
};