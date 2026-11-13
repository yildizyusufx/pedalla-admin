import { applyBikeTypes, enabledPeriods, RESOURCES, ROLES, PERMS, BIKE_STATUS, SERVICE_STATUS, PAY_METHODS, PERIODS, ID_TYPES, DOC_TYPES, DOC_LANGS, CASH_IN, CASH_OUT, insurancePlans } from './shared/meta.js';
import {
  GET, POST, PUT, DEL, session, setToken, can, esc, money, num, date, dt, ago, badge, todayISO, addDays, fmtField, toast, guard, modal, closeModal, confirmBox,
  inputHtml, fillRefs, readForm, editForm, lookup, clearLookups, csv, table, bindTable, bindSelect, colsFromMeta, barChart, donut, meter, statusHex,
} from './core.js';
import { startI18n, langSwitch, bindLangSwitch, lang as uiLang, t as tr } from './i18n.js';
const MONTHS = { tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'], de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
import { docT, tv, docLangOf, dMoney, dNum, dDate, dDateTime, invoiceText, DOC_LANG_LABEL } from './docs-i18n.js';
import { contractHtml } from './contract-doc.js';
import { signPad, padHtml } from './signpad.js';
import { openScanner } from './scan.js';

const $ = (s, r = document) => r.querySelector(s);
const main = () => $('#main');
// render into #root (never replace <body>: in the demo the page's own <style> lives in body)
const appRoot = () => { let r = document.getElementById('root'); if (!r) { r = document.createElement('div'); r.id = 'root'; document.body.querySelector(':scope > .loading')?.remove(); document.body.prepend(r); } return r; };
const setMain = (html) => { main().innerHTML = html; bindTable(main()); return main(); };
const on = (sel, ev, fn, root = main()) => root.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, guard(fn)));
const head = (title, sub = '', actions = '') => `<div class="page-h"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="actions">${actions}</div></div>`;
const card = (title, body, extra = '') => `<section class="card ${extra}">${title ? `<div class="card-h"><h2>${title}</h2></div>` : ''}<div class="card-b">${body}</div></section>`;
const kpi = (label, value, sub = '', cls = '', href = '') => `<${href ? `a href="${href}"` : 'div'} class="kpi ${cls}"><span class="kpi-l">${label}</span><span class="kpi-v">${value}</span>${sub ? `<span class="kpi-s">${sub}</span>` : ''}</${href ? 'a' : 'div'}>`;
const dl = (pairs) => `<dl class="dl">${pairs.filter(Boolean).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v ?? '—'}</dd>`).join('')}</dl>`;
const tabs = (items, cur) => `<div class="tabs">${items.map(([k, l, n]) => `<button class="tab ${k === cur ? 'on' : ''}" data-tab="${k}">${l}${n != null ? ` <span class="cnt">${n}</span>` : ''}</button>`).join('')}</div>`;
const field = (res, k) => RESOURCES[res].fields.find((f) => f.k === k);
const loading = () => setMain('<div class="loading"><div class="pdl-loader" role="status" aria-label="Loading"></div></div>');

// ---------- navigation ----------
const NAV = [
  ['Genel', [['', 'Özet', 'dashboard', 'grid'], ['map', 'Canlı harita', 'fleet', 'map'], ['notifications', 'Bildirimler', 'dashboard', 'bell']]],
  ['Kiralama', [['rentals', 'Kiralamalar', 'rentals', 'key'], ['bikes', 'Bisikletler', 'fleet', 'bike'], ['customers', 'Müşteriler', 'customers', 'users'], ['riders', 'Sürücüler', 'customers', 'user'], ['portal_requests', 'Sürücü talepleri', 'rentals', 'inbox'], ['referrals', 'Tavsiye programı', 'customers', 'gift'], ['pricing_plans', 'Tarifeler', 'rentals', 'tag']]],
  ['Finans', [['invoices', 'Faturalar', 'finance', 'doc'], ['overdue', 'Geciken ödemeler', 'finance', 'alert'], ['payments', 'Ödemeler', 'finance', 'cash'], ['deposits', 'Depozitolar', 'finance', 'lock'], ['cash', 'Kasa', 'finance', 'safe'], ['sepa', 'SEPA otomatik ödeme', 'finance', 'bank']]],
  ['Servis & Stok', [['service', 'Servis kayıtları', 'service', 'wrench'], ['parts', 'Yedek parçalar', 'stock', 'box'], ['stock_moves', 'Stok hareketleri', 'stock', 'swap'], ['suppliers', 'Tedarikçiler', 'stock', 'truck']]],
  ['Analiz', [['summary', 'Yönetici özeti', 'reports', 'pie'], ['reports', 'Raporlar', 'reports', 'chart']]],
  ['Yönetim', [['users', 'Kullanıcılar', 'admin', 'users'], ['roles', 'Roller & yetkiler', 'admin', 'shield'], ['settings', 'Ayarlar', 'admin', 'cog'], ['audit_log', 'İşlem geçmişi', 'admin', 'list']]],
];
const ICONS = {
  gift: '<rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13M12 8c-2-4-6-4-6-1.5S9 8 12 8c3 0 6-1 6-1.5S14 4 12 8"/>', bank: '<path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>', scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2v2h-2zM18 14h2M14 18v2M18 18h2v2M16 16h2v2"/>', map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>', bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>', bike: '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16 10 8h5l3 8M10 8 8 5H6M12 16l3-8"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>', doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>', lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>', box: '<path d="m3 7 9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>', truck: '<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>', shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  safe: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5v1M12 14.5v1M15.5 12h-1M9.5 12h-1M6 20v1.5M18 20v1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  inbox: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>', pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" class="ic" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;
export const LOGO = `<span class="logo"><img src="img/logo.png" alt="pedalla.bike"></span>`;

function shell() {
  const u = session.user;
  appRoot().innerHTML = `<div class="app">
    <aside class="side" id="side"><div class="side-top">${LOGO}<span class="side-tag">Admin</span></div>
      <nav>${NAV.map(([g, items]) => { const vis = items.filter(([, , p]) => can(p)); return vis.length ? `<div class="nav-g"><div class="nav-gl">${g}</div>${vis.map(([h, l, , ic]) => `<a href="#/${h}" data-nav="${h}">${icon(ic)}<span>${l}</span>${h === 'notifications' ? '<span class="nav-cnt" id="notif-cnt"></span>' : ''}</a>`).join('')}</div>` : ''; }).join('')}</nav>
      <div class="side-foot"><div class="me"><span class="avatar">${esc(u.name.split(' ').map((x) => x[0]).join('').slice(0, 2))}</span><div><b>${esc(u.name)}</b><small>${esc(ROLES[u.role] || u.role)}</small></div></div><button class="btn ghost sm" id="logout">Çıkış</button></div>
    </aside><div class="side-back" id="sideback"></div>
    <div class="body"><header class="top"><button class="icon-btn menu" id="menu" aria-label="Menü">☰</button>
      <form class="gsearch" id="gsearch"><input type="search" placeholder="Bisiklet kodu, müşteri, sözleşme, fatura ara…" id="gq"></form>
      ${can('rentals', 'w') ? '<a class="btn primary sm" href="#/rentals/new">+ Kiralama</a>' : ''}${can('service', 'w') ? '<a class="btn sm" href="#/service/new">+ Servis kabul</a>' : ''}${langSwitch()}
      <button class="icon-btn" id="topscan" title="QR okut" aria-label="QR okut">${icon('qr')}</button>
      <a class="icon-btn bell" href="#/notifications" aria-label="Bildirimler">${icon('bell')}<span class="dot" id="notif-dot" hidden></span></a></header>
      <main id="main"></main></div></div>`;
  $('#logout').onclick = guard(async () => { await POST('logout').catch(() => {}); setToken(null); session.user = null; location.hash = '#/login'; route(); });
  const closeSide = () => { $('#side').classList.remove('open'); $('#sideback').classList.remove('on'); };
  $('#menu').onclick = () => { const o = $('#side').classList.toggle('open'); $('#sideback').classList.toggle('on', o); };
  $('#sideback').onclick = closeSide; $('#side').querySelectorAll('nav a').forEach((a) => a.addEventListener('click', closeSide));
  bindLangSwitch(appRoot());
  $('#topscan').onclick = guard(async () => { const txt = await scanQR(); if (!txt) return; const b = await findBikeByCode(txt); location.hash = can('fleet') ? `#/bikes/${b.id}` : `#/service/new?bike_id=${b.id}`; });
  $('#gsearch').onsubmit = (e) => {
    e.preventDefault(); const v = $('#gq').value.trim();
    const qr = v.match(/#\/b\/([A-Za-z0-9-]+)/); // a hand scanner types the whole sticker URL
    location.hash = qr ? '#/b/' + qr[1] : '#/search/' + encodeURIComponent(v);
  };
  refreshNotifCount();
}
// notifications: a notification counts as unread until the Notifications page has been opened once
const nKey = (x) => `${x.title}|${x.link}`;
const seenStore = () => `pedalla_seen_${session.user?.id || 0}`;
const getSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(seenStore()) || '[]')); } catch { return new Set(); } };
const setSeen = (keys) => { try { localStorage.setItem(seenStore(), JSON.stringify([...keys].slice(-2000))); } catch {} };
let notifTimer = null;
async function refreshNotifCount() {
  const n = await GET('notifications').catch(() => null); if (!n) return;
  const seen = getSeen(); const unread = n.filter((x) => !seen.has(nKey(x))).length;
  const el = $('#notif-cnt'); if (el) el.textContent = unread || '';
  const d = $('#notif-dot'); if (d) d.hidden = !unread;
  const bell = document.querySelector('.top .bell'); if (bell) { bell.classList.toggle('ring', unread > 0); bell.title = unread ? `${unread}` : ''; }
  clearTimeout(notifTimer); notifTimer = setTimeout(() => { if (session.user) refreshNotifCount(); }, 60000);
}

// ---------- login ----------
function loginPage() {
  appRoot().innerHTML = `<div class="login"><form class="login-card" id="lf">${langSwitch()}${LOGO}<h1>Yönetim paneli</h1><p class="sub">Filo, kiralama, servis ve finans tek ekranda.</p>
    <label class="field"><span>E-posta</span><input name="email" type="email" required value="${window.PEDALLA_DEMO ? 'admin@pedalla.bike' : ''}" autocomplete="username"></label>
    <label class="field"><span>Şifre</span><input name="password" type="password" required autocomplete="current-password" value="${window.PEDALLA_DEMO ? 'pedalla123' : ''}"></label>
    <button class="btn primary block">Giriş yap</button>${window.PEDALLA_DEMO ? '<p class="hint">Demo hesapları: admin@, operasyon@, servis@, muhasebe@pedalla.bike · şifre <code>pedalla123</code></p>' : ''}<p class="hint"><a href="portal.html">Sürücü müsünüz? Sürücü girişi →</a></p></form></div>`;
  bindLangSwitch(appRoot());
  $('#lf').onsubmit = guard(async (e) => {
    e.preventDefault();
    const ov = document.createElement('div'); ov.className = 'login-busy'; ov.innerHTML = '<div class="pdl-loader" role="status" aria-label="Yükleniyor"></div>';
    document.body.appendChild(ov);
    try { const r = await POST('login', readForm(e.target)); setToken(r.token); await boot(); } finally { ov.remove(); }
  });
}

// ---------- dashboard ----------
async function dashboardPage() {
  const d = await GET('dashboard'); const k = d.kpi; const fin = can('finance');
  const fleet = BIKE_STATUS.map((s) => ({ l: s, v: d.fleet.find((x) => x.status === s)?.n || 0, c: statusHex[s] })).filter((x) => x.v);
  const months = d.monthly.map((m) => ({ ...m, label: MONTHS[uiLang][Number(m.m.slice(5)) - 1] }));
  setMain(`${head(`Merhaba, ${esc(session.user.name.split(' ')[0])}`, `${date(todayISO())} · ${esc(session.settings.company_name || 'Pedalla')} filo özeti`, `${can('reports') ? '<a class="btn sm" href="#/summary">Yönetici özeti</a>' : ''}${fin && k.overdue_count ? `<a class="btn sm danger ghost" href="#/overdue">Geciken ödemeler (${k.overdue_count})</a>` : ''}`)}
  <div class="kpis">
    ${kpi('Kiradaki bisiklet', `${k.bikes_rented}<small>/${k.bikes_total}</small>`, meter(k.utilization) + `Doluluk %${k.utilization}`, 'hero', '#/bikes?status=kirada')}
    ${kpi('Müsait', k.bikes_available, `${k.reservations} rezervasyon`, '', '#/bikes?status=müsait')}
    ${kpi('Serviste / arızalı', k.bikes_service, `${k.open_service} açık servis kaydı`, k.bikes_service ? 'warn' : '', '#/service')}
    ${kpi('Geciken iade', k.late_returns, 'dönüş tarihi geçmiş', k.late_returns ? 'danger' : '', '#/rentals?tab=late')}
    ${fin ? kpi('Bu ay faturalanan', money(k.revenue_month), `Tahsil edilen ${money(k.collected_month)}`, '', '#/invoices') : ''}
    ${fin ? kpi('Aylık tekrarlayan gelir', money(k.mrr), 'aktif sözleşmelerden (net)', '', '#/rentals') : ''}
    ${fin ? kpi('Geciken ödemeler', money(k.overdue_amount), `${k.overdue_count} fatura · toplam alacak ${money(k.receivables)}`, k.overdue_count ? 'danger' : '', '#/invoices?tab=overdue') : ''}
    ${fin ? kpi('Tutulan depozito', money(k.deposits_held), 'iade yükümlülüğü', '', '#/deposits') : ''}
    ${kpi('Kritik stok', k.low_stock, fin ? `Stok değeri ${money(k.stock_value)}` : 'parça min. seviyede', k.low_stock ? 'warn' : '', '#/parts?low=1')}
  </div>
  <div class="grid g-2-1">
    ${fin ? card('Faturalanan / tahsil edilen (son 12 ay, net)', barChart(months, [{ k: 'invoiced', l: 'Faturalanan', c: 'var(--brand)' }, { k: 'collected', l: 'Tahsil edilen', c: 'var(--slate)' }])) : card('Bisiklet tipleri', table(d.by_type, [{ k: 'type', l: 'Tip' }, { k: 'n', l: 'Adet', cls: 'num' }, { k: 'rented', l: 'Kirada', cls: 'num' }]))}
    ${card('Filo durumu', donut(fleet, { center: `<b>${k.bikes_total}</b><small>bisiklet</small>` }))}
  </div>
  <div class="grid g-2">
    ${card('Geciken iadeler', table(d.late_returns, [{ k: 'code', l: 'Bisiklet' }, { k: 'customer', l: 'Müşteri' }, { l: 'Dönüş', f: (r) => `<b class="t-danger">${date(r.end_date)}</b>` }], { link: (r) => `#/rentals/${r.id}`, empty: 'Geciken iade yok 🎉' }))}
    ${fin ? card('Geciken ödemeler', table(d.overdue, [{ k: 'invoice_no', l: 'Fatura' }, { k: 'customer', l: 'Müşteri' }, { l: 'Gecikme', f: (r) => `<b class="t-danger">${r.days} gün</b>` }, { l: 'Kalan', f: (r) => money(r.balance), cls: 'num' }, ...(can('finance', 'w') ? [{ l: '', f: (r) => waBtn(r, true) }] : [])], { link: (r) => `#/invoices/${r.id}`, empty: 'Geciken ödeme yok' })) : ''}
    ${card('Yaklaşan iadeler (14 gün)', table(d.upcoming_returns, [{ k: 'code', l: 'Bisiklet' }, { k: 'customer', l: 'Müşteri' }, { l: 'Dönüş', f: (r) => date(r.end_date) }], { link: (r) => `#/rentals/${r.id}`, empty: 'Yaklaşan iade yok' }))}
    ${card('Açık servis kayıtları', table(d.open_service, [{ k: 'order_no', l: 'No' }, { k: 'code', l: 'Bisiklet' }, { l: 'Durum', f: (r) => badge(r.status) }, { l: 'Tahmini', f: (r) => (r.estimated_ready < todayISO() ? `<b class="t-danger">${date(r.estimated_ready)}</b>` : date(r.estimated_ready)) }], { link: (r) => `#/service/${r.id}`, empty: 'Açık servis yok' }))}
    ${card(`Kritik stok${d.low_stock.length ? '<a class="btn sm right" href="#/parts/order">Sipariş listesi oluştur</a>' : ''}`, table(d.low_stock, [{ k: 'sku', l: 'Kod' }, { k: 'name', l: 'Parça' }, { l: 'Stok', f: (r) => `<b class="${r.stock <= 0 ? 't-danger' : 't-warn'}">${num(r.stock)} ${esc(r.unit)}</b> / min ${num(r.min_stock)}`, cls: 'num' }], { link: (r) => `#/parts/${r.id}`, empty: 'Tüm stoklar yeterli' }))}
    ${card('Son işlemler', `<ul class="feed">${d.recent.map((a) => `<li><span class="feed-t">${ago(a.ts)}</span><b>${esc(a.user || 'Sistem')}</b> · ${esc(a.action)} <span class="muted">${esc(a.details)}</span></li>`).join('')}</ul>`)}
  </div>`);
  bindWa(main());
}

// ---------- map ----------
let mapTimer;
async function mapPage(q) {
  clearInterval(mapTimer);
  setMain(`${head('Canlı harita', 'GPS takip cihazlarından gelen son konumlar. Kartlara tıklayarak bisiklet detayına gidin.', `${can('fleet', 'w') ? '<button class="btn sm" id="sim">Konumları güncelle (simülasyon)</button>' : ''}<button class="btn sm" id="refresh">Yenile</button>`)}
    <div class="map-layout"><div class="map-side card"><div class="card-b"><input type="search" id="mq" placeholder="Kod, müşteri, sürücü…"><div class="chips" id="mchips">${['tümü', ...BIKE_STATUS].map((s) => `<button class="chip ${s === (q.status || 'tümü') ? 'on' : ''}" data-s="${s}">${s === 'tümü' ? 'Tümü' : `<i style="background:${statusHex[s]}"></i>${s}`}</button>`).join('')}</div><div class="rchip-row"><button class="chip on" id="rchip" hidden><i class="rdot"></i>Sürücü konumları <b></b></button></div><div id="mlist" class="mlist"></div></div></div>
    <div id="map" class="map card"></div></div>`);
  if (!window.L) { $('#map').innerHTML = '<div class="empty">Harita kütüphanesi yüklenemedi (internet bağlantısı gerekli).</div>'; }
  const map = window.L ? L.map('map', { zoomControl: true }).setView([Number(session.settings.map_center_lat) || 53.56, Number(session.settings.map_center_lng) || 9.95], 12) : null;
  if (map) L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  map?.on('popupopen', (e) => bindQuick(e.popup.getElement(), (id) => bikes.find((x) => x.id == id), async () => { map.closePopup(); await load(); }));
  let layer = map ? L.layerGroup().addTo(map) : null; let bikes = []; let filt = q.status || 'tümü'; const markers = {};
  let riderPins = []; let showRiders = true;
  const draw = () => {
    const term = ($('#mq')?.value || '').toLowerCase();
    const vis = bikes.filter((b) => (filt === 'tümü' || b.status === filt) && (!term || [b.code, b.customer_label, b.rider_name, b.model].join(' ').toLowerCase().includes(term)));
    $('#mlist').innerHTML = vis.map((b) => `<button class="mitem" data-id="${b.id}"><i style="background:${statusHex[b.status]}"></i><div><b>${esc(b.code)}</b> <small>${esc(b.model)}</small><br><small>${b.status === 'kirada' ? `${esc(b.customer_label || '')}${b.rider_name ? ' · ' + esc(b.rider_name) : ''}` : esc(b.location_name || b.status)}</small></div><small class="muted">${b.battery_level != null ? '%' + b.battery_level : ''}<br>${ago(b.last_seen)}</small></button>`).join('') || '<div class="empty">Sonuç yok</div>';
    if (!map) return;
    layer.clearLayers();
    for (const b of vis) {
      if (b.lat == null) continue;
      const m = L.marker([b.lat, b.lng], { icon: L.divIcon({ className: '', html: `<div class="pin" style="--c:${statusHex[b.status]}"><span>${esc(b.code.replace('PED-', ''))}</span></div>`, iconSize: [34, 42], iconAnchor: [17, 40] }) });
      m.bindPopup(`<div class="pop"><b>${esc(b.code)}</b> ${badge(b.status)}<br>${esc(b.brand)} ${esc(b.model)}<br>${b.status === 'kirada' ? `Kiracı: <b>${esc(b.customer_label || '—')}</b><br>Sürücü: ${esc(b.rider_name || '—')} ${b.rider_phone ? `<a href="tel:${esc(b.rider_phone)}">${esc(b.rider_phone)}</a>` : ''}<br>Dönüş: ${date(b.end_date)}<br>` : ''}Batarya: ${b.battery_level != null ? '%' + b.battery_level : '—'} · Son sinyal: ${ago(b.last_seen)}${b.lock_requested ? '<br><b class="t-danger">🔒 Durduruldu (kilit komutu gönderildi)</b>' : ''}<div class="pop-acts">${quickBtns(b)}<a class="btn sm" href="#/bikes/${b.id}">Detay →</a></div></div>`);
      m.addTo(layer); markers[b.id] = m;
    }
    if (showRiders) for (const r of riderPins) {
      const m = L.marker([r.last_lat, r.last_lng], { icon: L.divIcon({ className: '', html: `<div class="rpin" title="${esc(r.name)}">${esc(r.name.split(' ').map((x) => x[0]).join('').slice(0, 2))}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) });
      m.bindPopup(`<div class="pop"><b>${esc(r.name)}</b> <span class="badge b-info">sürücü</span><br>${esc(r.customer_label || '')}${r.current_bike ? ` · ${esc(r.current_bike)}` : ''}<br>${r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a><br>` : ''}Telefon konumu: ${ago(r.last_loc_at)}${r.last_loc_acc ? ` · ±${num(r.last_loc_acc)} m` : ''}<div class="pop-acts"><a class="btn sm" href="#/riders/${r.id}">Sürücü →</a></div></div>`);
      m.addTo(layer);
    }
    $('#mlist').querySelectorAll('.mitem').forEach((el) => el.onclick = () => { const b = bikes.find((x) => x.id == el.dataset.id); if (map && b?.lat) { map.setView([b.lat, b.lng], 15); markers[b.id]?.openPopup(); } else location.hash = `#/bikes/${b.id}`; });
  };
  const load = async () => {
    const [list, rentals] = await Promise.all([GET('bikes'), GET('rentals', { status: 'aktif' })]);
    const riders = can('customers') ? await GET('riders').catch(() => []) : [];
    const byBike = Object.fromEntries(rentals.map((r) => [r.bike_id, r]));
    bikes = list.map((b) => { const r = byBike[b.id]; const rd = riders.find((x) => x.id === r?.rider_id); return { ...b, customer_label: r?.customer_label, rider_name: r?.rider_name, rider_phone: rd?.phone, end_date: r?.end_date }; });
    riderPins = riders.filter((r) => r.last_lat != null && r.last_loc_at && r.last_loc_at >= addDays(todayISO(), -2));
    const rc = $('#rchip'); if (rc) { rc.hidden = !riderPins.length; rc.querySelector('b').textContent = riderPins.length; }
    draw();
  };
  await load();
  $('#mq').oninput = draw;
  $('#mchips').querySelectorAll('.chip').forEach((c) => c.onclick = () => { filt = c.dataset.s; $('#mchips .on')?.classList.remove('on'); c.classList.add('on'); draw(); });
  $('#refresh').onclick = guard(load);
  $('#rchip').onclick = () => { showRiders = !showRiders; $('#rchip').classList.toggle('on', showRiders); draw(); };
  $('#sim')?.addEventListener('click', guard(async () => { const r = await POST('simulate'); toast(`${r.moved} bisikletin konumu güncellendi`); await load(); }));
  mapTimer = setInterval(() => { if (!document.getElementById('map')) return clearInterval(mapTimer); load().catch(() => {}); }, 30000);
  setTimeout(() => map?.invalidateSize(), 50);
}

// ---------- generic list ----------
const LISTS = {
  bikes: { link: (r) => `#/bikes/${r.id}`, chips: ['status', BIKE_STATUS], sub: 'Filodaki tüm bisikletler, durumları ve bakım tarihleri.', actions: (q) => `<a class="btn sm" href="#/bikes/qr${q.status ? `?status=${encodeURIComponent(q.status)}` : ''}">QR etiketleri</a>` },
  customers: { link: (r) => `#/customers/${r.id}`, sub: 'Kurumsal (kurye firmaları) ve bireysel kiracılar.' },
  riders: { chips: ['pay_state', ['gecikmiş', 'yaklaşan', 'düzenli']], chipPerm: 'finance', fmt: { pay_state: (r) => (r.pay_state ? `<span class="pstate ps-${{ 'gecikmiş': 'late', 'yaklaşan': 'soon', 'düzenli': 'ok' }[r.pay_state]}">${{ 'gecikmiş': 'Gecikmiş', 'yaklaşan': 'Yaklaşan ödeme', 'düzenli': 'Düzenli ödüyor' }[r.pay_state]}${r.pay_state === 'gecikmiş' ? ` · ${money(r.overdue)}` : r.pay_state === 'yaklaşan' ? ` · ${money(r.due_soon)}` : ''}</span>` : '<span class="muted">—</span>'), balance: (r) => (r.balance == null ? '—' : `<b class="${r.balance < 0 ? 't-danger' : r.balance > 0 ? 't-ok' : ''}">${r.balance > 0 ? '+' : ''}${money(r.balance)}</b>`) }, link: (r) => `#/riders/${r.id}`, sub: 'Bisikleti fiilen kullanan kişiler. Firmaya bağlı kuryeleri firmayla, bireysel kiracıları "Bağlı firma" boş bırakarak kaydedin; sistem onları doğrudan müşteri yapar.' },
  pricing_plans: { sub: 'Bisiklet tipine göre günlük / haftalık / aylık tarifeler ve depozito tutarları.' },
  payments: { sub: 'Faturalara karşı alınan tüm ödemeler.', create: 'payment' },
  deposits: { sub: 'Depozito tahsilatı, iadesi ve kesintileri.', chips: ['type', ['tahsil', 'iade', 'kesinti']] },
  stock_moves: { sub: 'Stok giriş, çıkış ve sayım düzeltmeleri. Servise kullanılan parçalar otomatik düşer.', chips: ['type', ['giriş', 'çıkış', 'sayım düzeltme']] },
  suppliers: { sub: 'Yedek parça tedarikçileri.' },
  users: { sub: 'Panele erişen çalışanlar. Yetkiler "Roller & yetkiler" ekranından yönetilir.' },
  audit_log: { sub: 'Sistemde yapılan tüm işlemler.' },
  portal_requests: { link: (r) => `#/portal_requests/${r.id}`, sub: 'Sürücülerin sürücü ekranından gönderdiği servis, arıza, iade ve uzatma talepleri.', chips: ['status', ['yeni', 'onaylandı', 'tamamlandı', 'reddedildi', 'iptal']] },
};
async function listPage(res, q = {}) {
  const meta = RESOURCES[res]; const cfg = LISTS[res] || {};
  const filter = { ...q }; delete filter.tab;
  const rows = await GET(res, filter);
  const w = can(meta.perm, 'w') && !meta.readonly;
  const canDel = w && !meta.noBulk;
  const cols = colsFromMeta(res).filter((c) => !(['balance', 'pay_state'].includes(c.k) && !can('finance'))).map((c) => (cfg.fmt?.[c.k] ? { ...c, f: cfg.fmt[c.k] } : c));
  const chipHtml = cfg.chips && (!cfg.chipPerm || can(cfg.chipPerm)) ? `<div class="chips">${['', ...cfg.chips[1]].map((v) => `<a class="chip ${(q[cfg.chips[0]] || '') === v ? 'on' : ''}" href="#/${res}${v ? `?${cfg.chips[0]}=${encodeURIComponent(v)}` : ''}">${v || 'Tümü'}</a>`).join('')}</div>` : '';
  setMain(`${head(meta.label, cfg.sub, `<button class="btn sm" id="csv">CSV</button>${cfg.actions ? cfg.actions(q) : ''}${w && !meta.noCreate ? `<button class="btn primary sm" id="new">+ ${meta.single}</button>` : ''}`)}
    <div class="toolbar"><input type="search" id="q" placeholder="Ara…" value="${esc(q.q || '')}">${chipHtml}<span class="muted">${rows.length} kayıt</span></div>
    ${canDel ? bulkBar() : ''}
    ${card('', table(rows, cols, { link: cfg.link || (w && !meta.noEdit ? (r) => `#/${res}/${r.id}/edit` : null), select: canDel }), 'flush')}`);
  $('#csv').onclick = () => csv(rows, cols, res);
  if (canDel) bindBulkDelete(res, rows);
  const reload = () => route();
  $('#new')?.addEventListener('click', () => (cfg.create === 'payment' ? paymentForm({}, reload) : editForm(res, null, { onSaved: reload })));
  let t; $('#q').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { const p = new URLSearchParams({ ...q, q: e.target.value }); location.hash = `#/${res}?${p}`; }, 350); };
}
// bulk delete: tick rows in the last column, then "Seçilenleri sil". Records with linked data are skipped with the reason.
const bulkBar = () => `<div class="bulk-bar" id="bulk" hidden><span id="bulkn"></span><button class="btn sm ghost" id="bulkclr">Seçimi kaldır</button><button class="btn sm danger" id="bulkdel">Seçilenleri sil</button></div>`;
function bindBulkDelete(res, rows, path = res) {
  let ids = [];
  const sel = bindSelect(main(), (x) => { ids = x; $('#bulk').hidden = !ids.length; $('#bulkn').textContent = `${ids.length} kayıt seçildi`; });
  $('#bulkclr').onclick = () => sel.clear();
  $('#bulkdel').onclick = guard(async () => {
    if (!ids.length || !(await confirmBox(`${ids.length} kayıt silinsin mi? Bu işlem geri alınamaz.`))) return;
    let okN = 0; const fails = [];
    for (const id of ids) {
      try { await DEL(`${path}/${id}`); okN++; } catch (e) { const r = rows.find((x) => x.id === id); fails.push(`${RESOURCES[res].title ? RESOURCES[res].title(r || {}) : '#' + id}: ${e.message}`); }
    }
    clearLookups(); await route();
    if (fails.length) modal(`${okN} kayıt silindi, ${fails.length} kayıt silinemedi`, `<ul class="results">${fails.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`);
    else toast(`${okN} kayıt silindi`, 'ok');
  });
}
async function editRoute(res, id) {
  const row = await GET(`${res}/${id}`);
  await listPage(res, {});
  editForm(res, row, { onSaved: () => { location.hash = `#/${res}`; } });
}

