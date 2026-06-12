import { create } from 'zustand';
import type { Journey } from '../../domain/entities/Journey';

interface JourneyState {
  activeJourney: Journey | null;
  history: Journey[];
  isLoading: boolean;
  error: string | null;

  setActive(journey: Journey | null): void;
  setHistory(journeys: Journey[]): void;
  updateActive(update: Partial<Journey>): void;
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
}

export const useJourneyStore = create<JourneyState>((set) => ({
  activeJourney: null,
  history: [],
  isLoading: false,
  error: null,

  setActive: (journey) => set({ activeJourney: journey }),

  setHistory: (journeys) => set({ history: journeys }),

  updateActive: (update) =>
    set((state) =>
      state.activeJourney
        ? { activeJourney: { ...state.activeJourney, ...update } }
        : state,
    ),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}));
