import { PermissionsAndroid, NativeModules } from 'react-native';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

export interface PhonebookEntry {
  displayName: string;
  phoneNumbers: { number: string; label: string }[];
}

export interface PhonebookPickResult {
  displayName: string;
  rawPhoneNumbers: { number: string; label: string }[];
  /** Populated only when exactly one number exists, formatted to E.164 */
  resolvedPhoneNumber?: string;
}

export class PhonebookPickerUseCase {
  async execute(): Promise<PhonebookPickResult | null> {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS as import('react-native').Permission,
      {
        title: 'Access Contacts',
        message:
          'GuardianCircle needs access so you can choose a guardian from your contacts. ' +
          'Only the contact you select is saved — your full contact list is never stored.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      },
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return null;

    const contact: PhonebookEntry | null =
      await (NativeModules.ContactPickerModule as { pickContact(): Promise<PhonebookEntry | null> }).pickContact();

    if (!contact || contact.phoneNumbers.length === 0) return null;

    const result: PhonebookPickResult = {
      displayName: contact.displayName,
      rawPhoneNumbers: contact.phoneNumbers,
    };

    if (contact.phoneNumbers.length === 1 && contact.phoneNumbers[0]) {
      result.resolvedPhoneNumber = this.formatE164(contact.phoneNumbers[0].number);
    }

    return result;
  }

  formatE164(raw: string, region: CountryCode = 'IN'): string {
    const parsed = parsePhoneNumberFromString(raw, region);
    if (!parsed?.isValid()) throw new Error(`Invalid phone number: ${raw}`);
    return parsed.format('E.164');
  }
}
