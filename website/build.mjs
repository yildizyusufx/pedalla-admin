// Builds the static website into dist/:  /  (DE)  ·  /en/  ·  /tr/  ·  /impressum  ·  /datenschutz
// No dependencies – run with `node build.mjs`.
import { cpSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { T, LANGS } from './content/i18n.mjs';
import { SITE } from './content/site.mjs';
import { MODELS, GENERIC } from './content/models.mjs';
import { legalPage } from './content/legal.mjs';

const OUT = 'dist';
// local testing: PEDALLA_ADMIN=http://localhost:3000 node build.mjs
if (process.env.PEDALLA_ADMIN) { SITE.api = process.env.PEDALLA_ADMIN + '/api/portal'; SITE.portal = process.env.PEDALLA_ADMIN + '/portal.html'; }
const V = Date.now().toString(36); // cache buster for css/js
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
cpSync('src', OUT, { recursive: true });

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const base = (lang) => (lang === 'de' ? '/' : `/${lang}/`);
const price = (n) => (SITE.priceMode === 'gross' ? Math.round(n * (1 + SITE.vat)) : n);
const wa = (text) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

const ICON = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.6-1.2-1.6 0-2.7.9-2.7 2 0 2.8 5.6 1.4 5.6 4.2 0 1.1-1.2 2-2.8 2-1.2 0-2.2-.5-2.8-1.3M12 6.5V8m0 8v1.5"/>',
  bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l2 7h-6M14 6h2.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  bolt: '<path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8.4 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.6-2-1-1 .8a4 4 0 0 1-1.7-1.7l.8-1-1-2z"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

function card(m, lang, t) {
  return `<article class="bike" data-model="${m.id}">
    <div class="bike-img"><span class="bike-tag">${esc(m.tag?.[lang] || '')}</span><img src="${base(lang) === '/' ? '' : '../'}${m.image}" alt="${esc(m.name)}" loading="lazy" width="520" height="360"></div>
    <div class="bike-body">
      <h3>${esc(m.name)}</h3>
      <p>${esc(m.desc[lang])}</p>
      <div class="bike-price"><span class="muted">${t.starting_from}</span><b class="pill">€${price(m.fallbackPrice)}${t.per_month}</b><span class="avail" hidden></span></div>
    </div>
    <div class="bike-actions">
      <button class="btn ghost" data-details="${m.id}">${t.more_details}</button>
      <button class="btn dark" data-rent="${m.id}">${t.rent_now}</button>
    </div>
  </article>`;
}

function page(lang) {
  const t = T[lang];
  const pre = lang === 'de' ? '' : '../';
  const alt = Object.keys(LANGS).map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE.url}${base(l)}">`).join('\n  ');
  const fat = MODELS[0];
  const ld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Pedalla', url: SITE.url, telephone: SITE.phone, image: `${SITE.url}/img/og.jpg`,
    address: { '@type': 'PostalAddress', streetAddress: SITE.address.street, postalCode: SITE.address.zip, addressLocality: SITE.address.city, addressCountry: SITE.address.country },
    geo: { '@type': 'GeoCoordinates', latitude: SITE.stations[0].lat, longitude: SITE.stations[0].lng }, areaServed: 'Hamburg',
  };
  const runtime = {
    lang, api: SITE.api, portal: SITE.portal, whatsapp: SITE.whatsapp, priceMode: SITE.priceMode, vat: SITE.vat, durations: SITE.durations,
    stations: SITE.stations, area: SITE.area, privacy: `${pre}datenschutz`, pre,
    models: MODELS.map((m) => ({ sub: m.sub[lang], id: m.id, match: m.match.source, flags: m.match.flags, adminType: m.adminType, name: m.name, image: m.image, price: m.fallbackPrice, deposit: m.fallbackDeposit, tag: m.tag?.[lang] || '', desc: m.desc[lang], specs: m.specs[lang] })),
    generic: { sub: GENERIC.sub[lang], image: GENERIC.image, desc: GENERIC.desc[lang] },
    t,
  };
  const steps = [['bike', 'how1'], ['user', 'how2'], ['key', 'how3'], ['bolt', 'how4']];
  const inc = [['wrench', 'inc1'], ['shield', 'inc2'], ['phone', 'inc3'], ['chat', 'inc4'], ['calendar', 'inc5'], ['coin', 'inc6']];
  const faq = [1, 2, 3, 4, 5, 6];

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(t.meta_title)}</title>
  <meta name="description" content="${esc(t.meta_desc)}">
  <meta name="theme-color" content="#eb4056">
  <link rel="canonical" href="${SITE.url}${base(lang)}">
  ${alt}
  <link rel="alternate" hreflang="x-default" href="${SITE.url}/">
  <meta property="og:type" content="website"><meta property="og:title" content="${esc(t.meta_title)}"><meta property="og:description" content="${esc(t.meta_desc)}">
  <meta property="og:image" content="${SITE.url}/img/og.jpg"><meta property="og:url" content="${SITE.url}${base(lang)}"><meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${pre}img/favicon.png">
  <link rel="preload" href="${pre}fonts/sora-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${pre}site.css?v=${V}">
  <link rel="stylesheet" href="${pre}vendor/leaflet/leaflet.css">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<a class="skip" href="#main">Skip</a>
