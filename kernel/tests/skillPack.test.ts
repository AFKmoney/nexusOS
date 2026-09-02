// Skill pack test — validates that SkillForge seeds the curated pack
// at load, that it's idempotent, and that the pack skills execute.

import test from 'node:test';
import assert from 'node:assert';

if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null, setItem: () => {}, removeItem: () => {},
    clear: () => {}, length: 0, key: () => null,
  } as any;
}
if (typeof global.window === 'undefined') (global as any).window = {};
if (typeof global.Worker === 'undefined') (global as any).Worker = undefined;

import { vfs, SYSTEM_VFS_APP_ID } from '../fileSystem.ts';
import { skillForge } from '../skillForge.ts';
import { SKILL_PACK, SKILL_PACK_VERSION } from '../skillPack.ts';

test('skill pack defines a sane, non-empty library', () => {
  assert.ok(SKILL_PACK.length >= 10, `expected >=10 pack skills, got ${SKILL_PACK.length}`);
  assert.ok(SKILL_PACK_VERSION >= 1, 'pack version should be >= 1');
  const names = SKILL_PACK.map(s => s.name);
  assert.strictEqual(new Set(names).size, names.length, 'pack skill names must be unique');
  for (const s of SKILL_PACK) {
    assert.match(s.name, /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/, `invalid name: ${s.name}`);
    assert.ok(s.description.length > 5, `missing description: ${s.name}`);
    assert.ok(s.code.length > 20, `missing code: ${s.name}`);
  }
});

test('load() seeds the full pack into the registry', async () => {
  await skillForge.load();
  const names = skillForge.list().map(s => s.name);
  for (const s of SKILL_PACK) {
    assert.ok(names.includes(s.name), `expected pack skill ${s.name} to be seeded, got: ${names.join(',')}`);
  }
  // Persisted to VFS
  const files = vfs.listDir('/system/skills', SYSTEM_VFS_APP_ID) || [];
  for (const s of SKILL_PACK) {
    assert.ok(files.some(f => f === `${s.name}.skill.js`), `expected ${s.name}.skill.js on disk`);
  }
});

test('seeding is idempotent (does not duplicate on double-load)', async () => {
  const before = skillForge.list().length;
  await skillForge.load();
  await skillForge.load();
  const namesAfter = skillForge.list().map(s => s.name);
  assert.strictEqual(new Set(namesAfter).size, namesAfter.length, 'no duplicate skills after re-load');
  assert.ok(skillForge.list().length >= before, 'count should not decrease');
});

test('a data pack skill (csv_inspect) executes end-to-end', async () => {
  const skill = skillForge.get('csv_inspect');
  assert.ok(skill, 'csv_inspect should be present');
  const res = await skillForge.execute('csv_inspect', JSON.stringify({
    text: 'id,name,score\n1,alice,9\n2,bob,7\n3,carol,8',
  }));
  assert.strictEqual(res.success, true, `execution failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.rows, 3);
  assert.strictEqual(out.columns.join(','), 'id,name,score');
  assert.strictEqual(out.types.id, 'number');
  assert.strictEqual(out.types.name, 'text');
});

test('a dev pack skill (scaffold_component) writes a file', async () => {
  const res = await skillForge.execute('scaffold_component', JSON.stringify({
    name: 'HelloButton',
    path: '/home/user/Projects/HelloButton.tsx',
  }));
  assert.strictEqual(res.success, true, `execution failed: ${res.error}`);
  const written = vfs.readFile('/home/user/Projects/HelloButton.tsx', SYSTEM_VFS_APP_ID);
  assert.ok(written && written.includes('HelloButton'), 'component file should exist on disk');
});

test('a web pack skill (fetch_json) works when fetch is available', async () => {
  (global as any).fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => '{"a":1,"b":[1,2,3]}',
    json: async () => ({ a: 1, b: [1, 2, 3] }),
  });
  const res = await skillForge.execute('fetch_json', JSON.stringify({ url: 'https://example.com/x' }));
  assert.strictEqual(res.success, true, `execution failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.status, 200);
  assert.strictEqual(out.keys.join(','), 'a,b');
});

test('pack never clobbers a user/AI customized skill of the same name', async () => {
  // Re-register one pack skill with custom content, then force a re-seed
  // by bumping the pack version marker to an older value, and confirm the
  // custom code survives.
  await skillForge.register('csv_inspect', 'custom desc', `return 'CUSTOM';`);
  vfs.writeFile('/system/.skill_pack_version', '0', SYSTEM_VFS_APP_ID);
  await skillForge.load();
  const skill = skillForge.get('csv_inspect');
  assert.ok(skill, 'skill still present');
  assert.match(skill.description, /custom desc/, `custom description should be preserved, got: ${skill.description}`);
  assert.match(skill.code, /CUSTOM/, `custom code should be preserved, got: ${skill.code}`);
});

