import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Athlete, AnalysisSession } from '../../types';
import { sessionService } from '../../services/sessionService';

interface AthleteDetailModalProps {
  isOpen: boolean;
  athlete: Athlete | null;
  sessions?: AnalysisSession[];
  onClose: () => void;
}

export const AthleteDetailModal: React.FC<AthleteDetailModalProps> = ({
  isOpen,
  athlete,
  sessions: initialSessions,
  onClose,
}) => {
  const [sessions, setSessions] = useState<AnalysisSession[]>(initialSessions || []);

  useEffect(() => {
    if (initialSessions) {
      setSessions(initialSessions);
    } else if (athlete?.id && isOpen) {
      sessionService.getSessionsByAthleteId(athlete.id).then((data: AnalysisSession[]) => {
        setSessions(data || []);
      });
    }
  }, [athlete, initialSessions, isOpen]);

  if (!athlete) return null;

  const totalAttemptsUploaded = sessions.reduce(
    (acc, s) =>
      acc + (s.attempts || []).filter((att) => att.video || att.status === 'Video Tersedia').length,
    0
  );

  const birthYear = new Date(athlete.birthDate).getFullYear();
  const calculatedAge = athlete.age || new Date().getFullYear() - birthYear;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Profil Atlet"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold font-mono text-base">
              {athlete.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-dark">{athlete.name}</h3>
              <p className="font-mono text-dark-secondary">{athlete.athleteCode}</p>
            </div>
          </div>
          <Badge variant={athlete.status === 'Aktif' ? 'success' : 'neutral'}>
            {athlete.status || 'Aktif'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-dark-border">
            <span className="text-dark-secondary block text-[11px]">Jenis Kelamin & Usia</span>
            <span className="font-semibold text-dark">
              {athlete.gender} • {calculatedAge} th
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-dark-border">
            <span className="text-dark-secondary block text-[11px]">Kategori Tanding</span>
            <span className="font-semibold text-dark">{athlete.category || 'Tanding'}</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-dark-border">
            <span className="text-dark-secondary block text-[11px]">Kaki Dominan</span>
            <span className="font-semibold text-primary">Kaki {athlete.dominantLeg}</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-dark-border">
            <span className="text-dark-secondary block text-[11px]">Fase Pemulihan</span>
            <span className="font-semibold text-dark">{athlete.recoveryPhase || '-'}</span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-dark-border">
          <span className="text-dark-secondary block text-[11px] mb-1">Riwayat Cedera:</span>
          <p className="text-dark font-medium">
            {athlete.injuredLeg
              ? `Kaki ${athlete.injuredLeg} (${athlete.injuryType || 'Cedera'})`
              : 'Tidak Ada Riwayat Cedera Aktif'}
          </p>
          {athlete.notes && (
            <p className="text-dark-secondary italic text-[11px] mt-1 pt-1 border-t border-dark-border/60">
              "{athlete.notes}"
            </p>
          )}
        </div>

        <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-lg font-mono text-[11px]">
          <span>Total Sesi Uji: <b>{sessions.length}</b></span>
          <span>Video Tersedia: <b>{totalAttemptsUploaded}</b></span>
        </div>
      </div>
    </Modal>
  );
};