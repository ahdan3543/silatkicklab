import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Athlete } from '../../types';
import { athleteService } from '../../services/athleteService';
import { sessionService } from '../../services/sessionService';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSessionId?: string) => void;
}

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [kickingLeg, setKickingLeg] = useState<'Kanan' | 'Kiri'>('Kanan');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      athleteService.getAllAthletes().then((data) => {
        setAthletes(data || []);
        if (data.length > 0 && !selectedAthleteId) {
          setSelectedAthleteId(data[0].id);
          setKickingLeg(data[0].dominantLeg || 'Kanan');
        }
      });
    }
  }, [isOpen]);

  const handleAthleteChange = (athId: string) => {
    setSelectedAthleteId(athId);
    const ath = athletes.find((a) => a.id === athId);
    if (ath) {
      setKickingLeg(ath.dominantLeg || 'Kanan');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthleteId) return;
    try {
      const ath = athletes.find((a) => a.id === selectedAthleteId);
      const newSes = await sessionService.createSession({
        athleteId: selectedAthleteId,
        athleteName: ath?.name,
        athleteCode: ath?.athleteCode,
        date,
        kickingLeg,
        notes,
      });
      onSuccess(newSes.id);
    } catch (err) {
      console.error('Gagal membuat sesi baru:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Sesi Analisis Baru"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" icon={<Save size={14} />} onClick={handleSubmit}>
            Simpan Sesi
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block text-dark font-medium mb-1">Pilih Atlet</label>
          <select
            value={selectedAthleteId}
            onChange={(e) => handleAthleteChange(e.target.value)}
            className="w-full p-2 border border-dark-border rounded-lg bg-white"
            required
          >
            {athletes.map((ath) => (
              <option key={ath.id} value={ath.id}>
                {ath.name} ({ath.athleteCode}) - Kaki: {ath.dominantLeg}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Tanggal Pengujian"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <div>
            <label className="block text-dark font-medium mb-1">Kaki yang Diuji</label>
            <select
              value={kickingLeg}
              onChange={(e) => setKickingLeg(e.target.value as 'Kanan' | 'Kiri')}
              className="w-full p-2 border border-dark-border rounded-lg bg-white"
            >
              <option value="Kanan">Kanan</option>
              <option value="Kiri">Kiri</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-dark font-medium mb-1">Catatan Protokol / Sesi</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full p-2 border border-dark-border rounded-lg bg-white"
            placeholder="Catatan tambahan kondisi sesi..."
          />
        </div>
      </form>
    </Modal>
  );
};