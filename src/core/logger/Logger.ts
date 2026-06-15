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

const MAX_ENTRIES   = 500;
const STORAGE_KEY   = 'gc_logs';
const FLUSH_DELAY   = 300; // ms — batch writes within this window
const IS_DEV = __DEV__;

const storage = new MMKV({ id: 'gc_logger' });

// In-memory buffer accumulates entries; a debounced timer flushes them to MMKV.
// This converts O(n) MMKV read+parse+push+serialize+write per log call into
// a single async write per flush window — critical on the SOS hot path.
let memBuffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(): void {
  if (flushTimer !== null) {return;}
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushToStorage();
  }, FLUSH_DELAY);
}

function flushToStorage(): void {
  if (memBuffer.length === 0) {return;}
  try {
    const raw = storage.getString(STORAGE_KEY);
    const persisted: LogEntry[] = raw ? (JSON.parse(raw) as LogEntry[]) : [];
    const merged = [...persisted, ...memBuffer];
    const trimmed = merged.length > MAX_ENTRIES
      ? merged.slice(merged.length - MAX_ENTRIES)
      : merged;
    storage.set(STORAGE_KEY, JSON.stringify(trimmed));
    memBuffer = [];
  } catch {
    // Silently fail — logging must never crash the app
  }
}

function append(entry: LogEntry): void {
  memBuffer.push(entry);
  if (memBuffer.length > MAX_ENTRIES) {
    memBuffer.splice(0, memBuffer.length - MAX_ENTRIES);
  }
  scheduleFlush();
}

function shouldWrite(level: LogLevel): boolean {
  if (IS_DEV) {return true;}
  return level === 'warn' || level === 'error';
}

// Capture console methods at module load to avoid the no-console lint rule at call sites.
// The Logger is the designated console wrapper for the entire app.
const _console = {
  debug: globalThis.console.debug.bind(globalThis.console),
  info:  globalThis.console.info.bind(globalThis.console),
  warn:  globalThis.console.warn.bind(globalThis.console),
  error: globalThis.console.error.bind(globalThis.console),
};

function consoleOutput(entry: LogEntry): void {
  if (!IS_DEV) {return;}
  const prefix = `[${entry.tag}]`;
  switch (entry.level) {
    case 'debug': _console.debug(prefix, entry.message, entry.meta ?? ''); break;
    case 'info':  _console.info(prefix, entry.message, entry.meta ?? '');  break;
    case 'warn':  _console.warn(prefix, entry.message, entry.meta ?? '');  break;
    case 'error': _console.error(prefix, entry.message, entry.meta ?? ''); break;
  }
}

function log(
  level: LogLevel,
  tag: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (!shouldWrite(level)) {return;}
  const entry: LogEntry = { level, tag, message, ts: Date.now(), meta };
  consoleOutput(entry);
  append(entry);
}

/** Returns the last `count` log entries (most recent last), including unflushed in-memory entries. */
function getRecentLogs(count = 100): LogEntry[] {
  try {
    const raw = storage.getString(STORAGE_KEY);
    const persisted: LogEntry[] = raw ? (JSON.parse(raw) as LogEntry[]) : [];
    const all = [...persisted, ...memBuffer];
    return all.slice(-count);
  } catch {
    return [...memBuffer].slice(-count);
  }
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
