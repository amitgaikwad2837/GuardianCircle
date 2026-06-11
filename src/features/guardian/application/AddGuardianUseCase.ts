import { v4 as uuidv4 } from 'uuid';
import type { IGuardianRepository } from '../domain/interfaces/IGuardianRepository';
import type { Guardian } from '../domain/entities/Guardian';
import { EventBus } from '@core/events/EventBus';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface AddGuardianInput {
  displayName: string;
  phoneNumber: string;         // raw — will be normalised to E.164
  notificationPriority?: number;
  isDecoy?: boolean;
  publicKey?: string;
  fcmToken?: string;
}

export class AddGuardianUseCase {
  constructor(private readonly repo: IGuardianRepository) {}

  async execute(input: AddGuardianInput): Promise<Guardian> {
    const phone = parsePhoneNumberFromString(input.phoneNumber, 'IN');
    if (!phone?.isValid()) {
      throw new Error('Invalid phone number. Please enter a valid Indian mobile number.');
    }

    const existing = await this.repo.findByPhone(phone.format('E.164'));
    if (existing) {
      throw new Error('This phone number is already in your guardian list.');
    }

    const count = await this.repo.count();
    if (count >= 10) {
      throw new Error('Maximum of 10 guardians reached.');
    }

    const guardian = await this.repo.create({
      displayName: input.displayName.trim(),
      phoneNumber: phone.format('E.164'),
      trustLevel: input.publicKey ? 2 : 1,
      notificationPriority: input.notificationPriority ?? count + 1,
      isActive: true,
      isDecoy: input.isDecoy ?? false,
      publicKey: input.publicKey,
      fcmToken: input.fcmToken,
      addedAt: new Date(),
    });

    EventBus.emit('guardian:added', { guardianId: guardian.id });
    return guardian;
  }
}
