import { RESOURCES, ROLES, PERMS, BIKE_STATUS, SERVICE_STATUS, PAY_METHODS, PERIODS } from './shared/meta.js';
import {
  GET, POST, PUT, DEL, session, setToken, can, esc, money, num, date, dt, ago, badge, todayISO, addDays, fmtField, toast, guard, modal, closeModal, confirmBox,
  inputHtml, fillRefs, readForm, editForm, lookup, clearLookups, csv, table, bindTable, colsFromMeta, barChart, donut, meter, statusHex,
} from './core.js';

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
const loading = () => setMain('<div class="loading"><div class="spin"></div></div>');

// ---------- navigation ----------
const NAV = [
  ['Genel', [['', 'Özet', 'dashboard', 'grid'], ['map', 'Canlı harita', 'fleet', 'map'], ['notifications', 'Bildirimler', 'dashboard', 'bell']]],
  ['Kiralama', [['rentals', 'Kiralamalar', 'rentals', 'key'], ['bikes', 'Bisikletler', 'fleet', 'bike'], ['customers', 'Müşteriler', 'customers', 'users'], ['riders', 'Sürücüler', 'customers', 'user'], ['pricing_plans', 'Tarifeler', 'rentals', 'tag']]],
  ['Finans', [['invoices', 'Faturalar', 'finance', 'doc'], ['payments', 'Ödemeler', 'finance', 'cash'], ['deposits', 'Depozitolar', 'finance', 'lock']]],
  ['Servis & Stok', [['service', 'Servis kayıtları', 'service', 'wrench'], ['parts', 'Yedek parçalar', 'stock', 'box'], ['stock_moves', 'Stok hareketleri', 'stock', 'swap'], ['suppliers', 'Tedarikçiler', 'stock', 'truck']]],
  ['Analiz', [['reports', 'Raporlar', 'reports', 'chart']]],
  ['Yönetim', [['users', 'Kullanıcılar', 'admin', 'users'], ['roles', 'Roller & yetkiler', 'admin', 'shield'], ['settings', 'Ayarlar', 'admin', 'cog'], ['audit_log', 'İşlem geçmişi', 'admin', 'list']]],
];
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>', bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>', bike: '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16 10 8h5l3 8M10 8 8 5H6M12 16l3-8"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>', doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>', lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>', box: '<path d="m3 7 9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>', truck: '<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>', shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" class="ic" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;
export const LOGO = `<span class="logo"><svg viewBox="0 0 40 40" class="logo-mark" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="var(--brand)"/><circle cx="13" cy="24" r="5" fill="none" stroke="var(--accent)" stroke-width="2.6"/><circle cx="27" cy="24" r="5" fill="none" stroke="var(--accent)" stroke-width="2.6"/><path d="M13 24 17 15h7l3 9M17 15l-1.5-3H13" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="logo-t">pedalla</span></span>`;

function shell() {
  const u = session.user;
  appRoot().innerHTML = `<div class="app">
    <aside class="side" id="side"><div class="side-top">${LOGO}<span class="side-tag">Admin</span></div>
      <nav>${NAV.map(([g, items]) => { const vis = items.filter(([, , p]) => can(p)); return vis.length ? `<div class="nav-g"><div class="nav-gl">${g}</div>${vis.map(([h, l, , ic]) => `<a href="#/${h}" data-nav="${h}">${icon(ic)}<span>${l}</span>${h === 'notifications' ? '<span class="nav-cnt" id="notif-cnt"></span>' : ''}</a>`).join('')}</div>` : ''; }).join('')}</nav>
      <div class="side-foot"><div class="me"><span class="avatar">${esc(u.name.split(' ').map((x) => x[0]).join('').slice(0, 2))}</span><div><b>${esc(u.name)}</b><small>${esc(ROLES[u.role] || u.role)}</small></div></div><button class="btn ghost sm" id="logout">Çıkış</button></div>
    </aside>
    <div class="body"><header class="top"><button class="icon-btn menu" id="menu" aria-label="Menü">☰</button>
      <form class="gsearch" id="gsearch"><input type="search" placeholder="Bisiklet kodu, müşteri, sözleşme, fatura ara…" id="gq"></form>
      ${can('rentals', 'w') ? '<a class="btn primary sm" href="#/rentals/new">+ Kiralama</a>' : ''}${can('service', 'w') ? '<a class="btn sm" href="#/service/new">+ Servis kabul</a>' : ''}
      <a class="icon-btn bell" href="#/notifications" aria-label="Bildirimler">${icon('bell')}<span class="dot" id="notif-dot" hidden></span></a></header>
      <main id="main"></main></div></div>`;
  $('#logout').onclick = guard(async () => { await POST('logout').catch(() => {}); setToken(null); session.user = null; location.hash = '#/login'; route(); });
  $('#menu').onclick = () => $('#side').classList.toggle('open');
  $('#gsearch').onsubmit = (e) => { e.preventDefault(); location.hash = '#/search/' + encodeURIComponent($('#gq').value); };
  refreshNotifCount();
}
async function refreshNotifCount() {
  const n = await GET('notifications').catch(() => []);
  const c = n.filter((x) => x.level !== 'info').length;
  const el = $('#notif-cnt'); if (el) el.textContent = c || '';
  const d = $('#notif-dot'); if (d) d.hidden = !c;
}

// ---------- login ----------
function loginPage() {
  appRoot().innerHTML = `<div class="login"><form class="login-card" id="lf">${LOGO}<h1>Yönetim paneli</h1><p class="sub">Filo, kiralama, servis ve finans tek ekranda.</p>
    <label class="field"><span>E-posta</span><input name="email" type="email" required value="admin@pedalla.bike" autocomplete="username"></label>
    <label class="field"><span>Şifre</span><input name="password" type="password" required autocomplete="current-password" value="${window.PEDALLA_DEMO ? 'pedalla123' : ''}"></label>
    <button class="btn primary block">Giriş yap</button><p class="hint">Demo hesapları: admin@, operasyon@, servis@, muhasebe@pedalla.bike · şifre <code>pedalla123</code></p></form></div>`;
  $('#lf').onsubmit = guard(async (e) => {
    e.preventDefault(); const r = await POST('login', readForm(e.target)); setToken(r.token); await boot();
  });
}

