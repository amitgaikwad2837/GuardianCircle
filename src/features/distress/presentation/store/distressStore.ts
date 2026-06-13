import { create } from 'zustand';
import type { DistressSignal } from '@core/events/EventTypes';

interface ActiveDistress {
  eventId: string;
  confidence: number;
  signals: DistressSignal[];
  detectedAt: number;
}

type FallPayload = { eventId: string; confidence: number; impactMagnitude: number };

interface DistressState {
  active: ActiveDistress | null;
  activeFall: FallPayload | null;
  activeCrash: FallPayload | null;

  setActive: (distress: ActiveDistress | null) => void;
  setActiveFall: (fall: FallPayload | null) => void;
  setActiveCrash: (crash: FallPayload | null) => void;
  dismiss: () => void;
  dismissFall: () => void;
  dismissCrash: () => void;
}

export const useDistressStore = create<DistressState>((set) => ({
  active: null,
  activeFall: null,
  activeCrash: null,

  setActive:      (distress) => set({ active: distress }),
  setActiveFall:  (fall)     => set({ activeFall: fall }),
  setActiveCrash: (crash)    => set({ activeCrash: crash }),
  dismiss:        ()         => set({ active: null }),
  dismissFall:    ()         => set({ activeFall: null }),
  dismissCrash:   ()         => set({ activeCrash: null }),
}));
