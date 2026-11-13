// Full database backup as one JSON file, fetched table by table from /api/backup (works with Vercel + Turso).
//   PEDALLA_URL=https://admin.pedalla.bike BACKUP_TOKEN=… node scripts/backup.mjs [out.json]
// BACKUP_TOKEN must be the same value as the BACKUP_TOKEN environment variable of the admin deployment.
import { writeFileSync } from 'node:fs';

const base = (process.env.PEDALLA_URL || 'http://localhost:3000').replace(/\/$/, '');
const token = process.env.BACKUP_TOKEN;
if (!token) { console.error('BACKUP_TOKEN missing'); process.exit(1); }
const out = process.argv[2] || `pedalla-backup-${new Date().toISOString().slice(0, 10)}.json`;

async function get(path) {
  for (let i = 0; ; i++) {
    const r = await fetch(base + path, { headers: { authorization: `Bearer ${token}` } });
    if (r.ok) return r.json();
    if (i >= 3 || r.status < 500) throw new Error(`${path} → HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    await new Promise((ok) => setTimeout(ok, 2000 * (i + 1)));
  }
}

const manifest = await get('/api/backup');
const data = {};
for (const t of manifest.tables) {
  data[t.name] = []; let after = 0;
  for (;;) {
    const part = await get(`/api/backup/table?name=${encodeURIComponent(t.name)}&after=${after}`);
    data[t.name].push(...part.rows.map(({ __rowid, ...row }) => row));
    if (part.next == null) break;
    after = part.next;
  }
  if (data[t.name].length < t.count) throw new Error(`${t.name}: expected ${t.count} rows, got ${data[t.name].length}`);
}
writeFileSync(out, JSON.stringify({ app: manifest.app, created_at: manifest.created_at, source: base, tables: data }));
await get('/api/backup?mark=1'); // shows "last backup" in Ayarlar
console.log(`OK ${out}: ${manifest.tables.map((t) => `${t.name}=${data[t.name].length}`).join(' ')}`);
