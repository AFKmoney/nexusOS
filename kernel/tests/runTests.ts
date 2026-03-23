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

await import('./errorGuard.test.ts');
