import { Athlete } from '../types';
import { mockAthletes } from '../data/mockData';

const STORAGE_KEY = 'silat_kick_athletes_data';

// Ambil data Ahdan saja dari mockAthletes sebagai data bawaan
const DEFAULT_ATHLETES: Athlete[] = mockAthletes.filter(
  (a) =>
    a.name.toLowerCase().includes('ahdan') ||
    a.athleteCode.toLowerCase().includes('ahdan')
);

// Fallback jika di mockData nama Ahdan tidak tertulis persis
const INITIAL_DATA: Athlete[] =
  DEFAULT_ATHLETES.length > 0
    ? DEFAULT_ATHLETES
    : [
        {
          id: 'ath-001',
          athleteCode: 'AT-001',
          name: 'Muhammad Ahdan Haqiqin',
          category: 'Tanding',
          classCategory: 'Kelas C (Dewasa)',
          gender: 'Laki-laki',
          dominantLeg: 'Kanan',
          injuryStatus: 'Pasca Cedera (Tahap Pemulihan)',
          createdAt: '2026-01-15',
        } as any,
      ];

const getStoredAthletes = (): Athlete[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
  try {
    const parsed: Athlete[] = JSON.parse(data);
    // Hapus data Siti jika sebelumnya sempat tersimpan di browser
    const cleaned = parsed.filter((a) => !a.name.toLowerCase().includes('siti'));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return INITIAL_DATA;
  }
};

const saveAthletes = (athletes: Athlete[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(athletes));
};

export const athleteService = {
  getAllAthletes: async (): Promise<Athlete[]> => {
    return Promise.resolve(getStoredAthletes());
  },

  getAthleteById: async (id: string): Promise<Athlete | undefined> => {
    const athletes = getStoredAthletes();
    return Promise.resolve(athletes.find((a) => a.id === id));
  },

  createAthlete: async (data: Omit<Athlete, 'id' | 'createdAt'>): Promise<Athlete> => {
    const athletes = getStoredAthletes();
    const newAthlete: Athlete = {
      ...data,
      id: `ath-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    athletes.unshift(newAthlete);
    saveAthletes(athletes);
    return Promise.resolve(newAthlete);
  },

  updateAthlete: async (id: string, data: Partial<Athlete>): Promise<Athlete> => {
    const athletes = getStoredAthletes();
    const index = athletes.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error('Atlet tidak ditemukan');
    }
    athletes[index] = { ...athletes[index], ...data };
    saveAthletes(athletes);
    return Promise.resolve(athletes[index]);
  },

  deleteAthlete: async (id: string): Promise<boolean> => {
    const athletes = getStoredAthletes();
    const filtered = athletes.filter((a) => a.id !== id);
    saveAthletes(filtered);
    return Promise.resolve(true);
  },

  isAthleteCodeTaken: (athleteCode: string, excludeId?: string): boolean => {
    const athletes = getStoredAthletes();
    return athletes.some(
      (a) => a.athleteCode.toLowerCase() === athleteCode.trim().toLowerCase() && a.id !== excludeId
    );
  },
};