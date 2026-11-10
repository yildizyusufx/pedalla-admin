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
  const fallback = P.models.slice(0, 2).map((m) => ({ ...m, type: m.adminType, available: null }));
  let models = fallback; let catalog = null;
  const marketing = (name) => P.models.find((m) => new RegExp(m.match, m.flags).test(name));
  function fromCatalog(c) {
    const used = new Set();
    return c.types.filter((x) => x.price != null).map((x) => {
      let m = marketing(x.name); if (m && used.has(m.id)) m = null; if (m) used.add(m.id);
      return {
        id: m?.id || 'type-' + x.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), type: x.name, name: m?.name || x.name, tag: m?.tag || '',
        sub: m?.sub || P.generic.sub, desc: m?.desc || P.generic.desc, specs: m?.specs || [], image: x.image || m?.image || P.generic.image,
        price: x.price, deposit: x.deposit, period: x.period || 'ay', available: x.available,
      };
    }).sort((a, b) => (b.available > 0) - (a.available > 0) || a.price - b.price);
  }
  const byId = (id) => models.find((m) => m.id === id);

  function cardHtml(m) {
    return `<article class="bike rv in" data-model="${esc(m.id)}">
      <div class="bike-img"><span class="bike-tag">${esc(m.tag)}</span><img src="${esc(img(m.image))}" alt="${esc(m.name)}" loading="lazy"></div>
      <div class="bike-body"><h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p>
        <div class="bike-price"><span class="muted">${T.starting_from}</span><b class="pill">${money(m.price)}${per(m.period)}</b>${m.available == null ? '' : `<span class="avail ${m.available ? '' : 'none'}">${m.available ? fill(T.available_n, { n: m.available }) : T.available_0}</span>`}</div></div>
      <div class="bike-actions"><button class="btn ghost" data-details="${esc(m.id)}">${T.more_details}</button><button class="btn dark" data-rent="${esc(m.id)}">${T.rent_now}</button></div></article>`;
  }
  function renderCards() {
    $('#bikes').innerHTML = models.map(cardHtml).join('');
    const hero = models.find((m) => m.id === 'fat') || models[0];
    $$('[data-from]').forEach((el) => { const m = byId(el.dataset.from) || hero; if (m) el.textContent = money(m.price); });
    renderHeroModels();
  }

  // ---------- hero: model switcher ----------
  let heroId = 'fat';
  function renderHeroModels() {
    const box = $('#heroModels'); if (!box) return;
    if (!byId(heroId)) heroId = (models.find((m) => m.id === 'fat') || models[0])?.id;
    box.innerHTML = models.slice(0, 3).map((m) => `<button class="hm ${m.id === heroId ? 'on' : ''}" data-hero="${esc(m.id)}" role="tab" aria-selected="${m.id === heroId}"><span class="hm-img"><img src="${esc(img(m.image))}" alt=""></span><span><b>${esc(m.name)}</b><small>${money(m.price)}${per(m.period)}</small></span></button>`).join('');
    const st = $('#heroFree .stack'); if (st) st.innerHTML = models.slice(0, 3).map((m) => `<i><img src="${esc(img(m.image))}" alt=""></i>`).join('') + '<i class="plus">+</i>';
    showHero(heroId, true);
  }
  function showHero(id, instant) {
    const m = byId(id); if (!m) return; heroId = id;
    $$('#heroModels .hm').forEach((b) => { const on = b.dataset.hero === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    const bike = $('#heroBike'); const spot = $('#spot');
    const apply = () => {
      if (bike.getAttribute('src') !== img(m.image)) bike.src = img(m.image);
      bike.alt = m.name;
      $('.spot-name', spot).textContent = m.name;
      $('.spot-sub', spot).textContent = m.sub || P.generic.sub;
      $('.spot-desc', spot).textContent = m.desc;
      const pr = $('.spot-price', spot); const pb = $('b', pr); pb.textContent = money(m.price); pb.dataset.from = m.id; $('a', pr).dataset.details = m.id;
      $('.hero-go').dataset.rent = m.id;
      bike.classList.remove('swap');
    };
    if (instant) return apply();
    bike.classList.add('swap'); setTimeout(apply, 220);
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
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }).addTo(map);
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
      L.marker([lat, lng], { icon }).addTo(fleetLayer).bindPopup(`<b>${esc(m?.name || f.type)}</b><br>${m ? `${T.starting_from} ${money(m.price)}${per(m.period)}<br>` : ''}<a href="#" data-rent="${esc(m?.id || '')}">${T.rent_now} →</a>`);
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
      const free = (catalog.fleet || []).length; const freeAll = catalog.types.reduce((s, x) => s + (x.available || 0), 0);
      $('#freeCount').textContent = freeAll;
      if (freeAll > 0) { const f = $('#heroFree'); $('.lv1', f).innerHTML = `<span class="g">${freeAll}</span> ${esc(T.hero_free)}`; $('.lv2', f).textContent = T.hero_free_sub; }
      drawFleet();
    } catch (e) {
      $('#mapOff').hidden = false; $('#freeCount').textContent = '–';
    }
  }
  renderCards(); loadCatalog();

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
      <div class="price-big">${money(m.price)} <small>${per(m.period)} · ${P.priceMode === 'gross' ? T.vat_gross : T.vat_net}</small></div>
      ${m.deposit ? `<small class="muted">${T.deposit}: ${money(m.deposit)}</small>` : ''}
      ${m.specs.length ? `<ul>${m.specs.map((s) => `<li>${IC.check}${esc(s)}</li>`).join('')}</ul>` : ''}
      <div class="incl-note">${IC.shield}${T.d_incl}</div>
      <button class="btn red lg" style="width:100%" data-rent="${esc(m.id)}">${T.rent_now}</button></div></div>`, true);
  }

  // ---------- rent flow ----------
  const tomorrow = () => { const d = new Date(Date.now() + 864e5); return d.toISOString().slice(0, 10); };
  const fmtDate = (s) => new Date(s + 'T12:00:00').toLocaleDateString(P.lang === 'tr' ? 'tr-TR' : P.lang === 'en' ? 'en-GB' : 'de-DE');
  let st = {};
  function waLink() {
    const m = byId(st.model);
    return `https://wa.me/${P.whatsapp}?text=${encodeURIComponent(fill(T.wa_msg, { model: m?.name || '', date: st.date ? fmtDate(st.date) : '', dur: durLabel(m?.period, st.dur) }))}`;
  }
  function rent(id) {
    st = { model: (id && byId(id)) ? id : (models.find((m) => m.available) || models[0]).id, date: tomorrow(), dur: P.durations[0], tab: 'new', step: 1 };
    step1();
  }
  const stepper = (n) => `<div class="stepper">${[T.r_step1, T.r_step2, T.r_step3].map((s, i) => `<span class="${i < n ? 'on' : ''}">${i + 1}. ${s}</span>`).join('')}</div>`;
  function summary() {
    const m = byId(st.model); if (!m) return '';
    const rateLabel = m.period === 'ay' ? T.r_sum_rate : T.r_model;
    return `<div class="sum"><div><span>${esc(m.name)} · ${rateLabel}</span><b>${money(m.price)}${per(m.period)}</b></div>
      <div><span>${T.r_sum_total} (${durLabel(m.period, st.dur)})</span><b>${money(m.price * st.dur)}</b></div>
      ${m.deposit ? `<div class="tot"><span>${T.r_sum_dep}</span><b>${money(m.deposit)}</b></div>` : ''}
      <div><small class="muted">${P.priceMode === 'gross' ? T.vat_gross : T.vat_net}</small></div></div>`;
  }
  function step1() {
    open(`<form class="rent" id="rf1" novalidate>${stepper(1)}<h2 id="modalTitle">${T.r_title}</h2>
      <div class="fld"><span>${T.r_model}</span><div class="opts">${models.map((m) => `<label class="opt"><input type="radio" name="model" value="${esc(m.id)}" ${m.id === st.model ? 'checked' : ''}><div><img src="${esc(img(m.image))}" alt=""><b>${esc(m.name)}</b><small>${money(m.price)}${per(m.period)}</small>${m.available == null ? '' : `<small class="avail ${m.available ? '' : 'none'}">${m.available ? fill(T.available_n, { n: m.available }) : T.available_0}</small>`}</div></label>`).join('')}</div></div>
      <div class="row2"><label class="fld"><span>${T.r_start}</span><input type="date" name="date" min="${tomorrow()}" value="${st.date}" required></label>
      <div class="fld"><span>${T.r_duration}</span><div class="durs" id="durs"></div></div></div>
      <div id="sum">${summary()}</div>
      <div class="acts"><button class="btn red lg" type="submit">${T.r_next}</button></div></form>`, true);
    const f = $('#rf1');
    const durs = () => { const m = byId(st.model); $('#durs').innerHTML = P.durations.map((n) => `<label><input type="radio" name="dur" value="${n}" ${n === st.dur ? 'checked' : ''}><span>${durLabel(m?.period, n)}</span></label>`).join(''); };
    durs();
    f.addEventListener('change', (e) => {
      if (e.target.name === 'model') { st.model = e.target.value; durs(); }
      if (e.target.name === 'dur') st.dur = Number(e.target.value);
      if (e.target.name === 'date') st.date = e.target.value;
      $('#sum').innerHTML = summary();
    });
    f.addEventListener('submit', (e) => { e.preventDefault(); st.date = f.date.value; if (!st.date || st.date < tomorrow()) { f.date.focus(); return; } step2(); });
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
    $('#back').addEventListener('click', () => { keep(); step1(); });
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
        const m = byId(st.model);
        const note = ['Website' + (P.lang !== 'de' ? ' (' + P.lang.toUpperCase() + ')' : ''), d.notes].filter(Boolean).join(' · ');
        const me = await api('requests', { method: 'POST', token, body: JSON.stringify({ type: 'yeni kiralama', bike_type: m?.type || '', period: m?.period || 'ay', duration: st.dur, preferred_date: st.date, notes: note }) });
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
      <p>${esc(fill(T.r_ok_p, { name: first }))}</p><div class="tip">${T.r_ok_next}</div>
      <div class="acts"><button class="btn ghost lg" data-close>${T.r_close}</button><a class="btn red lg" href="${portalUrl(token)}">${T.r_ok_portal}</a></div></div>`);
  }

  // ---------- global clicks ----------
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-rent]'); if (r) { e.preventDefault(); return rent(r.dataset.rent); }
    const d = e.target.closest('[data-details]'); if (d) { const m = byId(d.dataset.details); if (m) details(m); return; }
    const h = e.target.closest('[data-hero]'); if (h) return showHero(h.dataset.hero);
    const a = e.target.closest('.nav a'); if (a) toggleNav(false);
    if (nav.classList.contains('open') && !e.target.closest('#nav, #burger')) toggleNav(false);
  });

  // header: shadow on scroll + mobile menu
  const top = $('#top'); const nav = $('#nav'); const burger = $('#burger');
  const onScroll = () => top.classList.toggle('scrolled', window.scrollY > 8); onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  function toggleNav(on) { nav.classList.toggle('open', on); burger.setAttribute('aria-expanded', on); }
  burger.addEventListener('click', () => toggleNav(!nav.classList.contains('open')));

  // reveal on scroll
  const rv = $$('.sec-h, .steps li, .inc, .map-box, .map-side > div, .biz, .faq details, .cta');
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -40px 0px' });
  // only animate what is still below the fold; never keep content hidden if the observer does not fire
  rv.filter((el) => el.getBoundingClientRect().top > window.innerHeight).forEach((el) => { el.classList.add('rv'); io.observe(el); });
  setTimeout(() => rv.forEach((el) => el.classList.add('in')), 4000);

  // ---------- intro loader: hide when the page has loaded (max 1.2 s) ----------
  const ready = () => document.documentElement.classList.add('ready');
  if (document.readyState === 'complete') ready(); else addEventListener('load', ready, { once: true });
  setTimeout(ready, 1200);
})();
