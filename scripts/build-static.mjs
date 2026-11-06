// Builds the browser-only version (no server, in-browser SQLite) into dist/ – used by Vercel / any static host.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('public', 'dist', { recursive: true });
cpSync('shared', 'dist/shared', { recursive: true });
cpSync('public/demo.html', 'dist/index.html');
console.log('dist/ hazır (statik demo sürümü)');
