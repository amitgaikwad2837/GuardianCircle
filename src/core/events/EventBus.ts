import EventEmitter from 'eventemitter3';
import type { AppEvents } from './EventTypes';

/**
 * Typed application-wide event bus.
 * The ONLY mechanism for cross-feature communication.
 * Features must not import each other directly.
 *
 * Usage:
 *   EventBus.emit('sos:triggered', { incidentId, method, isSilent, location });
 *   const unsub = EventBus.on('sos:triggered', (payload) => { ... });
 *   unsub(); // cleanup
 */
class TypedEventBus {
  private emitter = new EventEmitter();

  on<K extends keyof AppEvents>(
    event: K,
    listener: (payload: AppEvents[K]) => void,
  ): () => void {
    this.emitter.on(event, listener);
    return () => this.emitter.off(event, listener);
  }

  once<K extends keyof AppEvents>(
    event: K,
    listener: (payload: AppEvents[K]) => void,
  ): void {
    this.emitter.once(event, listener);
  }

  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
    this.emitter.emit(event, payload);
  }

  off<K extends keyof AppEvents>(
    event: K,
    listener: (payload: AppEvents[K]) => void,
  ): void {
    this.emitter.off(event, listener);
  }

  removeAllListeners<K extends keyof AppEvents>(event?: K): void {
    this.emitter.removeAllListeners(event);
  }
}

export const EventBus = new TypedEventBus();
