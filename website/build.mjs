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

// PREVIEW=1: explicit index.html / .html links for hosts without clean URLs
const IDX = process.env.PREVIEW ? 'index.html' : '';
const EXT = process.env.PREVIEW ? '.html' : '';
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
    priceRange: '€€',
    makesOffer: MODELS.map((m) => ({ '@type': 'Offer', name: m.name, priceCurrency: 'EUR', price: price(m.fallbackPrice), priceSpecification: { '@type': 'UnitPriceSpecification', price: price(m.fallbackPrice), priceCurrency: 'EUR', unitCode: 'MON' } })),
  };
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [7, 1, 2, 3, 4, 5, 6].filter((n) => t['q' + n]).map((n) => ({ '@type': 'Question', name: t['q' + n], acceptedAnswer: { '@type': 'Answer', text: String(t['a' + n]).replace(/<[^>]+>/g, '') } })) };
  const runtime = {
    lang, api: SITE.api, portal: SITE.portal, whatsapp: SITE.whatsapp, priceMode: SITE.priceMode, vat: SITE.vat, durations: SITE.durations, periods: SITE.periods, pickup: `${SITE.stations[0].street}, ${SITE.stations[0].zip}`,
    stations: SITE.stations, area: SITE.area, privacy: `${pre}datenschutz${EXT}`, pre,
    models: MODELS.map((m) => ({ sub: m.sub[lang], id: m.id, match: m.match.source, flags: m.match.flags, adminType: m.adminType, name: m.name, image: m.image, price: m.fallbackPrice, deposit: m.fallbackDeposit, tag: m.tag?.[lang] || '', desc: m.desc[lang], specs: m.specs[lang] })),
    generic: { sub: GENERIC.sub[lang], image: GENERIC.image, desc: GENERIC.desc[lang] },
    t,
  };
  const steps = [['bike', 'how1'], ['user', 'how2'], ['key', 'how3'], ['bolt', 'how4']];
  const inc = [['wrench', 'inc1'], ['shield', 'inc2'], ['phone', 'inc3'], ['chat', 'inc4'], ['calendar', 'inc5'], ['coin', 'inc6']];
  const faq = [7, 1, 2, 3, 4, 5, 6];

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(t.meta_title)}</title>
  <meta name="description" content="${esc(t.meta_desc)}">
  <meta name="theme-color" content="#eb4056">
  <meta name="color-scheme" content="light only">
  <link rel="canonical" href="${SITE.url}${base(lang)}">
  ${alt}
  <link rel="alternate" hreflang="x-default" href="${SITE.url}/">
  <meta property="og:type" content="website"><meta property="og:title" content="${esc(t.meta_title)}"><meta property="og:description" content="${esc(t.meta_desc)}">
  <meta property="og:image" content="${SITE.url}/img/og.jpg"><meta property="og:url" content="${SITE.url}${base(lang)}"><meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${pre}img/favicon.png"><link rel="apple-touch-icon" href="${pre}img/apple-touch-icon.png">
  <link rel="preload" href="${pre}fonts/sora-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${pre}site.css?v=${V}">
  <link rel="stylesheet" href="${pre}vendor/leaflet/leaflet.css">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <script type="application/ld+json">${JSON.stringify(faqLd)}</script>
