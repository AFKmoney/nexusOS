// Shims for browser globals
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (key: string) => null,
    setItem: (key: string, value: string) => {},
    removeItem: (key: string) => {},
    clear: () => {},
    length: 0,
    key: (index: number) => null,
  },
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'navigator', {
  value: {
    hardwareConcurrency: 4,
  },
  writable: true,
  configurable: true
});

// Helper to run sequential tests since we can't use top-level await in CJS easily via tsx
async function runAll() {
  await import('./errorGuard.test.ts');
  await import('./osManifest.test.ts');
  await import('./fileSystem.test.ts');
}

runAll().catch(e => {
  console.error(e);
  process.exit(1);
});
