// ═══════════════════════════════════════════════════════════════════
// SKILL PACK — Curated, versioned library of pre-forged skills
// ═══════════════════════════════════════════════════════════════════
// A ship-it library of high-value skills across data, filesystem,
// development, web and productivity categories. SkillForge seeds any
// pack skill that isn't already present in the VFS, and re-seeds newly
// added ones whenever SKILL_PACK_VERSION is bumped — so the pack can
// grow across releases WITHOUT clobbering the AI's or the user's own
// customizations.
//
// RULES for authors:
//   • Skills run sandboxed with ONLY the `ctx` object in scope:
//       ctx.args, ctx.vfs.{read,write,list,delete}, ctx.memory.{remember,recall},
//       ctx.os.{openWindow,closeWindow,notify,getRegistry,getWindows},
//       ctx.ai.{generate,stream}, ctx.fetch, ctx.log.
//   • NEVER reference `useOS`, `window`, `localStorage`, `document`.
//   • Use only single-quoted strings / concatenation (no inner backticks)
//     so the source can live inside a template literal here.
//   • `return` a string (or JSON) so the AI can read the outcome.

export interface PackSkill {
  name: string;
  description: string;
  code: string;
  expose?: string;
}

// Bump this when adding/updating pack skills so already-seeded installs
// re-seed the ones they're missing.
export const SKILL_PACK_VERSION = 3;

