// ═══════════════════════════════════════════════════════════════════
// KERNEL LOG — Single point of truth for diagnostic output
//
// Why this exists: the codebase used to scatter `console.log` calls across
// boot paths, the VFS init, and the Wllama wrapper. Those calls hit the
// console unconditionally, which is noisy for end users and risks leaking
// internal state in production builds. This module gives every callsite a
// single knob: `kernelLog.setProduction(true)` silences `info`/`debug`
// while keeping `warn`/`error` (which are useful even in production).
//
// Usage:
//   import { kernelLog } from './kernel/log';
//   kernelLog.info('[SYSTEM] booting…');
//   kernelLog.error('[SYSTEM] boot failed', err);
//
// The logger is intentionally tiny — no levels enum, no transports, no
// async flush. It writes to `console` directly so devtools and CI both
// see the same stream.
// ═══════════════════════════════════════════════════════════════════

type Level = 'debug' | 'info' | 'warn' | 'error';

const VERBOSE_LEVELS: ReadonlySet<Level> = new Set<Level>(['debug', 'info']);

class KernelLog {
  // Default to verbose. Boot flips this to true once the OS store hydrates
  // `kernelRules.verbosity === 0`, but until then we want full output for
  // early-boot debugging. Tests can force verbose=false to assert silence.
  private production = false;

  setProduction(value: boolean): void {
    this.production = value;
  }

  isProduction(): boolean {
    return this.production;
  }

  debug(...args: unknown[]): void {
    if (this.production) return;
    // eslint-disable-next-line no-console
    console.debug('[KERNEL]', ...args);
  }

  info(...args: unknown[]): void {
    if (this.production && VERBOSE_LEVELS.has('info')) return;
    // eslint-disable-next-line no-console
    console.log('[KERNEL]', ...args);
  }

  warn(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn('[KERNEL]', ...args);
  }

  error(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error('[KERNEL]', ...args);
  }
}

export const kernelLog = new KernelLog();

// Convenience for tests: restore default verbose mode.
export function __resetKernelLogForTests(): void {
  // Mutating the singleton is enough; tests import the same instance.
  (kernelLog as unknown as { production: boolean }).production = false;
}
