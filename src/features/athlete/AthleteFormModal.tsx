import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Athlete, Gender, DominantLeg, AthleteStatus } from '../../types';
import { athleteService } from '../../services/athleteService';

interface AthleteFormModalProps {
  isOpen: boolean;
  initialData?: Athlete | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AthleteFormModal: React.FC<AthleteFormModalProps> = ({
  isOpen,
  initialData,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [athleteCode, setAthleteCode] = useState('');
  const [gender, setGender] = useState<Gender>('Laki-laki');
  const [birthDate, setBirthDate] = useState('2002-01-01');
  const [category, setCategory] = useState('Tanding Kelas C');
  const [dominantLeg, setDominantLeg] = useState<DominantLeg>('Kanan');
  const [injuredLeg, setInjuredLeg] = useState<DominantLeg | ''>('');
  const [injuryType, setInjuryType] = useState('');
  const [recoveryPhase, setRecoveryPhase] = useState('Mid');
  const [status, setStatus] = useState<AthleteStatus>('Aktif');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setAthleteCode(initialData.athleteCode || '');
      setGender(initialData.gender || 'Laki-laki');
      setBirthDate(initialData.birthDate || '2002-01-01');
      setCategory(initialData.category || 'Tanding Kelas C');
      setDominantLeg(initialData.dominantLeg || 'Kanan');
      setInjuredLeg(initialData.injuredLeg || '');
      setInjuryType(initialData.injuryType || '');
      setRecoveryPhase(initialData.recoveryPhase || 'Mid');
      setStatus(initialData.status || 'Aktif');
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setAthleteCode(`PS-UPI-${Math.floor(100 + Math.random() * 900)}`);
      setGender('Laki-laki');
      setBirthDate('2002-01-01');
      setCategory('Tanding Kelas C');
      setDominantLeg('Kanan');
      setInjuredLeg('');
      setInjuryType('');
      setRecoveryPhase('Mid');
      setStatus('Aktif');
      setNotes('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const birthYear = new Date(birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;

      const payload = {
        name,
        athleteCode,
        gender,
        birthDate,
        age,
        category,
        dominantLeg,
        injuredLeg: (injuredLeg || null) as DominantLeg | null,
        injuryType,
        recoveryPhase,
        status,
        notes,
        updatedAt: new Date().toISOString(),
      };

      if (initialData?.id) {
        await athleteService.updateAthlete(initialData.id, payload);
      } else {
        await athleteService.createAthlete(payload as any);
      }
      onSuccess();
    } catch (err) {
      console.error('Gagal menyimpan atlet:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Profil Atlet' : 'Tambah Atlet Baru'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" icon={<Save size={14} />} onClick={handleSubmit}>
            Simpan Atlet
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Kode Atlet"
            value={athleteCode}
            onChange={(e) => setAthleteCode(e.target.value)}
            required
          />
          <Input
            label="Nama Lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-dark font-medium mb-1">Jenis Kelamin</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full p-2 border border-dark-border rounded-lg bg-white"
            >
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>
          <Input
            label="Tanggal Lahir"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Kategori / Kelas Tanding"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <div>
            <label className="block text-dark font-medium mb-1">Kaki Dominan</label>
            <select
              value={dominantLeg}
              onChange={(e) => setDominantLeg(e.target.value as DominantLeg)}
              className="w-full p-2 border border-dark-border rounded-lg bg-white"
            >
              <option value="Kanan">Kanan</option>
              <option value="Kiri">Kiri</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-dark font-medium mb-1">Kaki yang Cedera</label>
            <select
              value={injuredLeg}
              onChange={(e) => setInjuredLeg(e.target.value as DominantLeg | '')}
              className="w-full p-2 border border-dark-border rounded-lg bg-white"
            >
              <option value="">Tidak Ada (Non-Cedera)</option>
              <option value="Kanan">Kaki Kanan</option>
              <option value="Kiri">Kaki Kiri</option>
            </select>
          </div>
          <Input
            label="Diagnosa / Jenis Cedera"
            placeholder="Misal: Post ACL Strain"
            value={injuryType}
            onChange={(e) => setInjuryType(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-dark font-medium mb-1">Fase Pemulihan</label>
            <select
              value={recoveryPhase}
              onChange={(e) => setRecoveryPhase(e.target.value)}
              className="w-full p-2 border border-dark-border rounded-lg bg-white"
            >
              <option value="Early">Early (Fase Awal)</option>
              <option value="Mid">Mid (Fase Lanjut)</option>
              <option value="Return to Sport Ready">Return to Sport Ready</option>
            </select>
          </div>
          <div>
            <label className="block text-dark font-medium mb-1">Status Atlet</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 border border-dark-border rounded-lg bg-white"
            >
              <option value="Aktif">Aktif</option>
              <option value="Dalam Pemulihan">Dalam Pemulihan</option>
              <option value="Tidak Aktif">Tidak Aktif</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-dark font-medium mb-1">Catatan Tambahan</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full p-2 border border-dark-border rounded-lg bg-white"
            placeholder="Kondisi terkini atlet..."
          />
        </div>
      </form>
    </Modal>
  );
};