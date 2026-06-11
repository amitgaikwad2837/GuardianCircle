import { create } from 'zustand';
import type { EscalationLevel } from '@core/events/EventTypes';

export type SOSStatus = 'idle' | 'countdown' | 'active' | 'cancelled' | 'resolved';

interface SOSState {
  status: SOSStatus;
  activeIncidentId: string | null;
  escalationLevel: EscalationLevel;
  countdownSeconds: number;
  isSilentMode: boolean;
  isDuressMode: boolean;

  // Actions
  startCountdown: (isSilent: boolean) => void;
  setActive: (incidentId: string) => void;
  setCountdown: (seconds: number) => void;
  escalate: (level: EscalationLevel) => void;
  cancel: () => void;
  resolve: () => void;
  reset: () => void;
}

export const useSOSStore = create<SOSState>((set) => ({
  status: 'idle',
  activeIncidentId: null,
  escalationLevel: 0,
  countdownSeconds: 10,
  isSilentMode: false,
  isDuressMode: false,

  startCountdown: (isSilent) =>
    set({ status: 'countdown', isSilentMode: isSilent }),

  setActive: (incidentId) =>
    set({ status: 'active', activeIncidentId: incidentId }),

  setCountdown: (seconds) => set({ countdownSeconds: seconds }),

  escalate: (level) => set({ escalationLevel: level }),

  cancel: () =>
    set({ status: 'cancelled', activeIncidentId: null, escalationLevel: 0 }),

  resolve: () =>
    set({ status: 'resolved', activeIncidentId: null, escalationLevel: 0 }),

  reset: () =>
    set({
      status: 'idle',
      activeIncidentId: null,
      escalationLevel: 0,
      isSilentMode: false,
      isDuressMode: false,
    }),
}));
