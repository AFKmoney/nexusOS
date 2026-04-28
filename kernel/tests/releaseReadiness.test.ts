import test from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('release configuration files are aligned on NexusOS branding', async () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const packageJson = await readFile(path.join(projectRoot, 'package.json'), 'utf8');
  const electronBuilder = await readFile(path.join(projectRoot, 'electron-builder.yml'), 'utf8');
  const buildAndRelease = await readFile(path.join(projectRoot, 'BUILD_AND_RELEASE.md'), 'utf8');

  assert.match(packageJson, /"name":\s*"nexusos"/);
  assert.match(packageJson, /"version":\s*"2\.0\.0"/);
  assert.match(electronBuilder, /productName:\s*NexusOS/);
  assert.match(electronBuilder, /artifactName:\s*"NexusOS_Setup_\$\{version\}\.\$\{ext\}"/);
  assert.match(buildAndRelease, /product name: `NexusOS`/);
  assert.match(buildAndRelease, /artifact name: `NexusOS_Setup_\$\{version\}\.\$\{ext\}`/);
});

test('testing guidance documents include the current validation order', async () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const testingMd = await readFile(path.join(projectRoot, 'TESTING.md'), 'utf8');

  assert.match(testingMd, /npm run typecheck/);
  assert.match(testingMd, /npm test/);
  assert.match(testingMd, /npm run build/);
  assert.match(testingMd, /npm run electron:build/);
});

test('runTests.ts auto-discovers test files by .test.ts suffix', async () => {
  const file = await readFile(path.join(__dirname, 'runTests.ts'), 'utf8');

  assert.match(file, /endsWith\('\.test\.ts'\)/);
  assert.match(file, /await import\(pathToFileURL\(path\.join\(testsDir, file\)\)\.href\)/);
});