import { create } from 'zustand';
import type { CheckIn } from '../../domain/entities/CheckIn';

interface CheckInState {
  pending: CheckIn[];
  isLoading: boolean;

  setPending(checkins: CheckIn[]): void;
  addCheckIn(checkin: CheckIn): void;
  updateCheckIn(id: string, update: Partial<CheckIn>): void;
  removeCheckIn(id: string): void;
  setLoading(loading: boolean): void;
}

export const useCheckInStore = create<CheckInState>((set) => ({
  pending: [],
  isLoading: false,

  setPending: (checkins) => set({ pending: checkins }),

  addCheckIn: (checkin) =>
    set((state) => ({ pending: [...state.pending, checkin] })),

  updateCheckIn: (id, update) =>
    set((state) => ({
      pending: state.pending.map((c) => (c.id === id ? { ...c, ...update } : c)),
    })),

  removeCheckIn: (id) =>
    set((state) => ({ pending: state.pending.filter((c) => c.id !== id) })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
