// Turns a backup JSON (scripts/backup.mjs) into SQL statements for an EMPTY database with the current schema.
//   node scripts/restore-backup.mjs pedalla-backup.json > restore.sql
//   sqlite3 data/pedalla.db < restore.sql        (local)   ·   turso db shell <db> < restore.sql   (Turso)
// Start the app once against the empty database first so that all tables exist.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/restore-backup.mjs backup.json > restore.sql'); process.exit(1); }
const { tables } = JSON.parse(readFileSync(file, 'utf8'));
const lit = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? '1' : '0') : `'${String(v).replace(/'/g, "''")}'`);
const q = (n) => `"${String(n).replace(/"/g, '""')}"`;
const lines = ['PRAGMA foreign_keys=OFF;', 'BEGIN;'];
for (const [name, rows] of Object.entries(tables)) {
  lines.push(`DELETE FROM ${q(name)};`);
  for (const row of rows) {
    const cols = Object.keys(row);
    lines.push(`INSERT INTO ${q(name)} (${cols.map(q).join(',')}) VALUES (${cols.map((c) => lit(row[c])).join(',')});`);
  }
}
lines.push('COMMIT;', 'PRAGMA foreign_keys=ON;');
process.stdout.write(lines.join('\n') + '\n');
