export type CheckInStatus = 'pending' | 'completed' | 'missed' | 'escalated' | 'cancelled';
export type CheckInType = 'one_time' | 'recurring' | 'journey_linked';

export interface CheckIn {
  id: string;
  label?: string;
  type: CheckInType;
  scheduledAt: Date;
  completedAt?: Date;
  missedAt?: Date;
  /** iCal RRULE string for recurring check-ins e.g. "FREQ=DAILY;BYHOUR=21;BYMINUTE=0" */
  recurrenceRule?: string;
  guardianIds: string[];
  escalationDelayMinutes: number;
  status: CheckInStatus;
  journeyId?: string;
  createdAt: Date;
}
