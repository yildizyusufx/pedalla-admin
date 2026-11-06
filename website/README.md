# Pedalla website (pedalla.bike)

Public marketing & rental site: DE first (`/`), English (`/en/`) and Turkish (`/tr/`).
Static HTML/CSS/JS, no dependencies, no cookies, fonts self-hosted (GDPR-friendly).

## What it does
- **Bike cards** with *Mehr Details* / *Jetzt mieten*. Bike types, monthly prices, deposits and the number of free bikes come **live** from the admin panel (`GET /api/portal/catalog`). If the panel cannot be reached, the prices in `content/models.mjs` are shown.
- **Jetzt mieten** opens a 3-step dialog (bike + start date + duration → name/e-mail/phone/password → done). It creates the rider account in the admin panel (`/api/portal/signup` or `/login`) and sends a **"yeni kiralama"** request (`/api/portal/requests`). The request appears in the admin panel under *Sürücü talepleri*. "Zum Fahrerkonto" logs the rider straight into `portal.html`.
- **Live map** (Leaflet + CARTO/OSM tiles): free bikes (position rounded to ~100 m), the Pedalla hub, the service area.
- Business section, FAQ, Impressum and Datenschutz (drafts – fill in `[BITTE ERGÄNZEN]` in `content/legal.mjs`).

## Edit content
| What | File |
|---|---|
| Texts (DE/EN/TR) | `content/i18n.mjs` |
| Bike model names, descriptions, specs, photos | `content/models.mjs` + `src/img/` |
| Phone, WhatsApp, address, hub position, map area, net/gross prices | `content/site.mjs` |
| Design | `src/site.css` |

Prices, bike types and photos per type can also be changed in the admin panel (Ayarlar → Bisiklet tipleri, Fiyat planları) – the site picks them up automatically.

## Run locally
```
node build.mjs && node dev.mjs          # http://localhost:5500
PEDALLA_ADMIN=http://localhost:3000 node build.mjs   # test against a local admin panel
```

## Deploy (Vercel, separate project)
1. Vercel → Add New → Project → import `yildizyusufx/pedalla-admin` **again**.
2. **Root Directory: `website`** (Framework: Other). Build/output come from `website/vercel.json`.
3. Domains: add `pedalla.bike` and `www.pedalla.bike`. In Cloudflare DNS (DNS only, grey cloud): `A @ 76.76.21.21` and `CNAME www cname.vercel-dns.com` (use exactly what Vercel shows).
4. The admin panel already allows requests from `https://pedalla.bike`, `https://www.pedalla.bike` and `https://pedalla*.vercel.app`. Other origins: set `SITE_ORIGINS` (comma separated) on the admin project.
