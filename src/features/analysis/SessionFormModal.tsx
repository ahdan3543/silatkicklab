import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Athlete } from '../../types';
import { athleteService } from '../../services/athleteService';
import { sessionService } from '../../services/sessionService';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSessionId: string) => void;
}

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [kickingLeg, setKickingLeg] = useState<'Kanan' | 'Kiri'>('Kanan');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      athleteService.getAllAthletes().then((data) => {
        const activeAthletes = data.filter((a) => a.status === 'Aktif');
        setAthletes(activeAthletes);
        if (activeAthletes.length > 0) {
          setSelectedAthleteId(activeAthletes[0].id);
          setKickingLeg(activeAthletes[0].dominantLeg);
        }
      });
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setErrors({});
    }
  }, [isOpen]);

  const handleAthleteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const athId = e.target.value;
    setSelectedAthleteId(athId);
    const found = athletes.find((a) => a.id === athId);
    if (found) {
      setKickingLeg(found.dominantLeg);
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!selectedAthleteId) newErrors.athleteId = 'Wajib memilih atlet';
    if (!date) newErrors.date = 'Tanggal sesi wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const chosenAthlete = athletes.find((a) => a.id === selectedAthleteId);
      const newSession = await sessionService.createSession({
        athleteId: selectedAthleteId,
        athleteName: chosenAthlete ? chosenAthlete.name : 'Unknown Athlete',
        date,
        kickingLeg,
        notes,
      });

      onSuccess(newSession.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat sesi';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Sesi Analisis Baru"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Membuat Sesi...' : 'Buat Sesi & 5 Percobaan'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {athletes.length === 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Tidak ada atlet aktif yang tersedia. Pastikan atlet sudah terdaftar dan berstatus Aktif.
          </div>
        ) : (
          <Select
            label="Pilih Atlet Terdaftar *"
            value={selectedAthleteId}
            onChange={handleAthleteChange}
            error={errors.athleteId}
            options={athletes.map((a) => ({
              value: a.id,
              label: `${a.athleteCode} — ${a.name} (${a.gender})`,
            }))}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tanggal Analisis *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />
          <Select
            label="Kaki yang Diuji *"
            value={kickingLeg}
            onChange={(e) => setKickingLeg(e.target.value as 'Kanan' | 'Kiri')}
            options={[
              { value: 'Kanan', label: 'Kanan' },
              { value: 'Kiri', label: 'Kiri' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-dark mb-1.5">Catatan Sesi (Opsional)</label>
          <textarea
            rows={3}
            className="w-full px-3.5 py-2 text-sm bg-white border border-dark-border rounded-lg text-dark placeholder:text-dark-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="Kondisi atlet sebelum tes, target evaluasi, atau catatan klinis..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="p-3 bg-slate-50 border border-dark-border rounded-lg text-xs text-dark-secondary leading-relaxed">
          <p className="font-semibold text-dark mb-0.5">Ketentuan Protokol:</p>
          Sistem akan secara otomatis men-generate tepat <b>5 slot percobaan tendangan</b> untuk sesi ini.
        </div>
      </form>
    </Modal>
  );
};