import { create } from 'zustand';
import type { Guardian } from '../../domain/entities/Guardian';

interface GuardianState {
  guardians: Guardian[];
  isLoading: boolean;
  selectedGuardianId: string | null;

  setGuardians: (guardians: Guardian[]) => void;
  addGuardian: (guardian: Guardian) => void;
  removeGuardian: (id: string) => void;
  updateGuardian: (id: string, update: Partial<Guardian>) => void;
  setLoading: (loading: boolean) => void;
  selectGuardian: (id: string | null) => void;
}

export const useGuardianStore = create<GuardianState>((set) => ({
  guardians: [],
  isLoading: false,
  selectedGuardianId: null,

  setGuardians: (guardians) => set({ guardians }),
  addGuardian: (guardian) =>
    set((s) => ({ guardians: [...s.guardians, guardian] })),
  removeGuardian: (id) =>
    set((s) => ({ guardians: s.guardians.filter((g) => g.id !== id) })),
  updateGuardian: (id, update) =>
    set((s) => ({
      guardians: s.guardians.map((g) => (g.id === id ? { ...g, ...update } : g)),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  selectGuardian: (selectedGuardianId) => set({ selectedGuardianId }),
}));
