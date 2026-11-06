// Vercel serverless entry: every /api/* request lands here (see vercel.json).
// Needs TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.
import { createApi } from '../shared/api.js';
import { libsqlDb } from '../shared/db-libsql.js';
import { seedRemote } from '../shared/dump.js';
import { crypto } from '../shared/node-crypto.js';

let ready;
async function getApi() {
  if (!process.env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL ortam değişkeni tanımlı değil.');
  const db = libsqlDb(process.env.TURSO_DATABASE_URL, process.env.TURSO_AUTH_TOKEN);
  const api = await createApi(db, crypto);
  if ((await db.get('SELECT COUNT(*) AS n FROM users')).n === 0) {
    if (process.env.NO_SEED === '1') {
      const email = process.env.ADMIN_EMAIL || 'admin@pedalla.bike';
      await db.run("INSERT INTO users(name,email,role,password_hash) VALUES('Yönetici',?,'admin',?)", [email, crypto.hashPassword(process.env.ADMIN_PASSWORD || 'pedalla123')]);
    } else {
      await seedRemote(db, crypto);
    }
  }
  return api;
}

async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  let raw = ''; for await (const ch of req) raw += ch;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export default async function handler(req, res) {
  try {
    ready ||= getApi().catch((e) => { ready = null; throw e; });
    const api = await ready;
    const url = new URL(req.url, 'http://x');
    // vercel.json rewrites /api/<path> to /api?__path=<path>
    const rewritten = url.searchParams.get('__path');
    url.searchParams.delete('__path');
    const path = rewritten != null && !url.pathname.startsWith('/api/') ? `/api/${rewritten}` : url.pathname;
    const body = req.method === 'GET' ? {} : await readBody(req);
    const token = (req.headers.authorization || '').replace(/^Bearer /, '') || null;
    const out = await api.handle({ method: req.method, path, query: Object.fromEntries(url.searchParams), body, token });
    res.statusCode = out.status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify(out.body));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: `Sunucu hatası: ${e.message}` }));
  }
}
