// CORS for the public website (pedalla.bike): only the rider-portal endpoints are callable from other origins.
const DEFAULT = ['https://pedalla.bike', 'https://www.pedalla.bike'];
export function corsHeaders(origin, path) {
  if (!origin || !/^\/api\/portal\//.test(path)) return {};
  const extra = String(process.env.SITE_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
  const okOrigin = [...DEFAULT, ...extra].includes(origin)
    || /^https:\/\/pedalla[\w-]*\.vercel\.app$/.test(origin)
    || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!okOrigin) return {};
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,authorization', 'access-control-max-age': '86400', vary: 'Origin' };
}
