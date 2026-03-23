
const EVENTS_KEY = 'nexus_calendar_v1';
const mockLocalStorage = {
  data: {},
  setItem(key, value) {
    // In a real browser, this would involve disk I/O
    this.data[key] = value;
  },
  getItem(key) {
    return this.data[key];
  }
};

const COLORS = ['#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#3b82f6'];

function generateEvents(count) {
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push({
      id: `id-${i}`,
      date: '2023-10-27',
      title: `Event ${i} with some long text to make it larger and larger and larger`,
      time: '10:00',
      color: COLORS[i % COLORS.length]
    });
  }
  return events;
}

const count = 10000;
const largeData = generateEvents(count);

console.log(`Benchmarking with ${count} events...`);

// Synchronous version
const startSync = performance.now();
const persistSync = (e) => {
  mockLocalStorage.setItem(EVENTS_KEY, JSON.stringify(e));
};
persistSync(largeData);
const endSync = performance.now();
console.log(`Sync Persist (blocking): ${(endSync - startSync).toFixed(4)}ms`);

// Deferred version (simulating requestIdleCallback with setTimeout 0)
const startAsync = performance.now();
const persistAsync = (e) => {
  // The "work" is scheduled for later
  setTimeout(() => {
    mockLocalStorage.setItem(EVENTS_KEY, JSON.stringify(e));
  }, 0);
};
persistAsync(largeData);
const endAsync = performance.now();
console.log(`Async Persist (scheduling time): ${(endAsync - startAsync).toFixed(4)}ms`);

console.log('\nRationale: The Sync version blocks the main thread for the entire duration of JSON.stringify and localStorage.setItem.');
console.log('The Async version returns almost immediately, allowing the UI to remain responsive.');
