// Tiny static server for dist/ (with clean URLs like Vercel). PORT=5500 by default.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
const ROOT = join(process.cwd(), 'dist');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const isFile = async (p) => (await stat(p).catch(() => null))?.isFile();
http.createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let f = join(ROOT, p);
  if (!(await isFile(f))) f = (await isFile(join(f, 'index.html'))) ? join(f, 'index.html') : f + '.html';
  if (!f.startsWith(ROOT) || !(await isFile(f))) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(await readFile(f));
}).listen(process.env.PORT || 5500, () => console.log('http://localhost:' + (process.env.PORT || 5500)));
