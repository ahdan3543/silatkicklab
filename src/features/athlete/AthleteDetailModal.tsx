import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Athlete, AnalysisSession, MAX_ATTEMPTS } from '../../types';
import { formatDate } from '../../utils/formatters';
import { sessionService } from '../../services/sessionService';
import { Activity, User, Shield } from 'lucide-react';

interface AthleteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: Athlete | null;
  sessions?: AnalysisSession[]; // fallback
}

export const AthleteDetailModal: React.FC<AthleteDetailModalProps> = ({
  isOpen,
  onClose,
  athlete,
}) => {
  const [athleteSessions, setAthleteSessions] = useState<AnalysisSession[]>([]);

  useEffect(() => {
    if (isOpen && athlete) {
      sessionService.getSessionsByAthleteId(athlete.id).then((data) => {
        setAthleteSessions(data);
      });
    }
  }, [isOpen, athlete]);

  if (!athlete) return null;

  const totalAttempts = athleteSessions.reduce((acc, s) => acc + s.attempts.length, 0);
  const totalVideos = athleteSessions.reduce(
    (acc, s) => acc + s.attempts.filter((att) => att.video || att.status === 'Video Tersedia').length,
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Informasi Atlet"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-dark-border">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
            <User size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-dark">{athlete.name}</h4>
              <Badge variant={athlete.status === 'Aktif' ? 'success' : 'neutral'}>
                {athlete.status}
              </Badge>
            </div>
            <p className="text-xs text-dark-secondary font-mono mt-0.5">{athlete.athleteCode}</p>
          </div>
        </div>

        {/* Informasi Atlet */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-white border border-dark-border rounded-lg">
            <span className="text-dark-secondary block">Jenis Kelamin</span>
            <span className="font-semibold text-dark mt-0.5 block">{athlete.gender}</span>
          </div>
          <div className="p-3 bg-white border border-dark-border rounded-lg">
            <span className="text-dark-secondary block">Tanggal Lahir / Usia</span>
            <span className="font-semibold text-dark mt-0.5 block">
              {formatDate(athlete.birthDate)} ({athlete.age} th)
            </span>
          </div>
          <div className="p-3 bg-white border border-dark-border rounded-lg">
            <span className="text-dark-secondary block">Kaki Dominan</span>
            <span className="font-semibold text-primary mt-0.5 block">{athlete.dominantLeg}</span>
          </div>
        </div>

        {athlete.notes && (
          <div className="p-3 bg-slate-50 border border-dark-border rounded-lg text-xs">
            <span className="font-semibold text-dark block mb-0.5">Catatan:</span>
            <p className="text-dark-secondary">{athlete.notes}</p>
          </div>
        )}

        {/* Ringkasan Analisis */}
        <div>
          <h5 className="text-xs font-bold text-dark uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shield size={14} className="text-primary" /> Ringkasan Analisis
          </h5>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-primary/5 border border-primary/15 rounded-lg text-center">
              <span className="text-[11px] text-dark-secondary block">Total Sesi</span>
              <span className="text-base font-bold text-primary">{athleteSessions.length}</span>
            </div>
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg text-center">
              <span className="text-[11px] text-dark-secondary block">Total Percobaan</span>
              <span className="text-base font-bold text-accent-dark">{totalAttempts}</span>
            </div>
            <div className="p-3 bg-slate-100 border border-dark-border rounded-lg text-center">
              <span className="text-[11px] text-dark-secondary block">Total Video</span>
              <span className="text-base font-bold text-dark">{totalVideos}</span>
            </div>
          </div>
        </div>

        {/* Riwayat Sesi Analisis */}
        <div>
          <h5 className="text-xs font-bold text-dark uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity size={14} className="text-primary" /> Riwayat Sesi Analisis
          </h5>
          {athleteSessions.length > 0 ? (
            <Table headers={['Kode Sesi', 'Tanggal', 'Percobaan', 'Status']}>
              {athleteSessions.map((session) => (
                <tr key={session.id} className="text-xs">
                  <td className="px-4 py-2.5 font-mono font-medium">{session.sessionCode}</td>
                  <td className="px-4 py-2.5 text-dark-secondary">{formatDate(session.date)}</td>
                  <td className="px-4 py-2.5 font-medium">{session.attempts.length} / {MAX_ATTEMPTS}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={session.status === 'Selesai' ? 'success' : 'neutral'}>
                      {session.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="p-4 border border-dashed border-dark-border rounded-lg text-center text-xs text-dark-secondary">
              Belum ada sesi analisis.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};