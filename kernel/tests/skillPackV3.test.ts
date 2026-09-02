// Skill pack v3 test — validates the new database, image-info, scraping and
// skill-chaining capabilities, plus the ctx.runSkill sandbox primitive.

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

test('pack v3 registers the new skills', async () => {
  await skillForge.load();
  for (const name of ['db_create', 'db_insert', 'db_query', 'db_stats', 'extract_image_info', 'scrape_links', 'scrape_table', 'chain_tasks']) {
    assert.ok(skillForge.get(name), `expected skill ${name} to be present`);
  }
  assert.ok(SKILL_PACK_VERSION >= 3, 'pack version should be >= 3');
});

test('db_create / db_insert / db_query / db_stats round-trips a collection', async () => {
  const create = await skillForge.execute('db_create', JSON.stringify({ name: 'people', fields: ['name', 'age'] }));
  assert.strictEqual(create.success, true, `create failed: ${create.error}`);
  assert.match(create.result as string, /"created":"people"/);

  const ins = await skillForge.execute('db_insert', JSON.stringify({ name: 'people', records: [
    { name: 'alice', age: 30 }, { name: 'bob', age: 25 }, { name: 'alice', age: 35 },
  ]}));
  assert.strictEqual(ins.success, true, `insert failed: ${ins.error}`);

  const q = await skillForge.execute('db_query', JSON.stringify({ name: 'people', filter: { name: 'alice' } }));
  assert.strictEqual(q.success, true, `query failed: ${q.error}`);
  const qOut = JSON.parse(q.result as string);
  assert.strictEqual(qOut.returned, 2);

  const sorted = await skillForge.execute('db_query', JSON.stringify({ name: 'people', sort: 'age', desc: true }));
  const sOut = JSON.parse(sorted.result as string);
  assert.strictEqual(sOut.records[0].age, 35);

  const stats = await skillForge.execute('db_stats', JSON.stringify({ name: 'people', field: 'age' }));
  const st = JSON.parse(stats.result as string);
  assert.strictEqual(st.count, 3);
  assert.strictEqual(st.max, 35);
});

test('extract_image_info reads a PNG header', async () => {
  // Build a minimal valid PNG signature + IHDR (24x48).
  const png = 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAw' + ''; // short placeholder not enough — use bytes
  // Construct via known PNG dimensions through char codes.
  const hdr = Buffer.from([
    0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,  // signature
    0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,  // IHDR
    0x00,0x00,0x00,0x18, 0x00,0x00,0x00,0x30, // width=24 height=48
  ]);
  const dataUri = 'data:image/png;base64,' + hdr.toString('base64');
  const res = await skillForge.execute('extract_image_info', JSON.stringify({ dataUri }));
  assert.strictEqual(res.success, true, `image failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.format, 'png');
  assert.strictEqual(out.dimensions.width, 24);
  assert.strictEqual(out.dimensions.height, 48);
});

test('scrape_links extracts links and headings from HTML', async () => {
  (global as any).fetch = async () => ({
    ok: true, status: 200,
    text: async () => '<html><head><title>My Site</title></head><body><h1>Title</h1><a href="https://a.io/1">One</a><a href="/b">Two</a></body></html>',
    json: async () => ({}),
  });
  const res = await skillForge.execute('scrape_links', JSON.stringify({ url: 'https://example.com' }));
  assert.strictEqual(res.success, true, `scrape failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.title, 'My Site');
  assert.strictEqual(out.totalLinks, 2);
  assert.ok(out.links.some((l: any) => l.href === 'https://a.io/1'));
  assert.ok(out.headings.includes('Title'));
});

test('scrape_table pulls the first HTML table into pipe-delimited rows', async () => {
  (global as any).fetch = async () => ({
    ok: true, status: 200,
    text: async () => '<table><tr><th>id</th><th>name</th></tr><tr><td>1</td><td>alice</td></tr><tr><td>2</td><td>bob</td></tr></table>',
    json: async () => ({}),
  });
  const res = await skillForge.execute('scrape_table', JSON.stringify({ url: 'https://example.com' }));
  assert.strictEqual(res.success, true, `scrape_table failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.rows, 3); // header + 2
  assert.match(out.csv, /id \| name/);
  assert.match(out.csv, /2 \| bob/);
});

test('chain_tasks runs a sequence of skills via ctx.runSkill', async () => {
  // Set up a small DB to read in a step, and chain create -> insert -> query->stats stop.
  const res = await skillForge.execute('chain_tasks', JSON.stringify({
    steps: [
      { skill: 'db_create', args: { name: 'cars', fields: ['brand', 'price'] } },
      { skill: 'db_insert', args: { name: 'cars', records: [{ brand: 'a', price: 100 }, { brand: 'b', price: 200 }] } },
      { skill: 'db_query', args: { name: 'cars' } },
    ],
  }));
  assert.strictEqual(res.success, true, `chain failed: ${res.error}`);
  const out = JSON.parse(res.result as string);
  assert.strictEqual(out.steps, 3);
  assert.strictEqual(out.ok, 3);
  assert.strictEqual(out.failed, 0);
  assert.strictEqual(out.outputs[2].ok, true);
});

test('chaining depth is bounded (runSkill cannot recurse forever)', async () => {
  // Register a self-calling skill and confirm the guard stops it. The guard
  // returns an error OBJECT, which the self-calling skill returns as its own
  // result (so the outer skill still reports success), and the embedded error
  // carries the depth message.
  await skillForge.register('self_call', 'calls itself', `return await ctx.runSkill('self_call', ctx.argsRaw);`);
  const res = await skillForge.execute('self_call', JSON.stringify({}));
  const body = JSON.stringify(res.result ?? res.error);
  assert.match(body, /depth|recurs/i, `depth guard should be hit, got: ${body}`);
});
