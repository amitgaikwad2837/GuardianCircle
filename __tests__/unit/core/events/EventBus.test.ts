import { EventBus } from '@core/events/EventBus';

describe('EventBus', () => {
  it('delivers event to subscriber', () => {
    const handler = jest.fn();
    EventBus.on('sos:triggered', handler);
    EventBus.emit('sos:triggered', {
      incidentId: 'abc',
      method: 'long_press',
      isSilent: false,
      location: null,
    });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ incidentId: 'abc' }),
    );
    EventBus.off('sos:triggered', handler);
  });

  it('returns unsubscribe function that stops delivery', () => {
    const handler = jest.fn();
    const unsub = EventBus.on('sos:cancelled', handler);
    unsub();
    EventBus.emit('sos:cancelled', { incidentId: 'abc', reason: 'user' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not deliver to unrelated event subscriber', () => {
    const handler = jest.fn();
    EventBus.on('sos:resolved', handler);
    EventBus.emit('sos:triggered', {
      incidentId: 'abc',
      method: 'shake',
      isSilent: false,
      location: null,
    });
    expect(handler).not.toHaveBeenCalled();
    EventBus.off('sos:resolved', handler);
  });
});
