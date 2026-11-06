// Builds the static front end into dist/ (Vercel or any static host).
import { cpSync, rmSync, mkdirSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('public', 'dist', { recursive: true });
cpSync('shared', 'dist/shared', { recursive: true });
// index.html decides at runtime (GET /api/_mode): with TURSO_DATABASE_URL set on the server it uses
// the shared database, otherwise it opens demo.html. No rebuild is needed after adding env vars.
console.log('dist/ hazır (Turso: ' + (process.env.TURSO_DATABASE_URL ? 'tanımlı' : 'yok, demo açılır') + ')');
