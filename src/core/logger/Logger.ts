import { MMKV } from 'react-native-mmkv';

/**
 * Structured logger for GuardianCircle.
 *
 * Design constraints:
 * - No remote logging — all logs stay on device (DV threat model, ADR-007)
 * - Circular buffer in MMKV — last N entries survive app restarts for debugging
 * - In release builds, debug/info logs are no-ops; only warn/error are written
 * - Log entries contain no PII (no phone numbers, locations, message content)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  ts: number;
  meta?: Record<string, unknown>;
}

const MAX_ENTRIES = 500;
const STORAGE_KEY = 'gc_logs';
const IS_DEV = __DEV__;

const storage = new MMKV({ id: 'gc_logger' });

function readBuffer(): LogEntry[] {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LogEntry[];
  } catch {
    return [];
  }
}

function writeBuffer(entries: LogEntry[]): void {
  try {
    storage.set(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Silently fail — logging must never crash the app
  }
}

function append(entry: LogEntry): void {
  const entries = readBuffer();
  entries.push(entry);
  // Trim to circular buffer size
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  writeBuffer(entries);
}

function shouldWrite(level: LogLevel): boolean {
  if (IS_DEV) return true;
  return level === 'warn' || level === 'error';
}

function consoleOutput(entry: LogEntry): void {
  if (!IS_DEV) return;
  const prefix = `[${entry.tag}]`;
  switch (entry.level) {
    case 'debug': console.debug(prefix, entry.message, entry.meta ?? ''); break;
    case 'info':  console.info(prefix, entry.message, entry.meta ?? '');  break;
    case 'warn':  console.warn(prefix, entry.message, entry.meta ?? '');  break;
    case 'error': console.error(prefix, entry.message, entry.meta ?? ''); break;
  }
}

function log(
  level: LogLevel,
  tag: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (!shouldWrite(level)) return;
  const entry: LogEntry = { level, tag, message, ts: Date.now(), meta };
  consoleOutput(entry);
  append(entry);
}

/** Returns the last `count` log entries (most recent last). */
function getRecentLogs(count = 100): LogEntry[] {
  const all = readBuffer();
  return all.slice(-count);
}

/** Clears all stored logs. Call on factory reset / data wipe. */
function clearLogs(): void {
  storage.delete(STORAGE_KEY);
}

/** Creates a tagged child logger. Reduces tag boilerplate at call sites. */
function createTagged(tag: string) {
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log('debug', tag, msg, meta),
    info:  (msg: string, meta?: Record<string, unknown>) => log('info',  tag, msg, meta),
    warn:  (msg: string, meta?: Record<string, unknown>) => log('warn',  tag, msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log('error', tag, msg, meta),
  };
}

export const Logger = {
  debug: (tag: string, msg: string, meta?: Record<string, unknown>) => log('debug', tag, msg, meta),
  info:  (tag: string, msg: string, meta?: Record<string, unknown>) => log('info',  tag, msg, meta),
  warn:  (tag: string, msg: string, meta?: Record<string, unknown>) => log('warn',  tag, msg, meta),
  error: (tag: string, msg: string, meta?: Record<string, unknown>) => log('error', tag, msg, meta),
  /** Logs an Error without capturing the stack trace, which may contain PII. */
  safeError(tag: string, msg: string, err: unknown): void {
    log('error', tag, msg, {
      name: err instanceof Error ? err.name : 'UnknownError',
      message: err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120),
    });
  },
  create: createTagged,
  getRecentLogs,
  clearLogs,
};
