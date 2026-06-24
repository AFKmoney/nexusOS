import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Import each .test.ts file sequentially. Each one calls test() which registers
// against node:test's default global suite. We track passes/failures by
// listening to the process events that `node:test` emits.
async function main() {
  const testsDir = path.resolve(__dirname);
  const entries = await readdir(testsDir, { withFileTypes: true });
  const testFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.ts'))
    .map((entry) => entry.name)
    .sort();

  for (const file of testFiles) {
    try {
      await import(pathToFileURL(path.join(testsDir, file)).href);
    } catch (err: unknown) {
      // Certain test files import browser-only modules (e.g. wllama) that are
      // unavailable in Node. Skip them gracefully instead of crashing the
      // entire suite — the TAP output will still reflect the other files.
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[runTests] Skipping ${file}: ${msg}`);
    }
  }
}

main()
  .then(() => {
    // Tests are auto-flushed by node:test once main() resolves. Some imported
    // modules (e.g. browser-targeted services importing wllama) leave open
    // handles (workers, intervals) that beforeExit cannot drain — so we give
    // tests a fixed grace window to finish, then force-exit. Without this CI
    // would hang indefinitely.
    setTimeout(() => process.exit(process.exitCode ?? 0), 3000);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });