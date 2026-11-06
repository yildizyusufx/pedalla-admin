// Vercel serverless entry: every /api/* request lands here (see vercel.json).
// Needs TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.
import { createApi } from '../shared/api.js';
import { libsqlDb } from '../shared/db-libsql.js';
import { seedRemote } from '../shared/dump.js';
import { crypto } from '../shared/node-crypto.js';

let ready;
// Diagnostics for /api/_mode?check=1: raw HTTP calls to the database, and the token's shape (never its value).
async function probe() {
  const url = dbUrl().replace(/^libsql:/, 'https:').replace(/\/+$/, '');
  const tok = dbToken();
  const out = {
    host: url.replace(/^https?:\/\//, '').replace(/\?.*$/, ''),
    token_shape: { length: tok.length, parts: tok.split('.').length, starts_ey: tok.startsWith('ey'), has_space: /\s/.test(tok), has_quote: /["']/.test(tok), has_bearer: /^bearer/i.test(tok) },
  };
  const body = JSON.stringify({ requests: [{ type: 'execute', stmt: { sql: 'SELECT 1' } }, { type: 'close' }] });
  for (const [k, path, opt] of [['health', '/health', {}], ['v2', '/v2/pipeline', { method: 'POST', body }], ['v3', '/v3/pipeline', { method: 'POST', body }]]) {
    try {
      const r = await fetch(url + path, { ...opt, headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) } });
      out[k] = `${r.status} ${(await r.text()).slice(0, 300)}`;
    } catch (e) { out[k] = 'ERR ' + e.message; }
  }
  return out;
}
// Accept common spellings (TURSO_DATABASE_URL, TURSO_URL, LIBSQL_URL, ... and stray spaces/case in the name).
function envFind(re) {
  for (const [k, v] of Object.entries(process.env)) if (re.test(k.trim()) && v && v.trim()) return v.trim();
  return '';
}
const withScheme = (u) => (u && !/^[a-z]+:/i.test(u) ? `libsql://${u.replace(/^\/+/, '')}` : u);
const dbUrl = () => withScheme(envFind(/^(TURSO|LIBSQL)_?(DATABASE|DB)?_?URL$/i) || envFind(/^DATABASE_URL$/i).replace(/^(?!libsql:|https?:|wss?:|file:).*$/, ''));
const dbToken = () => envFind(/^(TURSO|LIBSQL)_?(AUTH)?_?TOKEN$/i).replace(/^bearer\s+/i, '').replace(/^["']|["']$/g, '').replace(/\s+/g, '');
async function getApi() {
  if (!dbUrl()) throw new Error('TURSO_DATABASE_URL ortam değişkeni tanımlı değil.');
  const db = libsqlDb(dbUrl(), dbToken());
  const step = async (name, fn) => { try { return await fn(); } catch (e) { throw new Error(`[${name}] ${e.message}${e.cause?.message ? ' / ' + e.cause.message : ''}`); } };
  await step('bağlantı', () => db.get('SELECT 1 AS ok'));
  const api = await step('tablolar', () => createApi(db, crypto));
  if ((await step('kullanıcı sayısı', () => db.get('SELECT COUNT(*) AS n FROM users'))).n === 0) {
    if (process.env.NO_SEED === '1') {
      const email = process.env.ADMIN_EMAIL || 'admin@pedalla.bike';
      await db.run("INSERT INTO users(name,email,role,password_hash) VALUES('Yönetici',?,'admin',?)", [email, crypto.hashPassword(process.env.ADMIN_PASSWORD || 'pedalla123')]);
    } else {
      await step('örnek veriler', () => seedRemote(db, crypto));
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
    const info = { db: !!dbUrl(), token: !!dbToken() };
    if (/check=1/.test(req.url) && info.db) {
      try { ready ||= getApi().catch((e) => { ready = null; throw e; }); await ready; info.connected = true; }
      catch (e) { info.connected = false; info.error = e.message; info.probe = await probe().catch((x) => String(x)); }
    }
    return res.end(JSON.stringify({ ...info, env: Object.keys(process.env).filter((k) => /turso|libsql|database/i.test(k)) }));
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
