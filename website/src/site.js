/* Pedalla website runtime: live catalog, bike cards, map, rent dialog → admin panel rider portal API */
(() => {
  const P = window.PEDALLA; const T = P.t; const $ = (s, el = document) => el.querySelector(s); const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fill = (s, p = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => p[k] ?? '');
  const plural = (s, n) => fill(String(s).split('|')[n === 1 ? 0 : 1] || s, { n });
  const money = (n) => (n == null ? '–' : '€' + (P.priceMode === 'gross' ? Math.round(n * (1 + P.vat)) : Math.round(n * 100) / 100).toLocaleString(P.lang === 'en' ? 'en-GB' : 'de-DE'));
  const img = (src) => (/^(https?:|data:)/.test(src) ? src : P.pre + src);
  const per = (p) => ({ 'gün': T.per_day, hafta: T.per_week }[p] || T.per_month);
  const durLabel = (p, n) => plural({ 'gün': T.r_days, hafta: T.r_weeks }[p] || T.r_months, n);
  const ICON = (d) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const IC = { check: ICON('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), shield: ICON('<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'), wa: ICON('<path d="M4 20l1.3-4A8 8 0 1 1 8.4 19z"/>') };

  // ---------- models: marketing data + live catalog from the admin panel ----------
  const fallback = P.models.slice(0, 2).map((m) => ({ ...m, type: m.adminType, available: null, period: 'ay', plans: [{ period: 'ay', price: m.price, deposit: m.deposit }] }));
  let models = fallback; let catalog = null;
  // marketing texts only for a type with exactly that name in the admin panel; other types show their own name
  const marketing = (name) => P.models.find((m) => m.adminType === name);
  function fromCatalog(c) {
    const used = new Set();
    // every bike type from Ayarlar → Bisiklet tipleri is offered; a type without a price plan is bookable "on request"
    return c.types.map((x) => {
      let m = marketing(x.name); if (m && used.has(m.id)) m = null; if (m) used.add(m.id);
      return {
        id: m?.id || 'type-' + x.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), type: x.name, name: m?.name || x.name, tag: m?.tag || '',
        sub: m?.sub || P.generic.sub, desc: m?.desc || P.generic.desc, specs: m?.specs || [], image: x.image || m?.image || P.generic.image,
        price: x.price, deposit: x.deposit, period: x.period || 'ay', available: x.available,
        plans: x.plans?.length ? x.plans : x.price != null ? [{ period: x.period || 'ay', price: x.price, deposit: x.deposit }] : [],
      };
    }).sort((a, b) => (b.available > 0) - (a.available > 0) || (a.price ?? 1e9) - (b.price ?? 1e9));
  }
  const byId = (id) => models.find((m) => m.id === id);

  function cardHtml(m) {
    return `<article class="bike rv in" data-model="${esc(m.id)}">
      <div class="bike-img"><span class="bike-tag">${esc(m.tag)}</span><img src="${esc(img(m.image))}" alt="${esc(m.name)}" loading="lazy"></div>
      <div class="bike-body"><h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p>
        <div class="bike-price">${m.price == null ? `<b class="pill">${T.st_req}</b>` : `<span class="muted">${T.starting_from}</span><b class="pill">${money(m.price)}${per(m.period)}</b>`}${m.available == null ? '' : `<span class="avail ${m.available ? '' : 'none'}">${m.available ? fill(T.available_n, { n: m.available }) : T.available_0}</span>`}</div></div>
      <div class="bike-actions"><button class="btn ghost" data-details="${esc(m.id)}">${T.more_details}</button><button class="btn dark" data-rent="${esc(m.id)}">${T.rent_now}</button></div></article>`;
  }
  function renderCards() {
    $('#bikes').innerHTML = models.map(cardHtml).join('');
    renderBox();
  }

  async function api(path, opt = {}) {
    const r = await fetch(P.api + '/' + path, { ...opt, headers: { 'content-type': 'application/json', ...(opt.token ? { authorization: 'Bearer ' + opt.token } : {}) } });
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.status = r.status; throw e; }
    return j;
  }

  // ---------- map ----------
  let map; let fleetLayer;
  function initMap() {
    if (!window.L || !$('#map') || map) return;
    const L = window.L; const st = P.stations[0];
    map = L.map('map', { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([P.area.lat, P.area.lng], 12);
    // OpenStreetMap's own free tiles (no API key). CARTO's basemaps now need a key, which is why the map showed an API message.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    const area = L.circle([P.area.lat, P.area.lng], { radius: P.area.radius, color: '#7a929e', weight: 1.5, dashArray: '6 6', fillColor: '#7a929e', fillOpacity: 0.08 }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    map.fitBounds(area.getBounds(), { padding: [10, 10] });
    for (const s of P.stations) {
      L.marker([s.lat, s.lng], { icon: L.divIcon({ className: '', html: `<div class="pin-hub"><img src="${P.pre}img/mark.png" alt=""></div>`, iconSize: [46, 46], iconAnchor: [23, 46] }), zIndexOffset: 1000 })
        .addTo(map).bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.street)}, ${esc(s.zip)}<br><small>${esc(T.map_hub_p)}</small>`);
    }
    fleetLayer = L.layerGroup().addTo(map);
    map.on('click', () => map.scrollWheelZoom.enable());
    drawFleet();
  }
  function drawFleet() {
    if (!map || !catalog) return;
    const L = window.L; fleetLayer.clearLayers();
    const icon = L.divIcon({ className: '', html: '<div class="pin-free"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    const seen = {};
    for (const f of catalog.fleet || []) {
      const k = f.lat + ',' + f.lng; const n = (seen[k] = (seen[k] || 0) + 1);
      // spread bikes that share the same rounded spot a little so each dot is visible
      const lat = f.lat + (n - 1) * 0.0004 * Math.sin(n * 2.4); const lng = f.lng + (n - 1) * 0.0006 * Math.cos(n * 2.4);
      const m = models.find((x) => x.type === f.type);
      L.marker([lat, lng], { icon }).addTo(fleetLayer).bindPopup(`<b>${esc(m?.name || f.type)}</b><br>${m && m.price != null ? `${T.starting_from} ${money(m.price)}${per(m.period)}<br>` : ''}<a href="#" data-rent="${esc(m?.id || '')}">${T.rent_now} →</a>`);
    }
  }
  const mapObs = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { initMap(); mapObs.disconnect(); } }, { rootMargin: '300px' });
  if ($('#map')) mapObs.observe($('#map'));

  // ---------- load live catalog ----------
  async function loadCatalog() {
    try {
      catalog = await api('catalog');
      const live = fromCatalog(catalog);
      if (live.length) { models = live; renderCards(); $('#liveNote').hidden = false; }
      const freeAll = catalog.types.reduce((s, x) => s + (x.available || 0), 0);
      $('#freeCount').textContent = freeAll;
      if (Array.isArray(catalog.periods) && catalog.periods.length) setPeriods(catalog.periods);
      $('#liveDot').hidden = false;
      checkAvail();
      drawFleet();
    } catch (e) {
      $('#mapOff').hidden = false; $('#freeCount').textContent = '–';
    }
  }

  // ---------- modal ----------
  const modal = $('#modal'); const body = $('#modalBody'); let lastFocus;
  function open(html, wide) {
    lastFocus = document.activeElement; body.innerHTML = html; $('.modal-card', modal).classList.toggle('wide', !!wide);
    modal.hidden = false; document.body.classList.add('locked');
    setTimeout(() => ($('input:not([type=hidden]):not([type=radio]), button.btn', body) || $('.modal-x', modal)).focus({ preventScroll: true }), 30);
  }
  function close() { modal.hidden = true; document.body.classList.remove('locked'); body.innerHTML = ''; lastFocus?.focus?.({ preventScroll: true }); }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

  function details(m) {
    open(`<div class="det"><div class="det-img"><img src="${esc(img(m.image))}" alt="${esc(m.name)}"></div><div>
      ${m.tag ? `<span class="bike-tag" style="position:static">${esc(m.tag)}</span>` : ''}
      <h2 id="modalTitle">${esc(m.name)}</h2><p class="muted">${esc(m.desc)}</p>
      <div class="price-big">${m.price == null ? T.st_req : `${money(m.price)} <small>${per(m.period)} · ${P.priceMode === 'gross' ? T.vat_gross : T.vat_net}</small>`}</div>
      ${m.deposit ? `<small class="muted">${T.deposit}: ${money(m.deposit)}</small>` : ''}
      ${m.specs.length ? `<ul>${m.specs.map((s) => `<li>${IC.check}${esc(s)}</li>`).join('')}</ul>` : ''}
      <div class="incl-note">${IC.shield}${T.d_incl}</div>
      <button class="btn red lg" style="width:100%" data-rent="${esc(m.id)}">${T.rent_now}</button></div></div>`, true);
  }

  // ---------- booking box (header): bike type · period · calendar · live availability ----------
  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dOf = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addD = (s, n) => { const d = dOf(s); d.setDate(d.getDate() + n); return isoOf(d); };
  const addM = (s, n) => { const d = dOf(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return isoOf(d); };
  const tomorrow = () => addD(isoOf(new Date()), 1);
  const LOC = P.lang === 'tr' ? 'tr-TR' : P.lang === 'en' ? 'en-GB' : 'de-DE';
  const fmtDate = (s) => dOf(s).toLocaleDateString(LOC);
  const fmtNice = (s) => dOf(s).toLocaleDateString(LOC, { weekday: 'short', day: 'numeric', month: 'short' });
  const durOpts = (p) => P.durations[p] || P.durations.ay || [1];
  let periods = (P.periods || ['ay']).slice();
  const bk = { model: null, period: periods[0], dur: durOpts(periods[0])[0], date: tomorrow(), month: tomorrow().slice(0, 7), avail: null, checking: false };
  const endOf = () => (bk.period === 'ay' ? addD(addM(bk.date, bk.dur), -1) : addD(bk.date, (bk.period === 'hafta' ? 7 : 1) * bk.dur - 1));
  // no price plan at all → bookable on request (price null); plans exist but not for this period → not bookable
  const planOf = (m, p = bk.period) => (!m ? null : !(m.plans || []).length ? { period: p, price: null, deposit: null } : m.plans.find((x) => x.period === p && x.price != null) || null);
  const priceTxt = (pl, mult = 1) => (pl?.price == null ? T.st_req : money(pl.price * mult));
  const freeOf = (m) => (bk.avail && m && m.type in bk.avail ? bk.avail[m.type] : m?.available ?? null);
  const cur = () => byId(bk.model);

  function setPeriods(list) {
    const known = list.filter((p) => P.durations[p]);
    if (!known.length) return;
    periods = known;
    if (!periods.includes(bk.period)) { bk.period = periods[0]; bk.dur = durOpts(bk.period)[0]; }
    renderBox();
  }
  function initBox() {
    $('#cal').addEventListener('click', (e) => {
      const nav = e.target.closest('[data-mon]'); if (nav) { bk.month = nav.dataset.mon; return renderCal(); }
      const d = e.target.closest('[data-day]'); if (d && !d.disabled) { bk.date = d.dataset.day; renderBox(); checkAvail(); }
    });
    $('#durList').addEventListener('click', (e) => { const b = e.target.closest('[data-dur]'); if (b) { bk.dur = Number(b.dataset.dur); renderBox(); checkAvail(); } });
    $('#perTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-per]'); if (b) { bk.period = b.dataset.per; bk.dur = durOpts(bk.period)[0]; renderBox(); checkAvail(); } });
    $('#heroDots').addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) { e.stopPropagation(); pick(b.dataset.pick, true); } });
    $('#bReset').addEventListener('click', () => { bk.date = tomorrow(); bk.month = bk.date.slice(0, 7); bk.period = periods[0]; bk.dur = durOpts(bk.period)[0]; renderBox(); checkAvail(); });
  }
  function pick(id, stay) {
    if (!byId(id)) return;
    bk.model = id; renderBox(true);
    if (!stay && window.innerWidth < 1100) $('#heroCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderBox(swap) {
    if (!bk.model || !byId(bk.model)) bk.model = (models.find((m) => freeOf(m) > 0 && planOf(m)?.price != null) || models.find((m) => planOf(m)?.price != null) || models.find((m) => freeOf(m) > 0) || models[0])?.id;
    const m = cur(); if (!m) return;
    const pl = planOf(m);
    // type rows
    $('#typeRows').innerHTML = models.map((x) => {
      const p = planOf(x); const f = freeOf(x);
      const st = !p ? `<em class="st off">${T.no_plan}</em>` : f == null ? `<em class="st">${T.st_req}</em>` : f > 0 ? `<em class="st ok">${fill(T.st_free, { n: f })}</em>` : `<em class="st no">${T.st_none}</em>`;
      return `<button class="tt-r ${x.id === bk.model ? 'on' : ''}" data-pick="${esc(x.id)}" role="row" aria-pressed="${x.id === bk.model}"><span class="tt-b"><i><img src="${esc(img(x.image))}" alt=""></i><b>${esc(x.name)}</b></span><span>${!p ? '–' : p.price == null ? T.st_req : money(p.price) + per(bk.period)}</span><span>${st}</span></button>`;
    }).join('');
    // hero card
    $('#heroDots').innerHTML = models.map((x) => `<button class="${x.id === bk.model ? 'on' : ''}" data-pick="${esc(x.id)}" role="tab" aria-selected="${x.id === bk.model}" aria-label="${esc(x.name)}"></button>`).join('');
    const bike = $('#heroBike');
    const apply = () => {
      if (bike.getAttribute('src') !== img(m.image)) bike.src = img(m.image);
      bike.alt = m.name; bike.classList.remove('swap');
      bike.classList.toggle('png', /^data:image\/(png|webp)|\.(png|webp|svg)(\?|$)/i.test(bike.getAttribute('src') || ''));
    };
    if (swap && bike.getAttribute('src') !== img(m.image)) { bike.classList.add('swap'); setTimeout(apply, 200); } else apply();
    $('#hcName').textContent = m.name; $('#hcSub').textContent = m.sub || P.generic.sub; $('#hcDesc').textContent = m.desc; $('#hcMore').dataset.details = m.id;
    $('#bPrice').textContent = pl?.price != null ? money(pl.price) : pl ? '?' : '–'; $('#bPer').textContent = per(bk.period).replace('/', '');
    $('#bDeposit').textContent = pl?.price == null ? '?' : pl.deposit ? money(pl.deposit) : '€0';
    const f = freeOf(m); $('#bFree').textContent = f == null ? '–' : f;
    // period tabs (only when more than one period is switched on in the admin panel)
    const tabs = $('#perTabs'); tabs.hidden = periods.length < 2;
    tabs.innerHTML = periods.map((p) => `<button type="button" role="tab" data-per="${p}" class="${p === bk.period ? 'on' : ''}" aria-selected="${p === bk.period}">${T['p_' + p] || p}</button>`).join('');
    $('#durList').innerHTML = `<small>${T.sched_dur}</small>` + durOpts(bk.period).map((n) => `<button type="button" role="radio" data-dur="${n}" class="${n === bk.dur ? 'on' : ''}" aria-checked="${n === bk.dur}">${durLabel(bk.period, n)}</button>`).join('');
    renderCal();
    // summary
    const end = endOf();
    $('#bsum').innerHTML = `<div class="bs-d"><span><small>${T.sum_pick}</small><b>${fmtNice(bk.date)}</b></span><i>${ICON('<path d="M5 12h14M13 6l6 6-6 6"/>')}</i><span><small>${T.sum_ret}</small><b>${fmtNice(end)}</b></span></div>
      <div class="bs-r"><span>${fill(T.sum_total, { dur: durLabel(bk.period, bk.dur) })}</span><b>${pl ? priceTxt(pl, bk.dur) : '–'}</b></div>
      ${pl?.deposit ? `<div class="bs-r"><span>${T.r_sum_dep}</span><b>${money(pl.deposit)}</b></div>` : ''}
      <small class="muted">${P.priceMode === 'gross' ? T.vat_gross : T.vat_net}</small>`;
    const av = $('#bAvail');
    av.className = 'bavail' + (!pl || f === 0 ? ' no' : '');
    av.textContent = !pl ? T.no_plan : bk.checking ? T.avail_check : f === 0 ? T.avail_none : bk.avail ? T.avail_live : '';
    $$('[data-go]').forEach((b) => { b.disabled = !pl; });
  }
  function renderCal() {
    const [y, mo] = bk.month.split('-').map(Number);
    const first = new Date(y, mo - 1, 1, 12); const days = new Date(y, mo, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Monday first
    const min = tomorrow(); const end = endOf(); const today = isoOf(new Date());
    const nowMon = today.slice(0, 7); const maxMon = addM(today, 12).slice(0, 7);
    const prev = isoOf(new Date(y, mo - 2, 1, 12)).slice(0, 7); const next = isoOf(new Date(y, mo, 1, 12)).slice(0, 7);
    const wd = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i, 12).toLocaleDateString(LOC, { weekday: 'short' }).replace('.', '').slice(0, 2));
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const s = `${y}-${pad(mo)}-${pad(d)}`;
      const cls = [s === bk.date ? 'start' : '', s === end ? 'end' : '', s > bk.date && s < end ? 'in' : '', s === today ? 'today' : ''].filter(Boolean).join(' ');
      cells += `<button type="button" data-day="${s}" class="${cls}" ${s < min ? 'disabled' : ''} aria-pressed="${s === bk.date}" aria-label="${fmtDate(s)}">${d}</button>`;
    }
    $('#cal').innerHTML = `<div class="cal-h"><button type="button" class="cal-n" data-mon="${prev}" ${prev < nowMon ? 'disabled' : ''} aria-label="${T.cal_prev}">${ICON('<path d="M15 6l-6 6 6 6"/>')}</button>
      <b>${first.toLocaleDateString(LOC, { month: 'long', year: 'numeric' })}</b>
      <button type="button" class="cal-n" data-mon="${next}" ${next > maxMon ? 'disabled' : ''} aria-label="${T.cal_next}">${ICON('<path d="M9 6l6 6-6 6"/>')}</button></div>
      <div class="cal-w">${wd.map((w) => `<span>${esc(w)}</span>`).join('')}</div><div class="cal-g">${cells}</div>`;
  }
  // live availability for the chosen dates (falls back to "free right now" from the catalog)
  let availTimer; let availSeq = 0;
  function checkAvail() {
    clearTimeout(availTimer);
    if (!catalog) return;
    bk.checking = true; renderBoxQuiet();
    availTimer = setTimeout(async () => {
      const seq = ++availSeq;
      try {
        const r = await api(`availability?from=${bk.date}&to=${endOf()}`);
        if (seq !== availSeq) return;
        bk.avail = Object.fromEntries((r.types || []).map((x) => [x.name, x.available]));
      } catch { if (seq === availSeq) bk.avail = null; }
      bk.checking = false; renderBox();
    }, 250);
  }
  const renderBoxQuiet = () => { const av = $('#bAvail'); if (av) { av.className = 'bavail'; av.textContent = T.avail_check; } };
  function go() {
    const m = cur(); if (!m || !planOf(m)) return;
    if (!bk.date || bk.date < tomorrow()) { bk.date = tomorrow(); renderBox(); }
    st.tab = st.tab || 'new';
    step2();
  }
  // every "rent" button on the page leads to the booking box in the header
  function rent(id) {
    if (!modal.hidden) close();
    if (id && byId(id)) bk.model = id;
    renderBox(true);
    const target = window.innerWidth < 1100 ? $('#sched') : $('#book');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const box = $('.sched'); box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
  }
  let st = { tab: 'new' };
  function waLink() {
    const m = cur();
    return `https://wa.me/${P.whatsapp}?text=${encodeURIComponent(fill(T.wa_msg, { model: m?.name || '', date: fmtDate(bk.date), dur: durLabel(bk.period, bk.dur) }))}`;
  }
  const stepper = (n) => `<div class="stepper">${[T.r_step1, T.r_step2, T.r_step3].map((s, i) => `<span class="${i < n ? 'on' : ''}">${i + 1}. ${s}</span>`).join('')}</div>`;
  function summary() {
    const m = cur(); const pl = planOf(m); if (!m || !pl) return '';
    return `<div class="sum"><div class="sum-bike"><img src="${esc(img(m.image))}" alt=""><span><b>${esc(m.name)}</b><small>${pl.price == null ? T.st_req : money(pl.price) + per(bk.period)}</small></span></div>
      <div><span>${T.r_when}</span><b>${fmtDate(bk.date)} – ${fmtDate(endOf())}</b></div>
      <div><span>${T.r_sum_total} (${durLabel(bk.period, bk.dur)})</span><b>${priceTxt(pl, bk.dur)}</b></div>
      ${pl.deposit ? `<div><span>${T.r_sum_dep}</span><b>${money(pl.deposit)}</b></div>` : ''}
      <div class="tot pick-row"><span>${T.sum_pick}</span><b>${esc(P.pickup)}</b></div>
      <div><small class="muted">${P.priceMode === 'gross' ? T.vat_gross : T.vat_net}</small></div></div>`;
  }
  function step2(error) {
    const isNew = st.tab === 'new'; const v = st.form || {};
    const privacy = `<a href="${P.privacy}" target="_blank">${P.lang === 'tr' ? 'Gizlilik' : P.lang === 'en' ? 'Privacy policy' : 'Datenschutzerklärung'}</a>`;
    open(`<form class="rent" id="rf2" novalidate>${stepper(2)}<h2 id="modalTitle">${T.r_step2}</h2>
      <div class="tabs" role="tablist"><button type="button" class="${isNew ? 'on' : ''}" data-tab="new">${T.r_new}</button><button type="button" class="${isNew ? '' : 'on'}" data-tab="have">${T.r_have}</button></div>
      ${catalog && catalog.signup === false && isNew ? `<div class="err">${T.r_closed} <a href="${waLink()}" target="_blank" rel="noopener">${T.r_wa}</a></div>` : ''}
      ${isNew ? `<label class="fld"><span>${T.r_name} *</span><input name="name" autocomplete="name" required value="${esc(v.name)}"></label>
        <div class="row2"><label class="fld"><span>${T.r_email} *</span><input name="email" type="email" autocomplete="email" required value="${esc(v.email)}"></label>
        <label class="fld"><span>${T.r_phone} *</span><input name="phone" type="tel" autocomplete="tel" required placeholder="+49 …" value="${esc(v.phone)}"></label></div>
        <label class="fld"><span>${T.r_pw} *</span><input name="password" type="password" autocomplete="new-password" minlength="6" required><small>${T.r_pw_hint}</small></label>
        <label class="fld"><span>${T.r_addr}</span><input name="address" autocomplete="street-address" value="${esc(v.address)}"></label>`
      : `<label class="fld"><span>${T.r_email}</span><input name="email" type="email" autocomplete="email" required value="${esc(v.email)}"></label>
        <label class="fld"><span>${T.r_pw.replace(/\s*\(.*\)/, '')}</span><input name="password" type="password" autocomplete="current-password" required></label>`}
      <label class="fld"><span>${T.r_note}</span><textarea name="notes" rows="2">${esc(v.notes)}</textarea></label>
      <div class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
      ${isNew ? `<label class="chk"><input type="checkbox" name="consent" ${v.consent ? 'checked' : ''}><span>${fill(esc(T.r_consent), { privacy })}</span></label>` : ''}
      ${summary()}
      ${error ? `<div class="err" role="alert">${error}</div>` : ''}
      <div class="acts"><button class="btn ghost lg" type="button" id="back">${T.r_back}</button><button class="btn red lg" type="submit">${T.r_send}</button></div></form>`, true);
    const f = $('#rf2');
    const keep = () => { st.form = { ...st.form, ...Object.fromEntries(new FormData(f)), consent: !!f.consent?.checked }; delete st.form.password; };
    $$('[data-tab]', f).forEach((b) => b.addEventListener('click', () => { keep(); st.tab = b.dataset.tab; step2(); }));
    $('#back').addEventListener('click', () => { keep(); close(); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); keep();
      const d = Object.fromEntries(new FormData(f)); const btn = $('button[type=submit]', f);
      if (isNew) {
        if (!d.name || !d.email || !d.phone || !d.password) return step2(T.r_err_fill);
        if (!/\s/.test(d.name.trim())) return step2(T.r_err_name);
        if (d.password.length < 6) return step2(T.r_err_pw);
        if (!f.consent.checked) return step2(T.r_err_consent);
      } else if (!d.email || !d.password) return step2(T.r_err_fill);
      btn.disabled = true; btn.textContent = T.r_sending;
      const busy = document.createElement('div'); busy.className = 'm-busy'; busy.setAttribute('role', 'status'); busy.innerHTML = `<div class="pdl-loader"></div><span>${T.r_sending}</span>`; $('.modal-card', modal).appendChild(busy);
      const unbusy = () => busy.remove();
      let token;
      try {
        const auth = isNew
          ? await api('signup', { method: 'POST', body: JSON.stringify({ name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(), password: d.password, address: d.address, consent: true, lang: P.lang, website: d.website }) })
          : await api('login', { method: 'POST', body: JSON.stringify({ email: d.email.trim(), password: d.password }) });
        token = auth.token;
        const m = cur();
        const note = ['Website' + (P.lang !== 'de' ? ' (' + P.lang.toUpperCase() + ')' : ''), d.notes].filter(Boolean).join(' · ');
        const me = await api('requests', { method: 'POST', token, body: JSON.stringify({ type: 'yeni kiralama', bike_type: m?.type || '', period: bk.period, duration: bk.dur, preferred_date: bk.date, notes: [note, `${fmtDate(bk.date)} – ${fmtDate(endOf())}`].join(' · ') }) });
        unbusy(); done(me?.rider?.name || d.name || '', token);
      } catch (err) {
        unbusy();
        if (!err.status) return step2(`${T.r_err_net} <a href="${waLink()}" target="_blank" rel="noopener">${T.r_wa} →</a>`);
        if (err.status === 409 && token) return step2(`${T.r_err_pending} <a href="${portalUrl(token)}">${T.r_ok_portal} →</a>`);
        if (err.status === 409) { st.tab = 'have'; return step2(T.r_err_taken); }
        if (err.status === 401) return step2(T.r_err_login);
        if (err.status === 403) return step2(`${T.r_closed} <a href="${waLink()}" target="_blank" rel="noopener">${T.r_wa} →</a>`);
        return step2(esc(err.message));
      }
    });
  }
  const portalUrl = (token) => `${P.portal}?lang=${P.lang}#t=${encodeURIComponent(token)}&go=home`;
  function done(name, token) {
    const first = String(name).trim().split(/\s+/)[0] || '';
    open(`<div class="rent done">${stepper(3)}<div class="done-ic">${IC.check}</div><h2 id="modalTitle">${T.r_ok_h}</h2>
      <p>${esc(fill(T.r_ok_p, { name: first }))}</p><div class="tip pick-tip">${esc(fill(T.r_ok_pick, { addr: P.pickup }))}</div><div class="tip">${T.r_ok_next}</div>
      <div class="acts"><button class="btn ghost lg" data-close>${T.r_close}</button><a class="btn red lg" href="${portalUrl(token)}">${T.r_ok_portal}</a></div></div>`);
  }

  initBox(); renderCards(); loadCatalog();

  // ---------- global clicks ----------
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-rent]'); if (r) { e.preventDefault(); return rent(r.dataset.rent); }
    const d = e.target.closest('[data-details]'); if (d) { const m = byId(d.dataset.details); if (m) details(m); return; }
    const pk = e.target.closest('[data-pick]'); if (pk) { e.preventDefault(); return pick(pk.dataset.pick); }
    if (e.target.closest('[data-book]')) { e.preventDefault(); return window.innerWidth < 1100 ? rent(bk.model) : go(); }
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); return go(); }
    const a = e.target.closest('.nav a'); if (a) toggleNav(false);
    if (nav.classList.contains('open') && !e.target.closest('#nav, #burger')) toggleNav(false);
  });

  // header: shadow on scroll + mobile menu
  const top = $('#top'); const nav = $('#nav'); const burger = $('#burger');
  const onScroll = () => top.classList.toggle('scrolled', window.scrollY > 8); onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  // header fit: long labels (TR/EN) must never be cut off – first drop icons/extra buttons, then fall back to the menu button
  function fitNav() {
    top.classList.remove('compact', 'collapsed');
    if (window.innerWidth <= 1100) return;
    const over = () => nav.scrollWidth > nav.clientWidth + 1 || top.querySelector('.top-in').scrollWidth > top.querySelector('.top-in').clientWidth + 1;
    if (over()) top.classList.add('compact');
    if (over()) top.classList.add('collapsed');
  }
  fitNav(); window.addEventListener('resize', fitNav); document.fonts?.ready.then(fitNav);
  function toggleNav(on) { nav.classList.toggle('open', on); burger.setAttribute('aria-expanded', on); }
  burger.addEventListener('click', () => toggleNav(!nav.classList.contains('open')));

  // reveal on scroll
  const rv = $$('.sec-h, .bike, .steps li, .inc, .map-box, .map-side > div, .biz, .faq details, .cta');
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -40px 0px' });
  // only animate what is still below the fold; never keep content hidden if the observer does not fire
  rv.filter((el) => el.getBoundingClientRect().top > window.innerHeight).forEach((el) => { el.classList.add('rv'); io.observe(el); });
  setTimeout(() => rv.forEach((el) => el.classList.add('in')), 4000);

  // ---------- intro loader: hide when the page has loaded (max 1.2 s) ----------
  const ready = () => document.documentElement.classList.add('ready');
  if (document.readyState === 'complete') ready(); else addEventListener('load', ready, { once: true });
  setTimeout(ready, 1200);
})();
