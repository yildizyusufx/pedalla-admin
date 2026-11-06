// Vercel serverless entry: every /api/* request lands here (see vercel.json).
// Needs TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.
import { createApi } from '../shared/api.js';
import { libsqlDb } from '../shared/db-libsql.js';
import { seedRemote } from '../shared/dump.js';
import { crypto } from '../shared/node-crypto.js';

let ready;
// Accept common spellings (TURSO_DATABASE_URL, TURSO_URL, LIBSQL_URL, ... and stray spaces/case in the name).
function envFind(re) {
  for (const [k, v] of Object.entries(process.env)) if (re.test(k.trim()) && v && v.trim()) return v.trim();
  return '';
}
const withScheme = (u) => (u && !/^[a-z]+:/i.test(u) ? `libsql://${u.replace(/^\/+/, '')}` : u);
const dbUrl = () => withScheme(envFind(/^(TURSO|LIBSQL)_?(DATABASE|DB)?_?URL$/i) || envFind(/^DATABASE_URL$/i).replace(/^(?!libsql:|https?:|wss?:|file:).*$/, ''));
const dbToken = () => envFind(/^(TURSO|LIBSQL)_?(AUTH)?_?TOKEN$/i);
async function getApi() {
  if (!dbUrl()) throw new Error('TURSO_DATABASE_URL ortam değişkeni tanımlı değil.');
  const db = libsqlDb(dbUrl(), dbToken());
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
  // The page asks this first: is a shared database configured? (no -> it opens the browser demo)
  if (/[?&]__path=_mode\b|\/api\/_mode\b/.test(req.url)) {
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    return res.end(JSON.stringify({ db: !!dbUrl(), token: !!dbToken(), env: Object.keys(process.env).filter((k) => /turso|libsql|database/i.test(k)) }));
  }
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
