// UI helpers: API client, formatting, tables, forms, modal, charts
import { RESOURCES } from './shared/meta.js';

// ---------- API ----------
let transport = async (method, path, body, token) => {
  const res = await fetch(path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && method !== 'GET' ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};
export const setTransport = (fn) => { transport = fn; };
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
export const session = { token: store.get('pedalla_token'), user: null, perms: {}, settings: {}, roles: {} };
export const setToken = (t) => { session.token = t; store.set('pedalla_token', t); };
export async function api(method, path, body) {
  let url = '/api/' + path.replace(/^\//, '');
  if (method === 'GET' && body) { url += '?' + new URLSearchParams(Object.entries(body).filter(([, v]) => v !== '' && v != null)); body = null; }
  const r = await transport(method, url, body, session.token);
  if (r.status === 401 && !path.startsWith('login')) { setToken(null); location.hash = '#/login'; throw new Error(r.body.error || 'Oturum açın'); }
  if (r.status >= 400) throw new Error(r.body.error || 'Hata');
  return r.body;
}
export const GET = (p, q) => api('GET', p, q);
export const POST = (p, b) => api('POST', p, b || {});
export const PUT = (p, b) => api('PUT', p, b || {});
export const DEL = (p) => api('DELETE', p);
export const can = (perm, lvl = 'r') => { const p = session.perms?.[perm] || ''; return lvl === 'r' ? !!p : p === 'w'; };

// ---------- formatting ----------
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR' });
export const money = (v) => (v == null || v === '' ? '—' : nf.format(Number(v)));
export const num = (v, d = 0) => (v == null || v === '' ? '—' : Number(v).toLocaleString('tr-TR', { maximumFractionDigits: d }));
export const date = (v) => { if (!v) return '—'; const [y, m, d] = String(v).slice(0, 10).split('-'); return `${d}.${m}.${y}`; };
export const dt = (v) => (v ? `${date(v)} ${String(v).slice(11, 16)}` : '—');
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
export const ago = (v) => {
  if (!v) return '—'; const ms = Date.now() - new Date(String(v).replace(' ', 'T') + 'Z').getTime();
  const m = Math.round(ms / 60000); if (m < 1) return 'şimdi'; if (m < 60) return `${m} dk önce`; const h = Math.round(m / 60); if (h < 48) return `${h} sa önce`; return `${Math.round(h / 24)} gün önce`;
};
const BADGE = {
  'müsait': 'ok', 'kirada': 'brand', 'rezerve': 'info', 'serviste': 'warn', 'arızalı': 'danger', 'kayıp/çalıntı': 'danger', 'hizmet dışı': 'muted',
  'aktif': 'brand', 'rezervasyon': 'info', 'tamamlandı': 'muted', 'iptal': 'muted',
  'açık': 'warn', 'kısmi': 'info', 'ödendi': 'ok', 'tahsil': 'brand', 'iade': 'ok', 'kesinti': 'danger',
  'kabul edildi': 'info', 'teşhis': 'info', 'parça bekliyor': 'warn', 'onarımda': 'warn', 'hazır': 'ok', 'teslim edildi': 'muted',
  'giriş': 'ok', 'çıkış': 'warn', 'sayım düzeltme': 'info', 'sayım farkı': 'info', pasif: 'muted', admin: 'brand', operasyon: 'info', servis: 'warn', muhasebe: 'ok',
  'gecikmede': 'danger', 'kara liste': 'danger', 'alındı': 'ok', 'bekliyor': 'warn', 'iade edildi': 'muted', 'kısmi iade': 'info', 'mahsup edildi': 'info',
};
export const badge = (v, label) => (v == null || v === '' ? '—' : `<span class="badge b-${BADGE[v] || 'muted'}">${esc(label ?? v)}</span>`);
export const STATUS_COLORS = { 'müsait': '#1f9d55', 'kirada': 'var(--brand)', 'rezerve': '#2f6fd6', 'serviste': '#e0a100', 'arızalı': '#d64545', 'kayıp/çalıntı': '#7a1f1f', 'hizmet dışı': '#8a9690' };
export const statusHex = { 'müsait': '#1f9d55', 'kirada': '#eb4056', 'rezerve': '#2f6fd6', 'serviste': '#e0a100', 'arızalı': '#7a1f2b', 'kayıp/çalıntı': '#6b2fa0', 'hizmet dışı': '#7a929e' };

export function fmtField(f, row) {
  const v = f.show ? row[f.show] ?? row[f.k] : row[f.k];
  if (f.badge) { const o = f.o?.find((x) => x.v === v); return badge(v, o?.l); }
  switch (f.t) {
    case 'money': return money(v);
    case 'date': return date(v);
    case 'datetime': return dt(v);
    case 'bool': return v ? '<span class="yes">✓</span>' : '<span class="no">—</span>';
    case 'number': return f.k === 'days_late' ? (v > 0 ? `<b class="t-danger">${v}</b>` : '—') : num(v, 2);
    default: return v == null || v === '' ? '—' : esc(v);
  }
}

// ---------- toast ----------
export function toast(msg, kind = 'ok') {
  const el = document.createElement('div'); el.className = `toast t-${kind}`; el.textContent = msg;
  document.body.appendChild(el); setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}
export const guard = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message, 'err'); } };

