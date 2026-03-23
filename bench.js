const { performance } = require('perf_hooks');

const NUM_FILES = 100000;
const NUM_MATCHES = 5000;

const allFiles = Array.from({ length: NUM_FILES }, (_, i) => `file_${i}.txt`);
const matches = Array.from({ length: NUM_MATCHES }, (_, i) => `file_${Math.floor(Math.random() * NUM_FILES)}.txt`);

// Add some garbage strings to matches to test typeof m === 'string'
matches.push(123, null, undefined, {}, []);

console.log(`Benchmarking with ${NUM_FILES} files and ${NUM_MATCHES} matches...`);

// Baseline (Array.includes)
const start1 = performance.now();
const result1 = matches.filter(m => typeof m === 'string' && allFiles.includes(m));
const end1 = performance.now();
console.log(`Baseline (Array.includes): ${(end1 - start1).toFixed(2)} ms`);

// Optimized (Set.has)
const start2 = performance.now();
const allFilesSet = new Set(allFiles);
const result2 = matches.filter(m => typeof m === 'string' && allFilesSet.has(m));
const end2 = performance.now();
console.log(`Optimized (Set.has): ${(end2 - start2).toFixed(2)} ms`);

console.log(`Improvement: ${((end1 - start1) / (end2 - start2)).toFixed(2)}x faster`);