<header class="top" id="top">
  <div class="wrap top-in">
    <div class="top-l">
      <button class="round dark" id="burger" aria-label="${t.menu}" aria-expanded="false" aria-controls="nav">${ic('menu')}</button>
      <nav class="nav" id="nav">
        <a href="#modelle">${t.nav_models}</a><a href="#so-gehts">${t.nav_how}</a><a href="#karte">${t.nav_map}</a><a href="#business">${t.nav_business}</a><a class="nav-x" href="#faq">${t.nav_faq}</a>
        <a class="nav-x" href="${SITE.portal}?lang=${lang}">${t.nav_login}</a>
        <div class="nav-x nav-lang">${Object.keys(LANGS).map((l) => `<a href="${l === lang ? '#' : (lang === 'de' ? '' : '../') + (l === 'de' ? '' : l + '/')}" class="${l === lang ? 'on' : ''}" hreflang="${l}">${LANGS[l]}</a>`).join('')}</div>
      </nav>
    </div>
    <a class="logo" href="${base(lang)}" aria-label="Pedalla"><img src="${pre}img/logo.png" alt="Pedalla" width="160" height="29"></a>
    <div class="top-r">
      <div class="lang" role="navigation" aria-label="Language">${Object.keys(LANGS).map((l) => `<a href="${l === lang ? '#' : (lang === 'de' ? '' : '../') + (l === 'de' ? '' : l + '/')}" class="${l === lang ? 'on' : ''}" hreflang="${l}" lang="${l}" title="${LANGS[l]}">${l.toUpperCase()}</a>`).join('')}</div>
      <div class="contact hide-m"><a class="pillbtn" href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">${t.foot_contact}</a><a class="round light" href="tel:${SITE.phone.replace(/\s/g, '')}" aria-label="${SITE.phone}">${ic('phone')}</a></div>
      <button class="rentbtn" data-rent=""><span>${t.cta_rent}</span><i>${ic('bike')}</i></button>
    </div>
  </div>
</header>