// ---------- dashboard ----------
async function dashboardPage() {
  const d = await GET('dashboard'); const k = d.kpi; const fin = can('finance');
  const fleet = BIKE_STATUS.map((s) => ({ l: s, v: d.fleet.find((x) => x.status === s)?.n || 0, c: statusHex[s] })).filter((x) => x.v);
  const months = d.monthly.map((m) => ({ ...m, label: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][Number(m.m.slice(5)) - 1] }));
  setMain(`${head(`Merhaba, ${esc(session.user.name.split(' ')[0])}`, `${date(todayISO())} · ${esc(session.settings.company_name || 'Pedalla')} filo özeti`)}
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
    ${fin ? card('Faturalanan / tahsil edilen (son 12 ay, net)', barChart(months, [{ k: 'invoiced', l: 'Faturalanan', c: 'var(--brand)' }, { k: 'collected', l: 'Tahsil edilen', c: 'var(--accent-d)' }])) : card('Bisiklet tipleri', table(d.by_type, [{ k: 'type', l: 'Tip' }, { k: 'n', l: 'Adet', cls: 'num' }, { k: 'rented', l: 'Kirada', cls: 'num' }]))}
    ${card('Filo durumu', donut(fleet, { center: `<b>${k.bikes_total}</b><small>bisiklet</small>` }))}
  </div>
  <div class="grid g-2">
    ${card('Geciken iadeler', table(d.late_returns, [{ k: 'code', l: 'Bisiklet' }, { k: 'customer', l: 'Müşteri' }, { l: 'Dönüş', f: (r) => `<b class="t-danger">${date(r.end_date)}</b>` }], { link: (r) => `#/rentals/${r.id}`, empty: 'Geciken iade yok 🎉' }))}
    ${fin ? card('Geciken ödemeler', table(d.overdue, [{ k: 'invoice_no', l: 'Fatura' }, { k: 'customer', l: 'Müşteri' }, { l: 'Gecikme', f: (r) => `<b class="t-danger">${r.days} gün</b>` }, { l: 'Kalan', f: (r) => money(r.balance), cls: 'num' }], { link: (r) => `#/invoices/${r.id}`, empty: 'Geciken ödeme yok' })) : ''}
    ${card('Yaklaşan iadeler (14 gün)', table(d.upcoming_returns, [{ k: 'code', l: 'Bisiklet' }, { k: 'customer', l: 'Müşteri' }, { l: 'Dönüş', f: (r) => date(r.end_date) }], { link: (r) => `#/rentals/${r.id}`, empty: 'Yaklaşan iade yok' }))}
    ${card('Açık servis kayıtları', table(d.open_service, [{ k: 'order_no', l: 'No' }, { k: 'code', l: 'Bisiklet' }, { l: 'Durum', f: (r) => badge(r.status) }, { l: 'Tahmini', f: (r) => (r.estimated_ready < todayISO() ? `<b class="t-danger">${date(r.estimated_ready)}</b>` : date(r.estimated_ready)) }], { link: (r) => `#/service/${r.id}`, empty: 'Açık servis yok' }))}
    ${card('Kritik stok', table(d.low_stock, [{ k: 'sku', l: 'Kod' }, { k: 'name', l: 'Parça' }, { l: 'Stok', f: (r) => `<b class="${r.stock <= 0 ? 't-danger' : 't-warn'}">${num(r.stock)} ${esc(r.unit)}</b> / min ${num(r.min_stock)}`, cls: 'num' }], { link: (r) => `#/parts/${r.id}`, empty: 'Tüm stoklar yeterli' }))}
    ${card('Son işlemler', `<ul class="feed">${d.recent.map((a) => `<li><span class="feed-t">${ago(a.ts)}</span><b>${esc(a.user || 'Sistem')}</b> · ${esc(a.action)} <span class="muted">${esc(a.details)}</span></li>`).join('')}</ul>`)}
  </div>`);
}

// ---------- map ----------
let mapTimer;
async function mapPage(q) {
  clearInterval(mapTimer);
  setMain(`${head('Canlı harita', 'GPS takip cihazlarından gelen son konumlar. Kartlara tıklayarak bisiklet detayına gidin.', `${can('fleet', 'w') ? '<button class="btn sm" id="sim">Konumları güncelle (simülasyon)</button>' : ''}<button class="btn sm" id="refresh">Yenile</button>`)}
    <div class="map-layout"><div class="map-side card"><div class="card-b"><input type="search" id="mq" placeholder="Kod, müşteri, sürücü…"><div class="chips" id="mchips">${['tümü', ...BIKE_STATUS].map((s) => `<button class="chip ${s === (q.status || 'tümü') ? 'on' : ''}" data-s="${s}">${s === 'tümü' ? 'Tümü' : `<i style="background:${statusHex[s]}"></i>${s}`}</button>`).join('')}</div><div id="mlist" class="mlist"></div></div></div>
    <div id="map" class="map card"></div></div>`);
  if (!window.L) { $('#map').innerHTML = '<div class="empty">Harita kütüphanesi yüklenemedi (internet bağlantısı gerekli).</div>'; }
  const map = window.L ? L.map('map', { zoomControl: true }).setView([Number(session.settings.map_center_lat) || 53.56, Number(session.settings.map_center_lng) || 9.95], 12) : null;
  if (map) L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  let layer = map ? L.layerGroup().addTo(map) : null; let bikes = []; let filt = q.status || 'tümü'; const markers = {};
  const draw = () => {
    const term = ($('#mq')?.value || '').toLowerCase();
    const vis = bikes.filter((b) => (filt === 'tümü' || b.status === filt) && (!term || [b.code, b.customer_label, b.rider_name, b.model].join(' ').toLowerCase().includes(term)));
    $('#mlist').innerHTML = vis.map((b) => `<button class="mitem" data-id="${b.id}"><i style="background:${statusHex[b.status]}"></i><div><b>${esc(b.code)}</b> <small>${esc(b.model)}</small><br><small>${b.status === 'kirada' ? `${esc(b.customer_label || '')}${b.rider_name ? ' · ' + esc(b.rider_name) : ''}` : esc(b.location_name || b.status)}</small></div><small class="muted">${b.battery_level != null ? '%' + b.battery_level : ''}<br>${ago(b.last_seen)}</small></button>`).join('') || '<div class="empty">Sonuç yok</div>';
    if (!map) return;
    layer.clearLayers();
    for (const b of vis) {
      if (b.lat == null) continue;
      const m = L.marker([b.lat, b.lng], { icon: L.divIcon({ className: '', html: `<div class="pin" style="--c:${statusHex[b.status]}"><span>${esc(b.code.replace('PED-', ''))}</span></div>`, iconSize: [34, 42], iconAnchor: [17, 40] }) });
      m.bindPopup(`<div class="pop"><b>${esc(b.code)}</b> ${badge(b.status)}<br>${esc(b.brand)} ${esc(b.model)}<br>${b.status === 'kirada' ? `Kiracı: <b>${esc(b.customer_label || '—')}</b><br>Sürücü: ${esc(b.rider_name || '—')} ${b.rider_phone ? `<a href="tel:${esc(b.rider_phone)}">${esc(b.rider_phone)}</a>` : ''}<br>Dönüş: ${date(b.end_date)}<br>` : ''}Batarya: ${b.battery_level != null ? '%' + b.battery_level : '—'} · Son sinyal: ${ago(b.last_seen)}<br><a href="#/bikes/${b.id}">Detay →</a></div>`);
      m.addTo(layer); markers[b.id] = m;
    }
    $('#mlist').querySelectorAll('.mitem').forEach((el) => el.onclick = () => { const b = bikes.find((x) => x.id == el.dataset.id); if (map && b?.lat) { map.setView([b.lat, b.lng], 15); markers[b.id]?.openPopup(); } else location.hash = `#/bikes/${b.id}`; });
  };
  const load = async () => {
    const [list, rentals] = await Promise.all([GET('bikes'), GET('rentals', { status: 'aktif' })]);
    const riders = can('customers') ? await lookup('riders') : [];
    const byBike = Object.fromEntries(rentals.map((r) => [r.bike_id, r]));
    bikes = list.map((b) => { const r = byBike[b.id]; const rd = riders.find((x) => x.id === r?.rider_id); return { ...b, customer_label: r?.customer_label, rider_name: r?.rider_name, rider_phone: rd?.raw.phone, end_date: r?.end_date }; });
    draw();
  };
  await load();
  $('#mq').oninput = draw;
  $('#mchips').querySelectorAll('.chip').forEach((c) => c.onclick = () => { filt = c.dataset.s; $('#mchips .on')?.classList.remove('on'); c.classList.add('on'); draw(); });
  $('#refresh').onclick = guard(load);
  $('#sim')?.addEventListener('click', guard(async () => { const r = await POST('simulate'); toast(`${r.moved} bisikletin konumu güncellendi`); await load(); }));
  mapTimer = setInterval(() => { if (!document.getElementById('map')) return clearInterval(mapTimer); load().catch(() => {}); }, 30000);
  setTimeout(() => map?.invalidateSize(), 50);
}

