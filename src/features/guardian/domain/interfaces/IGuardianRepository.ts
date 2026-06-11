import type { Guardian } from '../entities/Guardian';

export interface IGuardianRepository {
  getAll(): Promise<Guardian[]>;
  getActiveGuardians(): Promise<Guardian[]>;        // isActive=true, isDecoy=false (or decoy mode)
  getById(id: string): Promise<Guardian | null>;
  findByPublicKey(publicKey: string): Promise<Guardian | null>;
  findByPhone(phoneNumber: string): Promise<Guardian | null>;
  create(guardian: Omit<Guardian, 'id' | 'createdAt' | 'updatedAt'>): Promise<Guardian>;
  update(id: string, update: Partial<Guardian>): Promise<void>;
  delete(id: string): Promise<void>;
  scheduleRemoval(id: string, delayMs: number): Promise<void>;
  count(): Promise<number>;
}