// ---------- modal ----------
export function modal(title, html, { wide } = {}) {
  closeModal();
  const wrap = document.createElement('div'); wrap.id = 'modal';
  wrap.innerHTML = `<div class="modal-back"></div><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-h"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Kapat">✕</button></div><div class="modal-b">${html}</div></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('.modal-back').onclick = closeModal; wrap.querySelector('[data-close]').onclick = closeModal;
  return wrap.querySelector('.modal-b');
}
export const closeModal = () => document.getElementById('modal')?.remove();
export const confirmBox = (text) => new Promise((res) => {
  const b = modal('Onay', `<p>${esc(text)}</p><div class="form-actions"><button class="btn" data-n>Vazgeç</button><button class="btn primary" data-y>Evet</button></div>`);
  b.querySelector('[data-n]').onclick = () => { closeModal(); res(false); }; b.querySelector('[data-y]').onclick = () => { closeModal(); res(true); };
});

// ---------- forms ----------
const lookups = {};
export async function lookup(res, q) {
  const key = res + JSON.stringify(q || {});
  if (!lookups[key]) lookups[key] = GET('lookup/' + res, q).catch(() => []);
  return lookups[key];
}
export const clearLookups = () => { for (const k in lookups) delete lookups[k]; };

export function inputHtml(f, v, extra = {}) {
  const id = `f_${f.k}`; const req = f.req ? 'required' : '';
  const dis = extra.disabled ? 'disabled' : '';
  let ctl;
  if (f.t === 'textarea') ctl = `<textarea id="${id}" name="${f.k}" rows="3" ${req} ${dis}>${esc(v)}</textarea>`;
  else if (f.t === 'select') { const os = v != null && v !== '' && !f.o.some((o) => String(o.v) === String(v)) ? [...f.o, { v, l: v }] : f.o; ctl = `<select id="${id}" name="${f.k}" ${req} ${dis}><option value="">—</option>${os.map((o) => `<option value="${esc(o.v)}" ${String(v) === String(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`; }
  else if (f.t === 'ref') ctl = `<select id="${id}" name="${f.k}" data-ref="${f.ref}" data-val="${esc(v ?? '')}" ${req} ${dis}><option value="">Yükleniyor…</option></select>`;
  else if (f.t === 'bool') return `<label class="check"><input type="checkbox" id="${id}" name="${f.k}" ${v ? 'checked' : ''} ${dis}> ${esc(f.l)}</label>`;
  else {
    const type = { money: 'number', number: 'number', date: 'date', datetime: 'datetime-local', email: 'email', tel: 'tel', password: 'password' }[f.t] || 'text';
    const val = f.t === 'datetime' && v ? String(v).replace(' ', 'T').slice(0, 16) : v;
    ctl = `<input id="${id}" name="${f.k}" type="${type}" ${type === 'number' ? `step="${f.step || (f.t === 'money' ? '0.01' : 'any')}"` : ''} value="${esc(val ?? '')}" ${req} ${dis} ${f.t === 'password' ? 'autocomplete="new-password"' : ''}>`;
  }
  return `<label class="field ${f.t === 'textarea' ? 'span2' : ''}" for="${id}"><span>${esc(f.l)}${f.req ? ' *' : ''}</span>${ctl}</label>`;
}
export async function fillRefs(root, filters = {}) {
  for (const sel of root.querySelectorAll('select[data-ref]')) {
    const res = sel.dataset.ref; const items = await lookup(res, filters[sel.name]);
    const cur = sel.dataset.val;
    sel.innerHTML = `<option value="">—</option>` + items.map((i) => `<option value="${i.id}" ${String(i.id) === cur ? 'selected' : ''}>${esc(i.label)}</option>`).join('');
  }
}
export function readForm(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked ? 1 : 0;
    else if (el.type === 'datetime-local') o[el.name] = el.value ? el.value.replace('T', ' ') + ':00' : '';
    else o[el.name] = el.value;
  }
  return o;
}
// Generic create / edit form from metadata
export async function editForm(res, row, { onSaved, defaults = {}, path } = {}) {
  const meta = RESOURCES[res]; const isNew = !row?.id;
  const fields = meta.fields.filter((f) => !f.ro || (!isNew && false));
  const val = (f) => (row ? row[f.k] : defaults[f.k] ?? f.def ?? (f.t === 'date' ? todayISO() : ''));
  const body = modal(`${meta.single} ${isNew ? 'ekle' : 'düzenle'}`, `<form class="grid-form">${fields.map((f) => inputHtml(f, f.t === 'password' ? '' : val(f))).join('')}
    <div class="form-actions span2">${!isNew && !meta.noDelete ? '<button type="button" class="btn danger ghost" data-del>Sil</button>' : ''}<span class="grow"></span><button type="button" class="btn" data-close2>Vazgeç</button><button class="btn primary">Kaydet</button></div></form>`, { wide: fields.length > 8 });
  const form = body.querySelector('form');
  await fillRefs(form);
  body.querySelector('[data-close2]').onclick = closeModal;
  body.querySelector('[data-del]')?.addEventListener('click', guard(async () => {
    if (!(await confirmBox('Bu kayıt silinsin mi?'))) return;
    await DEL(`${path || res}/${row.id}`); clearLookups(); toast('Silindi'); onSaved?.(null);
  }));
  form.onsubmit = guard(async (e) => {
    e.preventDefault();
    const data = readForm(form);
    if (res === 'users' && !isNew && !data.password) delete data.password;
    const saved = isNew ? await POST(path || res, data) : await PUT(`${path || res}/${row.id}`, data);
    clearLookups(); closeModal(); toast('Kaydedildi'); onSaved?.(saved);
  });
}

