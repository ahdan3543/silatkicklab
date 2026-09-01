export type Gender = 'Laki-laki' | 'Perempuan';
export type LegDominance = 'Kanan' | 'Kiri';
export type DominantLeg = LegDominance;
export type AthleteStatus = 'Aktif' | 'Tidak Aktif' | 'Dalam Pemulihan' | string;
export type RecoveryPhase = 'Early' | 'Mid' | 'Return to Sport Ready' | string;

export interface Athlete {
  id: string;
  athleteCode: string;
  name: string;
  gender: Gender;
  birthDate: string;
  age?: number;
  category?: string;
  dominantLeg: LegDominance;
  injuredLeg?: LegDominance | null;
  injuryType?: string;
  recoveryPhase?: RecoveryPhase;
  status?: AthleteStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AthleteFormData = Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>;