// ─── New v2 pack skills ─────────────────────────────────────────────
test('csv_aggregate groups by a column and aggregates numerically', async () => {
  const res = await skillForge.execute('csv_aggregate', JSON.stringify({
    text: 'team,score\\nred,10\\nblue,20\\nred,30',
    groupBy: 'team',
    value: 'score',
  }));
  assert.strictEqual(res.success, true, `execution failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.distinctGroups, 2);
  assert.strictEqual(out.groups.red.sum, 40);
  assert.strictEqual(out.groups.red.count, 2);
  assert.strictEqual(out.groups.red.avg, 20);
  assert.strictEqual(out.groups.red.max, 30);
});

test('csv_to_json converts CSV text into records', async () => {
  const res = await skillForge.execute('csv_to_json', JSON.stringify({
    text: 'name,age\\nalice,30\\nbob,25',
  }));
  assert.strictEqual(res.success, true, `execution failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.records.length, 2);
  assert.strictEqual(out.records[0].name, 'alice');
  assert.strictEqual(out.records[0].age, 30); // numeric col coerced
  assert.strictEqual(typeof out.records[1].name, 'string');
});

test('json_to_csv converts records back to CSV', async () => {
  const res = await skillForge.execute('json_to_csv', JSON.stringify({
    data: [{ a: 1, b: 'x' }, { a: 2, b: 'y,z' }],
  }));
  assert.strictEqual(res.success, true, `execution failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.rows, 2);
  assert.match(out.csv, /"y,z"/, 'comma-containing value should be quoted');
});

test('extract_entities pulls emails, urls, and mentions out of text', async () => {
  const res = await skillForge.execute('extract_entities', JSON.stringify({
    text: 'Email me at bob@site.com or visit https://a.io/x and follow @nexus and #ai',
  }));
  assert.strictEqual(res.success, true, `execution failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.ok(out.emails.includes('bob@site.com'));
  assert.ok(out.urls.some((u: string) => u.includes('https://a.io')));
  assert.ok(out.mentions.includes('@nexus'));
  assert.ok(out.hashtags.includes('#ai'));
});

test('html_to_text strips tags and scripts', async () => {
  const res = await skillForge.execute('html_to_text', JSON.stringify({
    html: '<script>evil()</script><h1>Hi</h1><p>Hello <b>world</b></p>',
  }));
  assert.strictEqual(res.success, true, `execution failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.match(out.text, /Hi/);
  assert.match(out.text, /Hello world/);
  assert.ok(!out.text.includes('evil'), 'script content should be stripped');
});

test('http_probe summarizes multiple URL statuses', async () => {
  (global as any).fetch = async (url: string) => ({
    ok: url.includes('good'),
    status: url.includes('good') ? 200 : 404,
    text: async () => '',
    json: async () => ({}),
  });
  const res = await skillForge.execute('http_probe', JSON.stringify({
    urls: ['https://good.io', 'https://bad.io'],
  }));
  assert.strictEqual(res.success, true, `execution failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.checked, 2);
  assert.strictEqual(out.ok, 1);
  assert.strictEqual(out.down, 1);
});

test('base64_tool encodes and decodes utf-8 safely', async () => {
  const enc = await skillForge.execute('base64_tool', JSON.stringify({ mode: 'encode', text: 'hello 🚀' }));
  assert.strictEqual(enc.success, true, `execution failed: ${enc.error}`);
  const encOut = JSON.parse(enc.result as string);
  const encoded = encOut.output;
  const dec = await skillForge.execute('base64_tool', JSON.stringify({ mode: 'decode', text: encoded }));
  assert.strictEqual(dec.success, true, `execution failed: ${dec.error}`);
  const decOut = JSON.parse(dec.result as string);
  assert.strictEqual(decOut.output, 'hello 🚀');
});

test('extract_pdf_text recovers strings from a simple PDF', async () => {
  const pdf = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj',
    '4 0 obj << /Length 30 >> stream',
    'BT /F1 12 Tf 72 720 Td (Hello Nexus PDF) Tj ET',
    'endstream endobj',
    '%%EOF',
  ].join('\\n');
  const res = await skillForge.execute('extract_pdf_text', JSON.stringify({ text: pdf }));
  assert.strictEqual(res.success, true, `execution failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.compressed, false);
  assert.match(out.text, /Hello Nexus PDF/);
});