// ---------- generic list ----------
const LISTS = {
  bikes: { link: (r) => `#/bikes/${r.id}`, chips: ['status', BIKE_STATUS], sub: 'Filodaki tüm bisikletler, durumları ve bakım tarihleri.' },
  customers: { link: (r) => `#/customers/${r.id}`, sub: 'Kurumsal (kurye firmaları) ve bireysel kiracılar.' },
  riders: { sub: 'Bisikleti fiilen kullanan kişiler. Kurumsal müşterilerde her kuryeyi ayrı kaydedin.' },
  pricing_plans: { sub: 'Bisiklet tipine göre günlük / haftalık / aylık tarifeler ve depozito tutarları.' },
  payments: { sub: 'Faturalara karşı alınan tüm ödemeler.', create: 'payment' },
  deposits: { sub: 'Depozito tahsilatı, iadesi ve kesintileri.', chips: ['type', ['tahsil', 'iade', 'kesinti']] },
  stock_moves: { sub: 'Stok giriş, çıkış ve sayım düzeltmeleri. Servise kullanılan parçalar otomatik düşer.', chips: ['type', ['giriş', 'çıkış', 'sayım düzeltme']] },
  suppliers: { sub: 'Yedek parça tedarikçileri.' },
  users: { sub: 'Panele erişen çalışanlar. Yetkiler "Roller & yetkiler" ekranından yönetilir.' },
  audit_log: { sub: 'Sistemde yapılan tüm işlemler.' },
};
async function listPage(res, q = {}) {
  const meta = RESOURCES[res]; const cfg = LISTS[res] || {};
  const filter = { ...q }; delete filter.tab;
  const rows = await GET(res, filter);
  const w = can(meta.perm, 'w') && !meta.readonly;
  const cols = colsFromMeta(res);
  const chipHtml = cfg.chips ? `<div class="chips">${['', ...cfg.chips[1]].map((v) => `<a class="chip ${(q[cfg.chips[0]] || '') === v ? 'on' : ''}" href="#/${res}${v ? `?${cfg.chips[0]}=${encodeURIComponent(v)}` : ''}">${v || 'Tümü'}</a>`).join('')}</div>` : '';
  setMain(`${head(meta.label, cfg.sub, `<button class="btn sm" id="csv">CSV</button>${w && !meta.noCreate ? `<button class="btn primary sm" id="new">+ ${meta.single}</button>` : ''}`)}
    <div class="toolbar"><input type="search" id="q" placeholder="Ara…" value="${esc(q.q || '')}">${chipHtml}<span class="muted">${rows.length} kayıt</span></div>
    ${card('', table(rows, cols, { link: cfg.link || (w && !meta.noEdit ? (r) => `#/${res}/${r.id}/edit` : null) }), 'flush')}`);
  $('#csv').onclick = () => csv(rows, cols, res);
  const reload = () => route();
  $('#new')?.addEventListener('click', () => (cfg.create === 'payment' ? paymentForm({}, reload) : editForm(res, null, { onSaved: reload })));
  let t; $('#q').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { const p = new URLSearchParams({ ...q, q: e.target.value }); location.hash = `#/${res}?${p}`; }, 350); };
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
    `${w ? '<button class="btn sm" id="edit">Düzenle</button><button class="btn sm" id="stat">Durum değiştir</button>' : ''}${can('service', 'w') ? `<a class="btn sm" href="#/service/new?bike_id=${b.id}">Servise al</a>` : ''}${can('rentals', 'w') && b.status === 'müsait' ? `<a class="btn primary sm" href="#/rentals/new?bike_id=${b.id}">Kirala</a>` : ''}`)}
  <div class="grid g-1-2">
    <div class="stack">
      ${card('Şu anki kullanım', cur ? dl([['Sözleşme', `<a href="#/rentals/${cur.id}">${esc(cur.contract_no)}</a> ${badge(cur.status)}`], ['Kiracı', `<a href="#/customers/${cur.customer_id}">${esc(cur.customer_label)}</a> ${cur.customer_phone ? `· <a href="tel:${esc(cur.customer_phone)}">${esc(cur.customer_phone)}</a>` : ''}`], ['Kullanıcı (sürücü)', cur.rider_name ? `${esc(cur.rider_name)} ${cur.rider_phone ? `· <a href="tel:${esc(cur.rider_phone)}">${esc(cur.rider_phone)}</a>` : ''}` : '—'], ['Dönem', `${date(cur.start_date)} – ${cur.end_date < todayISO() && cur.status === 'aktif' ? `<b class="t-danger">${date(cur.end_date)} (gecikmede)</b>` : date(cur.end_date)}`], ['Ücret', `${money(cur.rate)} / ${esc(cur.period)}`], ['Depozito', `${money(cur.deposit_amount)} ${badge(cur.deposit_status)}`]]) : `<div class="empty">Bisiklet şu an kirada değil.</div>`)}
      ${card('Bisiklet bilgileri', dl([['Şasi no', esc(b.frame_no)], ['Batarya no', esc(b.battery_no)], ['GPS cihazı', esc(b.gps_tracker_id)], ['Model yılı', esc(b.year)], ['Alış', `${date(b.purchase_date)} · ${money(b.purchase_price)}`], ['Kilometre', `${num(b.odometer_km)} km`], ['Batarya', b.battery_level != null ? `${meter(b.battery_level, b.battery_level < 20 ? 'low' : '')} %${b.battery_level}` : '—'], ['Sigorta', `${esc(b.insurance_no || '—')} · ${b.insurance_until && b.insurance_until < addDays(todayISO(), 30) ? `<b class="t-warn">${date(b.insurance_until)}</b>` : date(b.insurance_until)}`], ['Son / sonraki bakım', `${date(b.last_service_date)} → ${b.next_service_date && b.next_service_date < todayISO() ? `<b class="t-danger">${date(b.next_service_date)}</b>` : date(b.next_service_date)}`], ['Toplam ciro', can('finance') ? money(b.revenue) : '—'], ['Notlar', esc(b.notes)]]))}
    </div>
    ${card(`Konum · ${esc(b.location_name || '')} <small class="muted">son sinyal ${ago(b.last_seen)}</small>`, '<div id="bmap" class="map sm"></div>')}
  </div>
  ${card('Kiralama geçmişi', table(b.rentals, [{ k: 'contract_no', l: 'Sözleşme' }, { k: 'customer_label', l: 'Kiracı' }, { k: 'rider_name', l: 'Sürücü', f: (r) => esc(r.rider_name || '—') }, { l: 'Başlangıç', f: (r) => date(r.start_date) }, { l: 'Dönüş', f: (r) => date(r.returned_at || r.end_date) }, { l: 'Ücret', f: (r) => `${money(r.rate)}/${r.period}`, cls: 'num' }, { l: 'Durum', f: (r) => badge(r.status) }], { link: (r) => `#/rentals/${r.id}` }))}
  ${card('Servis geçmişi', table(b.services, [{ k: 'order_no', l: 'No' }, { l: 'Kabul', f: (r) => dt(r.received_at) }, { l: 'Tip', f: (r) => esc(r.type) }, { k: 'complaint', l: 'Şikayet', f: (r) => esc((r.complaint || '').slice(0, 70)) }, { l: 'Teknisyen', f: (r) => esc(r.technician_name || '—') }, { l: 'Parça', f: (r) => money(r.parts_total), cls: 'num' }, { l: 'Durum', f: (r) => badge(r.status) }], { link: (r) => `#/service/${r.id}` }))}`);
  if (window.L && b.lat != null) {
    const m = L.map('bmap').setView([b.lat, b.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    if (b.track.length > 1) L.polyline(b.track.map((p) => [p.lat, p.lng]).reverse(), { color: getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#0f6b48', weight: 3, opacity: 0.7 }).addTo(m);
    L.marker([b.lat, b.lng], { icon: L.divIcon({ className: '', html: `<div class="pin" style="--c:${statusHex[b.status]}"><span>${esc(b.code.replace('PED-', ''))}</span></div>`, iconSize: [34, 42], iconAnchor: [17, 40] }) }).addTo(m);
    setTimeout(() => m.invalidateSize(), 50);
  } else $('#bmap').innerHTML = '<div class="empty">Konum bilgisi yok</div>';
  $('#edit')?.addEventListener('click', () => editForm('bikes', b, { onSaved: (x) => (x ? route() : (location.hash = '#/bikes')) }));
  $('#stat')?.addEventListener('click', () => {
    const body = modal('Durum değiştir', `<form class="grid-form">${inputHtml(field('bikes', 'status'), b.status)}${inputHtml({ k: 'notes', l: 'Not', t: 'textarea' }, b.notes)}<div class="form-actions span2"><button class="btn primary">Kaydet</button></div></form>`);
    body.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await PUT(`bikes/${b.id}`, readForm(e.target)); closeModal(); toast('Durum güncellendi'); route(); });
  });
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
    { l: 'Durum', f: (r) => badge(r.is_late ? 'gecikmede' : r.status) + (r.is_late ? '' : ''), csv: (r) => r.status },
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
    <label class="field"><span>Müşteri *</span><select name="customer_id" required><option value="">Seçin…</option>${customers.map((c) => `<option value="${c.id}" ${c.raw.blacklisted ? 'disabled' : ''} ${String(q.customer_id) === String(c.id) ? 'selected' : ''}>${esc(c.label)}${c.raw.blacklisted ? ' (kara liste)' : ''}</option>`).join('')}</select></label>
    <label class="field"><span>Sürücü (bisikleti kullanacak kişi)</span><select name="rider_id"><option value="">Önce müşteri seçin</option></select></label>
    <label class="field"><span>Bisiklet * <small class="muted">(${bikes.length} müsait)</small></span><select name="bike_id" required><option value="">Seçin…</option>${bikes.map((b) => `<option value="${b.id}" data-type="${esc(b.type)}" data-km="${b.odometer_km ?? ''}" data-bat="${b.battery_level ?? ''}" ${String(q.bike_id) === String(b.id) ? 'selected' : ''}>${esc(b.code)} · ${esc(b.model)} (${esc(b.type)})</option>`).join('')}</select></label>
    <label class="field"><span>Tarife</span><select name="plan_id"><option value="">Manuel fiyat</option></select></label>
    <label class="field"><span>Faturalama periyodu</span><select name="period">${PERIODS.map((p) => `<option ${p === 'ay' ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
    <label class="field"><span>Periyot ücreti (net) *</span><input name="rate" type="number" step="0.01" required></label>
    <label class="field"><span>Başlangıç *</span><input name="start_date" type="date" value="${t}" required></label>
    <label class="field"><span>Planlanan dönüş *</span><input name="end_date" type="date" value="${addDays(t, 30)}" required></label>
    <label class="field"><span>Depozito</span><input name="deposit_amount" type="number" step="0.01"></label>
    <label class="field"><span>Teslim km</span><input name="start_km" type="number" step="any"></label>
    <label class="field"><span>Teslim batarya %</span><input name="start_battery" type="number" step="any"></label>
    <label class="check"><input type="checkbox" name="deposit_paid" checked> Depozito teslimde tahsil edildi</label>
    <label class="field span3"><span>Teslim edilen aksesuarlar</span><input name="accessories" value="Kilit x1, şarj cihazı x1, yağmur brandası x1"></label>
    <label class="field span3"><span>Not</span><textarea name="notes" rows="2"></textarea></label>
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
  f.customer_id.onchange = async () => {
    const rs = (await GET('riders', { customer_id: f.customer_id.value, active: 1 }));
    f.rider_id.innerHTML = '<option value="">—</option>' + rs.map((r) => `<option value="${r.id}">${esc(r.name)}${r.current_bike ? ` (şu an ${esc(r.current_bike)})` : ''}</option>`).join('');
  };
  f.bike_id.onchange = upd;
  f.plan_id.onchange = () => { const p = plans.find((x) => String(x.id) === f.plan_id.value); if (p) { f.rate.value = p.price; f.deposit_amount.value = p.deposit; f.period.value = p.period; } sum(); };
  f.rate.oninput = sum; f.deposit_amount.oninput = sum;
  await upd();
  if (q.customer_id) await f.customer_id.onchange();
  f.onsubmit = guard(async (e) => { e.preventDefault(); const d = readForm(f); d.deposit_paid = !!d.deposit_paid; const r = await POST('rentals', d); clearLookups(); toast(`${r.contract_no} oluşturuldu`); location.hash = `#/rentals/${r.id}`; });
}
async function rentalPage(id) {
  const r = await GET(`detail/rentals/${id}`); const w = can('rentals', 'w'); const fw = can('finance', 'w');
  const late = r.late_days > 0;
  setMain(`${head(`${esc(r.contract_no)} <span class="h-badge">${badge(late ? 'gecikmede' : r.status, late ? `gecikmede · ${r.late_days} gün` : r.status)}</span>`, `${esc(r.bike.code)} → ${esc(r.customer.company_name || r.customer.name)}`,
    `<button class="btn sm" id="print">Sözleşmeyi yazdır</button>${w && r.status === 'aktif' ? '<button class="btn sm" id="ext">Uzat</button><button class="btn primary sm" id="ret">İade al</button>' : ''}${w && r.status === 'rezervasyon' ? '<button class="btn sm" id="cancel">İptal</button><button class="btn primary sm" id="act">Teslim et</button>' : ''}${w ? '<button class="btn sm" id="edit">Düzenle</button>' : ''}`)}
  ${late ? `<div class="alert danger">Planlanan dönüş tarihi ${date(r.end_date)} idi. Bisiklet ${r.late_days} gündür gecikmede; iadede günlük ${money(r.late_return_fee_per_day)} gecikme bedeli önerilir.</div>` : ''}
  <div class="grid g-3">
    ${card('Kiracı', dl([['Müşteri', `<a href="#/customers/${r.customer.id}">${esc(r.customer.company_name || r.customer.name)}</a>`], ['Yetkili', esc(r.customer.name)], ['Telefon', r.customer.phone ? `<a href="tel:${esc(r.customer.phone)}">${esc(r.customer.phone)}</a>` : '—'], ['E-posta', esc(r.customer.email)], ['Sürücü (kullanıcı)', r.rider ? `${esc(r.rider.name)} · ${esc(r.rider.phone || '')}` : '—']]))}
    ${card('Bisiklet', dl([['Kod', `<a href="#/bikes/${r.bike.id}">${esc(r.bike.code)}</a> ${badge(r.bike.status)}`], ['Model', `${esc(r.bike.brand)} ${esc(r.bike.model)}`], ['Teslim km / batarya', `${num(r.start_km)} km · ${r.start_battery != null ? '%' + r.start_battery : '—'}`], ['İade km', r.end_km != null ? `${num(r.end_km)} km (${num(r.end_km - (r.start_km || 0))} km kullanıldı)` : '—'], ['Aksesuarlar', esc(r.accessories)]]))}
    ${card('Koşullar', dl([['Dönem', `${date(r.start_date)} – ${date(r.end_date)}`], ['İade', date(r.returned_at)], ['Tarife', esc(r.plan?.name || 'Manuel')], ['Ücret', `${money(r.rate)} / ${esc(r.period)} + KDV`], ['Depozito', `${money(r.deposit_amount)} ${badge(r.deposit_status)}<br><small>Tutulan: ${money(r.deposit_held)}</small>`], ['Hasar bedeli', money(r.damage_fee)], ['İade durumu', esc(r.return_condition)], ['Not', esc(r.notes)]]))}
  </div>
  ${can('finance') ? card(`Faturalar <span class="card-act">${fw && r.status === 'aktif' ? '<button class="btn sm" id="bill">Vadesi gelen dönemleri faturala</button>' : ''}${fw && r.deposit_status === 'bekliyor' && r.deposit_amount > 0 ? '<button class="btn sm" id="dep">Depozito tahsil et</button>' : ''}</span>`, table(r.invoices, [{ k: 'invoice_no', l: 'No' }, { l: 'Tarih', f: (i) => date(i.issue_date) }, { l: 'Dönem', f: (i) => (i.period_start ? `${date(i.period_start)} – ${date(i.period_end)}` : esc(i.description)) }, { l: 'Vade', f: (i) => (i.days_late ? `<b class="t-danger">${date(i.due_date)}</b>` : date(i.due_date)) }, { l: 'Toplam', f: (i) => money(i.total), cls: 'num' }, { l: 'Kalan', f: (i) => (i.balance > 0.005 ? `<b>${money(i.balance)}</b>` : '—'), cls: 'num' }, { l: 'Durum', f: (i) => badge(i.status) }], { link: (i) => `#/invoices/${i.id}` })) : ''}
  <div class="grid g-2">
    ${can('finance') ? card('Depozito hareketleri', table(r.deposits, [{ l: 'Tarih', f: (d) => date(d.date) }, { l: 'Hareket', f: (d) => badge(d.type) }, { l: 'Tutar', f: (d) => money(d.amount), cls: 'num' }, { k: 'notes', l: 'Açıklama' }], { empty: 'Depozito hareketi yok' })) : ''}
    ${card('Bu kiralamadaki servis kayıtları', table(r.services, [{ k: 'order_no', l: 'No' }, { l: 'Tip', f: (s) => esc(s.type) }, { l: 'Durum', f: (s) => badge(s.status) }], { link: (s) => `#/service/${s.id}`, empty: 'Servis kaydı yok' }))}
  </div>`);
  $('#print').onclick = () => printContract(r);
  $('#edit')?.addEventListener('click', () => editForm('rentals', r, { onSaved: (x) => (x ? route() : (location.hash = '#/rentals')) }));
  $('#act')?.addEventListener('click', guard(async () => { await POST(`rentals/${id}/activate`); toast('Bisiklet teslim edildi, kiralama aktif'); route(); }));
  $('#cancel')?.addEventListener('click', guard(async () => { if (await confirmBox('Rezervasyon iptal edilsin mi?')) { await POST(`rentals/${id}/cancel`); route(); } }));
  $('#bill')?.addEventListener('click', guard(async () => { const x = await POST(`rentals/${id}/bill`); toast(x.created ? `${x.created} fatura oluşturuldu` : 'Faturalanacak yeni dönem yok', x.created ? 'ok' : 'info'); route(); }));
  $('#dep')?.addEventListener('click', () => {
    const body = modal('Depozito tahsil et', `<form class="grid-form"><label class="field"><span>Tutar</span><input name="amount" type="number" step="0.01" value="${r.deposit_amount}"></label><label class="field"><span>Tarih</span><input name="date" type="date" value="${todayISO()}"></label><div class="form-actions span2"><button class="btn primary">Kaydet</button></div></form>`);
    body.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST(`rentals/${id}/deposit`, readForm(e.target)); closeModal(); toast('Depozito kaydedildi'); route(); });
  });
  $('#ext')?.addEventListener('click', () => {
    const body = modal('Kiralamayı uzat', `<form class="grid-form"><label class="field"><span>Yeni dönüş tarihi</span><input name="end_date" type="date" required value="${addDays(r.end_date < todayISO() ? todayISO() : r.end_date, 30)}"></label><div class="form-actions span2"><button class="btn primary">Uzat</button></div></form>`);
    body.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST(`rentals/${id}/extend`, readForm(e.target)); closeModal(); toast('Kiralama uzatıldı'); route(); });
  });
  $('#ret')?.addEventListener('click', () => {
    const lateFee = r.late_days * r.late_return_fee_per_day;
    const body = modal('İade al', `<form class="grid-form">
      <label class="field"><span>İade tarihi</span><input name="returned_at" type="date" value="${todayISO()}"></label>
      <label class="field"><span>İade km</span><input name="end_km" type="number" step="any" value="${r.bike.odometer_km ?? ''}"></label>
      <label class="field span2"><span>Bisikletin durumu / eksikler</span><textarea name="return_condition" rows="2" placeholder="Örn. sorunsuz; ön çamurlukta çizik…"></textarea></label>
      <label class="field"><span>Hasar bedeli (net, faturalanır)</span><input name="damage_fee" type="number" step="0.01" value="0"></label>
      <label class="field"><span>Depo / konum</span><input name="location_name" value="Depo Stresemannstraße"></label>
      ${r.late_days ? `<label class="check span2"><input type="checkbox" name="charge_late" checked> Geç iade bedeli faturala (${r.late_days} gün × ${money(r.late_return_fee_per_day)} = ${money(lateFee)})</label>` : ''}
      ${r.deposit_held > 0 ? `<label class="check span2"><input type="checkbox" name="deduct_from_deposit"> Açık faturaları depozitodan (${money(r.deposit_held)}) mahsup et, kalanı iade et</label>` : ''}
      <label class="check span2"><input type="checkbox" name="send_to_service"> Bisikleti kontrol için servise gönder</label>
      <div class="form-actions span2"><button class="btn primary">İadeyi tamamla</button></div></form>`);
    body.querySelector('form').onsubmit = guard(async (e) => {
      e.preventDefault(); const d = readForm(e.target); d.charge_late = d.charge_late === undefined ? true : !!d.charge_late; d.deduct_from_deposit = !!d.deduct_from_deposit; d.send_to_service = !!d.send_to_service;
      const x = await POST(`rentals/${id}/return`, d); closeModal();
      toast(`İade alındı${x.deposit_refund ? ` · depozito iadesi ${money(x.deposit_refund)}` : ''}${x.service_id ? ' · servis kaydı açıldı' : ''}`); route();
    });
  });
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
    ${card(`Sürücüler (${c.riders.length})`, table(c.riders, [{ k: 'name', l: 'Ad' }, { k: 'phone', l: 'Telefon' }, { l: 'Eğitim', f: (r) => (r.trained ? '✓' : '—') }, { l: 'Şu anki bisiklet', f: (r) => esc(r.current_bike || '—') }, { l: 'Aktif', f: (r) => (r.active ? '✓' : '—') }], { empty: 'Sürücü yok', link: w ? (r) => `#/riders/${r.id}/edit` : null }))}
  </div>
  ${card('Kiralamalar', table(c.rentals, [{ k: 'contract_no', l: 'Sözleşme' }, { k: 'bike_code', l: 'Bisiklet' }, { l: 'Sürücü', f: (r) => esc(r.rider_name || '—') }, { l: 'Dönem', f: (r) => `${date(r.start_date)} – ${date(r.returned_at || r.end_date)}` }, { l: 'Ücret', f: (r) => `${money(r.rate)}/${r.period}`, cls: 'num' }, { l: 'Durum', f: (r) => badge(r.is_late ? 'gecikmede' : r.status) }], { link: (r) => `#/rentals/${r.id}` }))}
  ${can('finance') ? card('Faturalar', table(c.invoices, [{ k: 'invoice_no', l: 'No' }, { l: 'Tarih', f: (i) => date(i.issue_date) }, { k: 'description', l: 'Açıklama', f: (i) => esc((i.description || '').slice(0, 60)) }, { l: 'Vade', f: (i) => (i.days_late ? `<b class="t-danger">${date(i.due_date)} · ${i.days_late} g</b>` : date(i.due_date)) }, { l: 'Toplam', f: (i) => money(i.total), cls: 'num' }, { l: 'Kalan', f: (i) => (i.balance > 0.005 ? money(i.balance) : '—'), cls: 'num' }, { l: 'Durum', f: (i) => badge(i.status) }], { link: (i) => `#/invoices/${i.id}` })) : ''}`);
  $('#edit')?.addEventListener('click', () => editForm('customers', c, { onSaved: (x) => (x ? route() : (location.hash = '#/customers')) }));
  $('#addr')?.addEventListener('click', () => editForm('riders', null, { defaults: { customer_id: c.id }, onSaved: route }));
}

// ---------- invoices ----------
async function invoicesPage(q) {
  const tab = q.tab || 'open';
  const all = await GET('invoices', q.q ? { q: q.q } : {});
  const sets = { open: all.filter((i) => ['açık', 'kısmi'].includes(i.status)), overdue: all.filter((i) => i.days_late > 0), paid: all.filter((i) => i.status === 'ödendi'), all };
  const rows = sets[tab]; const fw = can('finance', 'w');
  const cols = [{ k: 'invoice_no', l: 'No' }, { k: 'customer_label', l: 'Müşteri' }, { k: 'contract_no', l: 'Sözleşme', f: (i) => esc(i.contract_no || '—') }, { l: 'Tarih', f: (i) => date(i.issue_date), csv: (i) => i.issue_date }, { l: 'Vade', f: (i) => date(i.due_date), csv: (i) => i.due_date },
    { l: 'Gecikme', f: (i) => (i.days_late ? `<b class="t-danger">${i.days_late} gün</b>` : '—'), csv: (i) => i.days_late }, { l: 'Toplam', f: (i) => money(i.total), cls: 'num', csv: (i) => i.total }, { l: 'Ödenen', f: (i) => money(i.paid_amount), cls: 'num', csv: (i) => i.paid_amount },
    { l: 'Kalan', f: (i) => (i.balance > 0.005 ? `<b>${money(i.balance)}</b>` : '—'), cls: 'num', csv: (i) => i.balance }, { l: 'Durum', f: (i) => badge(i.status), csv: (i) => i.status }];
  const sumBal = rows.reduce((a, i) => a + (i.status === 'iptal' ? 0 : i.balance), 0);
  setMain(`${head('Faturalar', 'Kiralama dönem faturaları, hasar/servis faturaları ve gecikmiş ödemeler.', `<button class="btn sm" id="csv">CSV</button>${fw ? '<button class="btn sm" id="gen">Dönem faturalarını oluştur</button><button class="btn primary sm" id="new">+ Fatura</button>' : ''}`)}
    <div class="toolbar"><input type="search" id="q" placeholder="Fatura no, müşteri, sözleşme…" value="${esc(q.q || '')}">${tabs([['open', 'Açık', sets.open.length], ['overdue', 'Geciken', sets.overdue.length], ['paid', 'Ödenen', sets.paid.length], ['all', 'Tümü', all.length]], tab)}<span class="muted">Kalan toplam: <b>${money(sumBal)}</b></span></div>
    ${card('', table(rows, cols, { link: (i) => `#/invoices/${i.id}` }), 'flush')}`);
  main().querySelectorAll('.tab').forEach((b) => b.onclick = () => { location.hash = `#/invoices?${new URLSearchParams({ ...q, tab: b.dataset.tab })}`; });
  $('#csv').onclick = () => csv(rows, cols, 'faturalar');
  $('#gen')?.addEventListener('click', guard(async () => { const x = await POST('invoices/generate'); toast(x.created ? `${x.created} yeni dönem faturası oluşturuldu` : 'Tüm aktif kiralamaların faturaları güncel', x.created ? 'ok' : 'info'); route(); }));
  $('#new')?.addEventListener('click', () => editForm('invoices', null, { defaults: { due_date: addDays(todayISO(), Number(session.settings.payment_terms_days) || 14), vat_rate: session.settings.vat_rate }, onSaved: (x) => x && (location.hash = `#/invoices/${x.id}`) }));
  let tm; $('#q').oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { location.hash = `#/invoices?${new URLSearchParams({ tab, q: e.target.value })}`; }, 350); };
}
function paymentForm(defaults, onSaved) {
  editForm('payments', null, { defaults: { date: todayISO(), method: 'banka havalesi', ...defaults }, onSaved });
}
async function invoicePage(id) {
  const i = await GET(`detail/invoices/${id}`); const fw = can('finance', 'w');
  const open = ['açık', 'kısmi'].includes(i.status);
  const s = session.settings;
  setMain(`${head(`Fatura ${esc(i.invoice_no)} <span class="h-badge">${badge(i.status)}</span>`, `${esc(i.customer.company_name || i.customer.name)} · vade ${date(i.due_date)}${i.days_late ? ` · <b class="t-danger">${i.days_late} gün gecikmede</b>` : ''}`,
    `<button class="btn sm" id="print">Yazdır / PDF</button>${fw && open ? `<button class="btn sm" id="remind">Hatırlatma gönder</button>${i.days_late ? '<button class="btn sm" id="fee">Gecikme bedeli ekle</button>' : ''}<button class="btn sm" id="edit">Düzenle</button><button class="btn primary sm" id="pay">Ödeme gir</button>` : ''}${fw && i.status === 'açık' && !i.paid_amount ? '<button class="btn sm danger ghost" id="cancel">İptal</button>' : ''}`)}
  ${i.days_late ? `<div class="alert warn">Bu fatura ${i.days_late} gündür ödenmedi. ${i.reminders_sent ? `${i.reminders_sent} hatırlatma gönderildi (son: ${dt(i.last_reminder_at)}).` : 'Henüz hatırlatma gönderilmedi.'} Ayarlardaki günlük ${money(s.late_fee_per_day)} oranıyla önerilen gecikme bedeli: <b>${money(i.suggested_late_fee)}</b>.</div>` : ''}
  <div class="grid g-2-1"><div class="card"><div class="card-b">${invoiceDoc(i)}</div></div>
  <div class="stack">${card('Ödemeler', table(i.payments, [{ l: 'Tarih', f: (p) => date(p.date) }, { k: 'method', l: 'Yöntem' }, { k: 'reference', l: 'Ref.' }, { l: 'Tutar', f: (p) => money(p.amount), cls: 'num' }, ...(fw ? [{ l: '', f: (p) => `<button class="icon-btn sm" data-delpay="${p.id}" title="Sil">✕</button>` }] : [])], { empty: 'Ödeme yok' }) + `<div class="total-row"><span>Kalan</span><b>${money(i.balance)}</b></div>`)}
  ${card('Bağlantılar', dl([['Müşteri', `<a href="#/customers/${i.customer.id}">${esc(i.customer.company_name || i.customer.name)}</a>`], ['Kiralama', i.rental ? `<a href="#/rentals/${i.rental.id}">${esc(i.rental.contract_no)}</a> · ${esc(i.rental.bike_code)}` : '—'], ['Servis', i.service_id ? `<a href="#/service/${i.service_id}">Servis kaydı</a>` : '—']]))}</div></div>`);
  $('#print').onclick = () => printHtml(invoiceDoc(i), `Fatura ${i.invoice_no}`);
  $('#pay')?.addEventListener('click', () => paymentForm({ invoice_id: i.id, amount: i.balance }, route));
  $('#edit')?.addEventListener('click', () => editForm('invoices', i, { onSaved: (x) => (x ? route() : (location.hash = '#/invoices')) }));
  $('#fee')?.addEventListener('click', () => {
    const b = modal('Gecikme bedeli', `<form class="grid-form"><label class="field"><span>Tutar</span><input name="amount" type="number" step="0.01" value="${i.suggested_late_fee}"></label><div class="form-actions span2"><button class="btn primary">Faturaya ekle</button></div></form>`);
    b.querySelector('form').onsubmit = guard(async (e) => { e.preventDefault(); await POST(`invoices/${id}/late-fee`, readForm(e.target)); closeModal(); toast('Gecikme bedeli eklendi'); route(); });
  });
  $('#remind')?.addEventListener('click', guard(async () => {
    await POST(`invoices/${id}/remind`, { channel: 'e-posta' });
    const subj = encodeURIComponent(`Zahlungserinnerung / Ödeme hatırlatması ${i.invoice_no}`);
    const txt = encodeURIComponent(`Merhaba ${i.customer.name},\n\n${i.invoice_no} numaralı faturanızın vadesi ${date(i.due_date)} tarihinde dolmuştur. Kalan tutar: ${money(i.balance)}.\nÖdemeyi ${s.company_iban || 'IBAN'} hesabına yapabilirsiniz.\n\nTeşekkürler,\n${s.company_name}`);
    if (i.customer.email) window.open(`mailto:${i.customer.email}?subject=${subj}&body=${txt}`);
    toast('Hatırlatma kaydedildi'); route();
  }));
  $('#cancel')?.addEventListener('click', guard(async () => { if (await confirmBox('Fatura iptal edilsin mi?')) { await POST(`invoices/${id}/cancel`); route(); } }));
  main().querySelectorAll('[data-delpay]').forEach((b) => b.onclick = guard(async () => { if (await confirmBox('Ödeme kaydı silinsin mi?')) { await DEL(`payments/${b.dataset.delpay}`); route(); } }));
}
function invoiceDoc(i) {
  const s = session.settings; const c = i.customer;
  return `<div class="doc"><div class="doc-h">${LOGO}<div class="doc-co"><b>${esc(s.company_name)}</b><br>${esc(s.company_address)}<br>${esc(s.company_phone)} · ${esc(s.company_email)}${s.company_tax_no ? `<br>USt-IdNr: ${esc(s.company_tax_no)}` : ''}</div></div>
    <div class="doc-meta"><div><small>Fatura adresi</small><br><b>${esc(c.company_name || c.name)}</b><br>${c.company_name ? esc(c.name) + '<br>' : ''}${esc(c.address || '')}${c.tax_no ? `<br>Vergi no: ${esc(c.tax_no)}` : ''}</div>
    <div class="doc-no"><h2>FATURA / RECHNUNG</h2>${dl([['Fatura no', esc(i.invoice_no)], ['Tarih', date(i.issue_date)], ['Vade', date(i.due_date)], i.rental ? ['Sözleşme', esc(i.rental.contract_no)] : null, i.period_start ? ['Hizmet dönemi', `${date(i.period_start)} – ${date(i.period_end)}`] : null])}</div></div>
    <table class="tbl doc-t"><thead><tr><th>Açıklama</th><th class="num">Tutar</th></tr></thead><tbody><tr><td>${esc(i.description)}</td><td class="num">${money(i.net)}</td></tr>${i.late_fee ? `<tr><td>Gecikme bedeli</td><td class="num">${money(i.late_fee)}</td></tr>` : ''}</tbody>
    <tfoot><tr><td>Ara toplam (net)</td><td class="num">${money(i.net)}</td></tr><tr><td>KDV %${num(i.vat_rate)}</td><td class="num">${money(i.vat)}</td></tr><tr class="grand"><td>Genel toplam</td><td class="num">${money(i.total + (i.late_fee || 0))}</td></tr>${i.paid_amount ? `<tr><td>Ödenen</td><td class="num">−${money(i.paid_amount)}</td></tr><tr class="grand"><td>Kalan</td><td class="num">${money(i.balance)}</td></tr>` : ''}</tfoot></table>
    <p class="doc-foot">Lütfen ${date(i.due_date)} tarihine kadar ${s.company_iban ? `IBAN <b>${esc(s.company_iban)}</b>` : 'şirket hesabımıza'} ödeme yapınız ve açıklamaya fatura numarasını yazınız.</p></div>`;
}

