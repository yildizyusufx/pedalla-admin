// Builds the static front end into dist/ (Vercel or any static host).
// With TURSO_DATABASE_URL set, the page talks to the /api function and shared database;
// without it, the browser-only demo (in-browser SQLite) is published instead.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('public', 'dist', { recursive: true });
cpSync('shared', 'dist/shared', { recursive: true });
const live = !!process.env.TURSO_DATABASE_URL;
if (!live) cpSync('public/demo.html', 'dist/index.html');
console.log(live ? 'dist/ hazır: ortak veritabanlı sürüm (Turso)' : 'dist/ hazır: tarayıcı içi demo sürümü (TURSO_DATABASE_URL yok)');