<main id="main">
<section class="hero wrap">
  <div class="hero-box" id="hero">
    <div class="stage" aria-hidden="true"><i class="st-main"></i><i class="st-tab"></i><i class="st-join"></i><i class="st-notch"></i><i class="st-c1"></i><i class="st-c2"></i></div>
    <h1 class="hero-h"><span>${t.hero_h1a}</span><span class="badges" aria-hidden="true"><i class="bd-img"><img src="${pre}img/mark.png" alt=""></i><i class="bd-bolt">${ic('bolt')}</i></span><br><span class="red">${t.hero_h1b}</span> ${t.hero_h1c}</h1>
    <div class="hero-live" id="heroFree">
      <div class="stack">${MODELS.slice(0, 2).map((m) => `<i><img src="${pre}${m.image}" alt=""></i>`).join('')}<i class="plus">+</i></div>
      <p><b class="lv1">${t.chip_service} · ${t.chip_ins}</b><span class="lv2">${t.chip_fees}</span></p>
    </div>
    <img class="hero-bike" id="heroBike" src="${pre}${fat.image}" alt="${esc(fat.name)}" width="1069" height="1100" fetchpriority="high">
    <div class="spot" id="spot">
      <h2 class="spot-name">${esc(fat.name)}</h2>
      <span class="spot-sub">${esc(fat.sub[lang])}</span>
      <p class="spot-desc">${esc(fat.desc[lang])}</p>
      <p class="spot-price">${t.starting_from} <b data-from="${fat.id}">€${price(fat.fallbackPrice)}</b>${t.per_month} · <a href="#" data-details="${fat.id}">${t.more_details}</a></p>
    </div>
    <button class="btn red lg hero-cta-m" data-rent="">${t.cta_rent} ${ic('arrow')}</button>
    <button class="hero-go" data-rent="${fat.id}" aria-label="${t.cta_rent}">${ic('arrow')}</button>
    <div class="hero-models" id="heroModels" role="tablist" aria-label="${t.nav_models}">
      ${MODELS.slice(0, 2).map((m, i) => `<button class="hm ${i === 0 ? 'on' : ''}" data-hero="${m.id}" role="tab" aria-selected="${i === 0}"><span class="hm-img"><img src="${pre}${m.image}" alt=""></span><span><b>${esc(m.name)}</b><small>€${price(m.fallbackPrice)}${t.per_month}</small></span></button>`).join('')}
    </div>
  </div>
</section>

<section class="sec wrap" id="modelle">
  <div class="sec-h"><span class="eyebrow">${t.models_eyebrow}</span><h2>${t.models_h}</h2><p class="muted">${t.models_sub}</p></div>
  <div class="bikes" id="bikes">${MODELS.slice(0, 2).map((m) => card(m, lang, t)).join('')}</div>
  <p class="note" id="priceNote">${SITE.priceMode === 'gross' ? t.vat_gross : t.vat_net} · <span id="liveNote" hidden>${t.live_prices}</span></p>
</section>

<section class="sec wrap" id="so-gehts">
  <div class="sec-h"><span class="eyebrow">${t.how_eyebrow}</span><h2>${t.how_h}</h2></div>
  <ol class="steps">${steps.map(([i, k], n) => `<li><span class="step-n">0${n + 1}</span><span class="step-ic">${ic(i)}</span><h3>${t[k + '_h']}</h3><p>${t[k + '_p']}</p></li>`).join('')}</ol>
</section>

<section class="sec band">
  <div class="wrap">
    <div class="sec-h light"><span class="eyebrow">${t.inc_eyebrow}</span><h2>${t.inc_h}</h2></div>
    <div class="incl">${inc.map(([i, k]) => `<div class="inc"><span class="inc-ic">${ic(i)}</span><h3>${t[k + '_h']}</h3><p>${t[k + '_p']}</p></div>`).join('')}</div>
  </div>
</section>

<section class="sec wrap" id="karte">
  <div class="sec-h"><span class="eyebrow">${t.map_eyebrow}</span><h2>${t.map_h}</h2><p class="muted">${t.map_sub}</p></div>
  <div class="mapgrid">
    <div class="map-box"><div id="map" role="region" aria-label="${t.map_h}"></div><div class="map-off" id="mapOff" hidden>${t.map_offline}</div></div>
    <aside class="map-side">
      <div class="stat"><b id="freeCount">–</b><span>${t.map_free}</span></div>
      <div class="hub">${ic('pin')}<div><b>${t.map_hub}</b><span>${esc(SITE.stations[0].street)}, ${esc(SITE.stations[0].zip)}</span><small>${t.map_hub_p}</small>
        <a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SITE.stations[0].street + ', ' + SITE.stations[0].zip)}">${ic('route')} ${t.map_route}</a></div></div>
      <div class="legend"><span><i class="lg-free"></i>${t.map_free}</span><span><i class="lg-hub"></i>${t.map_hub}</span><span><i class="lg-area"></i>${t.map_area}</span></div>
      <div class="next"><h3>${ic('globe')} ${t.map_next_h}</h3><p>${t.map_next_p}</p><a class="btn ghost sm" target="_blank" rel="noopener" href="${wa(t.wa_wait)}">${t.map_next_cta}</a></div>
    </aside>
  </div>
