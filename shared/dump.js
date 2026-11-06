// Fills an empty remote database with the demo data in a single round trip:
// the seed runs against an in-memory SQLite database, which is then dumped as INSERT statements.
import { createApi } from './api.js';
import { seed } from './seed.js';

const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' || typeof v === 'bigint' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

export async function seedRemote(remoteDb, crypto) {
  const { DatabaseSync } = await import('node:sqlite');
  const mem = new DatabaseSync(':memory:');
  let depth = 0;
  const db = {
    all: (sql, p = []) => mem.prepare(sql).all(...p),
    get: (sql, p = []) => mem.prepare(sql).get(...p),
    run: (sql, p = []) => { const r = mem.prepare(sql).run(...p); return { changes: r.changes, lastId: Number(r.lastInsertRowid) }; },
    exec: (sql) => mem.exec(sql),
    tx: async (fn) => { if (depth++) { try { return await fn(); } finally { depth--; } } mem.exec('BEGIN'); try { const r = await fn(); mem.exec('COMMIT'); return r; } catch (e) { mem.exec('ROLLBACK'); throw e; } finally { depth--; } },
  };
  const api = await createApi(db, crypto);
  await seed(api, crypto.hashPassword);
  const tables = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> 'sessions'").map((t) => t.name);
  const stmts = ['PRAGMA foreign_keys = OFF;', 'BEGIN;'];
  for (const t of tables) {
    for (const row of db.all(`SELECT * FROM ${t}`)) {
      const cols = Object.keys(row);
      stmts.push(`INSERT OR REPLACE INTO ${t} (${cols.join(',')}) VALUES (${cols.map((c) => lit(row[c])).join(',')});`);
    }
  }
  stmts.push('COMMIT;', 'PRAGMA foreign_keys = ON;');
  await remoteDb.exec(stmts.join('\n'));
  return stmts.length;
}