// ---------- service ----------
async function servicePage(q) {
  const tab = q.tab || 'open';
  const all = await GET('service_orders', q.q ? { q: q.q } : {});
  const sets = { open: all.filter((s) => !['teslim edildi', 'iptal'].includes(s.status)), ready: all.filter((s) => s.status === 'hazır'), done: all.filter((s) => ['teslim edildi', 'iptal'].includes(s.status)), all };
  const rows = sets[tab];
  const cols = [{ k: 'order_no', l: 'Servis no' }, { k: 'bike_code', l: 'Bisiklet' }, { l: 'Tip', f: (s) => esc(s.type), csv: (s) => s.type }, { l: 'Şikayet', f: (s) => esc((s.complaint || '').slice(0, 60)), csv: (s) => s.complaint }, { l: 'Kabul', f: (s) => dt(s.received_at), csv: (s) => s.received_at },
    { l: 'Tahmini hazır', f: (s) => (s.estimated_ready && s.estimated_ready < todayISO() && !['teslim edildi', 'iptal'].includes(s.status) ? `<b class="t-danger">${date(s.estimated_ready)}</b>` : date(s.estimated_ready)), csv: (s) => s.estimated_ready },
    { l: 'Teknisyen', f: (s) => esc(s.technician_name || '—'), csv: (s) => s.technician_name }, { l: 'Parça', f: (s) => money(s.parts_total), cls: 'num', csv: (s) => s.parts_total }, { l: 'Durum', f: (s) => badge(s.status), csv: (s) => s.status }];
  setMain(`${head('Servis kayıtları', 'Servis kabul formu, teşhis, parça kullanımı ve teslim.', `<button class="btn sm" id="csv">CSV</button>${can('service', 'w') ? '<a class="btn primary sm" href="#/service/new">+ Servis kabul formu</a>' : ''}`)}
    <div class="toolbar"><input type="search" id="q" placeholder="Servis no, bisiklet, şikayet…" value="${esc(q.q || '')}">${tabs([['open', 'Açık', sets.open.length], ['ready', 'Teslime hazır', sets.ready.length], ['done', 'Kapanan', sets.done.length], ['all', 'Tümü', all.length]], tab)}</div>
    ${tab === 'open' ? `<div class="kanban">${SERVICE_STATUS.slice(0, 5).map((st) => `<div class="kcol"><div class="kcol-h">${badge(st)} <span class="muted">${all.filter((s) => s.status === st).length}</span></div>${all.filter((s) => s.status === st).map((s) => `<a class="kcard" href="#/service/${s.id}"><b>${esc(s.bike_code)}</b> <small class="muted">${esc(s.order_no)}</small><p>${esc((s.complaint || '').slice(0, 80))}</p><small>${esc(s.technician_name || 'atanmadı')} · ${s.estimated_ready && s.estimated_ready < todayISO() ? `<b class="t-danger">${date(s.estimated_ready)}</b>` : date(s.estimated_ready)}</small></a>`).join('')}</div>`).join('')}</div>` : card('', table(rows, cols, { link: (s) => `#/service/${s.id}` }), 'flush')}`);
  main().querySelectorAll('.tab').forEach((b) => b.onclick = () => { location.hash = `#/service?${new URLSearchParams({ ...q, tab: b.dataset.tab })}`; });
  $('#csv').onclick = () => csv(rows, cols, 'servis');
  let tm; $('#q').oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { location.hash = `#/service?${new URLSearchParams({ tab: 'all', q: e.target.value })}`; }, 350); };
}
const CHECK_ITEMS = ['Frenler (ön/arka)', 'Lastikler ve hava basıncı', 'Zincir / kayış', 'Vites', 'Işıklar (ön/arka)', 'Zil / korna', 'Batarya ve şarj soketi', 'Ekran / kumanda', 'Motor desteği', 'Kargo kutusu / kilit', 'Ayaklık (sehpa)', 'Gövde / boya'];
async function newServicePage(q) {
  const [bikes, techs] = await Promise.all([GET('bikes'), lookup('users', { role: 'servis' }).catch(() => [])]);
  const f = (k) => field('service_orders', k);
  setMain(`${head('Servis kabul formu', 'Bisiklet servise girerken doldurulur; kaydettikten sonra yazdırıp müşteriye imzalatabilirsiniz.')}
  <form id="sf" class="card"><div class="card-b grid-form three">
    <label class="field"><span>Bisiklet *</span><select name="bike_id" required><option value="">Seçin…</option>${bikes.map((b) => `<option value="${b.id}" data-km="${b.odometer_km ?? ''}" data-bat="${b.battery_level ?? ''}" ${String(q.bike_id) === String(b.id) ? 'selected' : ''}>${esc(b.code)} · ${esc(b.model)} (${esc(b.status)})</option>`).join('')}</select></label>
    ${inputHtml(f('type'), 'arıza')}
    ${inputHtml(f('received_at'), new Date().toISOString().slice(0, 16).replace('T', ' '))}
    ${inputHtml(f('customer_id'), '')}
    ${inputHtml(f('brought_by'), '')}
    ${inputHtml({ k: 'technician_id', l: 'Teknisyen', t: 'select', o: techs.map((t) => ({ v: t.id, l: t.label })) }, '')}
    ${inputHtml(f('km'), '')}${inputHtml(f('battery_level'), '')}${inputHtml(f('estimated_ready'), addDays(todayISO(), 2))}
    <label class="field span3"><span>Şikayet / talep *</span><textarea name="complaint" rows="2" required></textarea></label>
    <div class="span3"><span class="lbl">Kabul kontrol listesi</span><div class="checklist">${CHECK_ITEMS.map((c, i) => `<div class="ck"><span>${esc(c)}</span><div class="seg">${['ok', 'sorun', 'yok'].map((v) => `<label><input type="radio" name="ck_${i}" value="${v}" ${v === 'ok' ? 'checked' : ''}><span>${v === 'ok' ? 'Sağlam' : v === 'sorun' ? 'Sorunlu' : 'Yok'}</span></label>`).join('')}</div></div>`).join('')}</div></div>
    <label class="field span3"><span>Görsel durum / mevcut hasarlar</span><textarea name="visual_condition" rows="2"></textarea></label>
    <label class="field span2"><span>Bırakılan aksesuarlar</span><input name="accessories" placeholder="Şarj aleti, kilit, anahtar x2…"></label>
    ${inputHtml(f('estimated_cost'), '')}
    ${inputHtml(f('signature_name'), '')}
    <label class="check"><input type="checkbox" name="billable"> Müşteriye faturalanacak</label>
  </div><div class="card-f"><span class="grow"></span><a class="btn" href="#/service">Vazgeç</a><button class="btn primary">Kaydet ve formu aç</button></div></form>`);
  const form = $('#sf'); await fillRefs(form);
  form.bike_id.onchange = () => { const o = form.bike_id.selectedOptions[0]; form.km.value = o?.dataset.km || ''; form.battery_level.value = o?.dataset.bat || ''; };
  if (q.bike_id) form.bike_id.onchange();
  form.onsubmit = guard(async (e) => {
    e.preventDefault(); const d = readForm(form); d.checklist = {};
    CHECK_ITEMS.forEach((c, i) => { d.checklist[c] = form.querySelector(`[name=ck_${i}]:checked`)?.value; delete d[`ck_${i}`]; });
    const s = await POST('service_orders', d); clearLookups(); toast(`${s.order_no} açıldı`); location.hash = `#/service/${s.id}`;
  });
}
async function serviceDetailPage(id) {
  const s = await GET(`detail/service_orders/${id}`); const w = can('service', 'w');
  const closed = ['teslim edildi', 'iptal'].includes(s.status);
  const parts = w && !closed ? await GET('parts') : [];
  const techs = await lookup('users', { role: 'servis' }).catch(() => []);
  const steps = SERVICE_STATUS.filter((x) => x !== 'iptal');
  setMain(`${head(`${esc(s.order_no)} <span class="h-badge">${badge(s.status)}</span>`, `<a href="#/bikes/${s.bike.id}">${esc(s.bike.code)}</a> · ${esc(s.bike.brand)} ${esc(s.bike.model)} · ${esc(s.type)}`,
    `<button class="btn sm" id="pintake">Kabul formunu yazdır</button><button class="btn sm" id="preport">Servis raporu</button>`)}
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
    + (w && !closed ? `<form id="pf" class="inline-form"><select name="part_id" required><option value="">Parça seçin…</option>${parts.map((p) => `<option value="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${esc(p.sku)} · ${esc(p.name)} — stok ${num(p.stock)} · ${money(p.price)}</option>`).join('')}</select><input name="qty" type="number" step="0.5" min="0.5" value="1" style="width:90px"><button class="btn sm">Ekle (stoktan düş)</button></form>` : '')
    + `<div class="totals"><div><span>Parça</span><b>${money(s.parts_total)}</b></div><div><span>İşçilik (${num(s.labor_hours, 2)} sa × ${money(s.labor_rate)})</span><b>${money(s.labor_total)}</b></div><div class="grand"><span>Toplam (net)</span><b>${money(s.grand_total)}</b></div></div>`)}`);
  $('#pintake').onclick = () => printHtml(intakeDoc(s), `Servis kabul ${s.order_no}`);
  $('#preport').onclick = () => printHtml(serviceReportDoc(s), `Servis raporu ${s.order_no}`);
  main().querySelectorAll('.step').forEach((b) => b.onclick = guard(async () => {
    if (b.dataset.st === 'teslim edildi' && !(await confirmBox(`Servis kapatılsın ve bisiklet teslim edilsin mi?${s.billable ? ' Müşteriye fatura kesilecek.' : ''}`))) return;
    await PUT(`service_orders/${id}`, { status: b.dataset.st }); toast(`Durum: ${b.dataset.st}`); route();
  }));
  $('#wf')?.addEventListener('submit', guard(async (e) => { e.preventDefault(); await PUT(`service_orders/${id}`, readForm(e.target)); toast('Kaydedildi'); route(); }));
  $('#pf')?.addEventListener('submit', guard(async (e) => { e.preventDefault(); await POST(`service_orders/${id}/parts`, readForm(e.target)); toast('Parça eklendi, stoktan düşüldü'); route(); }));
  main().querySelectorAll('[data-rmp]').forEach((b) => b.onclick = guard(async () => { await DEL(`service_parts/${b.dataset.rmp}`); toast('Parça kaldırıldı, stoğa iade edildi'); route(); }));
}
function docHeader(title, no) {
  const s = session.settings;
  return `<div class="doc-h">${LOGO}<div class="doc-co"><b>${esc(s.company_name)}</b><br>${esc(s.company_address)}<br>${esc(s.company_phone)} · ${esc(s.company_email)}</div></div><h2 class="doc-title">${title} <small>${esc(no)}</small></h2>`;
}
function intakeDoc(s) {
  return `<div class="doc">${docHeader('SERVİS KABUL FORMU', s.order_no)}
  <div class="doc-2">${dl([['Kabul tarihi', dt(s.received_at)], ['Teslim alan', esc(s.received_by_name)], ['Getiren', esc(s.brought_by)], ['Müşteri', esc(s.customer ? s.customer.company_name || s.customer.name : 'Pedalla filo')], ['Servis tipi', esc(s.type)]])}
  ${dl([['Bisiklet', `${esc(s.bike.code)} · ${esc(s.bike.brand)} ${esc(s.bike.model)}`], ['Şasi no', esc(s.bike.frame_no)], ['Batarya no', esc(s.bike.battery_no)], ['Km', num(s.km)], ['Batarya', s.battery_level != null ? '%' + s.battery_level : '—']])}</div>
  <h3>Şikayet / talep</h3><p class="box">${esc(s.complaint)}</p>
  <h3>Kabul kontrol listesi</h3><table class="tbl doc-t ck-t"><thead><tr><th>Kontrol</th><th>Sağlam</th><th>Sorunlu</th><th>Yok</th></tr></thead><tbody>${s.checklist_items.map((c) => `<tr><td>${esc(c)}</td>${['ok', 'sorun', 'yok'].map((v) => `<td class="c">${s.checklist[c] === v ? '☒' : '☐'}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <h3>Görsel durum / mevcut hasarlar</h3><p class="box">${esc(s.visual_condition || '—')}</p>
  <div class="doc-2">${dl([['Bırakılan aksesuarlar', esc(s.accessories || '—')], ['Tahmini maliyet', money(s.estimated_cost)], ['Tahmini hazır olma', date(s.estimated_ready)]])}<div></div></div>
  <p class="small">${esc(session.settings.service_terms)}</p>
  <div class="sign"><div><span>Teslim eden (müşteri)</span><b>${esc(s.signature_name || '')}</b></div><div><span>Teslim alan (${esc(session.settings.company_name)})</span><b>${esc(s.received_by_name || '')}</b></div></div></div>`;
}
function serviceReportDoc(s) {
  return `<div class="doc">${docHeader('SERVİS RAPORU', s.order_no)}
  ${dl([['Bisiklet', `${esc(s.bike.code)} · ${esc(s.bike.brand)} ${esc(s.bike.model)}`], ['Kabul / teslim', `${dt(s.received_at)} → ${dt(s.delivered_at)}`], ['Şikayet', esc(s.complaint)], ['Teşhis', esc(s.diagnosis)], ['Yapılan işlemler', esc(s.work_done)]])}
  <table class="tbl doc-t"><thead><tr><th>Kalem</th><th class="num">Miktar</th><th class="num">Birim</th><th class="num">Tutar</th></tr></thead><tbody>${s.parts.map((p) => `<tr><td>${esc(p.sku)} ${esc(p.name)}</td><td class="num">${num(p.qty, 2)}</td><td class="num">${money(p.unit_price)}</td><td class="num">${money(p.qty * p.unit_price)}</td></tr>`).join('')}<tr><td>İşçilik</td><td class="num">${num(s.labor_hours, 2)} sa</td><td class="num">${money(s.labor_rate)}</td><td class="num">${money(s.labor_total)}</td></tr></tbody>
  <tfoot><tr class="grand"><td colspan="3">Toplam (net)</td><td class="num">${money(s.grand_total)}</td></tr></tfoot></table>
  <div class="sign"><div><span>Teknisyen</span><b>${esc(s.technician_name || '')}</b></div><div><span>Teslim alan</span><b></b></div></div></div>`;
}
function printContract(r) {
  const s = session.settings; const c = r.customer;
  printHtml(`<div class="doc">${docHeader('KİRALAMA SÖZLEŞMESİ / MIETVERTRAG', r.contract_no)}
    <div class="doc-2"><div><h3>Kiraya veren</h3>${dl([['Firma', esc(s.company_name)], ['Adres', esc(s.company_address)], ['Telefon', esc(s.company_phone)]])}</div>
    <div><h3>Kiracı</h3>${dl([['Müşteri', esc(c.company_name || c.name)], ['Yetkili', esc(c.name)], ['Adres', esc(c.address)], ['Vergi / kimlik no', esc(c.tax_no || c.id_no)], ['Telefon', esc(c.phone)]])}</div></div>
    <h3>Kiralanan bisiklet</h3>${dl([['Filo kodu', esc(r.bike.code)], ['Marka / model', `${esc(r.bike.brand)} ${esc(r.bike.model)} (${esc(r.bike.type)})`], ['Şasi no', esc(r.bike.frame_no)], ['Batarya no', esc(r.bike.battery_no)], ['Teslim km / batarya', `${num(r.start_km)} km · ${r.start_battery != null ? '%' + r.start_battery : '—'}`], ['Aksesuarlar', esc(r.accessories)], ['Yetkili sürücü', r.rider ? esc(r.rider.name) : 'Kiracı']])}
    <h3>Koşullar</h3>${dl([['Kiralama dönemi', `${date(r.start_date)} – ${date(r.end_date)}`], ['Ücret', `${money(r.rate)} / ${esc(r.period)} + KDV %${esc(s.vat_rate)}`], ['Depozito', money(r.deposit_amount)], ['Ödeme vadesi', `fatura tarihinden itibaren ${esc(s.payment_terms_days)} gün`], ['Geç iade bedeli', `${money(s.late_return_fee_per_day)} / gün`], ['Geç ödeme bedeli', `${money(s.late_fee_per_day)} / gün`]])}
    <p class="small">${esc(s.contract_terms)}</p>
    <div class="sign"><div><span>Kiraya veren</span><b>${esc(s.company_name)}</b></div><div><span>Kiracı</span><b>${esc(c.name)}</b></div></div></div>`, `Sözleşme ${r.contract_no}`);
}
function printHtml(html, title) {
  let p = document.getElementById('print'); if (!p) { p = document.createElement('div'); p.id = 'print'; document.body.appendChild(p); }
  p.innerHTML = html; const t = document.title; document.title = title; document.body.classList.add('printing');
  setTimeout(() => { window.print(); document.title = t; document.body.classList.remove('printing'); }, 50);
}

// ---------- parts ----------
async function partsPage(q) {
  const rows = await GET('parts', q); const w = can('stock', 'w');
  const cols = colsFromMeta('parts').map((c) => (c.k === 'stock' ? { ...c, f: (r) => `<b class="${r.stock <= 0 ? 't-danger' : r.low ? 't-warn' : ''}">${num(r.stock, 2)}</b> ${esc(r.unit)}` } : c));
  const value = rows.reduce((a, p) => a + p.stock * p.cost, 0);
  setMain(`${head('Yedek parçalar', 'Parça kataloğu, stok seviyeleri ve kritik stok uyarıları.', `<button class="btn sm" id="csv">CSV</button>${w ? '<button class="btn sm" id="move">Stok girişi / çıkışı</button><button class="btn primary sm" id="new">+ Parça</button>' : ''}`)}
    <div class="toolbar"><input type="search" id="q" placeholder="Kod, ad, uyumlu model, raf…" value="${esc(q.q || '')}"><div class="chips"><a class="chip ${!q.low ? 'on' : ''}" href="#/parts">Tümü</a><a class="chip ${q.low ? 'on' : ''}" href="#/parts?low=1">Kritik stok</a></div><span class="muted">${rows.length} parça · stok değeri <b>${money(value)}</b></span></div>
    ${card('', table(rows, cols, { link: (r) => `#/parts/${r.id}` }), 'flush')}`);
  $('#csv').onclick = () => csv(rows, cols, 'yedek-parcalar');
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
  const mn = (m) => `${['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][Number(m.slice(5)) - 1]} ${m.slice(2, 4)}`;
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
    ${sec('rev', barChart(r.revenue_by_month.map((m) => ({ ...m, label: mn(m.m) })), [{ k: 'net', l: 'Net ciro', c: 'var(--brand)' }, { k: 'paid', l: 'Tahsilat', c: 'var(--accent-d)' }]))}
    ${sec('util')}<div class="grid g-2">${sec('cust')}${sec('aging')}${sec('parts')}${sec('svc')}</div>`);
  $('#rq').onsubmit = (e) => { e.preventDefault(); location.hash = `#/reports?${new URLSearchParams(readForm(e.target))}`; };
  main().querySelectorAll('[data-csv]').forEach((b) => b.onclick = () => { const s = sections[b.dataset.csv]; csv(s.rows, s.cols, `rapor-${b.dataset.csv}`); });
}

// ---------- notifications ----------
async function notificationsPage() {
  const n = await GET('notifications');
  const groups = {}; n.forEach((x) => (groups[x.title] ||= []).push(x));
  setMain(`${head('Bildirimler', 'Sistem tarafından otomatik üretilen uyarılar: geciken ödeme ve iadeler, kritik stok, bakım zamanı, düşük batarya, GPS sinyali, sigorta.')}
    ${n.length ? Object.entries(groups).map(([t, items]) => card(`${esc(t)} <span class="cnt">${items.length}</span>`, `<ul class="notifs">${items.map((x) => `<li class="lv-${x.level}"><a href="${x.link}">${esc(x.text)}</a></li>`).join('')}</ul>`)).join('') : '<div class="empty big">Her şey yolunda, bildirim yok.</div>'}`);
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
const SETTINGS_FORM = [
  ['Şirket', [['company_name', 'Şirket adı'], ['company_address', 'Adres'], ['company_phone', 'Telefon'], ['company_email', 'E-posta'], ['company_tax_no', 'USt-IdNr / vergi no'], ['company_iban', 'IBAN']]],
  ['Finans', [['currency', 'Para birimi'], ['vat_rate', 'KDV oranı %', 'number'], ['payment_terms_days', 'Ödeme vadesi (gün)', 'number'], ['late_fee_per_day', 'Geç ödeme bedeli / gün (€)', 'number'], ['late_return_fee_per_day', 'Geç iade bedeli / gün (€)', 'number']]],
  ['Servis & filo', [['service_interval_days', 'Bakım aralığı (gün)', 'number'], ['service_interval_km', 'Bakım aralığı (km)', 'number'], ['labor_rate', 'Saatlik işçilik ücreti (€)', 'number'], ['low_battery_alert', 'Düşük batarya uyarısı %', 'number'], ['map_center_lat', 'Harita merkezi enlem'], ['map_center_lng', 'Harita merkezi boylam'], ['telemetry_key', 'GPS cihaz API anahtarı']]],
  ['Belge metinleri', [['contract_terms', 'Kiralama sözleşmesi koşulları', 'textarea'], ['service_terms', 'Servis kabul formu koşulları', 'textarea']]],
];
async function settingsPage() {
  const s = await GET('settings'); const w = can('admin', 'w');
  setMain(`${head('Ayarlar', 'Şirket bilgileri, finans kuralları ve belge metinleri.')}<form id="stf">${SETTINGS_FORM.map(([g, fs]) => card(g, `<div class="grid-form">${fs.map(([k, l, t]) => inputHtml({ k, l, t: t || 'text', step: 'any' }, s[k], { disabled: !w })).join('')}</div>`)).join('')}
  ${card('GPS takip cihazı entegrasyonu', `<p>Takip cihazları konumlarını şu adrese <code>POST</code> eder. Cihaz ID'si bisiklet kartındaki "GPS takip cihazı ID" alanıyla eşleşir.</p><pre class="code">POST ${location.origin}/api/telemetry
{"key":"${esc(s.telemetry_key || '…')}","tracker_id":"TRK-4101","lat":53.5503,"lng":9.9353,"battery":76,"speed":14}</pre>`)}
  ${w ? '<div class="form-actions"><button class="btn primary">Ayarları kaydet</button></div>' : ''}</form>`);
  $('#stf').onsubmit = guard(async (e) => { e.preventDefault(); session.settings = await PUT('settings', readForm(e.target)); toast('Ayarlar kaydedildi'); });
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

// ---------- router ----------
const ROUTES = [
  [/^$/, () => dashboardPage(), 'dashboard'],
  [/^map$/, (m, q) => mapPage(q), 'fleet'],
  [/^notifications$/, () => notificationsPage(), 'dashboard'],
  [/^bikes\/(\d+)$/, (m) => bikePage(m[1]), 'fleet'],
  [/^rentals$/, (m, q) => rentalsPage(q), 'rentals'],
  [/^rentals\/new$/, (m, q) => newRentalPage(q), 'rentals'],
  [/^rentals\/(\d+)$/, (m) => rentalPage(m[1]), 'rentals'],
  [/^customers\/(\d+)$/, (m) => customerPage(m[1]), 'customers'],
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
  if (!session.token) return loginPage();
  try {
    const me = await GET('me'); Object.assign(session, { user: me.user, perms: me.perms, roles: me.roles, settings: me.settings });
  } catch { setToken(null); return loginPage(); }
  if (!location.hash || location.hash === '#/login') location.hash = '#/';
  shell(); await route();
}
window.addEventListener('hashchange', () => { if (session.user || !session.token) route(); });