</section>

<section class="sec wrap" id="business">
  <div class="biz">
    <div class="biz-copy">
      <span class="eyebrow">${t.biz_eyebrow}</span><h2>${t.biz_h}</h2><p class="lead">${t.biz_p}</p>
      <ul class="ticks">${[1, 2, 3, 4].map((n) => `<li>${ic('check')}${t['biz' + n]}</li>`).join('')}</ul>
      <a class="btn red lg" target="_blank" rel="noopener" href="${wa(t.wa_biz)}">${ic('wa')} ${t.biz_cta}</a>
      <p class="muted small">${t.biz_more}</p>
    </div>
    <div class="biz-visual" aria-hidden="true">
      <img src="${pre}img/cargo.svg" alt="" loading="lazy">
      <div class="biz-badge"><img src="${pre}img/mark.png" alt=""><span>Your brand<br>on the box</span></div>
    </div>
  </div>
</section>

<section class="sec wrap" id="faq">
  <div class="sec-h"><span class="eyebrow">${t.faq_eyebrow}</span><h2>${t.faq_h}</h2></div>
  <div class="faq">${faq.map((n) => `<details><summary>${t['q' + n]}<span>${ic('plus')}</span></summary><p>${t['a' + n]}</p></details>`).join('')}</div>
</section>

<section class="wrap">
  <div class="cta">
    <div><h2>${t.cta_h}</h2><p>${t.cta_p}</p></div>
    <div class="cta-b"><button class="btn white lg" data-rent="">${t.cta_rent} ${ic('arrow')}</button><a class="btn outline-w lg" target="_blank" rel="noopener" href="https://wa.me/${SITE.whatsapp}">${ic('wa')} WhatsApp</a></div>
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap foot-in">
    <div><img src="${pre}img/logo-light.png" alt="Pedalla" width="150" height="27"><p>${t.foot_tag}</p></div>
    <div><h4>${t.foot_contact}</h4><p>${esc(SITE.address.street)}<br>${SITE.address.zip} ${SITE.address.city}</p><p><a href="tel:${SITE.phone.replace(/\s/g, '')}">${SITE.phone}</a><br><a href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">WhatsApp</a> · <a href="mailto:${SITE.email}">${SITE.email}</a></p></div>
    <div><h4>Pedalla</h4><p><a href="#modelle">${t.nav_models}</a><br><a href="#business">${t.nav_business}</a><br><a href="${SITE.portal}?lang=${lang}">${t.nav_login}</a></p></div>
    <div><h4>${t.foot_legal}</h4><p><a href="${pre}impressum">${t.foot_imprint}</a><br><a href="${pre}datenschutz">${t.foot_privacy}</a></p></div>
  </div>
  <div class="wrap foot-b">© ${new Date().getFullYear()} Pedalla. ${t.foot_rights}</div>
</footer>

<div class="modal" id="modal" hidden><div class="modal-bg" data-close></div><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><button class="modal-x" data-close aria-label="${t.close}">${ic('close')}</button><div id="modalBody"></div></div></div>

<script>window.PEDALLA=${JSON.stringify(runtime).replace(/</g, '\\u003c')};</script>
<script src="${pre}vendor/leaflet/leaflet.js" defer></script>
<script src="${pre}site.js?v=${V}" defer></script>
</body>
</html>`;
}

for (const lang of Object.keys(LANGS)) {
  const dir = lang === 'de' ? OUT : `${OUT}/${lang}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, page(lang));
}
for (const name of ['impressum', 'datenschutz']) writeFileSync(`${OUT}/${name}.html`, legalPage(name, SITE, V));
writeFileSync(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...Object.keys(LANGS).map(base), '/impressum', '/datenschutz'].map((p) => `  <url><loc>${SITE.url}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log('dist/ ready:', Object.keys(LANGS).join(', '), '+ impressum, datenschutz');
