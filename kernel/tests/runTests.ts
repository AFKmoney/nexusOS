import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from 'node:test';

async function main() {
  const testsDir = path.resolve(__dirname);
  const entries = await readdir(testsDir, { withFileTypes: true });
  const testFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.ts'))
    .map((entry) => entry.name)
    .sort();

  for (const file of testFiles) {
    await import(pathToFileURL(path.join(testsDir, file)).href);
  }

  const result = await run();
  if (typeof result[Symbol.asyncIterator] !== 'function') {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});