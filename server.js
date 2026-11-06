// Pedalla Admin – zero-dependency server (Node.js >= 22.13)
import http from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { crypto, hashPassword } from './shared/node-crypto.js';
import { createApi } from './shared/api.js';
import { seed } from './shared/seed.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || join(ROOT, 'data', 'pedalla.db');
await mkdir(dirname(DB_PATH), { recursive: true });

const sqlite = new DatabaseSync(DB_PATH);
sqlite.exec('PRAGMA journal_mode = WAL;');
let depth = 0;
const db = { // sync adapter; the API awaits each call
  all: (sql, p = []) => sqlite.prepare(sql).all(...p),
  get: (sql, p = []) => sqlite.prepare(sql).get(...p),
  run: (sql, p = []) => { const r = sqlite.prepare(sql).run(...p); return { changes: r.changes, lastId: Number(r.lastInsertRowid) }; },
  exec: (sql) => sqlite.exec(sql),
  tx: async (fn) => {
    if (depth++) { try { return await fn(); } finally { depth--; } }
    sqlite.exec('BEGIN');
    try { const r = await fn(); sqlite.exec('COMMIT'); return r; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } finally { depth--; }
  },
};
const api = await createApi(db, crypto);
if (process.env.NO_SEED !== '1') { if (await seed(api, hashPassword)) console.log('Demo verileri yüklendi. Giriş: admin@pedalla.bike / pedalla123'); }
else if ((await db.get('SELECT COUNT(*) AS n FROM users')).n === 0) {
  const email = process.env.ADMIN_EMAIL || 'admin@pedalla.bike'; const pw = process.env.ADMIN_PASSWORD || randomBytes(6).toString('hex');
  db.run("INSERT INTO users(name,email,role,password_hash) VALUES('Yönetici',?,'admin',?)", [email, hashPassword(pw)]);
  console.log(`Boş veritabanı oluşturuldu. Yönetici: ${email} / ${pw}`);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/api/_mode') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end('{"db":true}'); }
    if (url.pathname.startsWith('/api/')) {
      let raw = ''; for await (const ch of req) { raw += ch; if (raw.length > 2e6) throw new Error('too large'); }
      let body = {}; if (raw) { try { body = JSON.parse(raw); } catch { body = {}; } }
      const token = (req.headers.authorization || '').replace(/^Bearer /, '') || null;
      const out = await api.handle({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body, token });
      res.writeHead(out.status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(JSON.stringify(out.body));
    }
    let p = url.pathname === '/' ? '/index.html' : url.pathname;
    const isShared = p.startsWith('/shared/');
    const base = join(ROOT, isShared ? 'shared' : 'public');
    const file = normalize(join(base, isShared ? p.slice(7) : p));
    if (!file.startsWith(base + '/') && !file.startsWith(base + '\\')) { res.writeHead(403); return res.end(); }
    const st = await stat(file).catch(() => null);
    if (!st || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch (e) {
    console.error(e); res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'Sunucu hatası' }));
  }
});
server.listen(PORT, () => console.log(`Pedalla Admin çalışıyor → http://localhost:${PORT}`));
