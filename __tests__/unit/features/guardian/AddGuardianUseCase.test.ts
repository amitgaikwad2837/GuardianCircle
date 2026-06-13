import { AddGuardianUseCase } from '@features/guardian/application/AddGuardianUseCase';
import type { IGuardianRepository } from '@features/guardian/domain/interfaces/IGuardianRepository';

const makeGuardian = (overrides = {}) => ({
  id: 'g1',
  displayName: 'Priya',
  phoneNumber: '+919876543210',
  trustLevel: 1 as const,
  notificationPriority: 1,
  isActive: true,
  isDecoy: false,
  addedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockRepo: jest.Mocked<IGuardianRepository> = {
  getAll: jest.fn(),
  getActiveGuardians: jest.fn(),
  getById: jest.fn(),
  findByPublicKey: jest.fn(),
  findByPhone: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation(async (input) => makeGuardian(input)),
  update: jest.fn(),
  delete: jest.fn(),
  scheduleRemoval: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
};

jest.mock('@core/events/EventBus', () => ({ EventBus: { emit: jest.fn() } }));

describe('AddGuardianUseCase', () => {
  let useCase: AddGuardianUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AddGuardianUseCase(mockRepo);
  });

  it('normalises Indian phone number to E.164', async () => {
    await useCase.execute({ displayName: 'Priya', phoneNumber: '09876543210' });
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '+919876543210' }),
    );
  });

  it('rejects duplicate phone number', async () => {
    mockRepo.findByPhone.mockResolvedValueOnce(makeGuardian());
    await expect(
      useCase.execute({ displayName: 'Priya', phoneNumber: '+919876543210' }),
    ).rejects.toThrow('already in your guardian list');
  });

  it('rejects when guardian limit of 10 is reached', async () => {
    mockRepo.count.mockResolvedValueOnce(10);
    await expect(
      useCase.execute({ displayName: 'Priya', phoneNumber: '+919876543210' }),
    ).rejects.toThrow('Maximum of 10');
  });

  it('rejects invalid phone number', async () => {
    await expect(
      useCase.execute({ displayName: 'Priya', phoneNumber: '12345' }),
    ).rejects.toThrow('Invalid phone number');
  });

  it('sets trustLevel=2 when signingPublicKey and encryptionPublicKey provided', async () => {
    await useCase.execute({
      displayName: 'Priya',
      phoneNumber: '+919876543210',
      signingPublicKey: 'base64signingkey',
      encryptionPublicKey: 'base64encryptionkey',
    });
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ trustLevel: 2 }),
    );
  });

  it('trims whitespace from display name', async () => {
    await useCase.execute({ displayName: '  Priya  ', phoneNumber: '+919876543210' });
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Priya' }),
    );
  });
});
