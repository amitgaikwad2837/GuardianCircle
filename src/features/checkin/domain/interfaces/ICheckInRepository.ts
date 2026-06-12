import type { CheckIn, CheckInStatus } from '../entities/CheckIn';

export interface ICheckInRepository {
  create(input: Omit<CheckIn, 'id' | 'createdAt'>): Promise<CheckIn>;
  getById(id: string): Promise<CheckIn | null>;
  getPending(): Promise<CheckIn[]>;
  getDue(before: Date): Promise<CheckIn[]>;
  getRecurring(): Promise<CheckIn[]>;
  updateStatus(id: string, status: CheckInStatus, timestamp?: Date): Promise<void>;
  delete(id: string): Promise<void>;
}