// ---------- tables ----------
export function csv(rows, cols, name) {
  const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
  const lines = [cols.map((c) => c.l).join(';'), ...rows.map((r) => cols.map((c) => { const v = c.csv ? c.csv(r) : r[c.k]; return `"${strip(v).replace(/"/g, '""')}"`; }).join(';'))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}-${todayISO()}.csv`; a.click();
}
// cols: [{k, l, f?: (row)=>html, cls?}]
export function table(rows, cols, { link, empty = 'Kayıt yok.', id, select } = {}) {
  if (!rows.length) return `<div class="empty">${esc(empty)}</div>`;
  // select: adds a checkbox column at the end of each row (bulk actions, see bindSelect)
  return `<div class="table-wrap"><table class="tbl" ${id ? `id="${id}"` : ''}><thead><tr>${cols.map((c, i) => `<th data-i="${i}" class="${c.cls || ''}">${esc(c.l)}</th>`).join('')}${select ? '<th class="sel-c nosort"><input type="checkbox" class="sel-all" aria-label="Tümünü seç" title="Tümünü seç"></th>' : ''}</tr></thead>
  <tbody>${rows.map((r) => `<tr ${link ? `data-href="${esc(link(r))}" class="clickable"` : ''}>${cols.map((c) => `<td class="${c.cls || ''}" data-l="${esc(c.l)}">${c.f ? c.f(r) : esc(r[c.k] ?? '—')}</td>`).join('')}${select ? `<td class="sel-c" data-l="Seç"><input type="checkbox" class="sel" value="${esc(r.id)}" aria-label="Seç"></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
// wires the checkbox column: onChange(selectedIds) after every change
export function bindSelect(root, onChange) {
  const boxes = () => [...root.querySelectorAll('input.sel')];
  const fire = () => { const ids = boxes().filter((b) => b.checked).map((b) => Number(b.value)); boxes().forEach((b) => b.closest('tr').classList.toggle('selected', b.checked)); const all = root.querySelector('.sel-all'); if (all) { all.checked = ids.length > 0 && ids.length === boxes().length; all.indeterminate = ids.length > 0 && ids.length < boxes().length; } onChange(ids); };
  root.querySelector('.sel-all')?.addEventListener('change', (e) => { boxes().forEach((b) => (b.checked = e.target.checked)); fire(); });
  boxes().forEach((b) => b.addEventListener('change', fire));
  root.querySelectorAll('td.sel-c').forEach((td) => td.addEventListener('click', (e) => { if (e.target === td) { const b = td.querySelector('input'); b.checked = !b.checked; fire(); } }));
  return { clear: () => { boxes().forEach((b) => (b.checked = false)); fire(); } };
}
export function bindTable(root) {
  root.querySelectorAll('tr[data-href]').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.closest('button,a,input')) return; location.hash = tr.dataset.href; }));
  root.querySelectorAll('table.tbl th:not(.nosort)').forEach((th) => th.addEventListener('click', () => {
    const tb = th.closest('table').tBodies[0]; const i = [...th.parentNode.children].indexOf(th);
    const dir = th.dataset.dir === 'asc' ? 'desc' : 'asc'; th.parentNode.querySelectorAll('th').forEach((x) => delete x.dataset.dir); th.dataset.dir = dir;
    const val = (tr) => { const t = tr.children[i].textContent.trim(); const n = Number(t.replace(/[€\s.%]/g, '').replace(',', '.')); return /^\d{2}\.\d{2}\.\d{4}/.test(t) ? t.slice(6, 10) + t.slice(3, 5) + t.slice(0, 2) : Number.isFinite(n) && t !== '—' && t !== '' ? n : t.toLowerCase(); };
    [...tb.rows].sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (dir === 'asc' ? 1 : -1); }).forEach((r) => tb.appendChild(r));
  }));
}
export const colsFromMeta = (res) => RESOURCES[res].fields.filter((f) => f.list).map((f) => ({ k: f.show || f.k, l: f.l, f: (r) => fmtField(f, r), csv: (r) => (f.show ? r[f.show] : r[f.k]), cls: ['money', 'number'].includes(f.t) ? 'num' : '' }));