</head>
<body>
<div class="pdl-intro" aria-hidden="true"><div class="pdl-loader"></div></div>
<script>try{if(sessionStorage.getItem('pdl-seen'))document.documentElement.classList.add('ready');sessionStorage.setItem('pdl-seen','1')}catch(e){}</script>
<a class="skip" href="#main">Skip</a>
<header class="top" id="top">
  <div class="wrap top-in">
    <a class="logo-pill" href="${base(lang)}" aria-label="Pedalla"><i><img src="${pre}img/mark.png" alt="" width="30" height="19"></i><img class="lp-word" src="${pre}img/wordmark-light.png" alt="pedalla.bike" width="120" height="19"></a>
    <nav class="nav" id="nav" aria-label="${t.menu}">
      <a href="#book" class="on">${ic('calendar')}<span>${t.nav_book}</span></a><a href="#modelle">${ic('bike')}<span>${t.nav_models}</span></a><a href="#so-gehts">${ic('route')}<span>${t.nav_how}</span></a><a href="#karte">${ic('pin')}<span>${t.nav_map}</span></a><a href="#business">${ic('globe')}<span>${t.nav_business}</span></a><a href="#faq">${ic('chat')}<span>${t.nav_faq}</span></a>
      <div class="nav-x nav-lang">${Object.keys(LANGS).map((l) => `<a href="${l === lang ? '#' : (lang === 'de' ? '' : '../') + (l === 'de' ? '' : l + '/') + IDX}" class="${l === lang ? 'on' : ''}" hreflang="${l}">${LANGS[l]}</a>`).join('')}</div>
    </nav>
    <div class="top-r">
      <div class="lang" role="navigation" aria-label="Language">${Object.keys(LANGS).map((l) => `<a href="${l === lang ? '#' : (lang === 'de' ? '' : '../') + (l === 'de' ? '' : l + '/') + IDX}" class="${l === lang ? 'on' : ''}" hreflang="${l}" lang="${l}" title="${LANGS[l]}">${l.toUpperCase()}</a>`).join('')}</div>
      <a class="round light hide-s" href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('wa')}</a>
      <a class="login-pill" href="${SITE.portal}?lang=${lang}" title="${t.nav_login}"><span>${t.nav_login}</span><i>${ic('user')}</i></a>
      <button class="round dark burger" id="burger" aria-label="${t.menu}" aria-expanded="false" aria-controls="nav">${ic('menu')}</button>
    </div>
  </div>
</header>

<main id="main">
<section class="book wrap" id="book" aria-label="${t.sched_h}">
  <div class="bk">
    <div class="bk-col bk-left">
      <div class="card hello">
        <span class="eyebrow"><span class="dot"></span>${t.hello_eyebrow}</span>
        <h1>${t.hero_h1a} <span class="red">${t.hero_h1b}</span> ${t.hero_h1c}</h1>
        <p class="muted">${t.hello_p}</p>
        <div class="hello-b"><a class="btn dark" href="#sched">${ic('calendar')} ${t.hello_cta}</a><span class="chips"><span>${ic('wrench')}${t.chip_service}</span><span>${ic('shield')}${t.chip_ins}</span></span></div>
        <img class="hello-mark" src="${pre}img/mark.png" alt="" aria-hidden="true">
      </div>
      <div class="card types">
        <div class="card-h"><h2>${t.types_h}</h2><span class="live-dot" id="liveDot" hidden></span></div>
        <div class="tt" role="table"><div class="tt-h" role="row"><span role="columnheader">${t.col_bike}</span><span role="columnheader">${t.col_price}</span><span role="columnheader">${t.col_status}</span></div>
          <div id="typeRows">${MODELS.slice(0, 2).map((m) => `<button class="tt-r" data-pick="${m.id}" role="row"><span class="tt-b"><i><img src="${pre}${m.image}" alt=""></i><b>${esc(m.name)}</b></span><span>€${price(m.fallbackPrice)}${t.per_month}</span><span><em class="st">${t.st_req}</em></span></button>`).join('')}</div></div>
      </div>
    </div>

    <div class="bk-col bk-mid">
      <div class="card hero-card" id="heroCard">
        <i class="hc-stripe" aria-hidden="true"></i>
        <img class="hc-bike" id="heroBike" src="${pre}${fat.image}" alt="${esc(fat.name)}" width="1069" height="1100" fetchpriority="high">
        <div class="hc-dots" id="heroDots" role="tablist" aria-label="${t.nav_models}"></div>
        <div class="bubbles">
          <div class="bub"><i>${ic('shield')}</i><b id="bDeposit">€${price(fat.fallbackDeposit)}</b><small>${t.b_deposit}</small></div>
          <div class="bub dark"><i>${ic('coin')}</i><b id="bPrice">€${price(fat.fallbackPrice)}</b><small id="bPer">${t.per_month.replace('/', '')}</small></div>
          <div class="bub"><i>${ic('bike')}</i><b id="bFree">–</b><small>${t.b_free}</small></div>
        </div>
        <div class="glass">
          <div class="glass-h"><h2 id="hcName">${esc(fat.name)}</h2><span class="tag" id="hcSub">${esc(fat.sub[lang])}</span></div>
          <p id="hcDesc">${esc(fat.desc[lang])}</p>
          <a href="#" class="link" data-details="${fat.id}" id="hcMore">${t.more_details} ${ic('arrow')}</a>
        </div>
        <button class="btn black xl" id="hcBook" data-book>${t.b_book}</button>
      </div>
    </div>

    <div class="bk-col bk-right" id="sched">
      <div class="card sched-h"><h2>${t.sched_h}</h2><span class="round soft">${ic('calendar')}</span></div>
      <div class="card sched">
        <div class="per-tabs" id="perTabs" role="tablist" aria-label="${t.sched_dur}"></div>
        <div class="sched-in">
          <div class="durs-l" id="durList" role="radiogroup" aria-label="${t.sched_dur}"></div>
          <div class="cal" id="cal" aria-live="polite"></div>
        </div>
        <div class="bsum" id="bsum"></div>
        <p class="bavail" id="bAvail" aria-live="polite"></p>
        <div class="sched-a"><button class="btn ghost" id="bReset" type="button">${t.b_reset}</button><button class="btn red" id="bNext" type="button" data-go>${t.b_next} ${ic('arrow')}</button></div>
      </div>
      <div class="card pick">
        <span class="pick-ic">${ic('pin')}</span>
        <div><h3>${t.pick_h}</h3><b>${esc(SITE.stations[0].street)}, ${esc(SITE.stations[0].zip)}</b><p class="muted">${t.pick_p}</p>
          <a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SITE.stations[0].street + ', ' + SITE.stations[0].zip)}">${ic('route')} ${t.map_route}</a></div>
      </div>
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
    <div><img src="${pre}img/logo-light.png" alt="pedalla.bike" width="170" height="21"><p>${t.foot_tag}</p></div>
    <div><h4>${t.foot_contact}</h4><p>${esc(SITE.address.street)}<br>${SITE.address.zip} ${SITE.address.city}</p><p><a href="tel:${SITE.phone.replace(/\s/g, '')}">${SITE.phone}</a><br><a href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">WhatsApp</a> · <a href="mailto:${SITE.email}">${SITE.email}</a></p></div>
    <div><h4>Pedalla</h4><p><a href="#modelle">${t.nav_models}</a><br><a href="#business">${t.nav_business}</a><br><a href="${SITE.portal}?lang=${lang}">${t.nav_login}</a></p></div>
    <div><h4>${t.foot_legal}</h4><p><a href="${pre}impressum${EXT}">${t.foot_imprint}</a><br><a href="${pre}datenschutz${EXT}">${t.foot_privacy}</a></p></div>
  </div>
  <div class="wrap foot-b">© ${new Date().getFullYear()} Pedalla. ${t.foot_rights}</div>
</footer>

<div class="modal" id="modal" hidden><div class="modal-bg" data-close></div><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><button class="modal-x" data-close aria-label="${t.close}">${ic('close')}</button><div id="modalBody"></div></div></div>

<script>window.PEDALLA=${JSON.stringify(runtime).replace(/</g, '\\u003c')};</script>
<script src="${pre}vendor/leaflet/leaflet.js" defer></script>
<script src="${pre}site.js?v=${V}" defer></script>
<script src="${pre}pw-toggle.js?v=${V}" defer></script>
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