// ---------- bikes ----------
async function bikePage(id) {
  const b = await GET(`detail/bikes/${id}`); const w = can('fleet', 'w');
  const cur = b.current;
  setMain(`${head(`${esc(b.code)} <span class="h-badge">${badge(b.status)}</span>`, `${esc(b.type || '')} · ${esc(b.brand || '')} ${esc(b.model || '')} · ${esc(b.color || '')}`,
    `${w ? '<button class="btn sm" id="edit">Düzenle</button><button class="btn sm" id="stat">Durum değiştir</button>' : ''}<a class="btn sm" href="#/bikes/${b.id}/qr">QR etiketi</a>${w && cur?.rider_name ? '<button class="btn sm" id="askphoto">📷 Fotoğraf iste</button>' : ''}${quickBtns(b, false)}${can('service', 'w') ? `<a class="btn sm" href="#/service/new?bike_id=${b.id}">Servise al</a>` : ''}${can('rentals', 'w') && b.status === 'müsait' ? `<a class="btn primary sm" href="#/rentals/new?bike_id=${b.id}">Kirala</a>` : ''}`)}
  ${b.status === 'kayıp/çalıntı' ? `<div class="alert danger"><b>Çalıntı / kayıp bildirildi</b>${b.stolen_at ? ` · ${dt(b.stolen_at)}` : ''}${b.lat != null ? ` · Son konum: <a href="https://www.google.com/maps?q=${b.lat},${b.lng}" target="_blank" rel="noopener">${b.lat}, ${b.lng}</a> · ${ago(b.last_seen)}` : ''}</div>` : b.lock_requested ? '<div class="alert warn">🔒 Bisiklet durduruldu: GPS cihazına kilit komutu gönderildi. Tekrar kullanıma açmak için "Tekrar aktif et"e basın.</div>' : ''}
  ${b.economics ? econCard(b) : ''}
  <div class="grid g-1-2">
    <div class="stack">
      ${card('Şu anki kullanım', cur ? dl([['Sözleşme', `<a href="#/rentals/${cur.id}">${esc(cur.contract_no)}</a> ${badge(cur.status)}`], ['Kiracı', `<a href="#/customers/${cur.customer_id}">${esc(cur.customer_label)}</a> ${cur.customer_phone ? `· <a href="tel:${esc(cur.customer_phone)}">${esc(cur.customer_phone)}</a>` : ''}`], ['Kullanıcı (sürücü)', cur.rider_name ? `${esc(cur.rider_name)} ${cur.rider_phone ? `· <a href="tel:${esc(cur.rider_phone)}">${esc(cur.rider_phone)}</a>` : ''}` : '—'], ['Dönem', `${date(cur.start_date)} – ${cur.end_date < todayISO() && cur.status === 'aktif' ? `<b class="t-danger">${date(cur.end_date)} (gecikmede)</b>` : date(cur.end_date)}`], ['Ücret', `${money(cur.rate)} / ${esc(cur.period)}`], ['Depozito', `${money(cur.deposit_amount)} ${badge(cur.deposit_status)}`]]) : `<div class="empty">Bisiklet şu an kirada değil.</div>`)}
      ${card('Bisiklet bilgileri', dl([['Şasi no', esc(b.frame_no)], ['Batarya no', esc(b.battery_no)], ['GPS cihazı', esc(b.gps_tracker_id)], ['Model yılı', esc(b.year)], ['Alış', `${date(b.purchase_date)} · ${money(b.purchase_price)}`], ['QR kimliği', `<code class="uid">${esc(b.uid || '—')}</code>`], ['Kilometre', `${num(b.odometer_km)} km`], ['Batarya', b.battery_level != null ? `${meter(b.battery_level, b.battery_level < 20 ? 'low' : '')} %${b.battery_level}` : '—'], ['Sigorta', `${esc(b.insurance_no || '—')} · ${b.insurance_until && b.insurance_until < addDays(todayISO(), 30) ? `<b class="t-warn">${date(b.insurance_until)}</b>` : date(b.insurance_until)}`], ['Son / sonraki bakım', `${date(b.last_service_date)} → ${b.next_service_date && b.next_service_date < todayISO() ? `<b class="t-danger">${date(b.next_service_date)}</b>` : date(b.next_service_date)}`], ['Toplam ciro', can('finance') ? money(b.revenue) : '—'], ['Notlar', esc(b.notes)]]))}
    </div>
    ${card(`Konum · ${esc(b.location_name || '')} <small class="muted">son sinyal ${ago(b.last_seen)}</small>`, '<div id="bmap" class="map sm"></div>')}
  </div>
  ${photoCard('bike_id', b.id, w, `Fotoğraf geçmişi <span class="cnt">${b.photo_count}</span>`, w ? '<button class="btn sm" id="addphoto">+ Fotoğraf ekle</button>' : '')}
  ${card('Kiralama geçmişi', table(b.rentals, [{ k: 'contract_no', l: 'Sözleşme' }, { k: 'customer_label', l: 'Kiracı' }, { k: 'rider_name', l: 'Sürücü', f: (r) => esc(r.rider_name || '—') }, { l: 'Başlangıç', f: (r) => date(r.start_date) }, { l: 'Dönüş', f: (r) => date(r.returned_at || r.end_date) }, { l: 'Ücret', f: (r) => `${money(r.rate)}/${r.period}`, cls: 'num' }, { l: 'Durum', f: (r) => badge(r.status) }], { link: (r) => `#/rentals/${r.id}` }))}
  ${card(`Giderler <small class="muted">kaza, dış onarım, sigorta… (kazançtan düşülür)</small>${w ? '<button class="btn sm right" id="addcost">+ Gider ekle</button>' : ''}`, table(b.costs, [{ l: 'Tarih', f: (r) => date(r.date) }, { l: 'Gider türü', f: (r) => esc(r.category) }, { k: 'description', l: 'Açıklama' }, { l: 'Tutar', f: (r) => money(r.amount), cls: 'num' }, { l: 'Kullanıcı', f: (r) => esc(r.user_name || '—') }, w ? { l: '', f: (r) => `<button class="btn ghost sm" data-delcost="${r.id}" title="Sil">✕</button>` } : null].filter(Boolean), { empty: 'Kayıtlı gider yok' }))}
  ${card('Servis geçmişi', table(b.services, [{ k: 'order_no', l: 'No' }, { l: 'Kabul', f: (r) => dt(r.received_at) }, { l: 'Tip', f: (r) => esc(r.type) }, { k: 'complaint', l: 'Şikayet', f: (r) => esc((r.complaint || '').slice(0, 70)) }, { l: 'Teknisyen', f: (r) => esc(r.technician_name || '—') }, { l: 'Parça', f: (r) => money(r.parts_total), cls: 'num' }, { l: 'Durum', f: (r) => badge(r.status) }], { link: (r) => `#/service/${r.id}` }))}`);
  if (window.L && b.lat != null) {
    const m = L.map('bmap').setView([b.lat, b.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    if (b.track.length > 1) L.polyline(b.track.map((p) => [p.lat, p.lng]).reverse(), { color: getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#0f6b48', weight: 3, opacity: 0.7 }).addTo(m);
    L.marker([b.lat, b.lng], { icon: L.divIcon({ className: '', html: `<div class="pin" style="--c:${statusHex[b.status]}"><span>${esc(b.code.replace('PED-', ''))}</span></div>`, iconSize: [34, 42], iconAnchor: [17, 40] }) }).addTo(m);
    setTimeout(() => m.invalidateSize(), 50);
  } else $('#bmap').innerHTML = '<div class="empty">Konum bilgisi yok</div>';
  $('#edit')?.addEventListener('click', () => editForm('bikes', b, { onSaved: (x) => (x ? route() : (location.hash = '#/bikes')) }));
  bindQuick(main(), () => b, route);
  loadPhotos(main());
  $('#askphoto')?.addEventListener('click', () => askPhoto(b, cur));
  $('#addphoto')?.addEventListener('click', () => addStaffPhoto(b));
  $('#addcost')?.addEventListener('click', () => editForm('bike_costs', null, { defaults: { bike_id: b.id, date: todayISO() }, onSaved: route }));
  main().querySelectorAll('[data-delcost]').forEach((x) => x.onclick = guard(async (e) => { e.stopPropagation(); if (await confirmBox('Gider kaydı silinsin mi?')) { await DEL(`bike_costs/${x.dataset.delcost}`); route(); } }));
  $('#stat')?.addEventListener('click', () => {
    const body = modal('Durum değiştir', `<form class="grid-form">${inputHtml(field('bikes', 'status'), b.status)}${inputHtml({ k: 'notes', l: 'Not', t: 'textarea' }, b.notes)}<div class="form-actions span2"><button class="btn primary">Kaydet</button></div></form>`);
    body.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await PUT(`bikes/${b.id}`, readForm(e.target)); closeModal(); toast('Durum güncellendi'); route(); });
  });
}

// ---------- bike photo history (timeline) ----------
// Photos come from the rider screen (pick-up selfie + bike photos, photos on request) or from staff.
const PHOTO_STAGE = { 'teslim alma': 'Teslim alma kontrolü', talep: 'İstenen fotoğraf', 'sürücü': 'Sürücü gönderdi', personel: 'Personel ekledi', 'arıza': 'Arıza bildirimi', 'teslim tutanağı': 'Teslim tutanağı', 'iade tutanağı': 'İade tutanağı' };
const PHOTO_KIND = { selfie: 'Selfie', bisiklet: 'Bisiklet' };
const photoCard = (col, id, w, title, actions = '') => card(`${title}${actions ? `<span class="card-act">${actions}</span>` : ''}`, `<div class="ptl" data-col="${col}" data-id="${id}" data-w="${w ? 1 : ''}"><div class="muted">Yükleniyor…</div></div>`);
// shrink in the browser: full photo ≈ 1600 px, thumbnail ≈ 320 px (both JPEG) → about 200–400 KB per photo in the database
async function photoData(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Fotoğraf okunamadı (JPEG/PNG seçin).')); i.src = URL.createObjectURL(file); });
  const shot = (max, q) => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); };
  const out = { data: shot(1600, 0.8), thumb: shot(320, 0.7) }; URL.revokeObjectURL(img.src); return out;
}
function photoEvents(photos) {
  // consecutive photos of the same moment (same day, stage, person, request) form one event on the line
  const ev = [];
  for (const p of photos) {
    const key = [String(p.created_at).slice(0, 10), p.stage, p.rider_id || 'u' + (p.user_name || ''), p.request_id || '', p.rental_id || ''].join('|');
    const last = ev[ev.length - 1];
    if (last && last.key === key && Math.abs(new Date(last.items[last.items.length - 1].created_at.replace(' ', 'T')) - new Date(p.created_at.replace(' ', 'T'))) < 3 * 3600e3) last.items.push(p);
    else ev.push({ key, items: [p] });
  }
  return ev;
}
function photoTimelineHtml(box, h, append) {
  const col = box.dataset.col; const w = !!box.dataset.w;
  const reqs = append ? '' : h.requests.filter((q) => q.status === 'bekliyor').map((q) => {
    const wa = waPhone(q.rider_phone); const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}portal.html`;
    const msg = `Pedalla: ${q.bike_code} – ${q.kind === 'selfie' ? 'bitte ein Selfie' : q.kind === 'bisiklet' ? 'bitte ein Foto vom Fahrrad' : 'bitte ein Selfie und ein Foto vom Fahrrad'} im Fahrerbereich senden${q.note ? ` (${q.note})` : ''}: ${url}`;
    return `<div class="ptl-req"><span class="ptl-req-ic">⏳</span><div class="grow"><b>Fotoğraf bekleniyor · ${esc(PHOTO_KIND[q.kind] || q.kind)}</b><small>${esc(q.rider_name || '—')} · ${col !== 'bike_id' ? esc(q.bike_code) + ' · ' : ''}istendi ${ago(q.created_at)}${q.user_name ? ' · ' + esc(q.user_name) : ''}${q.note ? ` · “${esc(q.note)}”` : ''}</small></div>
      ${wa ? `<a class="btn xs wa" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}">WhatsApp ile hatırlat</a>` : ''}${w ? `<button class="btn xs ghost" data-preqx="${q.id}">İptal</button>` : ''}</div>`;
  }).join('');
  if (!append && !h.photos.length) return `${reqs}<p class="muted">Henüz fotoğraf yok. ${col === 'bike_id' ? 'Sürücü teslim alırken selfie ve bisiklet fotoğrafı çektiğinde ya da "Fotoğraf iste" ile istediğinizde burada tarih sırasıyla görünür.' : ''}</p>`;
  let lastDay = append ? box.dataset.lastDay : '';
  const rows = photoEvents(h.photos).map((e) => {
    const p = e.items[0]; const day = String(p.created_at).slice(0, 10);
    const dayHead = day !== lastDay ? `<li class="ptl-day"><span>${date(day)}</span></li>` : ''; lastDay = day;
    const who = p.rider_name ? `<a href="#/riders/${p.rider_id}">${esc(p.rider_name)}</a>` : esc(p.user_name || '—');
    const geo = p.lat != null ? ` · <a href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank" rel="noopener">📍 konum</a>` : '';
    return `${dayHead}<li class="ptl-ev s-${(p.stage || '').replace(/\s+/g, '-')}"><div class="ptl-dot"></div><div class="ptl-body">
      <div class="ptl-h"><b>${esc(PHOTO_STAGE[p.stage] || p.stage || 'Fotoğraf')}</b><small>${String(p.created_at).slice(11, 16)} · ${who}${col !== 'bike_id' ? ` · <a href="#/bikes/${p.bike_id}">${esc(p.bike_code)}</a>` : ''}${p.contract_no && col !== 'rental_id' ? ` · <a href="#/rentals/${p.rental_id}">${esc(p.contract_no)}</a>` : ''}${geo}</small></div>
      ${p.request_note ? `<p class="ptl-note">İstek: “${esc(p.request_note)}”</p>` : ''}${e.items.filter((x) => x.note).map((x) => `<p class="ptl-note">${esc(x.note)}</p>`).join('')}
      <div class="ptl-imgs">${e.items.map((x) => `<button type="button" class="ptl-img ${x.kind === 'selfie' ? 'selfie' : ''}" data-ph="${x.id}" title="${esc(PHOTO_KIND[x.kind] || '')}">${x.thumb ? `<img src="data:image/jpeg;base64,${x.thumb}" alt="" loading="lazy">` : '<span>JPG</span>'}<i>${esc(PHOTO_KIND[x.kind] || '')}</i></button>`).join('')}</div></div></li>`;
  }).join('');
  box.dataset.lastDay = lastDay;
  return append ? rows : `${reqs}<ol class="ptl-line">${rows}</ol>${h.more ? '<button class="btn sm ghost ptl-more">Daha eski fotoğraflar</button>' : ''}`;
}
async function loadPhotos(root, box = null, before = 0) {
  for (const el of box ? [box] : root.querySelectorAll('.ptl')) {
    const h = await GET('photos', { [el.dataset.col]: el.dataset.id, ...(before ? { before } : {}) });
    if (before) { el.querySelector('.ptl-more')?.remove(); el.querySelector('.ptl-line').insertAdjacentHTML('beforeend', photoTimelineHtml(el, h, true)); if (h.more) el.insertAdjacentHTML('beforeend', '<button class="btn sm ghost ptl-more">Daha eski fotoğraflar</button>'); }
    else el.innerHTML = photoTimelineHtml(el, h, false);
    el.dataset.oldest = h.photos.length ? h.photos[h.photos.length - 1].id : el.dataset.oldest;
    el.querySelectorAll('[data-ph]').forEach((b) => b.onclick = guard(() => openPhoto(b.dataset.ph, !!el.dataset.w, () => loadPhotos(root, el))));
    el.querySelectorAll('[data-preqx]').forEach((b) => b.onclick = guard(async () => { if (await confirmBox('Fotoğraf talebi iptal edilsin mi?')) { await POST(`photo_requests/${b.dataset.preqx}/cancel`); loadPhotos(root, el); } }));
    const more = el.querySelector('.ptl-more'); if (more) more.onclick = guard(() => loadPhotos(root, el, Number(el.dataset.oldest)));
  }
}
async function openPhoto(id, w, after) {
  const body = modal('Fotoğraf', '<div class="loading"><div class="pdl-loader"></div></div>', { wide: true });
  const p = await GET(`photos/${id}`);
  body.innerHTML = `<figure class="ph-full"><img src="data:${p.mime || 'image/jpeg'};base64,${p.data}" alt=""><figcaption class="muted">${dt(p.created_at)} · ${esc(PHOTO_KIND[p.kind] || p.kind)} · ${esc(PHOTO_STAGE[p.stage] || p.stage || '')}${p.note ? ` · ${esc(p.note)}` : ''}</figcaption></figure>
    <div class="form-actions"><a class="btn sm" download="pedalla-foto-${p.id}.jpg" href="data:image/jpeg;base64,${p.data}">İndir</a>${w ? '<button class="btn sm danger" id="phdel">Sil</button>' : ''}</div>`;
  body.querySelector('#phdel')?.addEventListener('click', guard(async () => { if (await confirmBox('Fotoğraf silinsin mi? Bisikletin geçmişinden kalkar.')) { await DEL(`photos/${id}`); closeModal(); toast('Fotoğraf silindi'); after?.(); } }));
}
function askPhoto(b, cur) {
  const body = modal(`Fotoğraf iste · ${b.code}`, `<form class="grid-form"><p class="span2">${esc(cur.rider_name)} sürücü ekranını açtığında en üstte "Fotoğraf çek" görevi görür; çektiği fotoğraf bu bisikletin fotoğraf geçmişine eklenir. Sürücü ekranı anlık bildirim gönderemez; acilse talepten sonra WhatsApp ile de hatırlatabilirsiniz.</p>
    <label class="field"><span>Ne istensin?</span><select name="kind"><option value="bisiklet">Bisiklet fotoğrafı</option><option value="selfie + bisiklet">Selfie + bisiklet fotoğrafı</option><option value="selfie">Sadece selfie</option></select></label>
    <label class="field span2"><span>Not (sürücü görür)</span><input name="note" maxlength="300" placeholder="Örn. arka tekerleği ve kilidi yakından çek"></label>
    <div class="form-actions span2"><button class="btn primary">Talep gönder</button></div></form>`);
  body.querySelector('form').onsubmit = guard(async (e) => {
    e.preventDefault(); const x = await POST('photo_requests', { bike_id: b.id, ...readForm(e.target) }); closeModal();
    toast(x.portal ? `${x.rider} için fotoğraf talebi gönderildi` : `Talep kaydedildi; ${x.rider} için sürücü ekranı girişi açık değil`, x.portal ? 'ok' : 'info'); route();
  });
}
function addStaffPhoto(b) {
  const body = modal(`Fotoğraf ekle · ${b.code}`, `<form class="grid-form"><label class="field span2"><span>Fotoğraflar</span><input type="file" name="f" accept="image/*" capture="environment" multiple required></label>
    <label class="field span2"><span>Not</span><input name="note" maxlength="300" placeholder="Örn. iade kontrolü, ön çamurlukta çizik"></label>
    <div class="form-actions span2"><button class="btn primary">Yükle</button></div></form>`);
  body.querySelector('form').onsubmit = guard(async (e) => {
    e.preventDefault(); const files = [...e.target.f.files]; const note = e.target.note.value; const btn = e.target.querySelector('button'); btn.disabled = true;
    try { for (const f of files) { const d = await photoData(f); await POST('photos', { bike_id: b.id, kind: 'bisiklet', note, ...d }); } } finally { btn.disabled = false; }
    closeModal(); toast(files.length > 1 ? `${files.length} fotoğraf eklendi` : 'Fotoğraf eklendi'); route();
  });
}

// quick actions (map popup + bike page): stop = remote lock, stolen = report theft, resume = back in use
function quickBtns(b, withService = true) {
  if (!can('fleet', 'w')) return withService && can('service', 'w') ? `<a class="btn sm" href="#/service/new?bike_id=${b.id}">Servise al</a>` : '';
  const off = b.lock_requested || ['kayıp/çalıntı', 'hizmet dışı'].includes(b.status);
  return (off ? `<button class="btn sm ok" data-bact="resume" data-bid="${b.id}">Tekrar aktif et</button>` : `<button class="btn sm warn" data-bact="stop" data-bid="${b.id}">Durdur</button>`)
    + (b.status !== 'kayıp/çalıntı' ? `<button class="btn sm danger" data-bact="stolen" data-bid="${b.id}">Çalıntı bildir</button>` : '')
    + (withService && can('service', 'w') ? `<a class="btn sm" href="#/service/new?bike_id=${b.id}">Servise al</a>` : '');
}
const QUICK = {
  stop: ['Bisikleti durdur', 'GPS cihazına kilit komutu gönderilir (cihaz bir sonraki sinyalde uygular). Kirada değilse durum "hizmet dışı" olur.', 'Durdur', 'Bisiklet durduruldu'],
  stolen: ['Çalıntı bildir', 'Bisiklet "kayıp/çalıntı" olarak işaretlenir, kilit komutu gönderilir ve son konum notlara yazılır. Bildirimlerde kırmızı uyarı olarak görünür.', 'Çalıntı olarak bildir', 'Çalıntı bildirimi kaydedildi'],
  resume: ['Tekrar aktif et', 'Kilit komutu kaldırılır; bisiklet kiradaysa "kirada", değilse "müsait" olur.', 'Aktif et', 'Bisiklet tekrar aktif'],
};
function bindQuick(root, getBike, after) {
  root?.querySelectorAll('[data-bact]').forEach((btn) => btn.onclick = () => {
    const b = getBike(btn.dataset.bid); const [title, text, label, done] = QUICK[btn.dataset.bact];
    const body = modal(`${title} · ${esc(b?.code || '')}`, `<form class="grid-form"><p class="span2">${text}</p>${inputHtml({ k: 'note', l: btn.dataset.bact === 'stolen' ? 'Not (ör. polis tutanak no, son görülme yeri)' : 'Not' , t: 'textarea' }, '')}<div class="form-actions span2"><button class="btn ${btn.dataset.bact === 'resume' ? 'primary' : 'danger'}">${label}</button></div></form>`);
    body.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST(`bikes/${btn.dataset.bid}/action`, { action: btn.dataset.bact, ...readForm(e.target) }); closeModal(); toast(done, 'ok'); refreshNotifCount(); await after(); });
  });
}
function econCard(b) {
  const e = b.economics; const sign = (v) => `${v > 0 ? '+' : ''}${money(v)}`;
  if (!e.purchase) return `<div class="alert info">Verimlilik hesabı için bisikletin <b>toplam satın alma maliyetini</b> girin (Düzenle → Toplam satın alma maliyeti). Şu ana kadar net kazanç: <b>${sign(e.net)}</b></div>`;
  const paid = e.net >= e.purchase;
  const big = paid ? `<span class="t-ok">${sign(e.profit)} kazanç</span>` : `%${Math.max(0, e.pct)} amorti etti`;
  const sub = paid ? 'Bisiklet kendini amorti etti; bu tutar satın alma maliyetinin üzerindeki net kazanç.' : `Amortismana kalan: <b>${money(e.purchase - e.net)}</b>${e.payback_months ? ` · bu hızla yaklaşık <b>${e.payback_months} ay</b>` : e.monthly <= 0 ? ' · şu an aylık net kazanç yok' : ''}`;
  return card('Verimlilik / amortisman', `<div class="econ"><div class="econ-main"><div class="econ-big">${big}</div>${meter(paid ? 100 : e.pct, paid ? 'ok' : e.pct < 30 ? 'low' : '')}<p class="muted">${sub}</p></div>
    ${dl([['Toplam satın alma maliyeti', money(e.purchase)], ['Kira + servis geliri (net)', money(e.income)], ['− Kullanılan yedek parça', money(e.parts_cost)], ['− Diğer giderler', `${money(e.other_cost)}${e.by_category.length ? ` <small class="muted">${e.by_category.map((c) => `${esc(c.category)}: ${money(c.amount)}`).join(' · ')}</small>` : ''}`], ['= Net kazanç', `<b>${sign(e.net)}</b>`], ['Kâr / zarar (maliyet sonrası)', `<b class="${e.profit >= 0 ? 't-ok' : 't-danger'}">${sign(e.profit)}</b>`], ['Aylık ortalama net', `${money(e.monthly)} <small class="muted">${date(e.since)}'den beri</small>`], ['Servis işçiliği (bilgi)', `${money(e.labor_cost)} <small class="muted">kendi personel, düşülmedi</small>`]])}</div>`);
}

// ---------- QR stickers ----------
const bikeUrl = (uid) => `${location.origin}${location.pathname}#/b/${uid}`;
const qrSvg = (text) => { if (!window.qrcode) return '<div class="empty">QR</div>'; const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); };
const sticker = (b) => `<div class="sticker"><div class="st-top">${LOGO}<b>${esc(b.code)}</b></div><div class="st-qr">${qrSvg(bikeUrl(b.uid))}</div><div class="st-foot"><span>ID ${esc(b.uid)}</span><span>${esc(session.settings.company_phone || '')}</span></div></div>`;
async function qrPage(ids, q = {}) {
  const all = ids ? [await GET(`bikes/${ids}`)] : await GET('bikes', q.status ? { status: q.status } : {});
  const bikes = all.filter((b) => b.uid);
  setMain(`${head(ids ? `QR etiketi · ${esc(bikes[0]?.code || '')}` : 'QR etiketleri', 'Etiketi yazdırıp bisiklete yapıştırın. Telefon kamerasıyla okutunca bisikletin sayfası açılır; servis kabulde hızlıca bulursunuz. Okuyucu tabancayla üstteki arama kutusuna da okutabilirsiniz.',
    `<label class="inline">Boyut <select id="stsize"><option value="s">Küçük (40 mm)</option><option value="m" selected>Orta (55 mm)</option><option value="l">Büyük (75 mm)</option></select></label><label class="inline">Kopya <input id="stcopies" type="number" min="1" max="20" value="1" style="width:64px"></label><button class="btn primary sm" id="stprint">Yazdır / PDF</button>`)}
    ${ids ? '' : `<div class="toolbar"><div class="chips">${['', ...BIKE_STATUS].map((v) => `<a class="chip ${(q.status || '') === v ? 'on' : ''}" href="#/bikes/qr${v ? `?status=${encodeURIComponent(v)}` : ''}">${v || 'Tümü'}</a>`).join('')}</div><span class="muted">${bikes.length} etiket</span></div>`}
    <div class="stickers m" id="stgrid">${bikes.map(sticker).join('') || '<div class="empty">Bisiklet yok</div>'}</div>`);
  $('#stsize').onchange = (e) => { $('#stgrid').className = `stickers ${e.target.value}`; };
  $('#stprint').onclick = () => { const n = Math.max(1, Math.min(20, Number($('#stcopies').value) || 1)); printHtml(`<div class="stickers ${$('#stsize').value}">${bikes.map((b) => sticker(b).repeat(n)).join('')}</div>`, ids ? `QR ${bikes[0]?.code}` : 'QR etiketleri'); };
}
async function qrOpen(uid) {
  try {
    const b = await GET(`bikes/by-uid/${encodeURIComponent(uid)}`);
    location.replace(can('fleet') ? `#/bikes/${b.id}` : `#/service/new?bike_id=${b.id}`);
  } catch (e) { setMain(`<div class="alert danger">${esc(e.message)}</div>`); }
}

// ---------- reorder list ----------
async function orderListPage() {
  const d = await GET('parts/reorder');
  const groups = {}; for (const it of d.items) (groups[it.supplier_name || '—'] ||= []).push(it);
  const rowHtml = (it) => `<tr data-id="${it.id}"><td><input type="checkbox" class="oi" checked></td><td><b>${esc(it.sku)}</b></td><td>${esc(it.name)}</td><td class="num">${num(it.stock, 2)} / ${num(it.min_stock)}</td><td class="num"><input type="number" class="oq" min="0" step="1" value="${it.suggested}" style="width:72px"> ${esc(it.unit)}</td><td class="num">${money(it.cost)}</td><td class="num ot">${money(it.line_total)}</td></tr>`;
  setMain(`${head('Sipariş listesi', `Minimum stok seviyesinde veya altındaki parçalar, tedarikçiye göre gruplu. Önerilen miktar = 2 × min. stok − mevcut stok; değiştirebilirsiniz.`, `<a class="btn sm" href="#/parts">← Yedek parçalar</a><button class="btn sm" id="ocsv">CSV</button><button class="btn primary sm" id="oprint">Yazdır / PDF</button>`)}
    ${d.items.length ? Object.entries(groups).map(([sup, items]) => card(`${esc(sup)} ${items[0].lead_days ? `<small class="muted">teslim ~${items[0].lead_days} gün</small>` : ''} ${items[0].supplier_email ? `<small class="muted">· ${esc(items[0].supplier_email)}${items[0].supplier_phone ? ' · ' + esc(items[0].supplier_phone) : ''}</small>` : ''}`,
      `<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Kod</th><th>Parça</th><th class="num">Stok / min</th><th class="num">Sipariş</th><th class="num">Birim fiyat</th><th class="num">Tutar</th></tr></thead><tbody>${items.map(rowHtml).join('')}</tbody><tfoot><tr><td colspan="6" class="num">Ara toplam</td><td class="num sub"></td></tr></tfoot></table></div>`, 'flush ogroup')).join('')
      + `<div class="card"><div class="card-b order-total">Genel toplam (net): <b id="ogt"></b></div></div>` : '<div class="empty big">Tüm stoklar yeterli, sipariş edilecek parça yok.</div>'}`);
  const byId = Object.fromEntries(d.items.map((x) => [x.id, x]));
  const sel = () => [...main().querySelectorAll('tr[data-id]')].filter((tr) => tr.querySelector('.oi').checked && Number(tr.querySelector('.oq').value) > 0).map((tr) => ({ ...byId[tr.dataset.id], qty: Number(tr.querySelector('.oq').value) }));
  const calc = () => {
    let gt = 0;
    main().querySelectorAll('.ogroup').forEach((g) => { let st = 0; g.querySelectorAll('tr[data-id]').forEach((tr) => { const it = byId[tr.dataset.id]; const on = tr.querySelector('.oi').checked; const v = on ? Number(tr.querySelector('.oq').value) * (it.cost || 0) : 0; tr.querySelector('.ot').textContent = money(v); tr.classList.toggle('off', !on); st += v; }); g.querySelector('.sub').textContent = money(st); gt += st; });
    if ($('#ogt')) $('#ogt').textContent = money(gt);
  };
  main().querySelectorAll('.oi, .oq').forEach((x) => x.addEventListener('input', calc)); calc();
  $('#ocsv').onclick = () => csv(sel(), [{ k: 'supplier_name', l: 'Tedarikçi' }, { k: 'sku', l: 'Kod' }, { k: 'name', l: 'Parça' }, { k: 'qty', l: 'Miktar' }, { k: 'unit', l: 'Birim' }, { k: 'cost', l: 'Birim fiyat' }], 'siparis-listesi');
  $('#oprint').onclick = () => {
    const items = sel(); if (!items.length) return toast('Seçili parça yok', 'info');
    const g = {}; for (const it of items) (g[it.supplier_name || '—'] ||= []).push(it);
    const tot = (xs) => xs.reduce((a, x) => a + x.qty * (x.cost || 0), 0);
    printHtml(`<div class="doc">${docHeader(tr('Sipariş listesi'), dDate(uiLang, d.date))}${Object.entries(g).map(([sup, xs]) => `<h3>${esc(sup)}${xs[0].supplier_contact ? ` <small>· ${esc(xs[0].supplier_contact)}</small>` : ''}${xs[0].supplier_email ? ` <small>· ${esc(xs[0].supplier_email)}</small>` : ''}${xs[0].supplier_phone ? ` <small>· ${esc(xs[0].supplier_phone)}</small>` : ''}</h3>
      <table class="dtbl"><thead><tr><th>${tr('Kod')}</th><th>${tr('Parça')}</th><th class="num">${tr('Miktar')}</th><th class="num">${tr('Birim fiyat')}</th><th class="num">${tr('Tutar')}</th></tr></thead><tbody>${xs.map((x) => `<tr><td>${esc(x.sku)}</td><td>${esc(x.name)}</td><td class="num">${num(x.qty, 2)} ${esc(tr(x.unit))}</td><td class="num">${money(x.cost)}</td><td class="num">${money(x.qty * (x.cost || 0))}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4" class="num">${tr('Ara toplam')}</td><td class="num"><b>${money(tot(xs))}</b></td></tr></tfoot></table>`).join('')}
      <p class="doc-total">${tr('Genel toplam (net)')}: <b>${money(tot(items))}</b></p><div class="doc-foot">${tr('Hazırlayan')}: ${esc(session.user.name)}</div></div>`, `${tr('Sipariş listesi')} ${d.date}`);
  };
}

// ---------- rentals ----------
async function rentalsPage(q) {
  const tab = q.tab || 'active';
  const all = await GET('rentals', q.q ? { q: q.q } : {});
  const t = todayISO();
  const sets = { active: all.filter((r) => r.status === 'aktif'), late: all.filter((r) => r.is_late), res: all.filter((r) => r.status === 'rezervasyon'), done: all.filter((r) => ['tamamlandı', 'iptal'].includes(r.status)), all };
  const rows = sets[tab];
  const cols = [
    { k: 'contract_no', l: 'Sözleşme' }, { k: 'bike_code', l: 'Bisiklet' }, { k: 'customer_label', l: 'Kiracı' }, { l: 'Sürücü', k: 'rider_name', f: (r) => esc(r.rider_name || '—') },
    { l: 'Başlangıç', f: (r) => date(r.start_date), csv: (r) => r.start_date }, { l: 'Dönüş', f: (r) => (r.is_late ? `<b class="t-danger">${date(r.end_date)}</b>` : date(r.returned_at || r.end_date)), csv: (r) => r.end_date },
    { l: 'Ücret', f: (r) => `${money(r.rate)}/${esc(r.period)}`, cls: 'num', csv: (r) => r.rate }, { l: 'Depozito', f: (r) => `${money(r.deposit_amount)} ${r.deposit_status === 'bekliyor' && r.deposit_amount > 0 ? badge('bekliyor') : ''}`, cls: 'num', csv: (r) => r.deposit_amount },
    ...(can('finance') ? [{ l: 'Açık bakiye', f: (r) => (r.open_balance > 0.005 ? `<b class="t-warn">${money(r.open_balance)}</b>` : '—'), cls: 'num', csv: (r) => r.open_balance }] : []),
    { l: 'Durum', f: (r) => badge(r.is_late ? 'gecikmede' : r.status), csv: (r) => r.status },
    { l: '', f: (r) => `<a class="btn sm" href="#/rentals/${r.id}/contract">Sözleşme</a>`, csv: () => '' },
  ];
  setMain(`${head('Kiralamalar', 'Sözleşmeler, teslim ve iade süreçleri.', `<button class="btn sm" id="csv">CSV</button>${can('rentals', 'w') ? '<a class="btn primary sm" href="#/rentals/new">+ Yeni kiralama</a>' : ''}`)}
    <div class="toolbar"><input type="search" id="q" placeholder="Sözleşme, bisiklet, müşteri, sürücü…" value="${esc(q.q || '')}">${tabs([['active', 'Aktif', sets.active.length], ['late', 'Geciken iade', sets.late.length], ['res', 'Rezervasyon', sets.res.length], ['done', 'Tamamlanan', sets.done.length], ['all', 'Tümü', all.length]], tab)}</div>
    ${card('', table(rows, cols, { link: (r) => `#/rentals/${r.id}` }), 'flush')}`);
  main().querySelectorAll('.tab').forEach((b) => b.onclick = () => { location.hash = `#/rentals?${new URLSearchParams({ ...q, tab: b.dataset.tab })}`; });
  $('#csv').onclick = () => csv(rows, cols, 'kiralamalar');
  let tm; $('#q').oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { location.hash = `#/rentals?${new URLSearchParams({ tab, q: e.target.value })}`; }, 350); };
}
async function newRentalPage(q) {
  const [customers, bikes, plans] = await Promise.all([lookup('customers'), GET('bikes', { status: 'müsait' }), GET('pricing_plans', { active: 1 })]);
  const t = todayISO();
  setMain(`${head('Yeni kiralama', 'Müşteri ve bisiklet seçin; tarife seçildiğinde ücret ve depozito otomatik dolar.')}
  <form id="rf" class="card"><div class="card-b grid-form three">
    <label class="field"><span>Müşteri *</span><select name="customer_id" required><option value="">Seçin…</option><option value="new" ${q.customer_id === 'new' ? 'selected' : ''}>+ Yeni bireysel müşteri (sürücü kendisi kiracı)</option>${customers.map((c) => `<option value="${c.id}" ${c.raw.blacklisted ? 'disabled' : ''} ${String(q.customer_id) === String(c.id) ? 'selected' : ''}>${esc(c.label)}${c.raw.blacklisted ? ' (kara liste)' : ''}</option>`).join('')}</select></label>
    <label class="field"><span>Bisiklet * <small class="muted">(${bikes.length} müsait)</small></span><select name="bike_id" required><option value="">Seçin…</option>${bikes.map((b) => `<option value="${b.id}" data-type="${esc(b.type)}" data-km="${b.odometer_km ?? ''}" data-bat="${b.battery_level ?? ''}" ${String(q.bike_id) === String(b.id) ? 'selected' : ''}>${esc(b.code)} · ${esc(b.model)} (${esc(b.type)})</option>`).join('')}</select></label>
    <label class="field"><span>Tarife</span><select name="plan_id"><option value="">Manuel fiyat</option></select></label>
    <label class="field"><span>Faturalama periyodu</span><select name="period">${enabledPeriods(session.settings).map((p) => `<option ${p === 'ay' ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
    <label class="field"><span>Periyot ücreti (net) *</span><input name="rate" type="number" step="0.01" required></label>
    <label class="field"><span>Başlangıç *</span><input name="start_date" type="date" value="${t}" required></label>
    <label class="field"><span>Planlanan dönüş *</span><input name="end_date" type="date" value="${addDays(t, 30)}" required></label>
    <label class="field"><span>Depozito</span><input name="deposit_amount" type="number" step="0.01"></label>
    <label class="field"><span>Sigorta paketi</span><select name="insurance_plan"><option value="">— yok —</option>${insurancePlans(session.settings).map((p) => `<option value="${esc(p.name)}" data-fee="${p.fee}" data-ded="${p.deductible ?? ''}" ${q.insurance === p.name ? 'selected' : ''}>${esc(p.name)} · ${p.fee ? money(p.fee) + ' / periyot' : 'dahil'}${p.deductible != null ? ` · muafiyet ${money(p.deductible)}` : ''}</option>`).join('')}</select></label>
    <label class="field"><span>Sigorta ücreti / periyot (net)</span><input name="insurance_fee" type="number" step="0.01"></label>
    <label class="field"><span>Muafiyet (hasar başına)</span><input name="insurance_deductible" type="number" step="0.01"></label>
    <label class="field"><span>Teslim km</span><input name="start_km" type="number" step="any"></label>
    <label class="field"><span>Teslim batarya %</span><input name="start_battery" type="number" step="any"></label>
    <label class="check"><input type="checkbox" name="deposit_paid" checked> Depozito teslimde tahsil edildi</label>
    <label class="field"><span>Depozito ödeme yöntemi</span><select name="deposit_method">${['nakit', 'kredi kartı', 'banka havalesi', 'PayPal'].map((m) => `<option>${m}</option>`).join('')}</select></label>
    <fieldset class="span3 fs"><legend>Bisikleti teslim alan kişi (sürücü) · kimlik bilgileri</legend><div class="grid-form three">
      <label class="field"><span>Kişi *</span><select name="rider_pick"><option value="">Önce müşteri seçin</option></select></label>
      <label class="field"><span>Ad soyad *</span><input name="r_name" required></label>
      <label class="field"><span>Telefon *</span><input name="r_phone" type="tel" required></label>
      <label class="field"><span>Kimlik türü *</span><select name="r_id_type" required><option value="">Seçin…</option>${ID_TYPES.map((x) => `<option>${esc(x)}</option>`).join('')}</select></label>
      <label class="field"><span>Kimlik / pasaport no *</span><input name="r_id_no" required></label>
      <label class="field"><span>Kimlik geçerlilik tarihi</span><input name="r_id_expiry" type="date"></label>
      <label class="field"><span>Doğum tarihi</span><input name="r_birth_date" type="date"></label>
      <label class="field"><span>Uyruk</span><input name="r_nationality"></label>
      <label class="field"><span>Ehliyet no (varsa)</span><input name="r_license_no"></label>
      <label class="field span2"><span>Adres</span><input name="r_address"></label>
      <label class="check"><input type="checkbox" name="r_id_checked"> Kimlik aslı görüldü / kopyası alındı</label>
    </div></fieldset>
    <label class="field span3"><span>Teslim edilen aksesuarlar</span><input name="accessories" value="Kilit x1, şarj cihazı x1, yağmur brandası x1"></label>
    <label class="field span3"><span>Not</span><textarea name="notes" rows="2" placeholder="Örn. teslim saati, özel fiyat anlaşması, sürücüye verilen ek bilgi…"></textarea></label>
  </div><div class="card-f"><span class="muted" id="sum"></span><span class="grow"></span><a class="btn" href="#/rentals">Vazgeç</a><button class="btn primary">Sözleşmeyi oluştur</button></div></form>`);
  const f = $('#rf');
  const upd = async () => {
    const opt = f.bike_id.selectedOptions[0]; const type = opt?.dataset.type;
    const prev = f.plan_id.value;
    f.plan_id.innerHTML = '<option value="">Manuel fiyat</option>' + plans.filter((p) => !type || p.bike_type === type).map((p) => `<option value="${p.id}" ${String(p.id) === prev ? 'selected' : ''}>${esc(p.name)} · ${money(p.price)}/${p.period}</option>`).join('');
    if (opt?.dataset.km && !f.start_km.value) f.start_km.value = opt.dataset.km;
    if (opt?.dataset.bat && !f.start_battery.value) f.start_battery.value = opt.dataset.bat;
  };
  const sum = () => { const r = Number(f.rate.value) || 0; const vat = Number(session.settings.vat_rate) || 0; $('#sum').textContent = r ? `Periyot başına ${money(r)} + KDV %${vat} = ${money(r * (1 + vat / 100))} · depozito ${money(f.deposit_amount.value || 0)}` : ''; };
  const RF = ['name', 'phone', 'id_type', 'id_no', 'id_expiry', 'birth_date', 'nationality', 'license_no', 'address'];
  let riders = [];
  const fillRider = () => {
    const r = riders.find((x) => String(x.id) === f.rider_pick.value);
    const cust = customers.find((c) => String(c.id) === f.customer_id.value)?.raw;
    // new person: for an individual customer, start from the customer's own details
    const src = r || (cust && cust.type === 'bireysel' && !riders.length ? { name: cust.name, phone: cust.phone, id_no: cust.id_no, address: cust.address } : {});
    RF.forEach((k) => { f[`r_${k}`].value = src[k] ?? ''; });
    f.r_id_checked.checked = !!src.id_checked;
  };
  f.customer_id.onchange = async () => {
    riders = f.customer_id.value && f.customer_id.value !== 'new' ? await GET('riders', { customer_id: f.customer_id.value, active: 1 }) : [];
    f.rider_pick.innerHTML = riders.map((r) => `<option value="${r.id}">${esc(r.name)}${r.id_no ? '' : ' · kimlik eksik'}${r.current_bike ? ` (şu an ${esc(r.current_bike)})` : ''}</option>`).join('') + '<option value="new">+ Yeni kişi ekle</option>';
    if (!riders.length) f.rider_pick.value = 'new';
    if (q.rider_id && riders.some((x) => String(x.id) === String(q.rider_id))) f.rider_pick.value = String(q.rider_id);
    fillRider();
  };
  f.rider_pick.onchange = fillRider;
  f.bike_id.onchange = upd;
  f.plan_id.onchange = () => { const p = plans.find((x) => String(x.id) === f.plan_id.value); if (p) { f.rate.value = p.price; f.deposit_amount.value = p.deposit; f.period.value = p.period; } sum(); };
  f.rate.oninput = sum; f.deposit_amount.oninput = sum;
  f.insurance_plan.onchange = () => { const o = f.insurance_plan.selectedOptions[0]; f.insurance_fee.value = o?.dataset.fee ?? ''; f.insurance_deductible.value = o?.dataset.ded ?? ''; };
  if (q.insurance) f.insurance_plan.onchange();
  if (q.bike_type && !q.bike_id) { const o = [...f.bike_id.options].find((x) => x.dataset.type === q.bike_type); if (o) f.bike_id.value = o.value; }
  if (q.period && enabledPeriods(session.settings).includes(q.period)) f.period.value = q.period;
  if (q.start) { const st = q.start < t ? t : q.start; f.start_date.value = st; f.end_date.value = q.period === 'gün' ? addDays(st, Number(q.duration) || 1) : q.period === 'hafta' ? addDays(st, 7 * (Number(q.duration) || 1)) : addDays(st, 30 * (Number(q.duration) || 1)); }
  await upd();
  if (q.period) { const p = plans.find((x) => x.period === q.period && (!f.bike_id.selectedOptions[0]?.dataset.type || x.bike_type === f.bike_id.selectedOptions[0].dataset.type)); if (p) { f.plan_id.value = String(p.id); f.plan_id.onchange(); } }
  if (q.customer_id) await f.customer_id.onchange();
  f.onsubmit = guard(async (e) => {
    e.preventDefault(); const d = readForm(f); d.deposit_paid = !!d.deposit_paid;
    d.rider = { id: d.rider_pick && d.rider_pick !== 'new' ? Number(d.rider_pick) : null, id_checked: !!d.r_id_checked };
    RF.forEach((k) => { d.rider[k] = d[`r_${k}`]; delete d[`r_${k}`]; }); delete d.r_id_checked; delete d.rider_pick;
    const r = await POST('rentals', d); clearLookups(); toast(`${r.contract_no} oluşturuldu. Sürücü sözleşmeyi telefondan imzalayabilir veya yazdırıp imzalatın.`);
    if (q.request_id) await PUT(`portal_requests/${q.request_id}`, { status: 'tamamlandı', admin_note: `Kiralamanız hazırlandı: ${r.contract_no}, başlangıç ${r.start_date}.` }).catch(() => {});
    location.hash = `#/rentals/${r.id}/contract`;
  });
}
async function rentalPage(id, q = {}) {
  const r = await GET(`detail/rentals/${id}`); const w = can('rentals', 'w'); const fw = can('finance', 'w');
  const late = r.late_days > 0;
  const hT = r.handovers.filter((h) => h.kind === 'teslim'); const hI = r.handovers.filter((h) => h.kind === 'iade');
  setMain(`${head(`${esc(r.contract_no)} <span class="h-badge">${badge(late ? 'gecikmede' : r.status, late ? `gecikmede · ${r.late_days} gün` : r.status)}</span>`, `${esc(r.bike.code)} → ${esc(r.customer.company_name || r.customer.name)}`,
    `<a class="btn sm" href="#/rentals/${r.id}/contract">Sözleşme çıktısı</a>${w && r.status === 'aktif' ? `<button class="btn sm" id="ext">Uzat</button>${hI.length ? '' : `<a class="btn primary sm" href="#/rentals/${r.id}/handover/iade">İade tutanağı</a>`}<button class="btn sm" id="ret">İade al</button>` : ''}${w && r.status === 'rezervasyon' ? `<button class="btn sm" id="cancel">İptal</button><button class="btn sm" id="act" title="Tutanak tutmadan teslim et">Hızlı teslim</button><a class="btn primary sm" href="#/rentals/${r.id}/handover/teslim">Tutanakla teslim et</a>` : ''}${w && r.status === 'aktif' && !hT.length ? `<a class="btn sm" href="#/rentals/${r.id}/handover/teslim">Teslim tutanağı</a>` : ''}${w ? '<button class="btn sm" id="edit">Düzenle</button>' : ''}`)}
  ${r.return_notice_date && r.status === 'aktif' ? `<div class="alert info">Sürücü iade tarihi bildirdi: <b>${date(r.return_notice_date)}</b>${r.return_notice_date < r.end_date ? ` <span>(sözleşme bitişi ${date(r.end_date)}, erken iade)</span>` : ''} · <span>${ago(r.return_notice_at)}</span></div>` : ''}
  ${late ? `<div class="alert danger">Planlanan dönüş tarihi ${date(r.end_date)} idi. Bisiklet ${r.late_days} gündür gecikmede; iadede günlük ${money(r.late_return_fee_per_day)} gecikme bedeli önerilir.</div>` : ''}
  <div class="grid g-3">
    ${card('Kiracı', dl([['Müşteri', `<a href="#/customers/${r.customer.id}">${esc(r.customer.company_name || r.customer.name)}</a>`], ['Yetkili', esc(r.customer.name)], ['Telefon', r.customer.phone ? `<a href="tel:${esc(r.customer.phone)}">${esc(r.customer.phone)}</a>` : '—'], ['E-posta', esc(r.customer.email)], ['Teslim alan / sürücü', r.rider ? `<a href="#/riders/${r.rider.id}">${esc(r.rider.name)}</a> · ${esc(r.rider.phone || '')}<br><small>${esc(r.rider.id_type || 'Kimlik')}: ${r.rider.id_no ? esc(r.rider.id_no) : '<b class="t-danger">eksik</b>'}${r.rider.id_checked ? ' ✓' : ''} · ${r.rider_documents.length ? `${r.rider_documents.length} evrak` : '<b class="t-warn">evrak yok</b>'}</small>` : '<b class="t-danger">girilmedi</b>']]))}
    ${card('Bisiklet', dl([['Kod', `<a href="#/bikes/${r.bike.id}">${esc(r.bike.code)}</a> ${badge(r.bike.status)}`], ['Model', `${esc(r.bike.brand)} ${esc(r.bike.model)}`], ['Teslim km / batarya', `${num(r.start_km)} km · ${r.start_battery != null ? '%' + r.start_battery : '—'}`], ['İade km', r.end_km != null ? `${num(r.end_km)} km (${num(r.end_km - (r.start_km || 0))} km kullanıldı)` : '—'], ['Aksesuarlar', esc(r.accessories)]]))}
    ${card('Koşullar', dl([['Dönem', `${date(r.start_date)} – ${date(r.end_date)}`], ['İade', date(r.returned_at)], ['Tarife', esc(r.plan?.name || 'Manuel')], ['Ücret', `${money(r.rate)} / ${esc(r.period)} + KDV`], ['Ödeme şekli', esc(r.pay_method || '—')], r.insurance_plan ? ['Sigorta', `${esc(r.insurance_plan)}${Number(r.insurance_fee) > 0 ? ` · ${money(r.insurance_fee)} / ${esc(r.period)}` : ' · dahil'}${r.insurance_deductible != null ? `<br><small>Muafiyet: ${money(r.insurance_deductible)}</small>` : ''}`] : null, ['Depozito', `${money(r.deposit_amount)} ${badge(r.deposit_status)}<br><small>Tutulan: ${money(r.deposit_held)}</small>`], ['Hasar bedeli', money(r.damage_fee)], ['İade durumu', esc(r.return_condition)], ['Not', esc(r.notes)]]))}
  </div>
  ${can('finance') ? card(`Faturalar <span class="card-act">${fw && r.status === 'aktif' ? '<button class="btn sm" id="bill">Vadesi gelen dönemleri faturala</button>' : ''}${fw && r.deposit_status === 'bekliyor' && r.deposit_amount > 0 ? '<button class="btn sm" id="dep">Depozito tahsil et</button>' : ''}</span>`, table(r.invoices, [{ k: 'invoice_no', l: 'No' }, { l: 'Tarih', f: (i) => date(i.issue_date) }, { l: 'Dönem', f: (i) => (i.period_start ? `${date(i.period_start)} – ${date(i.period_end)}` : esc(i.description)) }, { l: 'Vade', f: (i) => (i.days_late ? `<b class="t-danger">${date(i.due_date)}</b>` : date(i.due_date)) }, { l: 'Toplam', f: (i) => money(i.total), cls: 'num' }, { l: 'Kalan', f: (i) => (i.balance > 0.005 ? `<b>${money(i.balance)}</b>` : '—'), cls: 'num' }, { l: 'Durum', f: (i) => badge(i.status) }], { link: (i) => `#/invoices/${i.id}` })) : ''}
  ${can('finance') && r.plan_rows.length ? card(`Ödeme planı <small class="muted">${esc(r.pay_method || 'ödeme şekli seçilmedi')} · dönem faturaları her gün otomatik kesilir</small>`, planTable(r.plan_rows)) : ''}
  ${signCard(r, w)}
  ${card(`Teslim / iade tutanakları <span class="cnt">${r.handovers.length}</span>${w ? `<span class="card-act">${['rezervasyon', 'aktif'].includes(r.status) && !hT.length ? `<a class="btn sm" href="#/rentals/${r.id}/handover/teslim">+ Teslim tutanağı</a>` : ''}${['aktif', 'tamamlandı'].includes(r.status) && !hI.length ? `<a class="btn sm" href="#/rentals/${r.id}/handover/iade">+ İade tutanağı</a>` : ''}</span>` : ''}`,
    table(r.handovers, [{ l: 'Tutanak', f: (h) => `<b>${h.kind === 'teslim' ? 'Teslim' : 'İade'}</b>` }, { l: 'Tarih', f: (h) => dt(h.created_at) }, { l: 'Km', f: (h) => num(h.km), cls: 'num' }, { l: 'Batarya', f: (h) => (h.battery != null ? `%${h.battery}` : '—'), cls: 'num' }, { l: 'Hasar', f: (h) => (h.new_damages ? `<b class="${h.kind === 'iade' ? 't-danger' : 't-warn'}">${h.new_damages} yeni</b>` : '—') + (h.damage_count - h.new_damages ? ` <small class="muted">+${h.damage_count - h.new_damages} önceki</small>` : '') }, { l: 'İmzalayan', f: (h) => esc(h.rider_name || '—') }, { l: 'Personel', f: (h) => esc(h.staff_name || '—') }], { link: (h) => `#/handovers/${h.id}`, empty: 'Tutanak yok. Teslimde ve iadede km, hasar ve imzayı kayda almak için tutanak tutun.' }))}
  <div class="grid g-2">
    ${can('finance') ? card('Depozito hareketleri', table(r.deposits, [{ l: 'Tarih', f: (d) => date(d.date) }, { l: 'Hareket', f: (d) => badge(d.type) }, { l: 'Tutar', f: (d) => money(d.amount), cls: 'num' }, { k: 'notes', l: 'Açıklama' }], { empty: 'Depozito hareketi yok' })) : ''}
    ${docsCard('rental', r.id, r.documents, w, 'Kiralama belgeleri (imzalı sözleşme, kimlik fotokopisi, tutanaklar…)', true)}
    ${photoCard('rental_id', r.id, false, 'Fotoğraflar (teslim alma selfie\'si, bisiklet fotoğrafları)')}
    ${card('Bu kiralamadaki servis kayıtları', table(r.services, [{ k: 'order_no', l: 'No' }, { l: 'Tip', f: (s) => esc(s.type) }, { l: 'Durum', f: (s) => badge(s.status) }], { link: (s) => `#/service/${s.id}`, empty: 'Servis kaydı yok' }))}
  </div>`);
  $('#edit')?.addEventListener('click', () => editForm('rentals', r, { onSaved: (x) => (x ? route() : (location.hash = '#/rentals')) }));
  bindDocs(main(), route);
  bindSign(r);
  loadPhotos(main());
  $('#act')?.addEventListener('click', guard(async () => { await POST(`rentals/${id}/activate`); toast('Bisiklet teslim edildi, kiralama aktif'); route(); }));
  $('#cancel')?.addEventListener('click', guard(async () => { if (await confirmBox('Rezervasyon iptal edilsin mi?')) { await POST(`rentals/${id}/cancel`); route(); } }));
  $('#bill')?.addEventListener('click', guard(async () => { const x = await POST(`rentals/${id}/bill`); toast(x.created ? `${x.created} fatura oluşturuldu` : 'Faturalanacak yeni dönem yok', x.created ? 'ok' : 'info'); route(); }));
  $('#dep')?.addEventListener('click', () => {
    const body = modal('Depozito tahsil et', `<form class="grid-form"><label class="field"><span>Tutar</span><input name="amount" type="number" step="0.01" value="${r.deposit_amount}"></label><label class="field"><span>Tarih</span><input name="date" type="date" value="${todayISO()}"></label><label class="field"><span>Ödeme yöntemi</span><select name="method">${['nakit', 'kredi kartı', 'banka havalesi', 'PayPal'].map((m) => `<option>${m}</option>`).join('')}</select></label><div class="form-actions span2"><button class="btn primary">Kaydet</button></div></form>`);
    body.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST(`rentals/${id}/deposit`, readForm(e.target)); closeModal(); toast('Depozito kaydedildi'); route(); });
  });
  $('#ext')?.addEventListener('click', () => {
    const body = modal('Kiralamayı uzat', `<form class="grid-form"><label class="field"><span>Yeni dönüş tarihi</span><input name="end_date" type="date" required value="${addDays(r.end_date < todayISO() ? todayISO() : r.end_date, 30)}"></label><div class="form-actions span2"><button class="btn primary">Uzat</button></div></form>`);
    body.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST(`rentals/${id}/extend`, readForm(e.target)); closeModal(); toast('Kiralama uzatıldı'); route(); });
  });
  const openReturn = async (hid) => {
    const h = hid ? await GET(`handovers/${hid}`).catch(() => null) : null;
    $('#ret').click();
    if (!h) return; const f = document.querySelector('#modal form'); if (!f) return;
    if (h.km != null) f.end_km.value = h.km; const txt = damageText(h);
    f.return_condition.value = txt ? `İade tutanağına göre yeni hasar: ${txt}` : 'İade tutanağına göre yeni hasar yok.';
    if (txt) f.send_to_service.checked = true;
  };
  $('#ret')?.addEventListener('click', () => {
    const lateFee = r.late_days * r.late_return_fee_per_day;
    const body = modal('İade al', `<form class="grid-form">
      <label class="field"><span>İade tarihi</span><input name="returned_at" type="date" value="${todayISO()}"></label>
      <label class="field"><span>İade km</span><input name="end_km" type="number" step="any" value="${r.bike.odometer_km ?? ''}"></label>
      <label class="field span2"><span>Bisikletin durumu / eksikler</span><textarea name="return_condition" rows="2" placeholder="Örn. sorunsuz; ön çamurlukta çizik…"></textarea></label>
      <label class="field"><span>Hasar bedeli (net, faturalanır)</span><input name="damage_fee" type="number" step="0.01" value="0"></label>
      <label class="field"><span>Depo / konum</span><input name="location_name" value="Depo Missundestraße"></label>
      ${r.late_days ? `<label class="check span2"><input type="checkbox" name="charge_late" checked> Geç iade bedeli faturala (${r.late_days} gün × ${money(r.late_return_fee_per_day)} = ${money(lateFee)})</label>` : ''}
      ${r.deposit_held > 0 ? `<label class="check span2"><input type="checkbox" name="deduct_from_deposit"> Açık faturaları depozitodan (${money(r.deposit_held)}) mahsup et, kalanı iade et</label>` : ''}
      ${r.deposit_held > 0 ? `<label class="field"><span>Depozito iadesi nasıl yapılacak?</span><select name="refund_method">${['nakit', 'banka havalesi', 'kredi kartı', 'PayPal'].map((m) => `<option>${m}</option>`).join('')}</select></label><div></div>` : ''}
      <label class="check span2"><input type="checkbox" name="send_to_service"> Bisikleti kontrol için servise gönder</label>
      <div class="form-actions span2"><button class="btn primary">İadeyi tamamla</button></div></form>`);
    body.querySelector('form').onsubmit = guard(async (e) => {
      e.preventDefault(); const d = readForm(e.target); d.charge_late = d.charge_late === undefined ? true : !!d.charge_late; d.deduct_from_deposit = !!d.deduct_from_deposit; d.send_to_service = !!d.send_to_service;
      const x = await POST(`rentals/${id}/return`, d); closeModal();
      toast(`İade alındı${x.deposit_refund ? ` · depozito iadesi ${money(x.deposit_refund)}` : ''}${x.service_id ? ' · servis kaydı açıldı' : ''}`); location.hash = `#/rentals/${id}`; route();
    });
  });
  if (q.ret && r.status === 'aktif' && w) await openReturn(Number(q.ret));
}

// ---------- customers ----------
async function customerPage(id) {
  const c = await GET(`detail/customers/${id}`); const w = can('customers', 'w');
  setMain(`${head(esc(c.company_name || c.name), `${esc(c.type)} müşteri · ${esc(c.city || '')} ${c.blacklisted ? badge('kara liste') : ''} ${c.id_verified ? '<span class="badge b-ok">kimlik doğrulandı</span>' : '<span class="badge b-warn">kimlik doğrulanmadı</span>'}`,
    `${w ? '<button class="btn sm" id="edit">Düzenle</button><button class="btn sm" id="addr">+ Sürücü</button>' : ''}${can('rentals', 'w') && !c.blacklisted ? `<a class="btn primary sm" href="#/rentals/new?customer_id=${c.id}">+ Kiralama</a>` : ''}`)}
  ${c.blacklisted ? `<div class="alert danger">Bu müşteri kara listede. ${esc(c.notes || '')}</div>` : ''}
  <div class="kpis small">${kpi('Aktif kiralama', c.rentals.filter((r) => r.status === 'aktif').length)}${kpi('Toplam kiralama', c.rentals.length)}${can('finance') ? kpi('Açık bakiye', money(c.balance), '', c.balance > 0 ? 'warn' : '') + kpi('Geciken', money(c.overdue), '', c.overdue > 0 ? 'danger' : '') + kpi('Tutulan depozito', money(c.deposit_held)) : ''}</div>
  <div class="grid g-1-2">
    ${card('İletişim & kimlik', dl([['Yetkili', esc(c.name)], ['Telefon', c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '—'], ['E-posta', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'], ['Adres', esc(c.address)], ['Vergi no', esc(c.tax_no)], ['Kimlik no', esc(c.id_no)], ['IBAN', esc(c.iban)], ['Not', esc(c.notes)]]))}
    ${card(`Sürücüler (${c.riders.length})`, table(c.riders, [{ k: 'name', l: 'Ad' }, { k: 'phone', l: 'Telefon' }, { l: 'Eğitim', f: (r) => (r.trained ? '✓' : '—') }, { l: 'Şu anki bisiklet', f: (r) => esc(r.current_bike || '—') }, { l: 'Aktif', f: (r) => (r.active ? '✓' : '—') }], { empty: 'Sürücü yok', link: (r) => `#/riders/${r.id}` }))}
  </div>
  ${docsCard('customer', c.id, c.documents, w, 'Müşteri evrakları (kimlik, ticaret sicili, imzalı sözleşme…)')}
  ${card('Kiralamalar', table(c.rentals, [{ k: 'contract_no', l: 'Sözleşme' }, { k: 'bike_code', l: 'Bisiklet' }, { l: 'Sürücü', f: (r) => esc(r.rider_name || '—') }, { l: 'Dönem', f: (r) => `${date(r.start_date)} – ${date(r.returned_at || r.end_date)}` }, { l: 'Ücret', f: (r) => `${money(r.rate)}/${r.period}`, cls: 'num' }, { l: 'Durum', f: (r) => badge(r.is_late ? 'gecikmede' : r.status) }], { link: (r) => `#/rentals/${r.id}` }))}
  ${can('finance') ? card('Faturalar', table(c.invoices, [{ k: 'invoice_no', l: 'No' }, { l: 'Tarih', f: (i) => date(i.issue_date) }, { k: 'description', l: 'Açıklama', f: (i) => esc((i.description || '').slice(0, 60)) }, { l: 'Vade', f: (i) => (i.days_late ? `<b class="t-danger">${date(i.due_date)} · ${i.days_late} g</b>` : date(i.due_date)) }, { l: 'Toplam', f: (i) => money(i.total), cls: 'num' }, { l: 'Kalan', f: (i) => (i.balance > 0.005 ? money(i.balance) : '—'), cls: 'num' }, { l: 'Durum', f: (i) => badge(i.status) }], { link: (i) => `#/invoices/${i.id}` })) : ''}`);
  $('#edit')?.addEventListener('click', () => editForm('customers', c, { onSaved: (x) => (x ? route() : (location.hash = '#/customers')) }));
  $('#addr')?.addEventListener('click', () => editForm('riders', null, { defaults: { customer_id: c.id }, onSaved: route }));
  bindDocs(main(), route);
}


// ---------- WhatsApp payment reminder ----------
// Opens WhatsApp (app or web) with the reminder already written; the user only presses "send".
const waPhone = (p) => {
  let d = String(p || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = '49' + d.slice(1);
  return d.length >= 8 ? d : '';
};
function reminderText(inv) {
  const s = session.settings; const lang = inv.customer_lang === 'en' ? 'en' : 'de';
  const tpl = s[`whatsapp_${lang}`] || s.whatsapp_de || '';
  const vals = { name: inv.customer_name || '', invoice_no: inv.invoice_no, amount: dMoney(lang, inv.balance), due_date: dDate(lang, inv.due_date), iban: s.company_iban || 'IBAN', company: s.company_name || '' };
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));
}
function waBtn(inv, small = false) {
  const phone = waPhone(inv.customer_phone ?? inv.customer?.phone);
  const data = { ...inv, customer_name: inv.customer_name ?? inv.customer?.name, customer_lang: inv.customer_lang ?? inv.customer?.doc_lang };
  if (!phone) return `<button class="btn ${small ? 'xs' : 'sm'} wa" disabled title="Müşterinin telefon numarası kayıtlı değil">WhatsApp</button>`;
  return `<a class="btn ${small ? 'xs' : 'sm'} wa" data-wa="${inv.id}" href="https://wa.me/${phone}?text=${encodeURIComponent(reminderText(data))}" target="_blank" rel="noopener" title="WhatsApp ile ödeme hatırlatması gönder">${WA_ICON}${small ? '' : ' WhatsApp hatırlatma'}</a>`;
}
const WA_ICON = '<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
function bindWa(root, after) {
  root.querySelectorAll('[data-wa]').forEach((a) => a.addEventListener('click', (e) => {
    e.stopPropagation();
    POST(`invoices/${a.dataset.wa}/remind`, { channel: 'whatsapp' }).then(() => { toast('WhatsApp açıldı, hatırlatma kaydedildi. Mesajı WhatsApp\'ta gönderin.'); after?.(); }).catch(() => {});
  }));
}


// ---------- documents (ID copies, licences, signed contracts) ----------
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
function docsCard(type, id, docs, w, title = 'Belgeler', scan = true) {
  return card(`${title} <span class="cnt">${docs.length}</span>`, `<div class="docs" data-owner="${type}" data-oid="${id}">
    ${docs.length ? `<ul class="doclist">${docs.map((d) => `<li><span class="doc-ic ${d.mime === 'application/pdf' ? 'pdf' : 'img'}">${d.mime === 'application/pdf' ? 'PDF' : 'JPG'}</span><div class="grow"><b>${esc(d.doc_type)}</b><small>${esc(d.name)} · ${kb(d.size)} · ${dt(d.created_at)}${d.uploaded_by_name ? ' · ' + esc(d.uploaded_by_name) : ''}</small></div><button type="button" class="btn xs" data-docv="${d.id}">Aç</button>${w ? `<button type="button" class="icon-btn sm" data-docdel="${d.id}" title="Sil">✕</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Henüz belge yüklenmedi.</p>'}
    ${w ? `<div class="doc-up"><select name="doc_type">${DOC_TYPES.map((t) => `<option>${esc(t)}</option>`).join('')}</select>${scan ? '<button type="button" class="btn sm primary" data-scan>📄 Belge tara (çok sayfa → PDF)</button>' : ''}<label class="btn sm ${scan ? '' : 'primary'}"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden>Dosya seç / fotoğraf çek</label><small class="muted">JPEG, PNG veya PDF · en fazla 3 MB</small></div>` : ''}
  </div>`);
}
// shrink large photos before upload (phone photos are often 5–10 MB)
async function fileToData(file) {
  const read = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  if (!file.type.startsWith('image/') || file.size < 900 * 1024) return { mime: file.type, data: await read(file) };
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const k = Math.min(1, 2000 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
  return { mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.85) };
}
function bindDocs(root, after) {
  root.querySelectorAll('.docs').forEach((box) => {
    const inp = box.querySelector('input[type=file]');
    if (inp) inp.onchange = guard(async () => {
      const files = [...inp.files]; inp.value = '';
      for (const f of files) {
        if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(f.type)) throw new Error(`${f.name}: sadece JPEG, PNG veya PDF yüklenebilir.`);
        if (f.type === 'application/pdf' && f.size > 3 * 1048576) throw new Error(`${f.name}: PDF en fazla 3 MB olabilir.`);
        toast(`${f.name} yükleniyor…`, 'info');
        const { mime, data } = await fileToData(f);
        await POST('documents', { owner_type: box.dataset.owner, owner_id: box.dataset.oid, doc_type: box.querySelector('[name=doc_type]').value, name: f.name, mime, data });
      }
      toast(files.length > 1 ? `${files.length} belge yüklendi` : 'Belge yüklendi'); after?.();
    });
    box.querySelectorAll('[data-docv]').forEach((b) => b.onclick = guard(async () => {
      const win = window.open('', '_blank');
      const d = await GET(`documents/${b.dataset.docv}`);
      const bin = atob(d.data); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([u8], { type: d.mime }));
      if (win) win.location = url; else { const a = document.createElement('a'); a.href = url; a.download = d.name; a.click(); }
    }));
    box.querySelectorAll('[data-docdel]').forEach((b) => b.onclick = guard(async () => { if (await confirmBox('Belge silinsin mi?')) { await DEL(`documents/${b.dataset.docdel}`); toast('Belge silindi'); after?.(); } }));
    // paper documents (signed contract, ID copy, protocols…) → photographed page by page → one PDF on this record
    box.querySelector('[data-scan]')?.addEventListener('click', () => openScanner({
      lang: uiLang, types: DOC_TYPES.map((x) => [x, x]), type: box.querySelector('[name=doc_type]').value || 'İmzalı sözleşme', name: `${box.dataset.owner}-${box.dataset.oid}-${todayISO()}`, toast,
      onSave: async (d) => { await POST('documents', { owner_type: box.dataset.owner, owner_id: box.dataset.oid, doc_type: d.doc_type, name: d.name, mime: d.mime, data: d.data, notes: `Taranmış belge · ${d.pages} sayfa` }); toast(`${d.pages} sayfalık PDF kaydedildi`); after?.(); },
    }));
  });
}

// ---------- riders ----------
async function riderPage(id) {
  const r = await GET(`detail/riders/${id}`); const w = can('customers', 'w'); const c = r.customer;
  const direct = c?.type === 'bireysel';
  setMain(`${head(esc(r.name), `${direct ? 'Doğrudan müşteri (bireysel kiracı)' : c ? `Sürücü · <a href="#/customers/${c.id}">${esc(c.company_name || c.name)}</a>` : 'Sürücü'} ${r.active ? '' : badge('pasif')} ${r.self_registered ? '<span class="badge b-info">sürücü ekranından kayıt oldu</span>' : ''} ${r.id_no ? (r.id_checked ? '<span class="badge b-ok">kimlik görüldü</span>' : '<span class="badge b-warn">kimlik aslı görülmedi</span>') : '<span class="badge b-danger">kimlik eksik</span>'}`,
    `${w ? '<button class="btn sm" id="edit">Düzenle</button>' : ''}${c && direct ? `<a class="btn sm" href="#/customers/${c.id}">Müşteri kartı</a>` : ''}${can('rentals', 'w') && c && !c.blacklisted ? `<a class="btn primary sm" href="#/rentals/new?customer_id=${c.id}&rider_id=${r.id}">+ Kiralama</a>` : ''}`)}
  <div class="grid g-1-2">
    ${card('Kişisel bilgiler & kimlik', dl([['Telefon', r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : '—'], ['E-posta', esc(r.email)], ['Doğum tarihi', date(r.birth_date)], ['Uyruk', esc(r.nationality)], ['Kimlik türü', esc(r.id_type)], ['Kimlik no', esc(r.id_no)], ['Geçerlilik', r.id_expiry && r.id_expiry < todayISO() ? `<b class="t-danger">${date(r.id_expiry)} (süresi dolmuş)</b>` : date(r.id_expiry)], ['Ehliyet no', esc(r.license_no)], ['Adres', esc(r.address)], ['Eğitim', r.trained ? '✓ kargo bisikleti eğitimi aldı' : '—'], ['Şu anki bisiklet', esc(r.current_bike || '—')], ['Not', esc(r.notes)]]))}
    ${docsCard('rider', r.id, r.documents, w, 'Evraklar (kimlik, ehliyet, adres belgesi…)')}
  </div>
  ${r.balance != null ? card('Bakiye', `<div class="bal"><div class="bal-big ${r.balance < 0 ? 't-danger' : r.balance > 0 ? 't-ok' : ''}">${r.balance > 0 ? '+' : ''}${money(r.balance)}</div><p class="muted">Bu sürücünün kendi kiralamalarına göre: depozito (+) − açık faturalar (−) − alınmamış depozito (−). Firma faturalarının tamamı müşteri kartında.</p></div>
    ${dl([['Tutulan depozito', `<b class="t-ok">+${money(r.deposit_held)}</b>`], ['Açık faturalar', `<b class="${r.open_balance ? 't-danger' : ''}">${r.open_balance ? '−' : ''}${money(r.open_balance)}</b>${r.overdue ? ` <small class="t-danger">(${money(r.overdue)} vadesi geçmiş)</small>` : ''}`], ['Bekleyen depozito', `${r.deposit_pending ? `<b class="t-warn">−${money(r.deposit_pending)}</b>` : money(0)}`]])}
    ${r.invoices.length ? table(r.invoices.slice(0, 12), [{ k: 'invoice_no', l: 'Fatura' }, { l: 'Tarih', f: (i) => date(i.issue_date) }, { l: 'Vade', f: (i) => date(i.due_date) }, { l: 'Tutar', f: (i) => money(i.total), cls: 'num' }, { l: 'Kalan', f: (i) => money(i.balance), cls: 'num' }, { l: 'Durum', f: (i) => badge(i.days_late ? 'gecikmede' : i.status) }], { link: (i) => `#/invoices/${i.id}` }) : ''}
    ${r.deposits.length ? `<h3 class="sub-h">Depozito hareketleri</h3>${table(r.deposits, [{ l: 'Tarih', f: (d) => date(d.date) }, { k: 'contract_no', l: 'Sözleşme' }, { l: 'Hareket', f: (d) => badge(d.type) }, { l: 'Tutar', f: (d) => `${d.type === 'tahsil' ? '+' : '−'}${money(d.amount)}`, cls: 'num' }])}` : ''}`) : ''}
  ${r.last_lat != null ? card(`Son telefon konumu <small class="muted">${ago(r.last_loc_at)}${r.last_loc_acc ? ` · ±${num(r.last_loc_acc)} m` : ''}</small>`, `<div id="rmap" class="map sm"></div><p class="muted"><a href="https://www.google.com/maps?q=${r.last_lat},${r.last_lng}" target="_blank" rel="noopener">Google Haritalar'da aç</a> · Sürücü ekranı açıkken ve sürücü izin verdiyse gönderilir.</p>`) : ''}
  ${card('Sürücü ekranı', `${dl([['Durum', r.portal_active && r.portal_email ? '<span class="badge b-ok">giriş açık</span>' : '<span class="badge b-muted">kapalı</span>'], ['Giriş e-postası', esc(r.portal_email || '—')], ['Son giriş', dt(r.portal_last_login)], ['Dil', esc({ tr: 'Türkçe', de: 'Deutsch', en: 'English' }[r.lang] || '—')], ['Adres', `<a href="${location.origin}${location.pathname.replace(/[^/]*$/, '')}portal.html" target="_blank">${location.host}${location.pathname.replace(/[^/]*$/, '')}portal.html</a>`]])}
    <p class="muted">${r.portal_email ? 'Sürücü bu e-posta ve sizin belirlediğiniz şifreyle girer. Şifreyi değiştirmek veya girişi kapatmak için "Düzenle".' : 'Sürücü ekranını açmak için "Düzenle"den giriş e-postası ve şifre belirleyin.'}</p>
    ${r.requests?.length ? table(r.requests, [{ l: 'Geliş', f: (x) => dt(x.created_at) }, { l: 'Talep', f: (x) => esc(x.type) }, { l: 'İstenen tarih', f: (x) => date(x.preferred_date) }, { l: 'Durum', f: (x) => badge(x.status) }], { link: (x) => `#/portal_requests/${x.id}` }) : ''}`)}
  ${card(`Mesajlar ve bildirimler <small class="muted">sürücü ekranı + Android uygulaması</small>${w ? '<span class="card-act"><button class="btn sm" id="msg">Mesaj gönder</button></span>' : ''}`, msgList(r.messages || []))}
  <div id="rgrowth"></div>
  ${photoCard('rider_id', r.id, false, 'Selfie\'ler ve gönderdiği fotoğraflar')}
  ${card('Kiralamalar', table(r.rentals, [{ k: 'contract_no', l: 'Sözleşme' }, { k: 'bike_code', l: 'Bisiklet' }, { l: 'Dönem', f: (x) => `${date(x.start_date)} – ${date(x.returned_at || x.end_date)}` }, { l: 'Durum', f: (x) => badge(x.is_late ? 'gecikmede' : x.status) }], { link: (x) => `#/rentals/${x.id}`, empty: 'Kiralama yok' }))}`);
  $('#edit')?.addEventListener('click', () => editForm('riders', r, { onSaved: (x) => (x ? route() : (location.hash = '#/riders')) }));
  $('#msg')?.addEventListener('click', () => riderMessageModal(r, route));
  bindDocs(main(), route);
  loadPhotos(main());
  riderGrowth(r);
  if (window.L && r.last_lat != null && $('#rmap')) {
    const m = L.map('rmap').setView([r.last_lat, r.last_lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    L.marker([r.last_lat, r.last_lng], { icon: L.divIcon({ className: '', html: `<div class="rpin">${esc(r.name.split(' ').map((x) => x[0]).join('').slice(0, 2))}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(m);
    if (r.last_loc_acc) L.circle([r.last_lat, r.last_lng], { radius: r.last_loc_acc, weight: 1, fillOpacity: 0.08 }).addTo(m);
    setTimeout(() => m.invalidateSize(), 50);
  }
}

// ---------- rider requests (from the rider portal) ----------
async function requestPage(id) {
  const q = await GET(`portal_requests/${id}`); const w = can('rentals', 'w');
  const svc = ['servis randevusu', 'arıza bildirimi'].includes(q.type);
  setMain(`${head(`${esc(q.type)} <span class="h-badge">${badge(q.status)}</span>`, `Talep #${q.id} · ${dt(q.created_at)}`, `<a class="btn sm" href="#/portal_requests">← Talepler</a>`)}
  <div class="grid g-1-2">
    ${card('Talep', dl([['Sürücü', `<a href="#/riders/${q.rider_id}">${esc(q.rider_name)}</a>${q.rider_phone ? ` · <a href="tel:${esc(q.rider_phone)}">${esc(q.rider_phone)}</a>` : ''}`], ['Müşteri', q.customer_id ? `<a href="#/customers/${q.customer_id}">${esc(q.customer_label)}</a>` : '—'], ['Bisiklet', q.bike_id ? `<a href="#/bikes/${q.bike_id}">${esc(q.bike_code)}</a>` : '—'], ['Sözleşme', q.rental_id ? `<a href="#/rentals/${q.rental_id}">${esc(q.contract_no)}</a>` : '—'], ['İstenen tarih', `${date(q.preferred_date)} ${esc(q.preferred_time || '')}`], q.type === 'yeni kiralama' ? ['İstenen kiralama', `${esc(q.bike_type || 'tip fark etmez')} · ${q.duration || 1} ${esc(q.period || 'ay')}${q.insurance_plan ? ` · sigorta: ${esc(q.insurance_plan)}` : ''}`] : null, ['Sürücünün notu', esc(q.notes || '—')], ['Servis kaydı', q.service_id ? `<a href="#/service/${q.service_id}">${esc(q.order_no)}</a>` : '—']]))}
    ${w ? card('Cevap', `<form class="grid-form" id="qf">
      <label class="field"><span>Durum</span><select name="status">${['yeni', 'onaylandı', 'tamamlandı', 'reddedildi', 'iptal'].map((x) => `<option value="${x}" ${x === q.status ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="field"><span>Randevu tarihi</span><input name="preferred_date" type="date" value="${esc(q.preferred_date || '')}"></label>
      <label class="field"><span>Saat</span><input name="preferred_time" value="${esc(q.preferred_time || '')}"></label>
      <label class="field span2"><span>Sürücüye cevap (sürücü ekranında görünür)</span><textarea name="admin_note" rows="3">${esc(q.admin_note || '')}</textarea></label>
      <div class="form-actions span2">${svc && q.bike_id && !q.service_id && can('service', 'w') ? `<a class="btn" href="#/service/new?bike_id=${q.bike_id}&request_id=${q.id}">Servis kaydı aç</a>` : ''}${q.type === 'hesap silme' && can('admin', 'w') ? `<a class="btn danger" href="#/riders/${q.rider_id}">Sürücü kartında verileri sil (DSGVO)</a>` : ''}${q.type === 'iade randevusu' && q.rental_id ? `<a class="btn" href="#/rentals/${q.rental_id}">Kiralamaya git (iade al)</a>` : ''}${q.type === 'kiralama uzatma' && q.rental_id ? `<a class="btn" href="#/rentals/${q.rental_id}">Kiralamaya git (uzat)</a>` : ''}${q.type === 'yeni kiralama' && ['yeni', 'onaylandı'].includes(q.status) ? `<a class="btn" href="#/rentals/new?${new URLSearchParams({ customer_id: q.customer_id || '', rider_id: q.rider_id || '', bike_type: q.bike_type || '', period: q.period || '', duration: q.duration || '', start: q.preferred_date || '', insurance: q.insurance_plan || '', request_id: q.id })}">Kiralama oluştur</a>` : ''}<span class="grow"></span><button class="btn primary">Kaydet</button></div></form>`) : ''}
  </div>`);
  $('#qf')?.addEventListener('submit', guard(async (e) => { e.preventDefault(); await PUT(`portal_requests/${q.id}`, readForm(e.target)); toast('Kaydedildi'); route(); }));
}

// ---------- cash register (kasa) ----------
async function cashPage(q) {
  const from = q.from || addDays(todayISO(), -30); const to = q.to || todayISO();
  const [d, pays] = await Promise.all([GET('cash', { from, to }), GET('payments', { limit: 3000 }).catch(() => [])]); const fw = can('finance', 'w');
  // payments that do not go through the cash box (bank transfer, SEPA, card, online)
  const bank = pays.filter((p) => p.date >= from && p.date <= to && !['nakit', 'depozitodan mahsup'].includes(p.method));
  // running balance (oldest first)
  let bal = d.opening; const asc = [...d.rows].reverse().map((m) => { bal += m.type === 'çıkış' ? -m.amount : m.amount; return { ...m, run: bal }; });
  const rows = asc.reverse().filter((m) => !q.q || `${m.category} ${m.description} ${m.user_name}`.toLowerCase().includes(q.q.toLowerCase()));
  const sIn = rows.filter((m) => m.type === 'giriş').reduce((a, m) => a + m.amount, 0); const sOut = rows.filter((m) => m.type === 'çıkış').reduce((a, m) => a + m.amount, 0);
  const cols = [{ l: 'Tarih', f: (m) => date(m.date), csv: (m) => m.date }, { l: 'Hareket', f: (m) => badge(m.type), csv: (m) => m.type }, { k: 'category', l: 'Kategori' },
    { l: 'Açıklama', f: (m) => `${esc(m.description || '')}${m.invoice_id ? ` · <a href="#/invoices/${m.invoice_id}">${esc(m.invoice_no)}</a>` : ''}${m.rental_id && !m.invoice_id ? ` · <a href="#/rentals/${m.rental_id}">${esc(m.contract_no || 'kiralama')}</a>` : ''}`, csv: (m) => m.description },
    { l: 'Tutar', f: (m) => `<b class="${m.type === 'çıkış' || m.amount < 0 ? 't-danger' : 't-ok'}">${m.type === 'çıkış' ? '−' : m.amount > 0 ? '+' : ''}${money(Math.abs(m.amount))}</b>`, cls: 'num', csv: (m) => (m.type === 'çıkış' ? -m.amount : m.amount) },
    { l: 'Bakiye', f: (m) => money(m.run), cls: 'num', csv: (m) => m.run }, { k: 'user_name', l: 'Kullanıcı' },
    ...(fw ? [{ l: '', f: (m) => (!m.payment_id && !m.deposit_id ? `<button class="icon-btn sm" data-delc="${m.id}" title="Sil">✕</button>` : '<small class="muted" title="Ödeme / depozitodan otomatik">oto</small>'), csv: null }] : [])];
  setMain(`${head('Kasa', 'Nakit giriş ve çıkışları. Nakit alınan ödemeler ve depozitolar kasaya otomatik işlenir.', `<button class="btn sm" id="csv">CSV</button>${fw ? '<button class="btn sm" id="count">Gün sonu sayımı</button><button class="btn sm" id="out">− Çıkış</button><button class="btn primary sm" id="in">+ Giriş</button>' : ''}`)}
  <div class="kpis">${kpi('Kasa bakiyesi', money(d.balance), d.last_count ? `Son sayım ${date(d.last_count.date)}` : 'Henüz sayım yapılmadı', 'hero')}${kpi('Bugün giriş', money(d.today_in))}${kpi('Bugün çıkış', money(d.today_out), '', d.today_out ? 'warn' : '')}${kpi('Bu ay net', money(d.month_in - d.month_out), `Giriş ${money(d.month_in)} · çıkış ${money(d.month_out)}`)}</div>
  <form class="toolbar" id="cf"><input type="search" name="q" placeholder="Kategori, açıklama…" value="${esc(q.q || '')}"><label class="inline">Başlangıç <input type="date" name="from" value="${from}"></label><label class="inline">Bitiş <input type="date" name="to" value="${to}"></label><button class="btn sm">Filtrele</button><span class="muted">Dönem: giriş <b>${money(sIn)}</b> · çıkış <b>${money(sOut)}</b> · açılış ${money(d.opening)}</span></form>
  ${card('', table(rows, cols, { empty: 'Bu dönemde kasa hareketi yok' }), 'flush')}
  ${card(`Kasaya girmeyen tahsilatlar <small class="muted">havale, SEPA, kart, online · aynı dönem · kasa bakiyesini etkilemez</small><span class="card-act"><b>${money(bank.reduce((x, p) => x + p.amount, 0))}</b></span>`, table(bank.slice(0, 50), [{ l: 'Tarih', f: (p) => date(p.date) }, { l: 'Fatura', f: (p) => (p.invoice_id ? `<a href="#/invoices/${p.invoice_id}">${esc(p.invoice_no)}</a>` : '—') }, { k: 'customer_label', l: 'Müşteri' }, { k: 'method', l: 'Yöntem' }, { l: 'Referans', f: (p) => esc(p.reference || '—') }, { l: 'Tutar', f: (p) => `<b class="t-ok">+${money(p.amount)}</b>`, cls: 'num' }], { empty: 'Bu dönemde banka / online tahsilat yok' }))}`);
  $('#cf').onsubmit = (e) => { e.preventDefault(); location.hash = `#/cash?${new URLSearchParams(readForm(e.target))}`; };
  $('#csv').onclick = () => csv(rows, cols.filter((c) => c.csv !== null), 'kasa');
  const moveForm = (type) => {
    const cats = type === 'giriş' ? CASH_IN : CASH_OUT;
    const b = modal(type === 'giriş' ? 'Kasaya giriş' : 'Kasadan çıkış', `<form class="grid-form"><label class="field"><span>Tarih</span><input name="date" type="date" value="${todayISO()}" required></label><label class="field"><span>Tutar (€)</span><input name="amount" type="number" step="0.01" min="0.01" required></label>
      <label class="field"><span>Kategori</span><select name="category">${cats.map((c) => `<option>${esc(c)}</option>`).join('')}</select></label><label class="field"><span>Açıklama</span><input name="description" placeholder="${type === 'giriş' ? 'Örn. parça satışı' : 'Örn. zincir yağı, fiş no 123'}"></label>
      <div class="form-actions span2"><button class="btn primary">Kaydet</button></div></form>`);
    b.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST('cash', { ...readForm(e.target), type }); closeModal(); toast('Kasa hareketi kaydedildi'); route(); });
  };
  $('#in')?.addEventListener('click', () => moveForm('giriş'));
  $('#out')?.addEventListener('click', () => moveForm('çıkış'));
  $('#count')?.addEventListener('click', () => {
    const b = modal('Gün sonu kasa sayımı', `<form class="grid-form"><p class="span2">Sisteme göre kasada <b>${money(d.balance)}</b> olmalı. Kasadaki parayı sayıp girin; fark varsa "sayım farkı" olarak kaydedilir ve bakiye sayılan tutara eşitlenir.</p>
      <label class="field"><span>Sayılan tutar (€)</span><input name="counted" type="number" step="0.01" required value="${d.balance}"></label><label class="field"><span>Tarih</span><input name="date" type="date" value="${todayISO()}"></label>
      <label class="field span2"><span>Not</span><input name="notes" placeholder="Örn. sayan: Ali"></label><div class="form-actions span2"><button class="btn primary">Sayımı kaydet</button></div></form>`);
    b.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); const x = await POST('cash/count', readForm(e.target)); closeModal(); toast(Math.abs(x.diff) < 0.005 ? 'Kasa tuttu, fark yok' : `Sayım farkı: ${money(x.diff)}`, Math.abs(x.diff) < 0.005 ? 'ok' : 'info'); route(); });
  });
  main().querySelectorAll('[data-delc]').forEach((b) => b.onclick = guard(async () => { if (await confirmBox('Kasa hareketi silinsin mi?')) { await DEL(`cash/${b.dataset.delc}`); route(); } }));
}

// ---------- invoices ----------
async function invoicesPage(q) {
  const tab = q.tab || 'open';
  const all = await GET('invoices', q.q ? { q: q.q } : {});
  const sets = { open: all.filter((i) => ['açık', 'kısmi'].includes(i.status)), overdue: all.filter((i) => i.days_late > 0), paid: all.filter((i) => i.status === 'ödendi'), all };
  const rows = sets[tab]; const fw = can('finance', 'w');
  const cols = [{ k: 'invoice_no', l: 'No' }, { k: 'customer_label', l: 'Müşteri' }, { k: 'contract_no', l: 'Sözleşme', f: (i) => esc(i.contract_no || '—') }, { l: 'Tarih', f: (i) => date(i.issue_date), csv: (i) => i.issue_date }, { l: 'Vade', f: (i) => date(i.due_date), csv: (i) => i.due_date },
    { l: 'Gecikme', f: (i) => (i.days_late ? `<b class="t-danger">${i.days_late} gün</b>` : '—'), csv: (i) => i.days_late }, { l: 'Toplam', f: (i) => money(i.total), cls: 'num', csv: (i) => i.total }, { l: 'Ödenen', f: (i) => money(i.paid_amount), cls: 'num', csv: (i) => i.paid_amount },
    { l: 'Kalan', f: (i) => (i.balance > 0.005 ? `<b>${money(i.balance)}</b>` : '—'), cls: 'num', csv: (i) => i.balance }, { l: 'Durum', f: (i) => badge(i.status), csv: (i) => i.status },
    ...(fw && ['open', 'overdue'].includes(tab) ? [{ l: '', f: (i) => waBtn(i, true), csv: null }] : [])];
  const sumBal = rows.reduce((a, i) => a + (i.status === 'iptal' ? 0 : i.balance), 0);
  setMain(`${head('Faturalar', 'Kiralama dönem faturaları, hasar/servis faturaları ve gecikmiş ödemeler.', `<button class="btn sm" id="csv">CSV</button>${fw ? '<button class="btn sm" id="bank">Banka dökümü içe aktar</button><button class="btn sm" id="gen">Dönem faturalarını oluştur</button><button class="btn primary sm" id="new">+ Fatura</button>' : ''}`)}
    <div class="toolbar"><input type="search" id="q" placeholder="Fatura no, müşteri, sözleşme…" value="${esc(q.q || '')}">${tabs([['open', 'Açık', sets.open.length], ['overdue', 'Geciken', sets.overdue.length], ['paid', 'Ödenen', sets.paid.length], ['all', 'Tümü', all.length]], tab)}<span class="muted">Kalan toplam: <b>${money(sumBal)}</b></span></div>
    ${card('', table(rows, cols, { link: (i) => `#/invoices/${i.id}` }), 'flush')}`);
  main().querySelectorAll('.tab').forEach((b) => b.onclick = () => { location.hash = `#/invoices?${new URLSearchParams({ ...q, tab: b.dataset.tab })}`; });
  $('#csv').onclick = () => csv(rows, cols.filter((c) => c.csv !== null), 'faturalar');
  bindWa(main());
  $('#bank')?.addEventListener('click', () => bankImportModal(route));
  $('#gen')?.addEventListener('click', guard(async () => { const x = await POST('invoices/generate'); toast(x.created ? `${x.created} yeni dönem faturası oluşturuldu` : 'Tüm aktif kiralamaların faturaları güncel', x.created ? 'ok' : 'info'); route(); }));
  $('#new')?.addEventListener('click', () => editForm('invoices', null, { defaults: { due_date: addDays(todayISO(), Number(session.settings.payment_terms_days) || 14), vat_rate: session.settings.vat_rate }, onSaved: (x) => x && (location.hash = `#/invoices/${x.id}`) }));
  let tm; $('#q').oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { location.hash = `#/invoices?${new URLSearchParams({ tab, q: e.target.value })}`; }, 350); };
}
function paymentForm(defaults, onSaved) {
  editForm('payments', null, { defaults: { date: todayISO(), method: 'banka havalesi', ...defaults }, onSaved });
}
async function invoicePage(id) {
  const i = await GET(`detail/invoices/${id}`); const fw = can('finance', 'w');
  let lang = docLangOf(i.customer, session.settings);
  const open = ['açık', 'kısmi'].includes(i.status);
  const s = session.settings;
  setMain(`${head(`Fatura ${esc(i.invoice_no)} <span class="h-badge">${badge(i.status)}</span>`, `${esc(i.customer.company_name || i.customer.name)} · vade ${date(i.due_date)}${i.days_late ? ` · <b class="t-danger">${i.days_late} gün gecikmede</b>` : ''}`,
    `${langSw(lang)}<button class="btn sm" id="print">Yazdır / PDF</button>${fw && open ? `${waBtn(i)}${i.customer.type === 'bireysel' ? '<button class="btn sm" id="premind" title="Sürücü ekranına ve Android uygulamasına bildirim">Uygulamaya hatırlat</button>' : ''}<button class="btn sm" id="remind">E-posta hatırlatma</button>${i.days_late ? '<button class="btn sm" id="fee">Gecikme bedeli ekle</button>' : ''}<button class="btn sm" id="edit">Düzenle</button><button class="btn primary sm" id="pay">Ödeme gir</button>` : ''}${fw && i.status === 'açık' && !i.paid_amount ? '<button class="btn sm danger ghost" id="cancel">İptal</button>' : ''}`)}
  ${i.days_late ? `<div class="alert warn">Bu fatura ${i.days_late} gündür ödenmedi. ${i.reminders_sent ? `${i.reminders_sent} hatırlatma gönderildi (son: ${dt(i.last_reminder_at)}).` : 'Henüz hatırlatma gönderilmedi.'} Ayarlardaki günlük ${money(s.late_fee_per_day)} oranıyla önerilen gecikme bedeli: <b>${money(i.suggested_late_fee)}</b>.</div>` : ''}
  <div class="grid g-2-1"><div class="card"><div class="card-b" id="docv">${invoiceDoc(i, lang)}</div></div>
  <div class="stack">${card('Ödemeler', table(i.payments, [{ l: 'Tarih', f: (p) => date(p.date) }, { k: 'method', l: 'Yöntem' }, { k: 'reference', l: 'Ref.' }, { l: 'Tutar', f: (p) => money(p.amount), cls: 'num' }, ...(fw ? [{ l: '', f: (p) => `<button class="icon-btn sm" data-delpay="${p.id}" title="Sil">✕</button>` }] : [])], { empty: 'Ödeme yok' }) + `<div class="total-row"><span>Kalan</span><b>${money(i.balance)}</b></div>`)}
  ${card('Bağlantılar', dl([['Müşteri', `<a href="#/customers/${i.customer.id}">${esc(i.customer.company_name || i.customer.name)}</a>`], ['Kiralama', i.rental ? `<a href="#/rentals/${i.rental.id}">${esc(i.rental.contract_no)}</a> · ${esc(i.rental.bike_code)}` : '—'], ['Servis', i.service_id ? `<a href="#/service/${i.service_id}">Servis kaydı</a>` : '—']]))}</div></div>`);
  onLang((l) => { lang = l; $('#docv').innerHTML = invoiceDoc(i, lang); });
  $('#print').onclick = () => printHtml(invoiceDoc(i, lang), `${lang === 'en' ? 'Invoice' : 'Rechnung'} ${i.invoice_no}`);
  bindWa(main(), route);
  $('#pay')?.addEventListener('click', () => paymentForm({ invoice_id: i.id, amount: i.balance }, route));
  $('#edit')?.addEventListener('click', () => editForm('invoices', i, { onSaved: (x) => (x ? route() : (location.hash = '#/invoices')) }));
  $('#fee')?.addEventListener('click', () => {
    const b = modal('Gecikme bedeli', `<form class="grid-form"><label class="field"><span>Tutar</span><input name="amount" type="number" step="0.01" value="${i.suggested_late_fee}"></label><div class="form-actions span2"><button class="btn primary">Faturaya ekle</button></div></form>`);
    b.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST(`invoices/${id}/late-fee`, readForm(e.target)); closeModal(); toast('Gecikme bedeli eklendi'); route(); });
  });
  $('#remind')?.addEventListener('click', guard(async () => {
    await POST(`invoices/${id}/remind`, { channel: 'e-posta' });
    const subj = encodeURIComponent(`${lang === 'en' ? 'Payment reminder' : 'Zahlungserinnerung'} ${i.invoice_no}`);
    const txt = encodeURIComponent(reminderText({ ...i, customer_name: i.customer.name, customer_lang: lang }));
    if (i.customer.email) window.open(`mailto:${i.customer.email}?subject=${subj}&body=${txt}`);
    toast('Hatırlatma kaydedildi'); route();
  }));
  $('#cancel')?.addEventListener('click', guard(async () => { if (await confirmBox('Fatura iptal edilsin mi?')) { await POST(`invoices/${id}/cancel`); route(); } }));
  $('#premind')?.addEventListener('click', guard(async () => { await POST(`invoices/${id}/remind`, { channel: 'sürücü ekranı' }); toast('Hatırlatma sürücü ekranına gönderildi'); route(); }));
  main().querySelectorAll('[data-delpay]').forEach((b) => b.onclick = guard(async () => { if (await confirmBox('Ödeme kaydı silinsin mi?')) { await DEL(`payments/${b.dataset.delpay}`); route(); } }));
}
function invoiceDoc(i, lang = docLangOf(i.customer, session.settings)) {
  const s = session.settings; const c = i.customer; const t = docT(lang); const M = (v) => dMoney(lang, v); const D = (v) => dDate(lang, v);
  return `<div class="doc"><div class="doc-h">${LOGO}<div class="doc-co"><b>${esc(s.company_name)}</b><br>${esc(s.company_address)}<br>${esc(s.company_phone)} · ${esc(s.company_email)}${s.company_tax_no ? `<br>${t.vat_id}: ${esc(s.company_tax_no)}` : ''}</div></div>
    <div class="doc-meta"><div><small>${t.bill_to}</small><br><b>${esc(c.company_name || c.name)}</b><br>${c.company_name ? esc(c.name) + '<br>' : ''}${esc(c.address || '')}${c.tax_no ? `<br>${t.tax_no}: ${esc(c.tax_no)}` : ''}</div>
    <div class="doc-no"><h2>${t.invoice}</h2>${dl([[t.invoice_no, esc(i.invoice_no)], [t.date, D(i.issue_date)], [t.due, D(i.due_date)], i.rental ? [t.contract_no, esc(i.rental.contract_no)] : null, i.period_start ? [t.service_period, `${D(i.period_start)} – ${D(i.period_end)}`] : null])}</div></div>
    <table class="tbl doc-t"><thead><tr><th>${t.description}</th><th class="num">${t.amount}</th></tr></thead><tbody><tr><td>${esc(invoiceText(lang, i.description))}</td><td class="num">${M(i.net)}</td></tr>${i.late_fee ? `<tr><td>${t.late_fee}</td><td class="num">${M(i.late_fee)}</td></tr>` : ''}</tbody>
    <tfoot><tr><td>${t.subtotal}</td><td class="num">${M(i.net)}</td></tr><tr><td>${t.vat} ${dNum(lang, i.vat_rate, 2)} %</td><td class="num">${M(i.vat)}</td></tr><tr class="grand"><td>${t.total}</td><td class="num">${M(i.total + (i.late_fee || 0))}</td></tr>${i.paid_amount ? `<tr><td>${t.paid}</td><td class="num">−${M(i.paid_amount)}</td></tr><tr class="grand"><td>${t.balance}</td><td class="num">${M(i.balance)}</td></tr>` : ''}</tfoot></table>
    <p class="doc-foot">${t.pay_note(D(i.due_date), s.company_iban ? esc(s.company_iban) : '')}</p></div>`;
}