export const SKILL_PACK: PackSkill[] = [
  // ─── DATA ANALYSIS ────────────────────────────────────────────────
  {
    name: 'csv_inspect',
    description: 'Inspect CSV/TSV text or a VFS file: row count, columns, per-column type guess, sample.',
    code: `let src = ctx.args.text || '';
if (!src && ctx.args.path) src = ctx.vfs.read(ctx.args.path) || '';
if (!src) return 'Provide ctx.args.text or ctx.args.path';
const lines = src.split('\\n').filter(l => l.trim() !== '');
if (lines.length < 2) return 'Too few rows to inspect';
const delim = (lines[0].split('\\t').length > lines[0].split(',').length) ? '\\t' : ',';
const header = (lines[0] || '').split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
const rows = lines.slice(1).map(l => l.split(delim));
const types = {};
for (let i = 0; i < header.length; i++) {
  const col = header[i];
  let t = 'unknown'; let nums = 0; let blanks = 0;
  for (const r of rows) { const v = (r[i] || '').trim(); if (v === '') { blanks++; continue; } const n = Number(v); if (!isNaN(n) && v !== '') nums++; }
  if (blanks === rows.length) t = 'blank';
  else if (nums === rows.length) t = 'number';
  else t = 'text';
  types[col] = t;
}
const numericCols = header.filter(c => types[c] === 'number');
const summary = {};
for (const c of numericCols) { const vals = rows.map(r => Number(r[header.indexOf(c)])).filter(v => !isNaN(v)); if (vals.length) summary[c] = { min: Math.min(...vals), max: Math.max(...vals), avg: Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100)/100 }; }
return JSON.stringify({ rows: rows.length, columns: header, types, numericSummary: summary, sample: rows.slice(0,3) }, null, 2);`,
  },
  {
    name: 'json_path',
    description: 'Extract a nested value from JSON text or a file via a dot path (e.g. "user.profile.email").',
    code: `let obj = ctx.args.data;
if (typeof obj === 'string') { try { obj = JSON.parse(obj); } catch(e) { return 'Invalid JSON: ' + e.message; } }
if (!obj && ctx.args.path) { const raw = ctx.vfs.read(ctx.args.path) || ''; try { obj = JSON.parse(raw); } catch(e) { return 'Could not parse file: ' + e.message; } }
const path = (ctx.args.dot || ctx.args.path || '').toString();
if (!path) return 'Provide ctx.args.dot (dot path) or ctx.args.data';
let cur = obj;
for (const seg of path.split('.')) { if (cur == null) return 'Not found at: ' + seg; cur = cur[seg]; }
return typeof cur === 'object' ? JSON.stringify(cur, null, 2) : String(cur);`,
  },
  {
    name: 'text_stats',
    description: 'Count characters, words, lines, and most frequent words in provided text.',
    code: `const text = (ctx.args.text || '').toString();
if (!text) return 'Provide ctx.args.text';
const words = text.trim().split(/\\s+/).filter(Boolean);
const freq = {};
for (const w of words) { const k = w.toLowerCase().replace(/[^a-z0-9]/g, ''); if (k) freq[k] = (freq[k] || 0) + 1; }
const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([w,c])=>w+':'+c);
return JSON.stringify({ chars: text.length, words: words.length, lines: text.split('\\n').length, uniqueWords: Object.keys(freq).length, topWords: top }, null, 2);`,
  },

  // ─── FILESYSTEM / OFFICE ──────────────────────────────────────────
  {
    name: 'format_json_file',
    description: 'Read a JSON file in the VFS, pretty-print it, and write it back in place.',
    code: `const p = ctx.args.path || '';
if (!p) return 'Provide ctx.args.path';
const raw = ctx.vfs.read(p);
if (raw === null) return 'File not found: ' + p;
const indent = typeof ctx.args.indent === 'number' ? ctx.args.indent : 2;
let parsed; try { parsed = JSON.parse(raw); } catch(e) { return 'Invalid JSON: ' + e.message; }
const out = JSON.stringify(parsed, null, indent);
ctx.vfs.write(p, out);
return 'Formatted ' + p + ' (' + raw.length + ' -> ' + out.length + ' chars)';`,
  },
  {
    name: 'find_duplicates',
    description: 'Find files with identical content inside a VFS directory (by content hash).',
    code: `const dir = ctx.args.dir || '/home/user/Documents';
const byHash = {};
const walk = (d) => { for (const f of ctx.vfs.list(d)) { const p = d + '/' + f; const content = ctx.vfs.read(p); if (content !== null) { let h = 0; for (let i = 0; i < content.length; i++) { h = (h * 31 + content.charCodeAt(i)) >>> 0; } (byHash[h] = byHash[h] || []).push(p); } } };
walk(dir);
const dups = Object.entries(byHash).filter(([,files]) => files.length > 1).map(([,files]) => files);
return JSON.stringify({ dir, duplicateGroups: dups, uniqueFiles: Object.keys(byHash).length });`,
  },
  {
    name: 'batch_rename',
    description: 'Rename files in a VFS directory with a numbered prefix and optional extension filter.',
    code: `const dir = ctx.args.dir || '/home/user/Desktop';
const prefix = ctx.args.prefix || 'file';
const extFilter = ctx.args.ext ? ctx.args.ext.replace('.', '').toLowerCase() : '';
let start = Number(ctx.args.startIndex || 1);
const files = ctx.vfs.list(dir).filter(f => !extFilter || f.split('.').pop().toLowerCase() === extFilter);
const changed = [];
for (const f of files) { const ext = f.includes('.') ? '.' + f.split('.').pop() : ''; const base = f.split('.').slice(0, -1).join('.') || f; const src = dir + '/' + f; const content = ctx.vfs.read(src); if (content === null) continue; const newName = String(prefix) + '_' + (start++) + ext; ctx.vfs.write(dir + '/' + newName, content); ctx.vfs.delete(src); changed.push(base + ' -> ' + newName); }
return JSON.stringify({ dir, renamed: changed });`,
  },

  // ─── DEVELOPMENT ──────────────────────────────────────────────────
  {
    name: 'scaffold_component',
    description: 'Generate a React+TS functional component file in the VFS and return its code.',
    code: `const name = (ctx.args.name || 'Widget').toString();
if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return 'Invalid component name: ' + name;
const path = ctx.args.path || ('/home/user/Projects/' + name + '.tsx');
const slash = path.lastIndexOf('/'); if (slash > 0) ctx.vfs.createDir(path.slice(0, slash));
const code = 'import { useState } from \\'react\\';\\n\\nexport default function ' + name + '(props: { title?: string }) {\\n  const [count, setCount] = useState(0);\\n  return (\\n    <div>\\n      <h1>{props.title || \\'' + name + '\\'}</h1>\\n      <button onClick={() => setCount(c => c + 1)}>Clicked {count} times</button>\\n    </div>\\n  );\\n}\\n';
ctx.vfs.write(path, code);
ctx.os.notify('Scaffolded', name + ' created at ' + path);
return JSON.stringify({ path, code });`,
  },
  {
    name: 'make_api_client',
    description: 'Generate a typed fetch-based API client module for a base URL.',
    code: `const base = (ctx.args.baseUrl || '').toString() || 'https://api.example.com';
const name = (ctx.args.name || 'api').toString();
const path = ctx.args.path || ('/home/user/Projects/' + name + '.ts');
const slash = path.lastIndexOf('/'); if (slash > 0) ctx.vfs.createDir(path.slice(0, slash));
const endpoints = Array.isArray(ctx.args.endpoints) ? ctx.args.endpoints : ['get','post'];
let code = 'export const api = {\\n';
for (const e of endpoints) { code += '  ' + e + ': async (path: string, body?: unknown) => {\\n    const res = await fetch(' + "'" + base + "'" + ' + path, { method: \\'' + (e === 'get' ? 'GET' : 'POST') + '\\', headers: { \\'Content-Type\\': \\'application/json\\' }' + ', body: body ? JSON.stringify(body) : undefined });\\n    if (!res.ok) throw new Error(\\'HTTP \\' + res.status);\\n    return res.json();\\n  },\\n'; }
code += '};\\n';
ctx.vfs.write(path, code);
return JSON.stringify({ path, code });`,
  },

  // ─── WEB ──────────────────────────────────────────────────────────
  {
    name: 'fetch_json',
    description: 'Fetch a URL (CORS-proxied), parse JSON, optionally save it to the VFS.',
    code: `const url = ctx.args.url || '';
if (!url) return 'Provide ctx.args.url';
const res = await ctx.fetch(url, { headers: ctx.args.headers || {} });
if (!res.ok) return 'HTTP ' + res.status + ' for ' + url;
const data = await res.json();
if (ctx.args.saveTo) { ctx.vfs.write(ctx.args.saveTo, JSON.stringify(data, null, 2)); }
const text = JSON.stringify(data);
return JSON.stringify({ url, status: res.status, keys: Array.isArray(data) ? ('array(' + data.length + ')') : Object.keys(data || {}), size: text.length, saveTo: ctx.args.saveTo || null, preview: text.slice(0, 800) });`,
  },
  {
    name: 'fetch_text',
    description: 'Fetch a URL text body (CORS-proxied) with a char cap and save to VFS.',
    code: `const url = ctx.args.url || '';
if (!url) return 'Provide ctx.args.url';
const res = await ctx.fetch(url, { headers: ctx.args.headers || {} });
const raw = await res.text();
const max = Number(ctx.args.maxChars || 12000);
const body = raw.slice(0, max);
if (ctx.args.saveTo) { ctx.vfs.write(ctx.args.saveTo, body); }
return JSON.stringify({ url, status: res.status, chars: body.length, saveTo: ctx.args.saveTo || null, preview: body.slice(0, 600) });`,
  },

  // ─── PRODUCTIVITY ─────────────────────────────────────────────────
  {
    name: 'append_journal',
    description: 'Append a timestamped entry to the daily journal file.',
    code: `const entry = (ctx.args.entry || '').toString();
if (!entry) return 'Provide ctx.args.entry';
const file = ctx.args.file || '/home/user/Documents/journal.md';
const stamp = new Date().toISOString();
const sep = ctx.vfs.read(file) === null ? '' : '\\n\\n';
ctx.vfs.write(file, (ctx.vfs.read(file) || '') + sep + '## ' + stamp + '\\n' + entry);
ctx.os.notify('Journal', 'Entry appended to ' + file);
return 'Appended entry to ' + file;`,
  },
  {
    name: 'daily_brief',
    description: 'Assemble a daily brief from memories and system state, saved to Desktop.',
    code: `const recalls = ctx.memory.recall(ctx.args.query || 'work plan', 8);
const wins = ctx.os.getWindows();
const brief = '# Daily Brief\\n' + new Date().toISOString() + '\\n\\n## Open windows\\n' + (wins.length ? wins.map(w => '- ' + w.title).join('\\n') : '(none)') + '\\n\\n## Memory recall\\n' + (recalls.length ? recalls.map(r => '- ' + r.content).slice(0, 8).join('\\n') : '(nothing recalled)') + '\\n';
const path = '/home/user/Desktop/brief_' + Date.now() + '.md';
ctx.vfs.write(path, brief);
return 'Wrote ' + path + ' (' + recalls.length + ' recalls from ' + wins.length + ' windows)';`,
  },

  // ─── AI-ASSISTED (degrade gracefully) ─────────────────────────────
  {
    name: 'summarize_text',
    description: 'Summarize or transform provided text using the configured AI provider.',
    code: `const text = (ctx.args.text || '').toString().slice(0, 8000);
if (!text) return 'Provide ctx.args.text';
const mode = ctx.args.mode || 'summarize';
const prompt = mode === 'summarize' ? 'Summarize the following text in under 12 lines:\\n\\n' + text : (ctx.args.prompt || '') + '\\n\\n' + text;
try { const out = await ctx.ai.generate(prompt, 'chat'); return out; }
catch(e) { return 'AI unavailable (' + e.message + '). Raw text was ' + text.length + ' chars.'; }`,
  },

  // ─── ADVANCED DATA / CSV ──────────────────────────────────────────
  {
    name: 'csv_aggregate',
    description: 'Group CSV rows by a column and compute sum/avg/min/max/count on a numeric column.',
    code: `let src = ctx.args.text || '';
if (!src && ctx.args.path) src = ctx.vfs.read(ctx.args.path) || '';
if (!src) return 'Provide ctx.args.text or ctx.args.path';
const lines = src.split('\\\\n').filter(l => l.trim() !== '');
if (lines.length < 2) return 'Not enough rows';
const delim = (lines[0].split('\\\\t').length > lines[0].split(',').length) ? '\\\\t' : ',';
const header = (lines[0] || '').split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
const groupCol = (ctx.args.groupBy || '').toString();
const valCol = (ctx.args.value || '').toString();
const gi = header.indexOf(groupCol); const vi = header.indexOf(valCol);
if (gi < 0) return 'Group column not found: ' + groupCol + ' (columns: ' + header.join(', ') + ')';
if (vi < 0) return 'Value column not found: ' + valCol;
const rows = lines.slice(1).map(l => l.split(delim));
const groups = {};
for (const r of rows) { const g = (r[gi] || '').trim(); const v = Number((r[vi] || '').trim()); if (g === '' || isNaN(v)) continue; if (!groups[g]) groups[g] = { count: 0, sum: 0, min: Infinity, max: -Infinity }; const o = groups[g]; o.count++; o.sum += v; if (v < o.min) o.min = v; if (v > o.max) o.max = v; }
const out = {}; for (const [g, o] of Object.entries(groups)) { out[g] = { count: o.count, sum: o.sum, avg: Math.round((o.sum / o.count) * 100) / 100, min: o.min, max: o.max }; }
return JSON.stringify({ groupBy: groupCol, value: valCol, groups: out, distinctGroups: Object.keys(out).length });`,
  },
  {
    name: 'json_to_csv',
    description: 'Convert a JSON array of objects into a CSV/TSV string (optionally saved to the VFS).',
    code: `let data = ctx.args.data;
if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) { return 'Invalid JSON: ' + e.message; } }
if (!data && ctx.args.path) { const raw = ctx.vfs.read(ctx.args.path) || ''; try { data = JSON.parse(raw); } catch(e) { return 'Could not parse file: ' + e.message; } }
if (!Array.isArray(data) || data.length === 0) return 'Expected a non-empty JSON array';
const delim = ctx.args.delimiter === 'tab' ? '\\\\t' : ',';
const cols = Array.isArray(ctx.args.columns) ? ctx.args.columns : Object.keys(data[0]);
const esc = (v) => { const s = (v == null ? '' : String(v)); return (s.search(/[",\\\\n]/) >= 0) ? '"' + s.replace(/"/g, '""') + '"' : s; };
let out = cols.map(esc).join(delim) + '\\\\n';
for (const row of data) { out += cols.map(c => esc(row ? row[c] : null)).join(delim) + '\\\\n'; }
if (ctx.args.saveTo) ctx.vfs.write(ctx.args.saveTo, out);
return JSON.stringify({ rows: data.length, columns: cols, delimiter: delim, saveTo: ctx.args.saveTo || null, csv: out });`,
  },
  {
    name: 'csv_to_json',
    description: 'Convert CSV/TSV text or a file into a JSON array of objects (optionally saved to the VFS).',
    code: `let src = ctx.args.text || '';
if (!src && ctx.args.path) src = ctx.vfs.read(ctx.args.path) || '';
if (!src) return 'Provide ctx.args.text or ctx.args.path';
const lines = src.split('\\\\n').filter(l => l.trim() !== '');
if (lines.length < 2) return 'Not enough rows';
const delim = (lines[0].split('\\\\t').length > lines[0].split(',').length) ? '\\\\t' : ',';
const header = (lines[0] || '').split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
const rows = lines.slice(1).map(l => l.split(delim));
const records = rows.map(r => { const o = {}; for (let i = 0; i < header.length; i++) { const raw = (r[i] || '').trim().replace(/^"|"$/g, ''); o[header[i]] = (raw !== '' && !isNaN(Number(raw))) ? Number(raw) : raw; } return o; });
const parsed = JSON.stringify(records, null, 2);
if (ctx.args.saveTo) ctx.vfs.write(ctx.args.saveTo, parsed);
return JSON.stringify({ rows: records.length, columns: header, saveTo: ctx.args.saveTo || null, records });`,
  },

  // ─── INTERNET / TEXT EXTRACTION ───────────────────────────────────
  {
    name: 'extract_entities',
    description: 'Extract emails, URLs, hashtags, @mentions, and numbers from provided text.',
    code: `const text = (ctx.args.text || '').toString();
if (!text) return 'Provide ctx.args.text';
// Tokenize on whitespace with a manual scanner to avoid regex-escaping issues.
const isSep = (c) => ' \\t\\n\\r'.indexOf(c) >= 0;
const tokens = []; let cur = '';
for (const ch of text) { if (isSep(ch)) { if (cur) { tokens.push(cur); cur = ''; } } else cur += ch; }
if (cur) tokens.push(cur);
const hasChar = (t, c) => t.indexOf(c) >= 0;
const emails = tokens.filter(t => hasChar(t, '@') && hasChar(t, '.') && !t.startsWith('http'));
const urls = tokens.filter(t => t.startsWith('http://') || t.startsWith('https://'));
const hashtags = tokens.filter(t => t.startsWith('#') && t.length > 1);
const mentions = tokens.filter(t => t.startsWith('@') && t.length > 1);
const numbers = []; let num = '';
for (const ch of text) { if (ch >= '0' && ch <= '9') { num += ch; } else { if (num.length >= 2) numbers.push(num); num = ''; } }
if (num.length >= 2) numbers.push(num);
const uniq = (a) => Array.from(new Set(a));
return JSON.stringify({ emails: uniq(emails), urls: uniq(urls), hashtags: uniq(hashtags), mentions: uniq(mentions), numbers: uniq(numbers).slice(0, 50) }, null, 2);`,
  },
  // ─── INTERNET / TEXT EXTRACTION ────────────────────────────────────
  {
    name: 'html_to_text',
    description: 'Strip HTML tags, scripts, and styles from a string, leaving readable plain text.',
    code: `let html = (ctx.args.html || '').toString();
if (!html) return 'Provide ctx.args.html';
const scrub = (tag) => {
  let out = ''; let i = 0;
  const openMark = '<' + tag; const closeMark = '</' + tag + '>';
  while (i < html.length) {
    const open = html.indexOf(openMark, i);
    if (open === -1) { out += html.slice(i); break; }
    out += html.slice(i, open) + ' ';
    const close = html.indexOf(closeMark, open);
    if (close === -1) { i = html.length; break; }
    i = close + closeMark.length;
  }
  html = out;
};
scrub('script'); scrub('style');
// Manual tag stripper (no regex, no forward-slash literal problems).
let stripped = ''; let i = 0;
while (i < html.length) {
  const lt = html.indexOf('<', i);
  if (lt === -1) { stripped += html.slice(i); break; }
  stripped += html.slice(i, lt) + ' ';
  const gt = html.indexOf('>', lt);
  if (gt === -1) { i = html.length; break; }
  i = gt + 1;
}
html = stripped;
html = html.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
const lines = html.split('\\n').map(l => l.split(' ').filter(Boolean).join(' ').trim()).filter(l => l.length > 0);
const text = lines.join('\\n');
if (ctx.args.saveTo) ctx.vfs.write(ctx.args.saveTo, text);
return JSON.stringify({ chars: text.length, lines: lines.length, saveTo: ctx.args.saveTo || null, text: text.slice(0, 4000) });`,
  },
  {
    name: 'http_probe',
    description: 'Check HTTP status / availability of an array of URLs and return a compact summary table.',
    code: `const urls = Array.isArray(ctx.args.urls) ? ctx.args.urls : [ctx.args.url];
if (!urls.length) return 'Provide ctx.args.urls (array) or ctx.args.url';
const results = [];
for (const u of urls) { if (!u) continue; try { const res = await ctx.fetch(u, { method: 'HEAD', headers: (ctx.args.headers || {}) }); results.push({ url: u, status: res.status, ok: res.ok }); } catch(e) { results.push({ url: u, status: 0, ok: false, error: e.message }); } }
const ok = results.filter(r => r.ok).length;
return JSON.stringify({ checked: results.length, ok, down: results.length - ok, results }, null, 2);`,
  },

  // ─── UTILITIES ────────────────────────────────────────────────────
  {
    name: 'base64_tool',
    description: 'Encode or decode base64. Pass ctx.args.mode="encode"|"decode" and ctx.args.text (or ctx.args.file path).',
    code: `const mode = (ctx.args.mode || 'encode').toString();
let text = (ctx.args.text || '').toString();
if (!text && ctx.args.file) text = ctx.vfs.read(ctx.args.file) || '';
if (!text) return 'Provide ctx.args.text (or ctx.args.file) and ctx.args.mode';
const b64encode = (s) => { try { return btoa(unescape(encodeURIComponent(s))); } catch(e) { return 'encode-error: ' + e.message; } };
const b64decode = (s) => { try { return decodeURIComponent(escape(atob(s))); } catch(e) { return 'decode-error: ' + e.message; } };
const out = mode === 'decode' ? b64decode(text.trim()) : b64encode(text);
if (ctx.args.saveTo) ctx.vfs.write(ctx.args.saveTo, out);
return JSON.stringify({ mode, inputChars: text.length, outputChars: out.length, saveTo: ctx.args.saveTo || null, output: String(out).slice(0, 4000) });`,
  },
  {
    name: 'extract_pdf_text',
    description: 'Best-effort text extraction from a simple (mostly-uncompressed) PDF in ctx.args.text or a VFS file. Returns extracted strings and a warning if the PDF is compressed.',
    code: `let raw = (ctx.args.text || '').toString();
if (!raw && ctx.args.path) raw = ctx.vfs.read(ctx.args.path) || '';
if (!raw) return 'Provide ctx.args.text (PDF source) or ctx.args.path';
const compressed = /FlateDecode/.test(raw);
const strings = [];
const re = /\\(((?:[^\\\\()]|\\\\.)*)\\)/g;
let m;
while ((m = re.exec(raw)) !== null) { let s = m[1]; s = s.replace(/\\\\\\(/g, '(').replace(/\\\\\\)/g, ')').replace(/\\\\\\\\/g, '\\\\').replace(/\\\\n/g, '\\\\n'); strings.push(s); }
const text = strings.join('\\\\n').replace(/\\\\n+/g, '\\\\n').trim();
return JSON.stringify({ compressed, extracted: strings.length, chars: text.length, warning: compressed ? 'PDF uses FlateDecode compression; only text in uncompressed streams was recovered. For full extraction, convert to plain text first.' : null, text: text.slice(0, 4000) }, null, 2);`,
  },

  // ─── DATABASE (persistent JSON collection stored in VFS) ──────────
  {
    name: 'db_create',
    description: 'Create a named database (a JSON collection) stored in the VFS at /system/db/. Pass ctx.args.name and optional ctx.args.fields.',
    code: `const name = (ctx.args.name || '').toString();
if (!name) return 'Provide ctx.args.name';
const table = '/system/db/' + name + '.json';
if (ctx.vfs.read(table) !== null) return 'Database already exists: ' + name;
const schema = Array.isArray(ctx.args.fields) ? ctx.args.fields : [];
ctx.vfs.createDir('/system/db');
ctx.vfs.write(table, JSON.stringify({ name, schema, records: [] }, null, 2));
return JSON.stringify({ created: name, fields: schema, records: 0 });`,
  },
  {
    name: 'db_insert',
    description: 'Insert one or more records into a database collection. Pass ctx.args.name and ctx.args.record (object) or ctx.args.records (array).',
    code: `const name = (ctx.args.name || '').toString();
if (!name) return 'Provide ctx.args.name';
const table = '/system/db/' + name + '.json';
const raw = ctx.vfs.read(table);
if (raw === null) return 'Database not found: ' + name + ' (create it first with db_create)';
const db = JSON.parse(raw);
if (!Array.isArray(db.records)) db.records = [];
const recs = Array.isArray(ctx.args.records) ? ctx.args.records : (ctx.args.record ? [ctx.args.record] : []);
if (recs.length === 0) return 'Provide ctx.args.record (object) or ctx.args.records (array)';
for (const r of recs) { db.records.push(r); }
ctx.vfs.write(table, JSON.stringify(db, null, 2));
return JSON.stringify({ name, inserted: recs.length, total: db.records.length });`,
  },
  {
    name: 'db_query',
    description: 'Query a database collection with optional filter, sort, and limit. Pass ctx.args.name, ctx.args.filter (object of equality), ctx.args.sort (field), ctx.args.desc (bool), ctx.args.limit.',
    code: `const name = (ctx.args.name || '').toString();
if (!name) return 'Provide ctx.args.name';
const raw = ctx.vfs.read('/system/db/' + name + '.json');
if (raw === null) return 'Database not found: ' + name;
const db = JSON.parse(raw);
let rows = (db.records || []).slice();
const f = ctx.args.filter;
if (f && typeof f === 'object') { rows = rows.filter(r => { for (const k of Object.keys(f)) { if (r[k] !== f[k]) return false; } return true; }); }
if (ctx.args.sort) { const k = ctx.args.sort; const desc = !!ctx.args.desc; rows = rows.sort((a,b) => { const av=a[k], bv=b[k]; if (av < bv) return desc?1:-1; if (av > bv) return desc?-1:1; return 0; }); }
const limit = Number(ctx.args.limit || 100);
const out = rows.slice(0, limit);
return JSON.stringify({ name, matched: rows.length, returned: out.length, total: (db.records||[]).length, records: out }, null, 2);`,
  },
  {
    name: 'db_stats',
    description: 'Aggregate over a database collection numeric field. Pass ctx.args.name and ctx.args.field. Returns count/sum/avg/min/max.',
    code: `const name = (ctx.args.name || '').toString();
const field = (ctx.args.field || '').toString();
if (!name) return 'Provide ctx.args.name';
const raw = ctx.vfs.read('/system/db/' + name + '.json');
if (raw === null) return 'Database not found: ' + name;
const db = JSON.parse(raw);
const rows = (db.records || []).slice();
if (!field) return JSON.stringify({ name, total: rows.length, fields: rows.length ? Object.keys(rows[0]) : [] });
const vals = rows.map(r => Number(r[field])).filter(v => !isNaN(v));
if (vals.length === 0) return JSON.stringify({ name, field, count: 0, note: 'no numeric values' });
return JSON.stringify({ name, field, count: vals.length, sum: vals.reduce((a,b)=>a+b,0), avg: Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100)/100, min: Math.min(...vals), max: Math.max(...vals) });`,
  },

  // ─── DATA URI / IMAGE ANALYSIS ────────────────────────────────────
  {
    name: 'extract_image_info',
    description: 'Analyze a base64 data URI or a stored image: detect format, byte size, and dimensions (for SVG, PNG, GIF, BMP).',
    code: `let src = (ctx.args.dataUri || ''.toString());
if (src && ctx.args.path) src = ctx.vfs.read(ctx.args.path) || '';
if (!src && ctx.args.path) src = ctx.vfs.read(ctx.args.path) || '';
if (!src) return 'Provide ctx.args.dataUri (data: URI) or ctx.args.path';
let b64 = src; let mime = null;
const dm = src.match(/^data:([^;]+);base64,([A-Za-z0-9+\\/=]+)/);
if (dm) { mime = dm[1]; b64 = dm[2]; }
// decode base64 to bytes manually (no btoa for binary)
const bin = atob(b64); const bytes = bin.length;
const hex = (i) => (bin.charCodeAt(i)).toString(16).padStart(2, '0').toUpperCase();
let format = mime || null; let dims = null;
const sig = hex(0) + hex(1);
if (sig === '8950') { format = 'png'; const w = ((bin.charCodeAt(16)<<24)>>>0)+(bin.charCodeAt(17)<<16)+(bin.charCodeAt(18)<<8)+bin.charCodeAt(19); const h = ((bin.charCodeAt(20)<<24)>>>0)+(bin.charCodeAt(21)<<16)+(bin.charCodeAt(22)<<8)+bin.charCodeAt(23); dims = { width: w, height: h }; }
else if (sig === '4749') { format = 'gif'; const w = bin.charCodeAt(6)+(bin.charCodeAt(7)<<8); const h = bin.charCodeAt(8)+(bin.charCodeAt(9)<<8); dims = { width: w, height: h }; }
else if (sig === '424D') { format = 'bmp'; const w = bin.charCodeAt(18)+(bin.charCodeAt(19)<<8); const h = bin.charCodeAt(22)+(bin.charCodeAt(23)<<8); dims = { width: w, height: h }; }
else if (src.includes('<svg')) { format = 'svg'; const wm = src.match(/width=['\\\"]([\\d.]+)/); const hm = src.match(/height=['\\\"]([\\d.]+)/); dims = { width: wm?wm[1]:null, height: hm?hm[1]:null }; }
else if (sig === 'FFD8') { format = 'jpeg'; }
return JSON.stringify({ format, mime, bytes, approxKB: Math.round(bytes/1024), dimensions: dims }, null, 2);`,
  },

  // ─── STRUCTURED SCRAPING ──────────────────────────────────────────
  {
    name: 'scrape_links',
    description: 'Fetch a URL (CORS-proxied) and extract all links with their anchor text, plus titles/headings.',
    code: `const url = ctx.args.url || '';
if (!url) return 'Provide ctx.args.url';
const res = await ctx.fetch(url, { headers: ctx.args.headers || {} });
if (!res.ok) return 'HTTP ' + res.status + ' for ' + url;
const html = await res.text();
const links = []; const re = /<a[^>]*href=['\\\"]([^'\\\"]+)['\\\"][^>]*>([\\s\\S]*?)<\\/a>/gi;
let m; while ((m = re.exec(html)) !== null) { const href = m[1]; const text = m[2].replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim(); links.push({ href, text: text.slice(0, 80) }); }
const headings = []; const hre = /<(h[1-6])[^>]*>([\\s\\S]*?)<\\/h[1-6]>/gi;
while ((m = hre.exec(html)) !== null) { headings.push(m[2].replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim().slice(0, 100)); }
return JSON.stringify({ url, title: (html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)||[])[1]||null, links: links.slice(0, ctx.args.maxLinks||60), headings: headings.slice(0, 30), totalLinks: links.length });`,
  },
  {
    name: 'scrape_table',
    description: 'Fetch a URL and extract the first HTML <table> into CSV (pipe-delimited to preserve commas).',
    code: `const url = ctx.args.url || '';
if (!url) return 'Provide ctx.args.url';
const res = await ctx.fetch(url, { headers: ctx.args.headers || {} });
if (!res.ok) return 'HTTP ' + res.status + ' for ' + url;
const html = await res.text();
const t = html.match(/<table[^>]*>([\\s\\S]*?)<\\/table>/i);
if (!t) return 'No <table> found on the page';
const rows = []; const trRe = /<tr[^>]*>([\\s\\S]*?)<\\/tr>/gi;
let m; while ((m = trRe.exec(t[1])) !== null) { const cells = []; const tdRe = /<t[dh][^>]*>([\\s\\S]*?)<\\/t[dh]>/gi; let c; while ((c = tdRe.exec(m[1])) !== null) { cells.push(c[1].replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim()); } if (cells.length) rows.push(cells); }
let out = rows.map(r => r.join(' | ')).join('\\n');
if (ctx.args.saveTo) ctx.vfs.write(ctx.args.saveTo, out);
return JSON.stringify({ url, tableIndex: 1, rows: rows.length, saveTo: ctx.args.saveTo || null, csv: out.slice(0, 6000), preview: rows.slice(0, 5) }, null, 2);`,
  },

  // ─── SKILL CHAINING ───────────────────────────────────────────────
  {
    name: 'chain_tasks',
    description: 'Run a list of other skills sequentially via ctx.runSkill. Pass ctx.args.steps as an array of {skill, args?}. Returns per-step results.',
    code: `const steps = Array.isArray(ctx.args.steps) ? ctx.args.steps : [];
if (steps.length === 0) return 'Provide ctx.args.steps (array of {skill, args?})';
const outputs = [];
let ok = 0; let failed = 0;
for (const step of steps) {
  if (!step || !step.skill) { outputs.push({ skill: null, ok: false, error: 'step missing skill' }); failed++; continue; }
  const r = await ctx.runSkill(step.skill, step.args || {});
  if (r && r.success) { ok++; outputs.push({ skill: step.skill, ok: true, result: typeof r.result === 'string' ? r.result.slice(0, 500) : JSON.stringify(r.result).slice(0, 500) }); }
  else { failed++; outputs.push({ skill: step.skill, ok: false, error: (r && r.error) || 'failed' }); }
}
return JSON.stringify({ steps: steps.length, ok, failed, outputs }, null, 2);`,
  },

];