// ---------- charts (inline SVG) ----------
export function barChart(data, series, { height = 220, fmt = money } = {}) {
  if (!data.length) return '<div class="empty">Veri yok</div>';
  const W = 640, H = height, pad = { l: 56, r: 8, t: 12, b: 28 };
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.k] || 0)));
  const step = (W - pad.l - pad.r) / data.length; const bw = Math.min(22, (step - 8) / series.length);
  const y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">
    ${ticks.map((t) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${pad.l - 6}" y="${y(t) + 4}" class="ax" text-anchor="end">${fmt(t).replace(',00', '')}</text>`).join('')}
    ${data.map((d, i) => series.map((s, j) => { const v = d[s.k] || 0; const x = pad.l + i * step + (step - bw * series.length) / 2 + j * bw; return `<rect x="${x}" y="${y(v)}" width="${bw - 2}" height="${Math.max(0, H - pad.b - y(v))}" rx="3" fill="${s.c}"><title>${esc(d.label)} · ${esc(s.l)}: ${fmt(v)}</title></rect>`; }).join('') + `<text x="${pad.l + i * step + step / 2}" y="${H - 8}" class="ax" text-anchor="middle">${esc(d.label)}</text>`).join('')}
  </svg><div class="legend">${series.map((s) => `<span><i style="background:${s.c}"></i>${esc(s.l)}</span>`).join('')}</div>`;
}
export function donut(items, { size = 170, center = '' } = {}) {
  const total = items.reduce((a, x) => a + x.v, 0) || 1; const r = 60, c = 2 * Math.PI * r; let off = 0;
  const segs = items.map((x) => { const len = (x.v / total) * c; const s = `<circle r="${r}" cx="80" cy="80" fill="none" stroke="${x.c}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}"><title>${esc(x.l)}: ${x.v}</title></circle>`; off += len; return s; }).join('');
  return `<div class="donut-wrap"><svg viewBox="0 0 160 160" width="${size}" height="${size}" style="transform:rotate(-90deg)">${segs}</svg><div class="donut-c">${center}</div>
    <ul class="legend v">${items.map((x) => `<li><i style="background:${x.c}"></i>${esc(x.l)} <b>${x.v}</b></li>`).join('')}</ul></div>`;
}
export const meter = (pct, cls = '') => `<div class="meter ${cls}"><div style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
