// Async db adapter for Turso / libSQL (used on Vercel). Same interface as the sync adapters.
import { createClient } from '@libsql/client';
import { AsyncLocalStorage } from 'node:async_hooks';

export function libsqlDb(url, authToken) {
  const client = createClient({ url, authToken });
  const txStore = new AsyncLocalStorage();
  const target = () => txStore.getStore() || client;
  const args = (p = []) => p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
  const rows = (rs) => rs.rows.map((r) => {
    const o = {};
    rs.columns.forEach((c, i) => { const v = r[i]; o[c] = typeof v === 'bigint' ? Number(v) : v; });
    return o;
  });
  // Split a script into single statements (quote-aware) and send them with batch() in small chunks.
  // Remote-only: PRAGMA foreign_keys and BEGIN/COMMIT are dropped (each batch is already a transaction).
  const split = (sql) => {
    const out = []; let cur = ''; let q = null;
    for (const ch of sql) {
      if (q) { if (ch === q) q = null; cur += ch; continue; }
      if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
      if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.map((x) => x.replace(/^(\s*--[^\n]*\n)+/, '').trim()).filter((x) => x && !/^(PRAGMA\s+foreign_keys|BEGIN|COMMIT|ROLLBACK)\b/i.test(x));
  };
  const execScript = async (sql) => {
    const stmts = split(sql); let chunk = []; let size = 0;
    const flush = async () => { if (chunk.length) await target().batch(chunk, 'write'); chunk = []; size = 0; };
    for (const st of stmts) { chunk.push(st); size += st.length; if (chunk.length >= 100 || size > 60000) await flush(); }
    await flush();
  };
  const ex = (sql, p) => target().execute({ sql, args: args(p) });
  return {
    client,
    all: async (sql, p) => rows(await ex(sql, p)),
    get: async (sql, p) => rows(await ex(sql, p))[0],
    run: async (sql, p) => { const r = await ex(sql, p); return { changes: r.rowsAffected, lastId: Number(r.lastInsertRowid ?? 0) }; },
    exec: (sql) => execScript(sql),
    tx: async (fn) => {
      if (txStore.getStore()) return fn();
      const t = await client.transaction('write');
      try { const r = await txStore.run(t, fn); await t.commit(); return r; }
      catch (e) { try { await t.rollback(); } catch {} throw e; }
      finally { t.close(); }
    },
  };
}