// ---------- service ----------
async function servicePage(q) {
  const tab = q.tab || 'open';
  const all = await GET('service_orders', q.q ? { q: q.q } : {});
  const sets = { open: all.filter((s) => !['teslim edildi', 'iptal'].includes(s.status)), ready: all.filter((s) => s.status === 'hazır'), done: all.filter((s) => ['teslim edildi', 'iptal'].includes(s.status)), all };
  const rows = sets[tab];
  // bikes whose service period is due (next 7 days or overdue) and not already in service → call them in
  const [dueBikes, actRent] = can('fleet') ? await Promise.all([GET('bikes', { limit: 2000 }), GET('rentals', { status: 'aktif' }).catch(() => [])]) : [[], []];
  const riders = can('customers') ? await GET('riders').catch(() => []) : [];
  const due = dueBikes.filter((b) => b.next_service_date && b.next_service_date <= addDays(todayISO(), 7) && !['serviste', 'hizmet dışı', 'kayıp/çalıntı'].includes(b.status) && !all.some((x) => x.bike_id === b.id && !['teslim edildi', 'iptal'].includes(x.status)))
    .sort((a, b) => (a.next_service_date < b.next_service_date ? -1 : 1))
    .map((b) => { const r = actRent.find((x) => x.bike_id === b.id); const rd = riders.find((x) => x.id === r?.rider_id); return { ...b, rental: r, rider: rd }; });
  const waCall = (b) => { const ph = String(b.rider?.phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^0/, '49'); if (!ph) return ''; const L = b.rider?.lang || 'de';
    const msg = { tr: `Merhaba ${b.rider.name}, ${b.code} bisikletinin rutin bakım zamanı geldi (${date(b.next_service_date)}). Size uygun bir gün için sürücü ekranından randevu alabilir veya bu mesaja cevap verebilirsiniz. ${session.settings.company_name}`, de: `Hallo ${b.rider.name}, für Ihr Fahrrad ${b.code} steht die regelmäßige Wartung an (${date(b.next_service_date)}). Bitte buchen Sie im Fahrerbereich einen Termin oder antworten Sie auf diese Nachricht. ${session.settings.company_name}`, en: `Hi ${b.rider.name}, your bike ${b.code} is due for its routine service (${date(b.next_service_date)}). Please book a slot on the rider screen or reply to this message. ${session.settings.company_name}` }[L] || '';
    return `<a class="btn sm wa" href="https://wa.me/${ph}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp ile çağır</a>`; };
  const dueCard = due.length ? card(`Bakımı gelen bisikletler <span class="cnt">${due.length}</span> <small class="muted">sürücü ekranında da "bakım zamanı" bildirimi görünür</small>`, table(due, [{ l: 'Bisiklet', f: (b) => `<a href="#/bikes/${b.id}"><b>${esc(b.code)}</b></a> ${esc(b.model || '')}` }, { l: 'Bakım tarihi', f: (b) => (b.next_service_date < todayISO() ? `<b class="t-danger">${date(b.next_service_date)}</b>` : `<b class="t-warn">${date(b.next_service_date)}</b>`) }, { l: 'Sürücü', f: (b) => (b.rider ? `<a href="#/riders/${b.rider.id}">${esc(b.rider.name)}</a>${b.rider.phone ? ` · <a href="tel:${esc(b.rider.phone)}">${esc(b.rider.phone)}</a>` : ''}` : `<span class="muted">${esc(b.status)}</span>`) }, { l: '', f: (b) => `<div class="row-acts">${waCall(b)}${can('service', 'w') ? `<a class="btn sm" href="#/service/new?bike_id=${b.id}">Servis kaydı aç</a>` : ''}</div>` }])) : '';
  const cols = [{ k: 'order_no', l: 'Servis no' }, { k: 'bike_code', l: 'Bisiklet' }, { l: 'Tip', f: (s) => esc(s.type), csv: (s) => s.type }, { l: 'Şikayet', f: (s) => esc((s.complaint || '').slice(0, 60)), csv: (s) => s.complaint }, { l: 'Kabul', f: (s) => dt(s.received_at), csv: (s) => s.received_at },
    { l: 'Tahmini hazır', f: (s) => (s.estimated_ready && s.estimated_ready < todayISO() && !['teslim edildi', 'iptal'].includes(s.status) ? `<b class="t-danger">${date(s.estimated_ready)}</b>` : date(s.estimated_ready)), csv: (s) => s.estimated_ready },
    { l: 'Teknisyen', f: (s) => esc(s.technician_name || '—'), csv: (s) => s.technician_name }, { l: 'Parça', f: (s) => money(s.parts_total), cls: 'num', csv: (s) => s.parts_total }, { l: 'Durum', f: (s) => badge(s.status), csv: (s) => s.status }];
  setMain(`${head('Servis kayıtları', 'Servis kabul formu, teşhis, parça kullanımı ve teslim.', `<button class="btn sm" id="csv">CSV</button>${can('service', 'w') ? '<a class="btn primary sm" href="#/service/new">+ Servis kabul formu</a>' : ''}`)}
    ${dueCard}
    <div class="toolbar"><input type="search" id="q" placeholder="Servis no, bisiklet, şikayet…" value="${esc(q.q || '')}">${tabs([['open', 'Açık', sets.open.length], ['ready', 'Teslime hazır', sets.ready.length], ['done', 'Kapanan', sets.done.length], ['all', 'Tümü', all.length]], tab)}</div>
    ${tab === 'open' ? `<div class="kanban">${SERVICE_STATUS.slice(0, 5).map((st) => `<div class="kcol"><div class="kcol-h">${badge(st)} <span class="muted">${all.filter((s) => s.status === st).length}</span></div>${all.filter((s) => s.status === st).map((s) => `<a class="kcard" href="#/service/${s.id}"><b>${esc(s.bike_code)}</b> <small class="muted">${esc(s.order_no)}</small><p>${esc((s.complaint || '').slice(0, 80))}</p><small>${esc(s.technician_name || 'atanmadı')} · ${s.estimated_ready && s.estimated_ready < todayISO() ? `<b class="t-danger">${date(s.estimated_ready)}</b>` : date(s.estimated_ready)}</small></a>`).join('')}</div>`).join('')}</div>` : card('', table(rows, cols, { link: (s) => `#/service/${s.id}` }), 'flush')}`);
  main().querySelectorAll('.tab').forEach((b) => b.onclick = () => { location.hash = `#/service?${new URLSearchParams({ ...q, tab: b.dataset.tab })}`; });
  $('#csv').onclick = () => csv(rows, cols, 'servis');
  let tm; $('#q').oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { location.hash = `#/service?${new URLSearchParams({ tab: 'all', q: e.target.value })}`; }, 350); };
}
const CHECK_ITEMS = ['Frenler (ön/arka)', 'Lastikler ve hava basıncı', 'Zincir / kayış', 'Vites', 'Işıklar (ön/arka)', 'Zil / korna', 'Batarya ve şarj soketi', 'Ekran / kumanda', 'Motor desteği', 'Kargo kutusu / kilit', 'Ayaklık (sehpa)', 'Gövde / boya'];
async function newServicePage(q) {
  const [bikes, techs, active] = await Promise.all([GET('bikes'), lookup('users', { role: 'servis' }).catch(() => []), GET('rentals', { status: 'aktif' }).catch(() => [])]);
  const f = (k) => field('service_orders', k);
  const rq = q.request_id ? await GET(`portal_requests/${q.request_id}`).catch(() => null) : null;
  setMain(`${head('Servis kabul formu', 'Bisiklet servise girerken doldurulur; kaydettikten sonra yazdırıp müşteriye imzalatabilirsiniz.')}
  <div class="card scan-card"><div class="card-b scan-row"><button type="button" class="btn primary" id="qrscan">${icon('qr')} QR okut</button>
    <form id="qrf" class="scan-in"><input id="qrin" placeholder="veya QR / bisiklet kodunu yazın (el okuyucu da olur)" autocomplete="off"><button class="btn">Getir</button></form><span id="qrmsg" class="muted"></span></div></div>
  <form id="sf" class="card"><div class="card-b grid-form three">
    <label class="field"><span>Bisiklet *</span><select name="bike_id" required><option value="">Seçin…</option>${bikes.map((b) => `<option value="${b.id}" data-km="${b.odometer_km ?? ''}" data-bat="${b.battery_level ?? ''}" ${String(q.bike_id) === String(b.id) ? 'selected' : ''}>${esc(b.code)} · ${esc(b.model)} (${esc(b.status)})</option>`).join('')}</select></label>
    ${inputHtml(f('type'), 'arıza')}
    ${inputHtml(f('received_at'), new Date().toISOString().slice(0, 16).replace('T', ' '))}
    ${inputHtml(f('customer_id'), '')}
    <label class="field"><span>Teslim eden kişi</span><select name="brought_by_rider_id"><option value="">Önce bisiklet / müşteri seçin</option></select></label>
    <label class="field" id="bb_other" hidden><span>Teslim eden (ad soyad)</span><input name="brought_by" placeholder="Listede yoksa adını yazın"></label>
    ${inputHtml({ k: 'technician_id', l: 'Teknisyen', t: 'select', o: techs.map((t) => ({ v: t.id, l: t.label })) }, '')}
    ${inputHtml(f('km'), '')}${inputHtml(f('battery_level'), '')}${inputHtml(f('estimated_ready'), addDays(todayISO(), 2))}
    <label class="field span3"><span>Şikayet / talep *</span><textarea name="complaint" rows="2" required>${esc(rq ? `${rq.type}: ${rq.notes || ''}` : '')}</textarea></label>
    <div class="span3"><span class="lbl">Kabul kontrol listesi</span><div class="checklist">${CHECK_ITEMS.map((c, i) => `<div class="ck"><span>${esc(c)}</span><div class="seg">${['ok', 'sorun', 'yok'].map((v) => `<label><input type="radio" name="ck_${i}" value="${v}" ${v === 'ok' ? 'checked' : ''}><span>${v === 'ok' ? 'Sağlam' : v === 'sorun' ? 'Sorunlu' : 'Yok'}</span></label>`).join('')}</div></div>`).join('')}</div></div>
    <label class="field span3"><span>Görsel durum / mevcut hasarlar</span><textarea name="visual_condition" rows="2"></textarea></label>
    <label class="field span2"><span>Bırakılan aksesuarlar</span><input name="accessories" placeholder="Şarj aleti, kilit, anahtar x2…"></label>
    ${inputHtml(f('estimated_cost'), '')}
    ${inputHtml(f('signature_name'), '')}
    <label class="check"><input type="checkbox" name="billable"> Müşteriye faturalanacak</label>
  </div><div class="card-f"><span class="grow"></span><a class="btn" href="#/service">Vazgeç</a><button class="btn primary">Kaydet ve formu aç</button></div></form>`);
  const form = $('#sf'); await fillRefs(form);
  let riders = [];
  const pickOther = () => { const other = form.brought_by_rider_id.value === 'other'; $('#bb_other').hidden = !other; if (!other) form.brought_by.value = ''; };
  const loadRiders = async (preselect) => {
    const cid = form.customer_id.value;
    riders = cid ? await GET('riders', { customer_id: cid, active: 1 }).catch(() => []) : [];
    form.brought_by_rider_id.innerHTML = riders.map((r) => `<option value="${r.id}">${esc(r.name)}${r.phone ? ' · ' + esc(r.phone) : ''}</option>`).join('')
      + `<option value="filo">Pedalla çalışanı (filo operasyonu)</option><option value="other">Diğer (adını yaz)</option>`;
    form.brought_by_rider_id.value = preselect || (riders[0] ? String(riders[0].id) : 'filo');
    pickOther();
  };
  form.brought_by_rider_id.onchange = pickOther;
  form.customer_id.onchange = () => loadRiders();
  form.bike_id.onchange = async () => {
    const o = form.bike_id.selectedOptions[0]; form.km.value = o?.dataset.km || ''; form.battery_level.value = o?.dataset.bat || '';
    const rent = active.find((r) => String(r.bike_id) === form.bike_id.value);
    if (rent) form.customer_id.value = String(rent.customer_id);
    await loadRiders(rent?.rider_id ? String(rent.rider_id) : null);
  };
  await loadRiders();
  if (q.bike_id) form.bike_id.onchange();
  const useCode = async (txt) => {
    const b = await findBikeByCode(txt);
    form.bike_id.value = String(b.id); await form.bike_id.onchange();
    $('#qrmsg').innerHTML = `<b class="t-ok">✓ ${esc(b.code)}</b> bulundu, bilgiler dolduruldu`; $('#qrin').value = '';
    form.querySelector('[name=complaint]').focus();
  };
  $('#qrscan').onclick = guard(async () => { const txt = await scanQR(); if (txt) await useCode(txt); });
  $('#qrf').onsubmit = guard(async (e) => { e.preventDefault(); const v = $('#qrin').value.trim(); if (v) await useCode(v); });
  if (!q.bike_id) $('#qrin').focus();
  form.onsubmit = guard(async (e) => {
    e.preventDefault(); const d = readForm(form); d.checklist = {}; if (q.request_id) d.request_id = q.request_id;
    CHECK_ITEMS.forEach((c, i) => { d.checklist[c] = form.querySelector(`[name=ck_${i}]:checked`)?.value; delete d[`ck_${i}`]; });
    const pick = d.brought_by_rider_id;
    if (pick === 'filo') { d.brought_by = 'Pedalla filo operasyonu'; d.brought_by_rider_id = ''; }
    else if (pick === 'other') { if (!d.brought_by) throw new Error('Teslim eden kişinin adını yazın.'); d.brought_by_rider_id = ''; }
    else if (pick) { const r = riders.find((x) => String(x.id) === pick); d.brought_by = r?.name || ''; }
    if (!d.signature_name) d.signature_name = d.brought_by;
    const s = await POST('service_orders', d); clearLookups(); toast(`${s.order_no} açıldı`); location.hash = `#/service/${s.id}`;
  });
}
// used parts: tick the boxes (parts that fit this bike's model come first), set quantities, add them all at once
function partsPicker(parts, bike) {
  const model = `${bike.brand || ''} ${bike.model || ''}`.toLowerCase();
  const fits = (p) => (p.compatible || '').toLowerCase().split(/[,;/]/).map((x) => x.trim()).filter((x) => x.length > 2).some((x) => model.includes(x) || x.includes((bike.model || '').toLowerCase()) || /tüm|alle|all/.test(x));
  const list = parts.map((p) => ({ ...p, fit: fits(p) })).sort((a, b) => (b.fit - a.fit) || (b.stock > 0) - (a.stock > 0) || a.name.localeCompare(b.name, 'tr'));
  const cats = [...new Set(list.map((p) => p.category).filter(Boolean))];
  return `<div class="pp-box" id="pp"><div class="pp-head"><b>Kullanılan malzemeleri seçin</b><input type="search" id="ppq" placeholder="Parça ara (kod, ad, model)…"></div>
    <div class="chips pp-cats"><button type="button" class="chip on" data-c="">Tümü</button>${list.some((p) => p.fit) ? '<button type="button" class="chip" data-c="__fit">Bu bisiklete uygun</button>' : ''}${cats.map((c) => `<button type="button" class="chip" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="pp-grid">${list.map((p) => `<div class="pp ${p.stock <= 0 ? 'off' : ''}" data-id="${p.id}" data-c="${esc(p.category || '')}" data-fit="${p.fit ? 1 : ''}" data-s="${esc(`${p.sku} ${p.name} ${p.compatible || ''}`.toLowerCase())}">
      <label><input type="checkbox" class="ppc" ${p.stock <= 0 ? 'disabled' : ''}><span><b>${esc(p.name)}</b><small>${esc(p.sku)} · ${tr('stok')} ${num(p.stock, 2)} ${esc(tr(p.unit))} · ${money(p.price)}${p.fit ? ` · <span class="t-ok">${tr('uygun')}</span>` : ''}</small></span></label>
      <input type="number" class="ppq" min="0.5" step="0.5" value="1" max="${p.stock}" ${p.stock <= 0 ? 'disabled' : ''} aria-label="Miktar"></div>`).join('') || '<div class="empty">Parça kataloğu boş</div>'}</div>
    <div class="pp-foot"><span id="ppn" class="muted">Seçili parça yok</span><button type="button" class="btn primary sm" id="ppadd" disabled>Seçilenleri ekle (stoktan düş)</button></div></div>`;
}
function bindPartsPicker(serviceId) {
  const box = $('#pp'); if (!box) return;
  let cat = '';
  const filter = () => { const q = $('#ppq').value.trim().toLowerCase(); box.querySelectorAll('.pp').forEach((el) => { el.hidden = !((!q || el.dataset.s.includes(q)) && (!cat || (cat === '__fit' ? el.dataset.fit : el.dataset.c === cat)) || el.querySelector('.ppc').checked); }); };
  const sel = () => [...box.querySelectorAll('.pp')].filter((el) => el.querySelector('.ppc').checked).map((el) => ({ part_id: Number(el.dataset.id), qty: Number(el.querySelector('.ppq').value) || 0, name: el.querySelector('b').textContent }));
  const upd = () => { const x = sel(); box.querySelectorAll('.pp').forEach((el) => el.classList.toggle('on', el.querySelector('.ppc').checked)); $('#ppn').textContent = x.length ? `${x.length} parça seçildi` : 'Seçili parça yok'; $('#ppadd').disabled = !x.length; };
  $('#ppq').oninput = filter;
  box.querySelectorAll('.pp-cats .chip').forEach((c) => (c.onclick = () => { cat = c.dataset.c; box.querySelector('.pp-cats .on')?.classList.remove('on'); c.classList.add('on'); filter(); }));
  box.querySelectorAll('.ppc').forEach((c) => c.addEventListener('change', upd));
  box.querySelectorAll('.ppq').forEach((q) => q.addEventListener('input', () => { const c = q.closest('.pp').querySelector('.ppc'); if (!c.disabled && Number(q.value) > 0 && !c.checked) { c.checked = true; upd(); } }));
  $('#ppadd').onclick = guard(async () => {
    const items = sel().filter((x) => x.qty > 0); let okN = 0; const fails = [];
    for (const it of items) { try { await POST(`service_orders/${serviceId}/parts`, { part_id: it.part_id, qty: it.qty }); okN++; } catch (e) { fails.push(`${it.name}: ${e.message}`); } }
    await route();
    if (fails.length) modal(`${okN} parça eklendi, ${fails.length} parça eklenemedi`, `<ul class="results">${fails.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`);
    else toast(`${okN} parça eklendi, stoktan düşüldü`, 'ok');
  });
}
// ---------- QR scanning (phone / laptop camera) ----------
async function findBikeByCode(txt) {
  const m = String(txt).match(/#\/b\/([A-Za-z0-9-]+)/); const code = (m ? m[1] : String(txt).trim().split(/[\s/]/).pop());
  return await GET(`bikes/by-uid/${encodeURIComponent(code)}`);
}
const loadScript = (src) => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = () => no(new Error('Tarayıcı QR okuyucuyu yükleyemedi.')); document.head.appendChild(el); });
// opens the camera in a modal and resolves with the QR text (null when closed)
async function scanQR() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Bu tarayıcı kameraya erişemiyor. Kodu elle yazın veya el okuyucu kullanın.');
  const native = 'BarcodeDetector' in window && (await window.BarcodeDetector.getSupportedFormats?.().catch(() => []))?.includes('qr_code');
  if (!native) await loadScript('vendor/jsqr/jsQR.js');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
  catch { throw new Error('Kamera izni verilmedi. Tarayıcı ayarlarından kamera izni verin veya kodu elle yazın.'); }
  return await new Promise((resolve) => {
    const body = modal('QR okut', `<div class="qr-cam"><video playsinline muted autoplay></video><div class="qr-frame"></div></div><p class="muted">Bisikletin üzerindeki QR etiketini kameraya gösterin.</p>`);
    const video = body.querySelector('video'); video.srcObject = stream;
    const det = native ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
    const cv = document.createElement('canvas'); const ctx = cv.getContext('2d', { willReadFrequently: true });
    let done = false;
    const finish = (val) => { if (done) return; done = true; stream.getTracks().forEach((t) => t.stop()); obs.disconnect(); closeModal(); resolve(val); };
    const obs = new MutationObserver(() => { if (!document.body.contains(video)) finish(null); }); obs.observe(document.body, { childList: true, subtree: true });
    const tick = async () => {
      if (done) return;
      if (video.readyState >= 2) {
        try {
          if (det) { const r = await det.detect(video); if (r[0]?.rawValue) return finish(r[0].rawValue); }
          else { const w = Math.min(640, video.videoWidth); const h = Math.round(video.videoHeight * (w / video.videoWidth)); cv.width = w; cv.height = h; ctx.drawImage(video, 0, 0, w, h); const r = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' }); if (r?.data) return finish(r.data); }
        } catch {}
      }
      setTimeout(tick, 150);
    };
    tick();
  });
}
async function serviceDetailPage(id) {
  const s = await GET(`detail/service_orders/${id}`); const w = can('service', 'w');
  let lang = docLangOf(s.customer, session.settings);
  const closed = ['teslim edildi', 'iptal'].includes(s.status);
  const parts = w && !closed ? await GET('parts') : [];
  const techs = await lookup('users', { role: 'servis' }).catch(() => []);
  const steps = SERVICE_STATUS.filter((x) => x !== 'iptal');
  setMain(`${head(`${esc(s.order_no)} <span class="h-badge">${badge(s.status)}</span>`, `<a href="#/bikes/${s.bike.id}">${esc(s.bike.code)}</a> · ${esc(s.bike.brand)} ${esc(s.bike.model)} · ${esc(s.type)}`,
    `${langSw(lang)}<button class="btn sm" id="pintake">Kabul formunu yazdır</button><button class="btn sm" id="preport">Servis raporu</button>`)}
  ${s.report_id ? `<div class="alert ${s.urgent ? 'danger' : 'warn'}">Bu kayıt sürücü ekranından gelen arıza bildirimiyle otomatik açıldı${s.urgent ? ' · <b>sürücü bisikleti kullanamıyor</b>' : ''}. ${s.brought_by_rider ? `<a href="#/riders/${s.brought_by_rider.id}">${esc(s.brought_by_rider.name)}</a>${s.brought_by_rider.phone ? ` · <a href="tel:${esc(s.brought_by_rider.phone)}">${esc(s.brought_by_rider.phone)}</a>` : ''}` : ''} · <a href="#/portal_requests/${s.report_id}">bildirim</a></div>` : ''}
  <div class="steps">${steps.map((st, i) => `<button class="step ${st === s.status ? 'on' : ''} ${steps.indexOf(s.status) > i ? 'done' : ''}" data-st="${st}" ${!w || closed ? 'disabled' : ''}><span>${i + 1}</span>${st}</button>`).join('')}</div>
  <div class="grid g-2">
    ${card('Kabul bilgileri', dl([['Kabul', `${dt(s.received_at)} · ${esc(s.received_by_name || '')}`], ['Getiren', `${esc(s.brought_by || '—')}${s.customer ? ` · <a href="#/customers/${s.customer.id}">${esc(s.customer.company_name || s.customer.name)}</a>` : ''}`], ['Km / batarya', `${num(s.km)} km · ${s.battery_level != null ? '%' + s.battery_level : '—'}`], ['Şikayet', esc(s.complaint)], ['Görsel durum', esc(s.visual_condition)], ['Aksesuarlar', esc(s.accessories)], ['Tahmini', `${money(s.estimated_cost)} · ${date(s.estimated_ready)}`], ['İmzalayan', esc(s.signature_name)], ['Teslim', dt(s.delivered_at)]])
      + `<div class="checklist ro">${s.checklist_items.map((c) => `<div class="ck"><span>${esc(c)}</span>${s.checklist[c] ? badge(s.checklist[c] === 'ok' ? 'müsait' : s.checklist[c] === 'sorun' ? 'arızalı' : 'hizmet dışı', s.checklist[c] === 'ok' ? 'sağlam' : s.checklist[c]) : '<span class="muted">—</span>'}</div>`).join('')}</div>`)}
    ${card('Teşhis & işçilik', `<form id="wf" class="grid-form">
      <label class="field"><span>Teknisyen</span><select name="technician_id" ${!w || closed ? 'disabled' : ''}><option value="">—</option>${techs.map((t) => `<option value="${t.id}" ${t.id === s.technician_id ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select></label>
      ${inputHtml(field('service_orders', 'estimated_ready'), s.estimated_ready, { disabled: !w || closed })}
      ${inputHtml(field('service_orders', 'diagnosis'), s.diagnosis, { disabled: !w || closed })}
      ${inputHtml(field('service_orders', 'work_done'), s.work_done, { disabled: !w || closed })}
      ${inputHtml(field('service_orders', 'labor_hours'), s.labor_hours, { disabled: !w || closed })}
      ${inputHtml(field('service_orders', 'labor_rate'), s.labor_rate, { disabled: !w || closed })}
      ${inputHtml(field('service_orders', 'billable'), s.billable, { disabled: !w || closed })}
      ${w && !closed ? '<div class="form-actions span2"><button class="btn primary">Kaydet</button></div>' : ''}</form>`)}
  </div>
  ${card('Kullanılan parçalar', table(s.parts, [{ k: 'sku', l: 'Kod' }, { k: 'name', l: 'Parça' }, { l: 'Miktar', f: (p) => `${num(p.qty, 2)} ${esc(p.unit)}`, cls: 'num' }, { l: 'Birim fiyat', f: (p) => money(p.unit_price), cls: 'num' }, { l: 'Tutar', f: (p) => money(p.qty * p.unit_price), cls: 'num' }, ...(w && !closed ? [{ l: '', f: (p) => `<button class="icon-btn sm" data-rmp="${p.id}" title="Kaldır (stoğa geri al)">✕</button>` }] : [])], { empty: 'Henüz parça kullanılmadı' })
    + (w && !closed ? partsPicker(parts, s.bike) : '')
    + `<div class="totals"><div><span>Parça</span><b>${money(s.parts_total)}</b></div><div><span>İşçilik (${num(s.labor_hours, 2)} sa × ${money(s.labor_rate)})</span><b>${money(s.labor_total)}</b></div><div class="grand"><span>Toplam (net)</span><b>${money(s.grand_total)}</b></div></div>`)}
  ${s.report_id ? photoCard('service_id', s.id, false, 'Sürücünün gönderdiği fotoğraflar') : ''}`);
  loadPhotos(main());
  onLang((l) => { lang = l; });
  $('#pintake').onclick = () => printHtml(intakeDoc(s, lang), `${lang === 'en' ? 'Service intake' : 'Serviceannahme'} ${s.order_no}`);
  $('#preport').onclick = () => printHtml(serviceReportDoc(s, lang), `${lang === 'en' ? 'Service report' : 'Servicebericht'} ${s.order_no}`);
  main().querySelectorAll('.step').forEach((b) => b.onclick = guard(async () => {
    if (b.dataset.st === 'teslim edildi' && !(await confirmBox(`Servis kapatılsın ve bisiklet teslim edilsin mi?${s.billable ? ' Müşteriye fatura kesilecek.' : ''}`))) return;
    await PUT(`service_orders/${id}`, { status: b.dataset.st }); toast(`Durum: ${b.dataset.st}`); route();
  }));
  $('#wf')?.addEventListener('submit', guard(async (e) => { e.preventDefault(); await PUT(`service_orders/${id}`, readForm(e.target)); toast('Kaydedildi'); route(); }));
  bindPartsPicker(id);
  main().querySelectorAll('[data-rmp]').forEach((b) => b.onclick = guard(async () => { await DEL(`service_parts/${b.dataset.rmp}`); toast('Parça kaldırıldı, stoğa iade edildi'); route(); }));
}
function docHeader(title, no) {
  const s = session.settings;
  return `<div class="doc-h">${LOGO}<div class="doc-co"><b>${esc(s.company_name)}</b><br>${esc(s.company_address)}<br>${esc(s.company_phone)} · ${esc(s.company_email)}</div></div><h2 class="doc-title">${title} <small>${esc(no)}</small></h2>`;
}
const termsFor = (key, lang) => session.settings[`${key}_${lang}`] || session.settings[key] || '';
function intakeDoc(s, lang = docLangOf(s.customer, session.settings)) {
  const t = docT(lang); const D = (v) => dDateTime(lang, v);
  return `<div class="doc">${docHeader(t.intake, s.order_no)}
  <div class="doc-2">${dl([[t.received_at, D(s.received_at)], [t.received_by, esc(s.received_by_name)], [t.brought_by, `${esc(s.brought_by || '—')}${s.brought_by_rider ? `<br><small>${esc(s.brought_by_rider.phone || '')}${s.brought_by_rider.id_no ? ` · ${esc(tv(lang, s.brought_by_rider.id_type) || t.id_number)}: ${esc(s.brought_by_rider.id_no)}` : ''}</small>` : ''}`], [t.customer, esc(s.customer ? s.customer.company_name || s.customer.name : t.fleet)], [t.service_type, esc(tv(lang, s.type))]])}
  ${dl([[t.bike, `${esc(s.bike.code)} · ${esc(s.bike.brand)} ${esc(s.bike.model)}`], [t.frame_no, esc(s.bike.frame_no)], [t.battery_no, esc(s.bike.battery_no)], [t.km, dNum(lang, s.km)], [t.battery, s.battery_level != null ? s.battery_level + ' %' : '—']])}</div>
  <h3>${t.complaint}</h3><p class="box">${esc(s.complaint)}</p>
  <h3>${t.checklist}</h3><table class="tbl doc-t ck-t"><thead><tr><th>${t.check}</th><th>${t.ok}</th><th>${t.issue}</th><th>${t.missing}</th></tr></thead><tbody>${s.checklist_items.map((c) => `<tr><td>${esc(tv(lang, c))}</td>${['ok', 'sorun', 'yok'].map((v) => `<td class="c">${s.checklist[c] === v ? '☒' : '☐'}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <h3>${t.visual}</h3><p class="box">${esc(s.visual_condition || '—')}</p>
  <div class="doc-2">${dl([[t.left_acc, esc(s.accessories || '—')], [t.est_cost, s.estimated_cost != null ? dMoney(lang, s.estimated_cost) : '—'], [t.est_ready, dDate(lang, s.estimated_ready)]])}<div></div></div>
  <p class="small">${esc(termsFor('service_terms', lang))}</p>
  <div class="sign"><div><span>${t.handed_by}</span><b>${esc(s.signature_name || s.brought_by || '')}</b></div><div><span>${t.taken_by} (${esc(session.settings.company_name)})</span><b>${esc(s.received_by_name || '')}</b></div></div></div>`;
}
function serviceReportDoc(s, lang = docLangOf(s.customer, session.settings)) {
  const t = docT(lang); const M = (v) => dMoney(lang, v);
  return `<div class="doc">${docHeader(t.report, s.order_no)}
  ${dl([[t.bike, `${esc(s.bike.code)} · ${esc(s.bike.brand)} ${esc(s.bike.model)}`], [t.received_delivered, `${dDateTime(lang, s.received_at)} → ${dDateTime(lang, s.delivered_at)}`], [t.complaint, esc(s.complaint)], [t.diagnosis, esc(s.diagnosis)], [t.work_done, esc(s.work_done)]])}
  <table class="tbl doc-t"><thead><tr><th>${t.item}</th><th class="num">${t.qty}</th><th class="num">${t.unit_price}</th><th class="num">${t.amount}</th></tr></thead><tbody>${s.parts.map((p) => `<tr><td>${esc(p.sku)} ${esc(p.name)}</td><td class="num">${dNum(lang, p.qty, 2)}</td><td class="num">${M(p.unit_price)}</td><td class="num">${M(p.qty * p.unit_price)}</td></tr>`).join('')}<tr><td>${t.labor}</td><td class="num">${dNum(lang, s.labor_hours, 2)} ${t.hours}</td><td class="num">${M(s.labor_rate)}</td><td class="num">${M(s.labor_total)}</td></tr></tbody>
  <tfoot><tr class="grand"><td colspan="3">${t.total_net}</td><td class="num">${M(s.grand_total)}</td></tr></tfoot></table>
  <div class="sign"><div><span>${t.technician}</span><b>${esc(s.technician_name || '')}</b></div><div><span>${t.received_sig}</span><b></b></div></div></div>`;
}
function printHtml(html, title) {
  let p = document.getElementById('printarea'); if (!p) { p = document.createElement('div'); p.id = 'printarea'; document.body.appendChild(p); }
  p.innerHTML = html; const t = document.title; document.title = title; document.body.classList.add('printing');
  setTimeout(() => { window.print(); document.title = t; document.body.classList.remove('printing'); }, 50);
}

function contractDoc(r, lang = docLangOf(r.customer, session.settings)) {
  return contractHtml(r, session.settings, lang, { header: docHeader(docT(lang).contract, r.contract_no) });
}
// DE / EN switch shown next to every printable document
const langSw = (cur) => `<div class="seg lang-sw" title="Belge dili">${Object.entries(DOC_LANG_LABEL).map(([k, l]) => `<label><input type="radio" name="doclang" value="${k}" ${k === cur ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
const onLang = (fn) => main().querySelectorAll('input[name=doclang]').forEach((x) => x.addEventListener('change', () => fn(x.value)));
async function contractPage(id) {
  const r = await GET(`detail/rentals/${id}`);
  let lang = docLangOf(r.customer, session.settings);
  setMain(`${head(`Sözleşme ${esc(r.contract_no)}`, r.sign_state?.complete ? 'Sözleşme elektronik olarak imzalandı; imzalar ve kanıt bilgileri (tarih, IP, sağlama değeri) çıktıda yer alır.' : 'Sürücü sözleşmeyi sürücü ekranından telefonla imzalayabilir veya kiralama sayfasındaki "Burada imzalat" ile tablette imzalanır. Kâğıtla imzalatmak için yazdırın; imzalı kâğıdı "Belge tara" ile kiralamaya yükleyin.', `${langSw(lang)}<a class="btn sm" href="#/rentals/${r.id}">← Kiralamaya dön</a><button class="btn primary sm" id="print">Yazdır / PDF</button>`)}
    ${!r.rider?.id_no ? `<div class="alert warn">Bisikleti teslim alan kişinin kimlik bilgileri eksik. <a href="#/rentals/${r.id}">Kiralamayı açıp</a> "Düzenle" ile sürücüyü seçin, sürücü kartından kimliği tamamlayın.</div>` : ''}
    <div class="card doc-card"><div class="card-b" id="docv">${contractDoc(r, lang)}</div></div>`);
  onLang((l) => { lang = l; $('#docv').innerHTML = contractDoc(r, lang); });
  $('#print').onclick = () => printHtml(contractDoc(r, lang), `${lang === 'en' ? 'Rental agreement' : 'Mietvertrag'} ${r.contract_no}`);
}
// ---------- parts ----------
async function partsPage(q) {
  const rows = await GET('parts', q); const w = can('stock', 'w');
  const cols = colsFromMeta('parts').map((c) => (c.k === 'stock' ? { ...c, f: (r) => `<b class="${r.stock <= 0 ? 't-danger' : r.low ? 't-warn' : ''}">${num(r.stock, 2)}</b> ${esc(r.unit)}` } : c));
  const value = rows.reduce((a, p) => a + p.stock * p.cost, 0);
  setMain(`${head('Yedek parçalar', 'Parça kataloğu, stok seviyeleri ve kritik stok uyarıları.', `<button class="btn sm" id="csv">CSV</button><a class="btn sm" href="#/parts/order">Sipariş listesi oluştur</a>${w ? '<button class="btn sm" id="move">Stok girişi / çıkışı</button><button class="btn primary sm" id="new">+ Parça</button>' : ''}`)}
    <div class="toolbar"><input type="search" id="q" placeholder="Kod, ad, uyumlu model, raf…" value="${esc(q.q || '')}"><div class="chips"><a class="chip ${!q.low ? 'on' : ''}" href="#/parts">Tümü</a><a class="chip ${q.low ? 'on' : ''}" href="#/parts?low=1">Kritik stok</a></div><span class="muted">${rows.length} parça · stok değeri <b>${money(value)}</b></span></div>
    ${w ? bulkBar() : ''}${card('', table(rows, cols, { link: (r) => `#/parts/${r.id}`, select: w }), 'flush')}`);
  $('#csv').onclick = () => csv(rows, cols, 'yedek-parcalar');
  if (w) bindBulkDelete('parts', rows);
  $('#new')?.addEventListener('click', () => editForm('parts', null, { onSaved: route }));
  $('#move')?.addEventListener('click', () => editForm('stock_moves', null, { defaults: { type: 'giriş' }, onSaved: route }));
  let tm; $('#q').oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { location.hash = `#/parts?${new URLSearchParams({ ...q, q: e.target.value })}`; }, 350); };
}
async function partPage(id) {
  const p = await GET(`detail/parts/${id}`); const w = can('stock', 'w');
  setMain(`${head(`${esc(p.sku)} · ${esc(p.name)}`, `${esc(p.category || '')} · raf ${esc(p.location || '—')} · ${esc(p.supplier_name || 'tedarikçi yok')}`, w ? '<button class="btn sm" id="edit">Düzenle</button><button class="btn primary sm" id="in">Stok girişi</button><button class="btn sm" id="out">Çıkış</button><button class="btn sm" id="adj">Sayım</button>' : '')}
  <div class="kpis small">${kpi('Stok', `${num(p.stock, 2)} ${esc(p.unit)}`, `min ${num(p.min_stock)}`, p.stock <= p.min_stock ? 'danger' : '')}${kpi('Alış fiyatı', money(p.cost))}${kpi('Servis fiyatı', money(p.price))}${kpi('Stok değeri', money(p.stock * p.cost))}</div>
  <div class="grid g-2">${card('Stok hareketleri', table(p.moves, [{ l: 'Tarih', f: (m) => date(m.date) }, { l: 'Hareket', f: (m) => badge(m.type) }, { l: 'Miktar', f: (m) => num(m.qty, 2), cls: 'num' }, { l: 'Birim maliyet', f: (m) => money(m.unit_cost), cls: 'num' }, { k: 'ref', l: 'Ref.' }, { l: 'Kullanıcı', f: (m) => esc(m.user_name || '—') }]))}
  ${card('Kullanıldığı servisler', table(p.used_in, [{ k: 'order_no', l: 'Servis' }, { k: 'code', l: 'Bisiklet' }, { l: 'Miktar', f: (u) => num(u.qty, 2), cls: 'num' }, { l: 'Tarih', f: (u) => date(u.received_at) }], { link: (u) => `#/service/${u.id}`, empty: 'Henüz kullanılmadı' }))}</div>`);
  const mv = (type) => editForm('stock_moves', null, { defaults: { part_id: p.id, type, unit_cost: p.cost, qty: type === 'sayım düzeltme' ? p.stock : 1 }, onSaved: route });
  $('#in')?.addEventListener('click', () => mv('giriş')); $('#out')?.addEventListener('click', () => mv('çıkış')); $('#adj')?.addEventListener('click', () => mv('sayım düzeltme'));
  $('#edit')?.addEventListener('click', () => editForm('parts', p, { onSaved: (x) => (x ? route() : (location.hash = '#/parts')) }));
}

// ---------- reports ----------
async function reportsPage(q) {
  const from = q.from || addDays(todayISO(), -365); const to = q.to || todayISO();
  const r = await GET('reports', { from, to });
  const mn = (m) => `${MONTHS[uiLang][Number(m.slice(5)) - 1]} ${m.slice(2, 4)}`;
  const sections = {
    util: { t: 'Bisiklet bazında doluluk ve kârlılık', rows: r.utilization, cols: [{ k: 'code', l: 'Bisiklet' }, { k: 'model', l: 'Model' }, { l: 'Kirada gün', f: (u) => num(u.rented_days), cls: 'num', csv: (u) => u.rented_days }, { l: 'Doluluk', f: (u) => `${meter(u.utilization)} %${u.utilization}`, csv: (u) => u.utilization }, { l: 'Ciro (net)', f: (u) => money(u.revenue), cls: 'num', csv: (u) => u.revenue }, { l: 'Servis maliyeti', f: (u) => money(u.service_cost), cls: 'num', csv: (u) => u.service_cost }, { l: 'Servis sayısı', k: 'service_count', cls: 'num' }, { l: 'Katkı', f: (u) => `<b class="${u.margin < 0 ? 't-danger' : ''}">${money(u.margin)}</b>`, cls: 'num', csv: (u) => u.margin }] },
    cust: { t: 'Müşteri bazında ciro ve açık bakiye', rows: r.top_customers, cols: [{ k: 'customer', l: 'Müşteri' }, { k: 'rentals', l: 'Kiralama', cls: 'num' }, { l: 'Ciro (net)', f: (c) => money(c.revenue), cls: 'num', csv: (c) => c.revenue }, { l: 'Açık bakiye', f: (c) => (c.open > 0 ? `<b class="t-warn">${money(c.open)}</b>` : '—'), cls: 'num', csv: (c) => c.open }] },
    parts: { t: 'Yedek parça tüketimi', rows: r.parts_usage, cols: [{ k: 'sku', l: 'Kod' }, { k: 'name', l: 'Parça' }, { k: 'category', l: 'Kategori' }, { l: 'Adet', f: (p) => num(p.qty, 2), cls: 'num', csv: (p) => p.qty }, { l: 'Maliyet', f: (p) => money(p.cost), cls: 'num', csv: (p) => p.cost }] },
    svc: { t: 'Servis tipleri', rows: r.service_by_type, cols: [{ k: 'type', l: 'Tip' }, { k: 'n', l: 'Adet', cls: 'num' }, { l: 'Ort. süre (gün)', f: (s) => num(s.avg_days, 1), cls: 'num', csv: (s) => s.avg_days }] },
    aging: { t: 'Alacak yaşlandırma', rows: r.aging, cols: [{ k: 'bucket', l: 'Vade durumu' }, { k: 'n', l: 'Fatura', cls: 'num' }, { l: 'Tutar', f: (a) => money(a.amount), cls: 'num', csv: (a) => a.amount }] },
    rev: { t: 'Aylık gelir', rows: r.revenue_by_month, cols: [{ l: 'Ay', f: (m) => mn(m.m), csv: (m) => m.m }, { l: 'Net', f: (m) => money(m.net), cls: 'num', csv: (m) => m.net }, { l: 'Brüt', f: (m) => money(m.gross), cls: 'num', csv: (m) => m.gross }, { l: 'Tahsil', f: (m) => money(m.paid), cls: 'num', csv: (m) => m.paid }] },
  };
  const tot = r.revenue_by_month.reduce((a, m) => ({ net: a.net + m.net, paid: a.paid + m.paid }), { net: 0, paid: 0 });
  const avgUtil = r.utilization.length ? Math.round(r.utilization.filter((u) => u.status !== 'hizmet dışı').reduce((a, u) => a + u.utilization, 0) / r.utilization.filter((u) => u.status !== 'hizmet dışı').length) : 0;
  const sec = (k, extra = '') => card(`${sections[k].t} <span class="card-act"><button class="btn sm" data-csv="${k}">CSV</button></span>`, extra + table(sections[k].rows, sections[k].cols));
  setMain(`${head('Raporlar', 'Seçilen dönem için finans, filo ve servis analizleri.', `<form id="rq" class="inline-form"><input type="date" name="from" value="${from}"><span>–</span><input type="date" name="to" value="${to}"><button class="btn sm primary">Uygula</button></form>`)}
    <div class="kpis small">${kpi('Dönem cirosu (net)', money(tot.net))}${kpi('Tahsilat', money(tot.paid))}${kpi('Ortalama doluluk', `%${avgUtil}`)}${kpi('Servis işlemi', r.service_by_type.reduce((a, s) => a + s.n, 0))}</div>
    ${sec('rev', barChart(r.revenue_by_month.map((m) => ({ ...m, label: mn(m.m) })), [{ k: 'net', l: 'Net ciro', c: 'var(--brand)' }, { k: 'paid', l: 'Tahsilat', c: 'var(--slate)' }]))}
    ${sec('util')}<div class="grid g-2">${sec('cust')}${sec('aging')}${sec('parts')}${sec('svc')}</div>`);
  $('#rq').onsubmit = (e) => { e.preventDefault(); location.hash = `#/reports?${new URLSearchParams(readForm(e.target))}`; };
  main().querySelectorAll('[data-csv]').forEach((b) => b.onclick = () => { const s = sections[b.dataset.csv]; csv(s.rows, s.cols, `rapor-${b.dataset.csv}`); });
}

// ---------- notifications ----------
async function notificationsPage() {
  const n = await GET('notifications');
  const seen = getSeen(); n.forEach((x) => (x.unread = !seen.has(nKey(x))));
  setSeen(new Set([...seen, ...n.map(nKey)])); refreshNotifCount();
  const groups = {}; n.forEach((x) => (groups[x.title] ||= []).push(x));
  setMain(`${head('Bildirimler', 'Sistem tarafından otomatik üretilen uyarılar: geciken ödeme ve iadeler, kritik stok, bakım zamanı, düşük batarya, GPS sinyali, sigorta.')}
    ${n.length ? Object.entries(groups).map(([t, items]) => card(`${esc(t)} <span class="cnt">${items.length}</span>`, `<ul class="notifs">${items.map((x) => `<li class="lv-${x.level} ${x.unread ? 'unread' : ''}"><a href="${x.link}">${esc(x.text)}</a>${x.unread ? '<span class="badge b-brand">yeni</span>' : ''}</li>`).join('')}</ul>`)).join('') : '<div class="empty big">Her şey yolunda, bildirim yok.</div>'}`);
}

// ---------- roles ----------
async function rolesPage() {
  const r = await GET('roles'); const w = can('admin', 'w');
  setMain(`${head('Roller & yetkiler', 'Her rolün hangi modülleri görebileceğini (okuma) ve değiştirebileceğini (yazma) belirleyin. Yönetici rolü her zaman tam yetkilidir.', w ? '<button class="btn primary sm" id="save">Kaydet</button>' : '')}
  ${card('', `<div class="table-wrap"><table class="tbl matrix"><thead><tr><th>Modül</th>${Object.entries(r.roles).map(([k, l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${Object.entries(r.perms).map(([p, pl]) => `<tr><td>${esc(pl)}</td>${Object.keys(r.roles).map((role) => `<td><select data-role="${role}" data-perm="${p}" ${role === 'admin' || !w ? 'disabled' : ''}>${[['', 'Yok'], ['r', 'Okuma'], ['w', 'Okuma + yazma']].map(([v, l]) => `<option value="${v}" ${(r.matrix[role]?.[p] || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</tbody></table></div>`, 'flush')}`);
  $('#save')?.addEventListener('click', guard(async () => {
    const m = {}; main().querySelectorAll('select[data-role]').forEach((s) => { (m[s.dataset.role] ||= {})[s.dataset.perm] = s.value; });
    await PUT('roles', m); toast('Yetkiler kaydedildi');
  }));
}

// ---------- settings ----------
const ONOFF = [{ v: '1', l: 'Açık' }, { v: '0', l: 'Kapalı' }];
const SETTINGS_FORM = [
  ['Şirket', [['company_name', 'Şirket adı'], ['company_address', 'Adres'], ['pickup_address', 'Teslim alma adresi (site ve sürücü ekranı)'], ['company_phone', 'Telefon'], ['company_email', 'E-posta'], ['company_tax_no', 'USt-IdNr / vergi no'], ['company_iban', 'IBAN']]],
  ['Finans', [['currency', 'Para birimi'], ['vat_rate', 'KDV oranı %', 'number'], ['payment_terms_days', 'Ödeme vadesi (gün)', 'number'], ['late_fee_per_day', 'Geç ödeme bedeli / gün (€)', 'number'], ['late_return_fee_per_day', 'Geç iade bedeli / gün (€)', 'number']]],
  ['Otomatik tahsilat ve hatırlatmalar', [['auto_billing', 'Aktif kiralamaların dönem faturalarını her gün otomatik kes', 'select', ONOFF], ['auto_reminders', 'Bireysel kiracılara ödeme hatırlatması gönder (sürücü ekranı + Android bildirimi)', 'select', ONOFF], ['reminder_days_before', 'İlk hatırlatma: vadeden kaç gün önce', 'number'], ['dunning_days', 'Gecikme hatırlatmaları: vadeden kaç gün sonra (virgülle, ör. 1,7,14)'], ['auto_late_fee', 'Geciken faturalara günlük gecikme bedelini otomatik ekle', 'select', [{ v: '0', l: 'Kapalı' }, { v: '1', l: 'Açık' }]], ['pay_provider', 'Online ödeme sağlayıcısı (kart / SEPA). Henüz bağlı değil; bağlanınca sürücü ekranında "Online öde" düğmesi çıkar', 'readonly']]],
  ['Sürücü ekranı', [['portal_signup', 'Sürücüler sürücü ekranından kendi hesabını oluşturabilsin', 'select', [{ v: '1', l: 'Açık' }, { v: '0', l: 'Kapalı' }]], ['photo_pickup', 'Teslim almada selfie + bisiklet fotoğrafı iste (bisikletin fotoğraf geçmişine eklenir)', 'select', [{ v: '1', l: 'Açık' }, { v: '0', l: 'Kapalı' }]], ['self_extend', 'Sürücü kiralamasını kendisi uzatabilsin (gecikmiş ödeme yoksa ve bisiklet sonrasında rezerve değilse; değilse talep olarak gelir)', 'select', ONOFF], ['self_extend_max', 'Tek seferde en fazla kaç dönem uzatabilsin', 'number'], ['auto_service_from_report', 'Sürücünün arıza bildirimiyle servis kaydı otomatik açılsın', 'select', ONOFF]]],
  ['Kiralama periyotları', [['rental_periods', 'Sürücülerin ve sizin seçebileceğiniz periyotlar (kapalı olanlar tarife, kiralama ve sürücü ekranında görünmez)', 'periods']]],
  ['Bisiklet tipleri', [['bike_types', 'Bisiklet tipleri (her satıra bir tip; bisiklet ve tarife formlarında seçilir)', 'textarea']]],
  ['Servis & filo', [['service_interval_days', 'Bakım aralığı (gün)', 'number'], ['service_interval_km', 'Bakım aralığı (km)', 'number'], ['labor_rate', 'Saatlik işçilik ücreti (€)', 'number'], ['low_battery_alert', 'Düşük batarya uyarısı %', 'number'], ['map_center_lat', 'Harita merkezi enlem'], ['map_center_lng', 'Harita merkezi boylam'], ['telemetry_key', 'GPS cihaz API anahtarı']]],
  ['Belgeler (sözleşme, fatura, servis formu)', [['doc_lang', 'Varsayılan belge dili', 'select', DOC_LANGS], ['contract_terms_de', 'Sözleşme koşulları – Almanca', 'textarea'], ['contract_terms_en', 'Sözleşme koşulları – İngilizce', 'textarea'], ['service_terms_de', 'Servis formu koşulları – Almanca', 'textarea'], ['service_terms_en', 'Servis formu koşulları – İngilizce', 'textarea']]],
  ['WhatsApp ödeme hatırlatması', [['whatsapp_de', 'Mesaj – Almanca', 'textarea'], ['whatsapp_en', 'Mesaj – İngilizce', 'textarea']]],
  ['Online sözleşme imzası & gizlilik (DSGVO)', [['esign', 'Sürücü sözleşmeyi sürücü ekranından telefonla imzalayabilsin', 'select', ONOFF], ['privacy_url', 'Gizlilik metni (Datenschutzerklärung) adresi'], ['site_url', 'Web sitesi adresi (tavsiye linkleri bunu kullanır)'], ['retention_selfie_months', 'Biten kiralamaların teslim alma selfie\'leri kaç ay sonra otomatik silinsin (0 = silme)', 'number']]],
  ['Tavsiye programı', [['referral_on', 'Sürücüler arkadaş davet edip indirim kazanabilsin', 'select', ONOFF], ['referral_reward', 'Davet eden sürücüye ödül (net €, sonraki faturadan düşülür)', 'number'], ['referral_friend_reward', 'Gelen arkadaşa hoş geldin indirimi (net €)', 'number']]],
  ['Google yorumları', [['review_url', 'Google yorum linki (Google Business Profile → "Yorum iste" → linki kopyalayın)'], ['review_after_days', 'Kiralama başladıktan kaç gün sonra sürücüden yorum istensin (iadede bir kez daha)', 'number']]],
  ['Sigorta paketleri', [['insurance_plans', 'Her satıra bir paket: Ad | periyot ücreti (net €) | hasar başına muafiyet (€). Ücret, kira faturasına eklenir.', 'textarea']]],
  ['SEPA otomatik ödeme (Lastschrift)', [['sepa_on', 'Bireysel kiracılar sürücü ekranından SEPA yetkisi verebilsin', 'select', ONOFF], ['sepa_creditor_id', 'Gläubiger-Identifikationsnummer (Bundesbank, ör. DE98ZZZ09999999999)'], ['sepa_lead_days', 'Varsayılan tahsil tarihi: bugünden kaç gün sonra', 'number']]],
  ['Online kimlik doğrulama', [['id_provider', 'Servis', 'readonly', 'Bağlı değil · sürücü kimlik fotoğraflarını ve selfie\'sini yükler, siz sürücü kartında "Kimlik kontrolü" ile onaylarsınız']]],
];
async function settingsPage() {
  const s = await GET('settings'); const w = can('admin', 'w');
  setMain(`${head('Ayarlar', 'Şirket bilgileri, finans kuralları ve belge metinleri.')}<form id="stf">${SETTINGS_FORM.map(([g, fs]) => card(g, `<div class="grid-form">${fs.map(([k, l, t, o]) => (t === 'readonly' ? `<div class="field span2"><span>${esc(l)}</span><div class="ro-val">${s[k] ? esc(s[k]) : `<span class="muted">${o || 'Bağlı değil · ödemeler havale / SEPA ile, banka dökümü içe aktarılarak işlenir'}</span>`}</div></div>` : t === 'periods' ? `<div class="field span2"><span>${esc(l)}</span><div class="per-pick">${PERIODS.map((p) => `<label class="check"><input type="checkbox" name="per_${p}" ${enabledPeriods(s).includes(p) ? 'checked' : ''} ${w ? '' : 'disabled'}> ${{ 'gün': 'Günlük', hafta: 'Haftalık', ay: 'Aylık' }[p]}</label>`).join('')}</div></div>` : inputHtml({ k, l, t: t || 'text', step: 'any', o }, s[k], { disabled: !w }))).join('')}</div>${g === 'Bisiklet tipleri' ? '<div id="btimgs" class="bt-imgs"></div>' : ''}${g.startsWith('WhatsApp') ? '<p class="muted">Kullanılabilecek alanlar: {name} {invoice_no} {amount} {due_date} {iban} {company}. Müşterinin belge diline göre Almanca veya İngilizce mesaj seçilir.</p>' : ''}`)).join('')}
  ${card('GPS takip cihazı entegrasyonu', `<p>Takip cihazları konumlarını şu adrese <code>POST</code> eder. Cihaz ID'si bisiklet kartındaki "GPS takip cihazı ID" alanıyla eşleşir.</p><pre class="code">POST ${location.origin}/api/telemetry
{"key":"${esc(s.telemetry_key || '…')}","tracker_id":"TRK-4101","lat":53.5503,"lng":9.9353,"battery":76,"speed":14}</pre>
    <p><b>Traccar</b> (kendi sunucunuz veya traccar.org): <code>forward.url</code> / "Event forwarding" adresi olarak şunu girin, cihazın "Unique ID"si bisiklet kartındaki takip cihazı ID'si olmalı:</p><pre class="code">${location.origin}/api/telemetry/traccar?key=${esc(s.telemetry_key || '…')}</pre>
    <p><b>OsmAnd protokolü</b> (Traccar Client uygulaması ve birçok GPS cihazı): sunucu adresi</p><pre class="code">${location.origin}/api/telemetry/osmand?key=${esc(s.telemetry_key || '…')}&amp;id=CIHAZ_ID&amp;lat=…&amp;lon=…&amp;batt=…</pre>
    <p class="muted">Cevaptaki <code>"lock": true</code> bisiklet için "Durdur" istendiğini gösterir (destekleyen cihazlarda).</p>`)}
  ${card('Veri yedeği', `<p>Tüm veritabanı (kiralamalar, faturalar, belgeler, fotoğraflar…) tek bir JSON dosyası olarak iner. Son yedek: <b>${s.backup_last_at ? dt(s.backup_last_at) : 'henüz yok'}</b>.</p>
    <p class="muted">Otomatik günlük yedek için GitHub'daki <code>.github/workflows/backup.yml</code> hazır: Vercel'e <code>BACKUP_TOKEN</code>, GitHub'a <code>BACKUP_URL</code>, <code>BACKUP_TOKEN</code>, <code>BACKUP_PASSPHRASE</code> gizli değişkenleri eklenince her gece şifreli yedek alınır (README → Yedek). Turso da kendi tarafında geri dönüş noktası tutar.</p>
    <div class="form-actions"><button type="button" class="btn" id="bkp">Yedeği şimdi indir</button></div>`)}
  ${w ? '<div class="form-actions"><button class="btn primary">Ayarları kaydet</button></div>' : ''}</form>
  ${w ? card('Veri temizliği', `<p>Müşteriler, sürücüler, bisikletler, tarifeler, kiralamalar, faturalar, ödemeler, depozitolar, kasa, servis, parça/stok, evraklar, konum geçmişi ve işlem geçmişi kalıcı olarak silinir. Ayarlar, rol yetkileri ve sizin hesabınız kalır. Fatura/sözleşme numaraları baştan başlar.</p><label class="inline"><input type="checkbox" id="wipeKeepUsers"> Diğer kullanıcı hesaplarını sakla</label><div class="form-actions"><button class="btn danger" id="wipeBtn">Tüm verileri sil</button></div>`) : ''}`);
  $('#bkp')?.addEventListener('click', guard(async (e) => downloadBackup(e.currentTarget)));
  $('#wipeBtn')?.addEventListener('click', () => {
    const keepUsers = $('#wipeKeepUsers').checked;
    const b = modal('Tüm verileri sil', `<form class="grid-form"><p class="span2">Bu işlem geri alınamaz. Onaylamak için <b>SİL</b> yazın.</p><label class="field span2"><span>Onay</span><input name="confirm" autocomplete="off" required></label><div class="form-actions span2"><button class="btn danger">Kalıcı olarak sil</button></div></form>`);
    b.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST('wipe', { ...readForm(e.target), keep_users: keepUsers }); closeModal(); clearLookups(); toast('Tüm veriler silindi', 'ok'); location.hash = '#/'; route(); });
  });
  $('#stf').onsubmit = guard(async (e) => {
    e.preventDefault(); const d = readForm(e.target);
    const per = PERIODS.filter((p) => d[`per_${p}`]); PERIODS.forEach((p) => delete d[`per_${p}`]);
    if (!per.length) throw new Error('En az bir kiralama periyodu açık olmalı.');
    d.rental_periods = per.join(',');
    session.settings = await PUT('settings', d); applyBikeTypes(session.settings); toast('Ayarlar kaydedildi'); drawTypeImgs();
  });
  // bike type pictures
  const drawTypeImgs = async () => {
    const list = await GET('bike-types'); const box = $('#btimgs'); if (!box) return;
    box.innerHTML = `<p class="lbl">Tip görselleri <small class="muted">sürücü ekranında kiralama talebinde gösterilir; yeni tip eklediyseniz önce "Ayarları kaydet"</small></p><div class="bt-grid">${list.map((x, i) => `<div class="bt-card"><div class="bt-img">${x.image ? `<img src="${x.image}" alt="">` : '<span class="muted">görsel yok</span>'}</div><b>${esc(x.name)}</b>${w ? `<div class="bt-acts"><label class="btn sm">${x.image ? 'Değiştir' : 'Görsel yükle'}<input type="file" accept="image/*" data-bt="${i}" hidden></label>${x.image ? `<button type="button" class="btn sm ghost" data-btdel="${i}">Kaldır</button>` : ''}</div>` : ''}</div>`).join('')}</div>`;
    box.querySelectorAll('[data-bt]').forEach((inp) => inp.onchange = guard(async () => {
      const f = inp.files[0]; if (!f) return;
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Görsel okunamadı.')); i.src = URL.createObjectURL(f); });
      const k = Math.min(1, 900 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      // PNG/WebP keep their transparent background (stored as WebP, or PNG where the browser cannot write WebP); photos become JPEG
      const alpha = /png|webp|gif/i.test(f.type); const g = c.getContext('2d');
      if (!alpha) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0, c.width, c.height);
      let data = alpha ? c.toDataURL('image/webp', 0.86) : c.toDataURL('image/jpeg', 0.82);
      if (alpha && !data.startsWith('data:image/webp')) data = c.toDataURL('image/png');
      if (data.length > 690000) { const s2 = document.createElement('canvas'); s2.width = Math.round(c.width * 0.6); s2.height = Math.round(c.height * 0.6); s2.getContext('2d').drawImage(c, 0, 0, s2.width, s2.height); data = s2.toDataURL(data.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png', 0.82); }
      await PUT('bike-types', { type: list[inp.dataset.bt].name, data }); toast('Görsel kaydedildi'); drawTypeImgs();
    }));
    box.querySelectorAll('[data-btdel]').forEach((b) => b.onclick = guard(async () => { await PUT('bike-types', { type: list[b.dataset.btdel].name, data: null }); drawTypeImgs(); }));
  };
  drawTypeImgs();
}

// ---------- search ----------
async function searchPage(term) {
  const q = { q: term };
  const tryGet = (res, perm) => (can(perm) ? GET(res, q).catch(() => []) : Promise.resolve([]));
  const [bikes, customers, rentals, invoices, services, parts] = await Promise.all([tryGet('bikes', 'fleet'), tryGet('customers', 'customers'), tryGet('rentals', 'rentals'), tryGet('invoices', 'finance'), tryGet('service_orders', 'service'), tryGet('parts', 'stock')]);
  const sec = (t, rows, lbl, link) => (rows.length ? card(`${t} <span class="cnt">${rows.length}</span>`, `<ul class="results">${rows.slice(0, 20).map((r) => `<li><a href="${link(r)}">${lbl(r)}</a></li>`).join('')}</ul>`) : '');
  const html = [sec('Bisikletler', bikes, (b) => `<b>${esc(b.code)}</b> ${esc(b.model)} ${badge(b.status)}`, (b) => `#/bikes/${b.id}`), sec('Müşteriler', customers, (c) => esc(c.company_name || c.name), (c) => `#/customers/${c.id}`), sec('Kiralamalar', rentals, (r) => `<b>${esc(r.contract_no)}</b> ${esc(r.bike_code)} · ${esc(r.customer_label)} ${badge(r.status)}`, (r) => `#/rentals/${r.id}`), sec('Faturalar', invoices, (i) => `<b>${esc(i.invoice_no)}</b> ${esc(i.customer_label)} · ${money(i.total)} ${badge(i.status)}`, (i) => `#/invoices/${i.id}`), sec('Servis', services, (s) => `<b>${esc(s.order_no)}</b> ${esc(s.bike_code)} · ${esc((s.complaint || '').slice(0, 50))}`, (s) => `#/service/${s.id}`), sec('Parçalar', parts, (p) => `<b>${esc(p.sku)}</b> ${esc(p.name)}`, (p) => `#/parts/${p.id}`)].join('');
  setMain(`${head(`“${esc(term)}” için sonuçlar`)}${html ? `<div class="grid g-2">${html}</div>` : '<div class="empty big">Sonuç bulunamadı.</div>'}`);
}


// ======================================================================
// Hand-over / return protocol (teslim / iade tutanağı): km, battery, checklist, damage marks, two signatures
// ======================================================================
// simple long-john cargo bike, front to the right (right side view); the left side view is the same drawing mirrored
const BIKE_SHAPE = `<g class="bk" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="112" cy="214" r="58"/><circle cx="112" cy="214" r="7"/><circle cx="508" cy="228" r="44"/><circle cx="508" cy="228" r="6"/>
  <path d="M112 214 L236 214 L208 98 M112 214 L206 112 M236 214 L286 150 M286 92 L286 160 M286 200 L470 200 L508 228 M470 200 L470 150"/>
  <rect x="300" y="122" width="168" height="78" rx="8" class="bk-box"/><path d="M186 92 L232 92" class="bk-thick"/><path d="M286 92 L298 66 L322 62"/>
  <circle cx="236" cy="214" r="13"/><rect x="246" y="160" width="36" height="16" rx="4" transform="rotate(-52 264 168)" class="bk-bat"/>
  <path d="M60 170 Q112 140 164 170" class="bk-fender"/><path d="M470 196 Q508 172 548 196" class="bk-fender"/></g>`;
function bikeSvg(marks, side, { id = '', small = false } = {}) {
  const ms = marks.filter((m) => (m.side || 'sol') === side);
  return `<svg viewBox="0 0 600 300" class="dmg-svg ${small ? 'sm' : ''}" ${id ? `id="${id}"` : ''} role="img" aria-label="${side === 'sol' ? 'Sol taraf' : 'Sağ taraf'}">
    <rect width="600" height="300" class="dmg-bg"/>${side === 'sol' ? `<g transform="translate(600,0) scale(-1,1)">${BIKE_SHAPE}</g>` : BIKE_SHAPE}
    <text x="12" y="24" class="dmg-lbl">${side === 'sol' ? '◀ ön · SOL' : 'SAĞ · ön ▶'}</text>
    ${ms.map((m) => `<g class="dmg-m ${m.old ? 'old' : 'new'}"><circle cx="${m.x * 6}" cy="${m.y * 3}" r="13"/><text x="${m.x * 6}" y="${m.y * 3 + 5}" text-anchor="middle">${m.n}</text></g>`).join('')}</svg>`;
}
async function handoverPage(rentalId, kind) {
  const st = await GET('handovers/start', { rental_id: rentalId }); const r = st.rental; const isT = kind === 'teslim';
  let marks = st.previous.map((d, i) => ({ ...d, n: i + 1, old: 1 })); let side = 'sağ';
  const canAct = isT ? r.status === 'rezervasyon' : r.status === 'aktif';
  setMain(`${head(`${isT ? 'Teslim tutanağı' : 'İade tutanağı'} · ${esc(r.contract_no)}`, `${esc(r.bike.code)} · ${esc(r.bike.brand || '')} ${esc(r.bike.model || '')} → ${esc(r.customer.company_name || r.customer.name)}${r.rider ? ' · ' + esc(r.rider.name) : ''}`, `<a class="btn sm" href="#/rentals/${r.id}">← Kiralamaya dön</a>`)}
  <form id="hf" class="stack">
  <div class="grid g-2">
    ${card('Bisiklet', `<div class="grid-form">
      <label class="field"><span>Kilometre *</span><input name="km" type="number" step="any" required value="${esc(r.bike.odometer_km ?? '')}"></label>
      <label class="field"><span>Batarya %</span><input name="battery" type="number" min="0" max="100" value="${esc(r.bike.battery_level ?? '')}"></label>
      <label class="field span2"><span>${isT ? 'Teslim edilen aksesuarlar' : 'Geri gelen aksesuarlar'}</span><input name="accessories" value="${esc(r.accessories || 'Kilit x1, şarj cihazı x1, yağmur brandası x1')}"></label>
      <label class="field span2"><span>${isT ? 'Teslim alan kişi' : 'Getiren kişi'} *</span><input name="rider_name" required value="${esc(r.rider?.name || r.customer.name || '')}"></label>
      <label class="field span2"><span>Not</span><textarea name="notes" rows="2" placeholder="${isT ? 'Örn. sürücüye kilit ve şarj anlatıldı' : 'Örn. temiz geldi; şarj aleti eksik'}"></textarea></label></div>`)}
    ${card('Kontrol listesi', `<div class="checklist">${st.checklist_items.map((c, i) => `<div class="ck"><span>${esc(c)}</span><div class="seg">${['ok', 'sorun', 'yok'].map((v) => `<label><input type="radio" name="ck_${i}" value="${v}" ${v === 'ok' ? 'checked' : ''}><span>${v === 'ok' ? 'Sağlam' : v === 'sorun' ? 'Sorunlu' : 'Yok'}</span></label>`).join('')}</div></div>`).join('')}</div>`)}
  </div>
  ${card(`Hasar işaretleme <small class="muted">çizime dokunarak hasarın yerini işaretleyin${st.previous.length ? ' · gri işaretler önceki tutanaktan' : ''}</small>`, `<div class="dmg-wrap">
    <div class="dmg-side seg"><label><input type="radio" name="dside" value="sağ" checked><span>Sağ taraf</span></label><label><input type="radio" name="dside" value="sol"><span>Sol taraf</span></label></div>
    <div id="dmgfig"></div><div id="dmglist"></div></div>`)}
  <div class="grid g-2">
    ${card('Fotoğraflar', `<label class="field"><span>Bu tutanağa fotoğraf ekle (bisiklet, hasarlar, km göstergesi)</span><input type="file" id="hph" accept="image/*" capture="environment" multiple></label><p class="muted" id="hphn"></p>`)}
    ${card('İmzalar', `<div class="sigs">${padHtml('rider', `${isT ? 'Teslim alan' : 'Getiren'} (sürücü / kiracı) *`)}${padHtml('staff', `Pedalla · ${esc(session.user.name)}`)}</div>`)}
  </div>
  ${photoCard('rental_id', r.id, false, 'Bu kiralamanın önceki fotoğrafları (teslim alma selfie\'si vb.)')}
  <div class="card"><div class="card-f">${canAct ? `<label class="check"><input type="checkbox" name="go" checked> ${isT ? 'Kaydedince kiralamayı başlat (bisiklet teslim edildi)' : 'Kaydedince iade işlemine geç (depozito, hasar bedeli)'}</label>` : ''}<span class="grow"></span><a class="btn" href="#/rentals/${r.id}">Vazgeç</a><button class="btn primary">Tutanağı kaydet</button></div></div>
  </form>`);
  const pads = {}; main().querySelectorAll('[data-pad]').forEach((el) => { pads[el.dataset.pad] = signPad(el); });
  const DT = ['çizik', 'ezik', 'kırık', 'eksik', 'kir / leke', 'diğer'];
  const draw = () => {
    $('#dmgfig').innerHTML = bikeSvg(marks, side, { id: 'dsvg' });
    $('#dmglist').innerHTML = marks.length ? `<table class="tbl dmg-t"><thead><tr><th>#</th><th>Taraf</th><th>Tür</th><th>Not</th><th></th></tr></thead><tbody>${marks.map((m, i) => `<tr class="${m.old ? 'muted' : ''}"><td><span class="dmg-n ${m.old ? 'old' : ''}">${m.n}</span></td><td>${esc(m.side || 'sol')}</td>
      <td>${m.old ? esc(m.type) + ' <small>(önceki)</small>' : `<select data-mt="${i}">${DT.map((x) => `<option ${x === m.type ? 'selected' : ''}>${x}</option>`).join('')}</select>`}</td>
      <td>${m.old ? esc(m.note || '') : `<input data-mn="${i}" value="${esc(m.note || '')}" placeholder="Örn. ön çamurlukta 3 cm çizik">`}</td><td><button type="button" class="icon-btn sm" data-mx="${i}" title="Kaldır">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Hasar işaretlenmedi.</p>';
    $('#dsvg').onclick = (e) => { const b = e.currentTarget.getBoundingClientRect(); marks.push({ x: Math.round(((e.clientX - b.left) / b.width) * 1000) / 10, y: Math.round(((e.clientY - b.top) / b.height) * 1000) / 10, side, type: 'çizik', note: '', old: 0 }); renum(); draw(); main().querySelector(`[data-mn="${marks.length - 1}"]`)?.focus(); };
    main().querySelectorAll('[data-mt]').forEach((s) => s.onchange = () => { marks[s.dataset.mt].type = s.value; });
    main().querySelectorAll('[data-mn]').forEach((s) => s.oninput = () => { marks[s.dataset.mn].note = s.value; });
    main().querySelectorAll('[data-mx]').forEach((b) => b.onclick = () => { marks.splice(Number(b.dataset.mx), 1); renum(); draw(); });
  };
  const renum = () => marks.forEach((m, i) => { m.n = i + 1; });
  main().querySelectorAll('[name=dside]').forEach((x) => x.onchange = () => { side = x.value; draw(); });
  draw();
  $('#hph').onchange = () => { $('#hphn').textContent = $('#hph').files.length ? `${$('#hph').files.length} fotoğraf seçildi, tutanakla birlikte yüklenecek` : ''; };
  loadPhotos(main());
  $('#hf').onsubmit = guard(async (e) => {
    e.preventDefault(); const f = e.target; const d = readForm(f);
    const rider_sign = pads.rider.value(); if (!rider_sign) throw new Error(`${isT ? 'Teslim alan' : 'Getiren'} kişinin imzası gerekli.`);
    const checklist = {}; st.checklist_items.forEach((c, i) => { checklist[c] = f.querySelector(`[name=ck_${i}]:checked`)?.value; });
    const btn = f.querySelector('button.primary'); btn.disabled = true;
    try {
      const h = await POST('handovers', { rental_id: r.id, kind, km: d.km, battery: d.battery, accessories: d.accessories, rider_name: d.rider_name, notes: d.notes, checklist, damages: marks, rider_sign, staff_sign: pads.staff.value(), activate: isT && !!d.go });
      const files = [...$('#hph').files];
      for (const file of files) { const p = await photoData(file); await POST('photos', { bike_id: r.bike_id, handover_id: h.id, kind: 'bisiklet', note: isT ? 'Teslim tutanağı' : 'İade tutanağı', ...p }); }
      toast(isT ? (d.go ? 'Tutanak kaydedildi, kiralama başladı' : 'Teslim tutanağı kaydedildi') : 'İade tutanağı kaydedildi');
      location.hash = !isT && d.go ? `#/rentals/${r.id}?ret=${h.id}` : `#/handovers/${h.id}`;
    } finally { btn.disabled = false; }
  });
}
function handoverDoc(h, lang) {
  const t = docT(lang); const r = h.rental; const isT = h.kind === 'teslim';
  const sides = ['sol', 'sağ'].filter((s) => h.damages.some((m) => (m.side || 'sol') === s));
  return `<div class="doc">${docHeader(t[`ho_${h.kind}`], r.contract_no)}
  <div class="doc-2">${dl([[t.ho_time, dDateTime(lang, h.created_at)], [t.customer, esc(r.customer_label)], [isT ? t.ho_sign_rider_teslim : t.ho_sign_rider_iade, esc(h.rider_name || r.rider_name || '')], [t.ho_staff, esc(h.staff_name || '')]])}
  ${dl([[t.bike, `${esc(r.bike_code)} · ${esc(r.brand || '')} ${esc(r.model || '')}`], [t.frame_no, esc(r.frame_no)], [t.km, dNum(lang, h.km)], [t.battery, h.battery != null ? h.battery + ' %' : '—'], [t.accessories, esc(h.accessories || '—')]])}</div>
  <h3>${t.checklist}</h3><table class="tbl doc-t ck-t"><thead><tr><th>${t.check}</th><th>${t.ok}</th><th>${t.issue}</th><th>${t.missing}</th></tr></thead><tbody>${h.checklist_items.map((c) => `<tr><td>${esc(tv(lang, c))}</td>${['ok', 'sorun', 'yok'].map((v) => `<td class="c">${h.checklist[c] === v ? '☒' : '☐'}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <h3>${t.ho_damage_h}</h3>${h.damages.length ? `<div class="dmg-print">${sides.map((s) => bikeSvg(h.damages, s, { small: true })).join('')}</div>
    <table class="tbl doc-t"><thead><tr><th>${t.ho_no}</th><th>${t.ho_side}</th><th>${t.ho_kind}</th><th>${t.ho_note}</th><th></th></tr></thead><tbody>${h.damages.map((m) => `<tr><td>${m.n}</td><td>${esc(tv(lang, m.side || 'sol'))}</td><td>${esc(tv(lang, m.type))}</td><td>${esc(m.note || '')}</td><td>${m.old ? t.ho_old : `<b>${t.ho_new}</b>`}</td></tr>`).join('')}</tbody></table>` : `<p class="box">${t.ho_none}</p>`}
  ${h.notes ? `<h3>${t.ho_notes}</h3><p class="box">${esc(h.notes)}</p>` : ''}
  ${h.photos.length ? `<h3>${t.ho_photos}</h3><div class="ho-photos">${h.photos.map((p) => `<img src="data:image/jpeg;base64,${p.thumb}" alt="">`).join('')}</div>` : ''}
  <p class="small">${t[`ho_confirm_${h.kind}`]}</p>
  <div class="sign ho-sign"><div>${h.rider_sign ? `<img src="${h.rider_sign}" alt="">` : '<b></b>'}<span>${isT ? t.ho_sign_rider_teslim : t.ho_sign_rider_iade} · ${esc(h.rider_name || '')}</span></div><div>${h.staff_sign ? `<img src="${h.staff_sign}" alt="">` : '<b></b>'}<span>${t.ho_sign_staff} · ${esc(h.staff_name || '')}</span></div></div></div>`;
}
async function handoverViewPage(id) {
  const h = await GET(`handovers/${id}`); let lang = docLangOf({ doc_lang: h.rental.doc_lang }, session.settings);
  const nw = h.damages.filter((m) => !m.old).length;
  setMain(`${head(`${h.kind === 'teslim' ? 'Teslim tutanağı' : 'İade tutanağı'} · ${esc(h.rental.contract_no)}`, `${dt(h.created_at)} · ${esc(h.staff_name || '')}${nw ? ` · <b class="${h.kind === 'iade' ? 't-danger' : ''}">${nw} yeni hasar işareti</b>` : ''}`,
    `${langSw(lang)}<a class="btn sm" href="#/rentals/${h.rental_id}">← Kiralamaya dön</a>${can('admin', 'w') ? '<button class="btn sm danger ghost" id="del">Sil</button>' : ''}<button class="btn primary sm" id="print">Yazdır / PDF</button>`)}
    <div class="card doc-card"><div class="card-b" id="docv">${handoverDoc(h, lang)}</div></div>`);
  onLang((l) => { lang = l; $('#docv').innerHTML = handoverDoc(h, lang); });
  $('#print').onclick = () => printHtml(handoverDoc(h, lang), `${h.kind === 'teslim' ? (lang === 'en' ? 'Handover' : 'Übergabe') : (lang === 'en' ? 'Return' : 'Rückgabe')} ${h.rental.contract_no}`);
  $('#del')?.addEventListener('click', guard(async () => { if (await confirmBox('Tutanak silinsin mi? Fotoğrafları bisikletin geçmişinde kalır.')) { await DEL(`handovers/${id}`); location.hash = `#/rentals/${h.rental_id}`; } }));
}
// text for the return form from the new damage marks of a return protocol
const damageText = (h) => h.damages.filter((m) => !m.old).map((m) => `${m.n}) ${m.side || 'sol'} · ${m.type}${m.note ? ': ' + m.note : ''}`).join('; ');

// ======================================================================
// Payment plan, bank statement import
// ======================================================================
const PLAN_BADGE = { 'ödendi': 'ödendi', 'gecikmiş': 'gecikmede', 'kısmi': 'kısmi', 'bekliyor': 'açık', 'planlandı': 'rezervasyon' };
const planTable = (rows) => table(rows, [{ l: 'Dönem', f: (p) => `${date(p.start)} – ${date(p.end)}` }, { l: 'Son ödeme', f: (p) => (p.state === 'gecikmiş' ? `<b class="t-danger">${date(p.due)}</b>` : date(p.due)) },
  { l: 'Fatura', f: (p) => (p.invoice_id ? `<a href="#/invoices/${p.invoice_id}">${esc(p.invoice_no)}</a>` : '<span class="muted">dönem başında kesilir</span>') }, { l: 'Tutar (brüt)', f: (p) => money(p.amount), cls: 'num' },
  { l: 'Kalan', f: (p) => (p.balance > 0.005 && p.state !== 'planlandı' ? `<b>${money(p.balance)}</b>` : '—'), cls: 'num' }, { l: 'Durum', f: (p) => badge(PLAN_BADGE[p.state] || p.state, p.state) }], { empty: 'Ödeme planı yok (ücret girilmemiş)' });
async function readTextFile(file) {
  const buf = await file.arrayBuffer(); let txt = new TextDecoder('utf-8').decode(buf);
  if (txt.includes('�')) txt = new TextDecoder('windows-1252').decode(buf); // German bank CSVs are often Latin-1
  return txt;
}
function bankImportModal(after) {
  const body = modal('Banka dökümü içe aktar', `<form class="grid-form" id="bif"><p class="span2 muted">Bankanızdan indirdiğiniz hesap hareketlerini (CSV) seçin veya satırları buraya yapıştırın. Açıklamasında fatura numarası (ör. F-2026-0012) geçen gelen ödemeler bulunur ve faturaya işlenir. Aynı satır ikinci kez kaydedilmez.</p>
    <label class="field span2"><span>CSV dosyası</span><input type="file" name="f" accept=".csv,.txt,text/csv,text/plain"></label>
    <label class="field span2"><span>veya satırları yapıştırın</span><textarea name="text" rows="6" placeholder="01.11.2026;Miete F-2026-0012 Lukas Weber;153,51"></textarea></label>
    <div class="form-actions span2"><button class="btn primary">Eşleştir</button></div></form><div id="bires"></div>`, { wide: true });
  let text = '';
  body.querySelector('#bif').onsubmit = guard(async (e) => {
    e.preventDefault(); const f = e.target.f.files[0]; text = f ? await readTextFile(f) : e.target.text.value;
    if (!text.trim()) throw new Error('Dosya seçin veya satır yapıştırın.');
    const x = await POST('bank-import', { text }); const ok = (s) => ['eşleşti', 'tutar farklı'].includes(s);
    body.querySelector('#bires').innerHTML = `<p class="muted">${x.lines} satır okundu, ${x.rows.length} satırda fatura numarası bulundu.</p>${x.rows.length ? table(x.rows, [
      { l: '', f: (r) => (ok(r.state) ? `<input type="checkbox" class="bi" value="${esc(r.hash)}" ${r.state === 'eşleşti' ? 'checked' : ''}>` : '') }, { l: 'Fatura', f: (r) => (r.invoice_id ? `<a href="#/invoices/${r.invoice_id}">${esc(r.invoice_no)}</a>` : esc(r.invoice_no)) },
      { l: 'Müşteri', f: (r) => esc(r.customer || '—') }, { l: 'Tarih', f: (r) => date(r.date) }, { l: 'Tutar', f: (r) => money(r.amount), cls: 'num' }, { l: 'Fatura kalanı', f: (r) => money(r.balance), cls: 'num' },
      { l: 'Durum', f: (r) => badge(r.state === 'eşleşti' ? 'ödendi' : ok(r.state) ? 'kısmi' : 'iptal', r.state) }, { l: 'Satır', f: (r) => `<small class="muted">${esc(r.line.slice(0, 90))}</small>` }]) + `<div class="form-actions"><button class="btn primary" id="bisave">Seçilenleri ödeme olarak kaydet</button></div>` : '<div class="empty">Fatura numarası geçen satır bulunamadı.</div>'}`;
    body.querySelector('#bisave')?.addEventListener('click', guard(async () => {
      const hashes = [...body.querySelectorAll('.bi:checked')].map((c) => c.value); if (!hashes.length) throw new Error('Kaydedilecek satır seçin.');
      const y = await POST('bank-import', { text, commit: true, hashes }); closeModal(); toast(`${y.booked} ödeme kaydedildi`); after?.();
    }));
  });
}

// ======================================================================
// Overdue payments (red list) with automatic reminders
// ======================================================================
const LEVEL_TXT = (n) => (n >= 3 ? `${n}. hatırlatma (son)` : n ? `${n}. hatırlatma` : 'vadesi geçti');
async function overduePage() {
  const d = await GET('overdue'); const fw = can('finance', 'w'); const a = d.auto;
  setMain(`${head('Geciken ödemeler', 'Vadesi geçmiş faturalar müşteri bazında, en uzun gecikme en üstte.', `${fw ? '<button class="btn sm" id="run">Hatırlatmaları şimdi çalıştır</button>' : ''}<a class="btn sm" href="#/invoices?tab=overdue">Fatura listesi</a>`)}
  <div class="kpis">${kpi('Geciken toplam', money(d.total), `${d.count} fatura · ${d.groups.length} müşteri`, d.total ? 'danger hero' : 'hero')}
    ${kpi('7 gün içinde vadesi dolacak', money(d.soon.reduce((x, i) => x + i.balance, 0)), `${d.soon.length} fatura`, d.soon.length ? 'warn' : '')}
    ${kpi('Otomatik hatırlatma', a.reminders ? 'Açık' : 'Kapalı', a.reminders ? `vadeden ${a.before} gün önce · sonra ${d.levels.join(', ')}. gün` : 'Ayarlar\'dan açılabilir', a.reminders ? '' : 'warn', can('admin') ? '#/settings' : '')}
    ${kpi('Son otomatik çalışma', d.last_run ? date(d.last_run) : '—', a.billing ? 'dönem faturaları otomatik' : 'dönem faturaları elle')}</div>
  <div class="alert info">Bireysel kiracılara hatırlatmalar sürücü ekranına ve Pedalla Android uygulamasına bildirim olarak otomatik gider. Firmalara giden hatırlatma ve WhatsApp mesajı otomatik gönderilemez; aşağıdaki WhatsApp düğmesi mesajı hazır açar, siz gönderirsiniz.${a.late_fee ? ` <span>Gecikme bedeli günde ${money(a.fee_per_day)} olarak otomatik ekleniyor.</span>` : ''}</div>
  ${d.groups.length ? d.groups.map((g) => `<section class="card od-card lv${Math.min(3, g.level)}"><div class="card-b">
    <div class="od-h"><div><a href="#/customers/${g.customer_id}"><b>${esc(g.customer)}</b></a> <span class="badge b-danger">${g.max_days} gün</span> <span class="badge b-${g.level >= 3 ? 'danger' : 'warn'}">${LEVEL_TXT(g.level)}</span> ${g.type === 'kurumsal' ? '<span class="badge b-muted">firma</span>' : ''}
      <small class="muted">${g.riders.map((x) => `<a href="#/riders/${x.id}">${esc(x.name)}</a>${x.portal ? '' : ' <span>(sürücü ekranı kapalı)</span>'}`).join(', ')}${g.bikes.length ? ' · ' + g.bikes.map(esc).join(', ') : ''}${g.phone ? ` · <a href="tel:${esc(g.phone)}">${esc(g.phone)}</a>` : ''}${g.last_reminder_at ? ` · son hatırlatma ${ago(g.last_reminder_at)}` : ' · henüz hatırlatılmadı'}</small></div>
      <div class="od-sum"><b class="t-danger">${money(g.total)}</b></div></div>
    ${table(g.invoices, [{ l: 'Fatura', f: (i) => `<a href="#/invoices/${i.id}">${esc(i.invoice_no)}</a>${i.contract_no ? ` <small class="muted">${esc(i.contract_no)}</small>` : ''}` }, { l: 'Vade', f: (i) => date(i.due_date) }, { l: 'Gecikme', f: (i) => `<b class="t-danger">${i.days} gün</b>` },
      { l: 'Kalan', f: (i) => money(i.balance), cls: 'num' }, { l: 'Hatırlatma', f: (i) => `${i.reminders_sent || 0}×${i.last_reminder_at ? ` <small class="muted">${ago(i.last_reminder_at)}</small>` : ''}` },
      ...(fw ? [{ l: '', f: (i) => `<span class="od-act">${waBtn(i, true)}${i.rider_id && g.type === 'bireysel' ? `<button class="btn xs" data-prem="${i.id}" title="Sürücü ekranına ve telefona hatırlatma">Uygulamaya hatırlat</button>` : ''}${i.suggested_late_fee > (i.late_fee || 0) ? `<button class="btn xs ghost" data-fee="${i.id}" data-amt="${i.suggested_late_fee}">+ ${money(i.suggested_late_fee)} gecikme</button>` : ''}</span>` }] : [])])}
  </div></section>`).join('') : '<div class="empty big">Geciken ödeme yok 🎉</div>'}
  ${d.soon.length ? card('Yakında vadesi dolacaklar (7 gün)', table(d.soon, [{ l: 'Fatura', f: (i) => `<a href="#/invoices/${i.id}">${esc(i.invoice_no)}</a>` }, { k: 'customer', l: 'Müşteri' }, { l: 'Sürücü', f: (i) => esc(i.rider_name || '—') }, { l: 'Vade', f: (i) => date(i.due_date) }, { l: 'Tutar', f: (i) => money(i.balance), cls: 'num' }])) : ''}`);
  bindWa(main(), route);
  $('#run')?.addEventListener('click', guard(async () => { const x = await POST('daily'); toast(`${x.invoices} fatura, ${x.messages} hatırlatma${x.late_fees ? `, ${x.late_fees} gecikme bedeli` : ''}`); route(); }));
  main().querySelectorAll('[data-prem]').forEach((b) => b.onclick = guard(async () => { await POST(`invoices/${b.dataset.prem}/remind`, { channel: 'sürücü ekranı' }); toast('Hatırlatma sürücü ekranına gönderildi'); route(); }));
  main().querySelectorAll('[data-fee]').forEach((b) => b.onclick = guard(async () => { await POST(`invoices/${b.dataset.fee}/late-fee`, { amount: b.dataset.amt }); toast('Gecikme bedeli eklendi'); route(); }));
}

// ======================================================================
// Management summary (yönetici özeti)
// ======================================================================
async function summaryPage(q) {
  const d = await GET('summary', q.month ? { month: q.month } : {}); const k = d.kpi;
  const [yy, mm] = d.month.split('-'); const mLabel = `${MONTHS[uiLang][Number(mm) - 1]} ${yy}`;
  const trend = d.trend.map((x) => ({ ...x, label: MONTHS[uiLang][Number(x.m.slice(5)) - 1] }));
  const per = [...d.per_bike].sort((a, b) => b.profit - a.profit || b.net_total - a.net_total);
  setMain(`${head('Yönetici özeti', `${mLabel} · ${d.bikes} aktif filo bisikleti${d.to > todayISO() ? ' · ay devam ediyor' : ''}`, `<input type="month" id="mon" value="${d.month}" class="sm-input"><button class="btn sm" id="print">Yazdır</button>`)}
  <div id="sumv">
  <div class="kpis">
    ${kpi('Gelir (net)', money(k.revenue), `kira ${money(k.revenue_rental)} · servis ${money(k.revenue_service)}`, 'hero')}
    ${kpi('Tahsil edilen', money(k.collected), 'bu ay gelen ödemeler')}
    ${kpi('Doluluk', `%${k.occupancy}`, meter(k.occupancy) + `şu an ${k.rented_now} bisiklet kirada`)}
    ${kpi('Brüt kâr', money(k.profit), `parça ve bisiklet giderleri ${money(k.costs)}`, k.profit < 0 ? 'danger' : '')}
    ${kpi('Aylık tekrarlayan gelir', money(k.mrr), 'aktif sözleşmeler (net)')}
    ${kpi('Açık alacak', money(k.receivables), `${money(k.overdue)} gecikmiş`, k.overdue ? 'danger' : '', '#/overdue')}
    ${kpi('Boşta bisiklet', k.idle_now, 'müsait durumda bekliyor', k.idle_now ? 'warn' : '', '#/bikes?status=müsait')}
    ${kpi('Kiralamalar', `+${k.new_rentals} / −${k.ended_rentals}`, 'bu ay başlayan / biten')}
  </div>
  <div class="grid g-2">
    ${card('Gelir ve tahsilat (son 6 ay, net)', barChart(trend, [{ k: 'revenue', l: 'Faturalanan', c: 'var(--brand)' }, { k: 'collected', l: 'Tahsil edilen', c: 'var(--slate)' }]))}
    ${card('Doluluk oranı (son 6 ay)', barChart(trend, [{ k: 'occupancy', l: 'Doluluk %', c: 'var(--brand)' }], { fmt: (v) => `%${Math.round(v)}` }))}
  </div>
  <div class="grid g-2">
    ${card(`Boşta bekleyen bisikletler <span class="cnt">${d.idle.length}</span>`, table(d.idle, [{ l: 'Bisiklet', f: (b) => `<b>${esc(b.code)}</b> ${esc(b.model || '')}` }, { l: 'Tip', f: (b) => esc(b.type || '—') }, { l: 'Boşta', f: (b) => `<b class="${b.days > 14 ? 't-danger' : b.days > 7 ? 't-warn' : ''}">${b.days} gün</b>`, cls: 'num' }, { l: 'Son kiralama bitişi', f: (b) => date(b.since) }], { link: (b) => `#/bikes/${b.id}`, empty: 'Boşta bisiklet yok, filo tam kullanımda' }))}
    ${card('Tip bazında doluluk', table(d.by_type, [{ k: 'type', l: 'Tip' }, { l: 'Bisiklet', f: (x) => x.bikes, cls: 'num' }, { l: 'Şu an kirada', f: (x) => x.rented_now, cls: 'num' }, { l: 'Bu ay doluluk', f: (x) => `${meter(x.occupancy)} %${x.occupancy}` }]))}
  </div>
  ${card('Bisiklet başına kâr', table(per, [{ l: 'Bisiklet', f: (b) => `<b>${esc(b.code)}</b> <small class="muted">${esc(b.model || '')}</small>` }, { l: 'Durum', f: (b) => badge(b.status) }, { l: 'Kirada (gün)', f: (b) => `${b.rented_days}/${d.days}`, cls: 'num' }, { l: 'Doluluk', f: (b) => `%${b.occupancy}`, cls: 'num' },
    { l: 'Bu ay gelir', f: (b) => money(b.revenue), cls: 'num' }, { l: 'Bu ay gider', f: (b) => (b.cost ? money(b.cost) : '—'), cls: 'num' }, { l: 'Bu ay kâr', f: (b) => `<b class="${b.profit < 0 ? 't-danger' : ''}">${money(b.profit)}</b>`, cls: 'num' },
    { l: 'Toplam net', f: (b) => money(b.net_total), cls: 'num' }, { l: 'Alış maliyetini çıkarma', f: (b) => (b.payback == null ? '—' : `${meter(b.payback)} %${b.payback}`) }], { link: (b) => `#/bikes/${b.id}` }), 'flush')}
  <p class="muted small">Gelir: o ay kesilen faturaların net tutarı (iptaller hariç). Gider: o ay servise giren bisikletlerde kullanılan parçaların alış maliyeti ve bisiklete yazılan giderler; personel işçiliği dahil değil. Doluluk: kirada geçen bisiklet-günü / filodaki bisiklet-günü (hizmet dışı ve kayıp bisikletler hariç).</p>
  </div>`);
  $('#mon').onchange = (e) => { location.hash = `#/summary?month=${e.target.value}`; };
  $('#print').onclick = () => printHtml(`<div class="doc sum-print"><h2>${esc(session.settings.company_name || 'Pedalla')} · Yönetici özeti · ${mLabel}</h2>${$('#sumv').innerHTML}</div>`, `Pedalla ${d.month}`);
}

// ======================================================================
// Messages to a rider (rider screen inbox + phone notification in the Android app)
// ======================================================================
const msgList = (list) => (list.length ? `<ul class="msg-list">${list.map((m) => `<li class="l-${m.level}"><div><b>${esc(m.title)}</b><p>${esc(m.body)}</p><small class="muted">${dt(m.created_at)}${m.user_name ? ' · ' + esc(m.user_name) : ' · otomatik'} · ${m.read_at ? `okundu ${ago(m.read_at)}` : m.pushed_at ? 'telefona iletildi' : 'iletilmeyi bekliyor'}</small></div></li>`).join('')}</ul>` : '<p class="muted">Henüz mesaj yok. Fotoğraf isteği, ödeme hatırlatması, servis ve talep cevapları burada da görünür.</p>');
function riderMessageModal(r, after) {
  const body = modal(`Mesaj gönder · ${r.name}`, `<form class="grid-form"><p class="span2 muted">Mesaj sürücü ekranındaki gelen kutusuna düşer; Pedalla Android uygulaması kuruluysa telefona bildirim olarak da gelir (en geç ~15 dakika içinde).${r.portal_active && r.portal_email ? '' : ' <b class="t-warn">Bu sürücünün sürücü ekranı girişi kapalı.</b>'}</p>
    <label class="field span2"><span>Başlık (isteğe bağlı)</span><input name="title" maxlength="80" placeholder="Pedalla"></label>
    <label class="field span2"><span>Mesaj *</span><textarea name="text" rows="4" maxlength="600" required placeholder="Örn. Yarın 10:00'da bisikleti bakım için getirebilir misiniz?"></textarea></label>
    <div class="form-actions span2"><button class="btn primary">Gönder</button></div></form>`);
  body.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST(`riders/${r.id}/message`, readForm(e.target)); closeModal(); toast('Mesaj gönderildi'); after?.(); });
}

// ---------- contract e-signature (rental page) ----------
const SIGN_ROLE_L = { 'sürücü': 'Sürücü (teslim alan)', 'kiracı': 'Kiracı (firma yetkilisi)', 'kiraya veren': 'Kiraya veren (Pedalla)' };
function signCard(r, w) {
  const st = r.sign_state || {}; const open = ['rezervasyon', 'aktif'].includes(r.status);
  const need = [st.rider_ok ? null : 'sürücü', st.individual || st.renter_ok ? null : 'kiracı'].filter(Boolean);
  const head2 = st.complete ? '<span class="badge b-ok">✓ elektronik olarak imzalandı</span>' : st.changed ? '<span class="badge b-danger">imzadan sonra değişti · yeniden imza gerekli</span>' : '<span class="badge b-warn">imza bekleniyor</span>';
  const list = (r.signs || []).slice().reverse();
  return card(`Sözleşme · e-imza ${head2}${w && open ? `<span class="card-act">${r.rider_id ? '<button class="btn sm" id="asksign">📲 Sürücüye imza isteği gönder</button>' : ''}<button class="btn sm primary" id="signhere">✍️ Burada imzalat</button></span>` : ''}`,
    `<div class="sign-state"><span class="muted">${st.complete ? `İmza tamam${r.signed_at ? ` · ${dt(r.signed_at)}` : ''}.` : need.length ? `Eksik: ${need.map((x) => SIGN_ROLE_L[x]).join(', ')}.` : ''} ${st.individual ? 'Bireysel kiracıda sürücünün imzası kiracı imzası yerine de geçer.' : ''}</span></div>
    ${list.length ? `<ul class="sign-list">${list.map((x) => `<li class="${x.valid ? '' : 'stale'}"><img src="${x.sign}" alt=""><div class="grow"><b>${esc(x.name)}</b> <span class="muted">· ${esc(SIGN_ROLE_L[x.role] || x.role)}</span><small class="muted">${dt(x.created_at)} · ${esc(x.channel || '')}${x.user_name ? ' · ' + esc(x.user_name) : ''}${x.ip ? ' · IP ' + esc(x.ip) : ''} · ${x.valid ? 'geçerli' : 'eski sürüm'}</small></div>${can('admin', 'w') ? `<button type="button" class="icon-btn sm" data-delsign="${x.id}" title="İmzayı sil">✕</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Henüz imza yok. Sürücü, kendi ekranındaki "Sözleşmeyi imzala" kartından okuyup parmağıyla imzalar; isterseniz tabletten burada da imzalatabilirsiniz.</p>'}
    <p class="muted" style="margin-top:8px">Her imzada tarih, saat, IP, cihaz ve sözleşme içeriğinin SHA-256 sağlama değeri saklanır. Fiyat, tarih, sürücü veya koşullar değişirse imza "eski sürüm" olur ve yeniden imza istenir. <a href="#/rentals/${r.id}/contract">Sözleşmeyi görüntüle →</a></p>`);
}
function bindSign(r) {
  $('#asksign')?.addEventListener('click', guard(async () => { const x = await POST(`rentals/${r.id}/ask-sign`); toast(x.portal ? 'İmza isteği sürücü ekranına ve telefona gönderildi' : 'İstek kaydedildi; sürücünün sürücü ekranı girişi açık değil', x.portal ? 'ok' : 'info'); }));
  main().querySelectorAll('[data-delsign]').forEach((b) => b.onclick = guard(async () => { if (await confirmBox('Bu imza silinsin mi? (Kanıt kaydı da silinir)')) { await DEL(`contract_signs/${b.dataset.delsign}`); route(); } }));
  $('#signhere')?.addEventListener('click', () => {
    const st = r.sign_state || {}; const roles = ['sürücü', ...(st.individual ? [] : ['kiracı']), 'kiraya veren'];
    const first = roles.find((x) => !(x === 'sürücü' ? st.rider_ok : x === 'kiracı' ? st.renter_ok : r.signs?.some((s) => s.role === x && s.valid))) || 'kiraya veren';
    const nameFor = (role) => (role === 'sürücü' ? r.rider?.name : role === 'kiracı' ? r.customer?.name : session.user.name) || '';
    const lang = docLangOf(r.customer, session.settings);
    const b = modal('Sözleşmeyi burada imzalat', `<form class="grid-form" id="sgf">
      <label class="field"><span>Kim imzalıyor?</span><select name="role">${roles.map((x) => `<option value="${x}" ${x === first ? 'selected' : ''}>${SIGN_ROLE_L[x]}</option>`).join('')}</select></label>
      <label class="field"><span>Ad soyad</span><input name="name" required value="${esc(nameFor(first))}"></label>
      <details class="span2"><summary>Sözleşmeyi göster (${lang.toUpperCase()})</summary><div class="doc-card" style="max-height:340px;overflow:auto;margin-top:8px">${contractDoc(r, lang)}</div></details>
      <div class="span2">${padHtml('s', 'İmza (parmak / kalem ile)')}</div>
      <label class="check span2"><input type="checkbox" name="ok" required> İmzalayan kişi sözleşmeyi okudu ve kabul etti.</label>
      <div class="form-actions span2"><button class="btn primary">İmzayı kaydet</button></div></form>`, { wide: true });
    const pad = signPad(b.querySelector('[data-pad=s]')); const f = b.querySelector('#sgf');
    f.role.onchange = () => { f.name.value = nameFor(f.role.value); };
    f.onsubmit = guard(async (e) => { e.preventDefault(); const sign = pad.value(); if (!sign) throw new Error('Lütfen imza atın.'); await POST(`rentals/${r.id}/sign`, { role: f.role.value, name: f.name.value, sign, lang }); closeModal(); toast('İmza kaydedildi'); route(); });
  });
}

// ---------- referral programme ----------
async function referralsPage() {
  const [rows, credits] = await Promise.all([GET('referrals'), can('finance') ? GET('credits') : Promise.resolve([])]);
  const s = session.settings; const on = s.referral_on !== '0';
  const earned = rows.filter((x) => x.status === 'kazanıldı');
  setMain(`${head('Tavsiye programı', `Arkadaşını getiren sürücüye ${money(s.referral_reward)}, gelen arkadaşa ${money(s.referral_friend_reward)} indirim (net). Ödül, arkadaşın ilk kira faturası ödenince kazanılır ve bir sonraki kira faturasından otomatik düşülür.`, `${can('admin') ? '<a class="btn sm" href="#/settings">Ayarlar</a>' : ''}${can('finance', 'w') ? '<button class="btn sm primary" id="addcr">+ Manuel indirim</button>' : ''}`)}
  ${on ? '' : '<div class="alert warn">Tavsiye programı Ayarlar\'da kapalı.</div>'}
  <div class="kpis">${kpi('Davet edilen', rows.length)}${kpi('Kazanılan', earned.length, `${money(earned.reduce((a, x) => a + (x.reward || 0), 0))} ödül`)}${kpi('Bekleyen', rows.filter((x) => x.status === 'bekliyor').length, 'arkadaş henüz ödeme yapmadı')}</div>
  ${card('Davetler', table(rows, [{ l: 'Tarih', f: (x) => date(x.created_at) }, { l: 'Davet eden', f: (x) => `<a href="#/riders/${x.referrer_id}">${esc(x.referrer_name)}</a> <small class="muted mono">${esc(x.ref_code || '')}</small>` }, { l: 'Gelen arkadaş', f: (x) => `<a href="#/riders/${x.referred_id}">${esc(x.referred_name)}</a>` }, { l: 'Kiralama', f: (x) => num(x.rentals), cls: 'num' }, { l: 'Ödül', f: (x) => money(x.reward), cls: 'num' }, { l: 'Durum', f: (x) => `${badge(x.status)}${x.note ? `<br><small class="muted">${esc(x.note)}</small>` : ''}` }, { l: '', f: (x) => (x.status === 'bekliyor' && can('customers', 'w') ? `<button class="btn xs ghost" data-refx="${x.id}">İptal</button>` : '') }], { empty: 'Henüz davet yok. Sürücüler kodlarını sürücü ekranında "Arkadaşını getir" bölümünde görür.' }))}
  ${can('finance') ? card('İndirim kredileri', table(credits, [{ l: 'Tarih', f: (x) => date(x.created_at) }, { l: 'Müşteri', f: (x) => `<a href="#/customers/${x.customer_id}">${esc(x.customer_label)}</a>` }, { k: 'reason', l: 'Sebep' }, { l: 'Tutar', f: (x) => money(x.amount), cls: 'num' }, { l: 'Kalan', f: (x) => (x.left_amount > 0.004 ? `<b>${money(x.left_amount)}</b>` : '—'), cls: 'num' }, { l: '', f: (x) => (x.left_amount > 0.004 && can('finance', 'w') ? `<button class="btn xs ghost" data-crx="${x.id}">İptal</button>` : '') }], { empty: 'Kredi yok' })) : ''}`);
  main().querySelectorAll('[data-refx]').forEach((b) => b.onclick = guard(async () => { if (await confirmBox('Bu davet iptal edilsin mi? Kullanılmamış hoş geldin indirimi de iptal olur.')) { await POST(`referrals/${b.dataset.refx}/cancel`, {}); route(); } }));
  main().querySelectorAll('[data-crx]').forEach((b) => b.onclick = guard(async () => { if (await confirmBox('Kalan kredi iptal edilsin mi?')) { await DEL(`credits/${b.dataset.crx}`); route(); } }));
  $('#addcr')?.addEventListener('click', async () => {
    const cs = await lookup('customers');
    const b = modal('Manuel indirim kredisi', `<form class="grid-form"><label class="field span2"><span>Müşteri</span><select name="customer_id" required><option value="">Seçin…</option>${cs.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join('')}</select></label>
      <label class="field"><span>Tutar (net €)</span><input name="amount" type="number" step="0.01" min="0.01" required></label><label class="field"><span>Sebep</span><input name="reason" placeholder="Örn. arıza nedeniyle iyi niyet indirimi"></label>
      <p class="muted span2">Bir sonraki kira dönemi faturasından otomatik düşülür.</p><div class="form-actions span2"><button class="btn primary">Kaydet</button></div></form>`);
    b.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST('credits', readForm(e.target)); closeModal(); toast('Kredi eklendi'); route(); });
  });
}

// ---------- SEPA direct debit ----------
const download = (name, text, type = 'application/xml') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
async function sepaPage(q) {
  const date0 = q.date || '';
  const [cand, batches, mandates] = await Promise.all([GET('sepa/candidates', date0 ? { date: date0 } : {}), GET('sepa/batches'), GET('sepa/mandates')]);
  const fw = can('finance', 'w'); const ready = cand.on && cand.creditor_id && cand.iban_ok;
  setMain(`${head('SEPA otomatik ödeme', 'Sürücüler sürücü ekranından SEPA yetkisi (Lastschriftmandat) verir. Burada vadesi gelen faturalar için bankaya yüklenecek tahsilat dosyası (pain.008) oluşur; ödeme sağlayıcısı gerekmez.', fw ? '<button class="btn sm" id="addm">+ Kâğıt yetki ekle</button>' : '')}
  ${ready ? '' : `<div class="alert warn">Kurulum eksik: ${[cand.on ? null : 'Ayarlar → SEPA otomatik ödemeyi açın', cand.creditor_id ? null : 'Gläubiger-ID (Bundesbank\'tan ücretsiz alınır) girin', cand.iban_ok ? null : 'Şirket IBAN\'ını girin'].filter(Boolean).join(' · ')}. ${can('admin') ? '<a href="#/settings">Ayarlar →</a>' : ''}</div>`}
  ${card(`Tahsil edilecek faturalar <small class="muted">vadesi ${date(cand.date)} veya öncesi, aktif yetkisi olan müşteriler</small>`, `<form class="inline-form" id="df"><label class="field"><span>Tahsil (borç) tarihi</span><input type="date" name="date" value="${cand.date}" min="${addDays(todayISO(), 1)}"></label><button class="btn sm">Listele</button></form>
    ${table(cand.rows, [{ l: '', f: (x) => `<input type="checkbox" data-sel="${x.id}" checked>` }, { k: 'invoice_no', l: 'Fatura' }, { l: 'Müşteri', f: (x) => esc(x.customer_label) }, { l: 'Vade', f: (x) => date(x.due_date) }, { l: 'IBAN', f: (x) => `<span class="mono">${esc(x.iban)}</span>` }, { l: 'Tür', f: (x) => (x.first_used_at ? 'RCUR' : 'FRST') }, { l: 'Tutar', f: (x) => money(x.balance), cls: 'num' }], { empty: 'Bu tarih için çekilecek fatura yok.' })}
    ${fw && cand.rows.length ? `<div class="form-actions"><span class="muted">Toplam ${money(cand.rows.reduce((a, x) => a + x.balance, 0))}</span><span class="grow"></span><button class="btn primary" id="mk" ${ready ? '' : 'disabled'}>SEPA dosyası oluştur ve indir</button></div>` : ''}`)}
  ${card('Oluşturulan dosyalar', table(batches, [{ l: 'Tarih', f: (x) => dt(x.created_at) }, { k: 'msg_id', l: 'Dosya' }, { l: 'Tahsil tarihi', f: (x) => date(x.collection_date) }, { l: 'Adet', f: (x) => num(x.count), cls: 'num' }, { l: 'Toplam', f: (x) => money(x.total), cls: 'num' }, { l: 'Durum', f: (x) => badge(x.status) },
    { l: '', f: (x) => `<button class="btn xs" data-dl="${x.id}">XML</button>${fw && x.status === 'oluşturuldu' ? `<button class="btn xs primary" data-settle="${x.id}">Tahsil edildi</button><button class="btn xs ghost" data-cx="${x.id}">İptal</button>` : ''}` }], { empty: 'Henüz dosya yok' }))}
  ${card('Yetkiler (mandate)', table(mandates, [{ l: 'Tarih', f: (x) => date(x.signed_at) }, { l: 'Müşteri', f: (x) => `<a href="#/customers/${x.customer_id}">${esc(x.customer_label)}</a>` }, { k: 'holder', l: 'Hesap sahibi' }, { l: 'IBAN', f: (x) => `<span class="mono">${esc(x.iban)}</span>` }, { k: 'mandate_ref', l: 'Referans' }, { l: 'Kanal', f: (x) => (x.ip ? 'sürücü ekranı' : 'kâğıt / panel') }, { l: 'Durum', f: (x) => badge(x.status) }, { l: '', f: (x) => (fw && x.status === 'aktif' ? `<button class="btn xs ghost" data-rv="${x.id}">İptal et</button>` : '') }], { empty: 'Henüz yetki yok' }))}
  <p class="muted">Akış: 1) Dosyayı oluşturup indirin. 2) Bankanızın online bankacılığında "SEPA-Lastschrift / Sammellastschrift Datei hochladen" ile yükleyin. 3) Para hesabınıza geçince "Tahsil edildi" deyin; geri dönen (Rücklastschrift) faturaları o ekranda işaretleyin. Sürücüye çekimden önce otomatik bildirim gider.</p>`);
  $('#df').onsubmit = (e) => { e.preventDefault(); location.hash = `#/sepa?date=${e.target.date.value}`; };
  $('#mk')?.addEventListener('click', guard(async () => {
    const ids = [...main().querySelectorAll('[data-sel]:checked')].map((x) => Number(x.dataset.sel)); if (!ids.length) throw new Error('En az bir fatura seçin.');
    const x = await POST('sepa/batches', { collection_date: $('#df').date.value, invoice_ids: ids }); download(`${x.msg_id}.xml`, x.xml); toast(`${x.count} fatura · ${money(x.total)} · dosya indirildi`); route();
  }));
  main().querySelectorAll('[data-dl]').forEach((b) => b.onclick = guard(async () => { const x = await GET(`sepa/batches/${b.dataset.dl}`); download(`${x.msg_id}.xml`, x.xml); }));
  main().querySelectorAll('[data-cx]').forEach((b) => b.onclick = guard(async () => { if (await confirmBox('Dosya iptal edilsin mi? (Bankaya yüklemediyseniz)')) { await POST(`sepa/batches/${b.dataset.cx}/cancel`, {}); route(); } }));
  main().querySelectorAll('[data-rv]').forEach((b) => b.onclick = guard(async () => { if (await confirmBox('Yetki iptal edilsin mi?')) { await DEL(`sepa/mandates/${b.dataset.rv}`); route(); } }));
  main().querySelectorAll('[data-settle]').forEach((b) => b.onclick = guard(async () => {
    const x = await GET(`sepa/batches/${b.dataset.settle}`);
    const m = modal('Tahsil edildi olarak işaretle', `<form class="grid-form"><label class="field"><span>Hesaba geçiş tarihi</span><input type="date" name="date" value="${x.collection_date}"></label><div></div>
      <p class="span2 muted">Geri dönen (ödenmeyen) faturaları işaretleyin; onlar açık kalır.</p><div class="span2">${x.items.map((i) => `<label class="check"><input type="checkbox" name="f_${i.invoice_id}"> ${esc(i.e2e)} · ${esc(i.debtor)} · ${money(i.amount)} <span class="muted">geri döndü</span></label>`).join('')}</div>
      <div class="form-actions span2"><button class="btn primary">Ödemeleri kaydet</button></div></form>`);
    m.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); const d = readForm(e.target); const failed = x.items.filter((i) => d[`f_${i.invoice_id}`]).map((i) => i.invoice_id); const r = await POST(`sepa/batches/${x.id}/settle`, { date: d.date, failed_ids: failed }); closeModal(); toast(`${r.paid} ödeme kaydedildi`); route(); });
  }));
  $('#addm')?.addEventListener('click', async () => {
    const cs = await lookup('customers');
    const b = modal('Kâğıt SEPA yetkisi ekle', `<form class="grid-form"><label class="field span2"><span>Müşteri</span><select name="customer_id" required><option value="">Seçin…</option>${cs.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join('')}</select></label>
      <label class="field"><span>Hesap sahibi</span><input name="holder" required></label><label class="field"><span>IBAN</span><input name="iban" required class="mono"></label>
      <label class="field"><span>BIC (isteğe bağlı)</span><input name="bic"></label><label class="field"><span>İmza tarihi</span><input name="signed_at" type="date" value="${todayISO()}"></label>
      <p class="muted span2">İmzalı kâğıt yetkiyi müşteri kartına belge olarak da yükleyin.</p><div class="form-actions span2"><button class="btn primary">Kaydet</button></div></form>`);
    b.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST('sepa/mandates', readForm(e.target)); closeModal(); toast('Yetki kaydedildi'); route(); });
  });
}

// ---------- rider page: referral, consent, SEPA, ID check, privacy ----------
async function riderGrowth(r) {
  const box = $('#rgrowth'); if (!box) return;
  const g = await GET(`riders/${r.id}/growth`).catch(() => null); if (!g) { box.remove(); return; }
  const wa = waPhone(r.phone); const ref = g.referral;
  const reviewTxt = encodeURIComponent(`Hallo ${r.name.split(' ')[0]}, danke, dass du mit Pedalla fährst! Wenn du zufrieden bist, würden wir uns sehr über eine kurze Google-Bewertung freuen: ${g.review_url || ''}`);
  box.innerHTML = `<div class="grid g-2">
    ${card('Kimlik kontrolü', `<div class="idcheck">${g.selfie?.thumb ? `<img src="data:image/jpeg;base64,${g.selfie.thumb}" alt="selfie" title="Son selfie · ${dt(g.selfie.created_at)}">` : '<div class="empty">selfie yok</div>'}<div>
      <p>${r.id_checked ? '<span class="badge b-ok">✓ kimlik doğrulandı</span>' : '<span class="badge b-warn">doğrulanmadı</span>'}</p>
      <p class="muted">Selfie'yi sürücünün yüklediği kimlik ön yüzüyle (Evraklar → Aç) karşılaştırın; ad, doğum tarihi ve geçerlilik tarihini kontrol edin. Online kimlik doğrulama servisi bağlandığında bu adım otomatik olur.</p>
      ${!r.id_checked && can('customers', 'w') ? '<button class="btn sm primary" id="idok">Kimliği doğruladım</button>' : ''}</div></div>`)}
    ${card('Tavsiye, SEPA ve gizlilik', `${dl([
      ref ? ['Tavsiye kodu', `<span class="ref-code">${esc(ref.code)}</span>${ref.link ? `<br><small><a href="${esc(ref.link)}" target="_blank" rel="noopener">${esc(ref.link)}</a></small>` : ''}`] : null,
      ref ? ['Davet ettikleri', `${ref.invited} kişi · ${ref.earned} kazanıldı${ref.credit ? ` · kalan kredi ${money(ref.credit)}` : ''}`] : null,
      ['Davet eden', g.referred_by ? `<a href="#/riders/${g.referred_by.id}">${esc(g.referred_by.name)}</a>` : '—'],
      ['SEPA yetkisi', g.mandate ? `<span class="mono">${esc(g.mandate.iban)}</span> · ${esc(g.mandate.mandate_ref)} · ${date(g.mandate.signed_at)}` : '—'],
      ['Gizlilik onayı', g.consent_at ? `${dt(g.consent_at)} · sürüm ${esc(g.consent_version || '')}` : '<span class="muted">kayıt yok (panelden açılan hesap)</span>'],
    ])}
      <div class="form-actions">${g.review_url && wa ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${reviewTxt}">⭐ Google yorumu iste (WhatsApp)</a>` : ''}<button class="btn sm" id="rexp">Verileri indir (DSGVO)</button>${can('admin', 'w') && !g.anonymized_at ? '<button class="btn sm danger" id="ranon">Verileri sil / anonimleştir</button>' : ''}</div>`)}
  </div>`;
  box.querySelector('#idok')?.addEventListener('click', guard(async () => { await PUT(`riders/${r.id}`, { id_checked: 1 }); toast('Kimlik doğrulandı olarak işaretlendi'); route(); }));
  box.querySelector('#rexp')?.addEventListener('click', guard(async () => { const x = await GET(`riders/${r.id}/export`); download(`pedalla-daten-${r.id}.json`, JSON.stringify(x, null, 2), 'application/json'); }));
  box.querySelector('#ranon')?.addEventListener('click', () => {
    const b = modal('Sürücü verilerini sil (DSGVO)', `<form class="grid-form"><p class="span2">Kimlik belgeleri, selfie'ler, konum, mesajlar, telefon, e-posta ve kimlik bilgileri silinir; sürücü ekranı girişi kapanır. Faturalar ve sözleşmeler yasal saklama süresi (10 yıl, § 147 AO) nedeniyle ad ve adresle birlikte kalır. Aktif kiralaması veya açık faturası olan sürücü silinemez. Geri alınamaz.</p>
      <label class="field span2"><span>Onay için SİL yazın</span><input name="confirm" autocomplete="off" required></label><div class="form-actions span2"><button class="btn danger">Kalıcı olarak sil</button></div></form>`);
    b.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST(`riders/${r.id}/anonymize`, readForm(e.target)); closeModal(); toast('Veriler silindi'); route(); });
  });
}

// ---------- backup (settings) ----------
async function downloadBackup(btn) {
  const old = btn.textContent; btn.disabled = true;
  try {
    const man = await GET('backup', { mark: '1' }); const out = { app: man.app, created_at: man.created_at, tables: {} };
    let i = 0;
    for (const t of man.tables) {
      i++; btn.textContent = `Yedekleniyor… ${i}/${man.tables.length}`; out.tables[t.name] = [];
      let after = 0; for (;;) { const ch = await GET('backup/table', { name: t.name, after }); out.tables[t.name].push(...ch.rows); if (ch.next == null) break; after = ch.next; }
    }
    download(`pedalla-yedek-${man.created_at.slice(0, 10)}.json`, JSON.stringify(out), 'application/json');
    toast('Yedek indirildi. Güvenli bir yerde (şifreli) saklayın; kimlik belgeleri içerir.');
  } finally { btn.disabled = false; btn.textContent = old; }
}

// ---------- router ----------
const ROUTES = [
  [/^$/, () => dashboardPage(), 'dashboard'],
  [/^map$/, (m, q) => mapPage(q), 'fleet'],
  [/^notifications$/, () => notificationsPage(), 'dashboard'],
  [/^bikes\/(\d+)$/, (m) => bikePage(m[1]), 'fleet'],
  [/^bikes\/(\d+)\/qr$/, (m) => qrPage(m[1]), 'fleet'],
  [/^bikes\/qr$/, (m, q) => qrPage(null, q), 'fleet'],
  [/^b\/([A-Za-z0-9-]+)$/, (m) => qrOpen(m[1]), null],
  [/^parts\/order$/, () => orderListPage(), 'stock'],
  [/^rentals$/, (m, q) => rentalsPage(q), 'rentals'],
  [/^rentals\/new$/, (m, q) => newRentalPage(q), 'rentals'],
  [/^rentals\/(\d+)$/, (m, q) => rentalPage(m[1], q), 'rentals'],
  [/^rentals\/(\d+)\/handover\/(teslim|iade)$/, (m) => handoverPage(m[1], m[2]), 'rentals'],
  [/^handovers\/(\d+)$/, (m) => handoverViewPage(m[1]), 'rentals'],
  [/^overdue$/, () => overduePage(), 'finance'],
  [/^summary$/, (m, q) => summaryPage(q), 'reports'],
  [/^rentals\/(\d+)\/contract$/, (m) => contractPage(m[1]), 'rentals'],
  [/^customers\/(\d+)$/, (m) => customerPage(m[1]), 'customers'],
  [/^riders\/(\d+)$/, (m) => riderPage(m[1]), 'customers'],
  [/^portal_requests\/(\d+)$/, (m) => requestPage(m[1]), 'rentals'],
  [/^cash$/, (m, q) => cashPage(q), 'finance'],
  [/^sepa$/, (m, q) => sepaPage(q), 'finance'],
  [/^referrals$/, () => referralsPage(), 'customers'],
  [/^invoices$/, (m, q) => invoicesPage(q), 'finance'],
  [/^invoices\/(\d+)$/, (m) => invoicePage(m[1]), 'finance'],
  [/^service$/, (m, q) => servicePage(q), 'service'],
  [/^service\/new$/, (m, q) => newServicePage(q), 'service'],
  [/^service\/(\d+)$/, (m) => serviceDetailPage(m[1]), 'service'],
  [/^parts$/, (m, q) => partsPage(q), 'stock'],
  [/^parts\/(\d+)$/, (m) => partPage(m[1]), 'stock'],
  [/^reports$/, (m, q) => reportsPage(q), 'reports'],
  [/^roles$/, () => rolesPage(), 'admin'],
  [/^settings$/, () => settingsPage(), 'admin'],
  [/^search\/(.*)$/, (m) => searchPage(decodeURIComponent(m[1])), null],
  [/^([a-z_]+)\/(\d+)\/edit$/, (m) => editRoute(m[1], m[2]), null],
  [/^([a-z_]+)$/, (m, q) => (RESOURCES[m[1]] ? listPage(m[1], q) : notFound()), null],
];
const notFound = () => setMain('<div class="empty big">Sayfa bulunamadı.</div>');
export async function route() {
  if (!session.token) return loginPage();
  if (!session.user) return boot();
  const raw = location.hash.replace(/^#\/?/, ''); const [path, qs] = raw.split('?');
  if (path === 'login') { location.hash = '#/'; return; }
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === path.split('/')[0] || (path.startsWith('service') && a.dataset.nav === 'service')));
  $('#side')?.classList.remove('open'); closeModal();
  for (const [re, fn, perm] of ROUTES) {
    const m = path.match(re); if (!m) continue;
    const p = perm || RESOURCES[m[1]]?.perm;
    if (p && !can(p)) return setMain('<div class="empty big">Bu sayfayı görüntüleme yetkiniz yok.</div>');
    loading();
    try { await fn(m, q); } catch (e) { setMain(`<div class="alert danger">${esc(e.message)}</div>`); }
    window.scrollTo(0, 0);
    return;
  }
  notFound();
}
export async function boot() {
  startI18n();
  if (!session.token) return loginPage();
  try {
    const me = await GET('me'); Object.assign(session, { user: me.user, perms: me.perms, roles: me.roles, settings: me.settings }); applyBikeTypes(me.settings);
  } catch { setToken(null); return loginPage(); }
  if (!location.hash || location.hash === '#/login') location.hash = '#/';
  shell(); await route();
}
window.addEventListener('hashchange', () => { if (session.user || !session.token) route(); });
