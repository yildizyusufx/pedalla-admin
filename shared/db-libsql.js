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
  const ex = (sql, p) => target().execute({ sql, args: args(p) });
  return {
    client,
    all: async (sql, p) => rows(await ex(sql, p)),
    get: async (sql, p) => rows(await ex(sql, p))[0],
    run: async (sql, p) => { const r = await ex(sql, p); return { changes: r.rowsAffected, lastId: Number(r.lastInsertRowid ?? 0) }; },
    exec: (sql) => target().executeMultiple(sql),
    tx: async (fn) => {
      if (txStore.getStore()) return fn();
      const t = await client.transaction('write');
      try { const r = await txStore.run(t, fn); await t.commit(); return r; }
      catch (e) { try { await t.rollback(); } catch {} throw e; }
      finally { t.close(); }
    },
  };
}
