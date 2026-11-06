// Admin panel language switch (Türkçe / Deutsch / English).
// The panel is written in Turkish; this module translates what is rendered on screen, using
// UI (interface texts) and VALUES (Turkish values stored in the database: statuses, types…).
// Numbers inside a text are matched with "#" (e.g. "# kayıt" → "# Einträge").
// Printed documents (contract, invoice, service forms) keep their own DE/EN switch and are skipped.
import { VALUES } from './i18n-values.js';
import { UI, PATTERNS } from './i18n-ui.js';

const KEY = 'pedalla_lang';
const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: (v) => { try { localStorage.setItem(KEY, v); } catch {} } };
export const LANGS = [['tr', 'TR', 'Türkçe'], ['de', 'DE', 'Deutsch'], ['en', 'EN', 'English']];
export let lang = ['tr', 'de', 'en'].includes(store.get()) ? store.get() : 'tr';
const IDX = { de: 0, en: 1 };
const NUM = /\d+(?:[.,]\d+)*/g;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);
const done = new WeakMap(); // text node → value we wrote (re-translate if the app changes it)
let miss = null; // Set of untranslated strings, collected when window.PEDALLA_I18N_DEBUG is on

const lookup = (s) => { const e = UI[s] || VALUES[s]; return e ? e[IDX[lang]] : undefined; };
const hasLetters = (s) => /[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(s);
const looksTurkish = (s) => /[çğıöşüÇĞİÖŞÜ]/.test(s) || /\b(ve|ile|için|yok|gün|kayıt|ekle|sil|kaydet|toplam|adet|yeni|tüm|son|tarih|tutar|durum)\b/i.test(s);

export function t(s) {
  if (lang === 'tr' || s == null) return s;
  const src = String(s); const core = src.trim();
  if (!core || !hasLetters(core)) return src;
  const out = tCore(core);
  if (out == null) { if (miss && (window.PEDALLA_I18N_DEBUG === 2 || looksTurkish(core))) miss.add(core); return src; }
  return src.replace(core, out);
}
function tCore(core) {
  let x = lookup(core); if (x !== undefined) return x;
  const nums = core.match(NUM);
  if (nums) { x = lookup(core.replace(NUM, '#')); if (x !== undefined) { let i = 0; return x.replace(/#/g, () => nums[i++] ?? '#'); } }
  for (const [re, fn] of PATTERNS) { const pm = core.match(re); if (pm) { const r = fn(pm, (q) => tCore(q) ?? q); if (r) return r[IDX[lang]]; } }
  // "Label *", "Label:", "(…)"
  let m = core.match(/^(.*?)(\s*[*:…]+)$/); if (m && m[1]) { x = tCore(m[1]); if (x != null) return x + m[2]; }
  m = core.match(/^([+←→✓•·−]\s*)(.+)$/); if (m) { x = tCore(m[2]); if (x != null) return m[1] + x; }
  m = core.match(/^(.+?)(\s*[→·])$/); if (m) { x = tCore(m[1]); if (x != null) return x + m[2]; }
  m = core.match(/^\((.+)\)$/); if (m) { x = tCore(m[1]); if (x != null) return `(${x})`; }
  // pieces joined with " · " or " – " or ", "
  for (const sep of [' · ', ' – ', ' / ', ', ', ': ']) {
    if (!core.includes(sep)) continue;
    const parts = core.split(sep); let changed = false;
    const tr = parts.map((p) => { const q = p.trim(); if (!q || !hasLetters(q)) return p; const y = tCore(q); if (y != null) { changed = true; return p.replace(q, y); } return p; });
    if (changed) return tr.join(sep);
  }
  return null;
}

function inSkipped(el) {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    if (SKIP.has(e.tagName) || e.isContentEditable) return true;
    if (e.classList && (e.classList.contains('no-i18n') || e.classList.contains('doc') || e.id === 'printarea')) return true;
  }
  return false;
}
function translateNode(root) {
  if (lang === 'tr') return;
  if (root.nodeType === 3) { textNode(root); return; }
  if (root.nodeType !== 1 || inSkipped(root)) return;
  attrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => (n.nodeType === 1 && (SKIP.has(n.tagName) || n.classList.contains('no-i18n') || n.classList.contains('doc') || n.id === 'printarea') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) textNode(n); else attrs(n); }
}
function textNode(n) {
  const v = n.nodeValue; if (done.get(n) === v) return; if (!v || !hasLetters(v)) return;
  const p = n.parentElement; if (!p || inSkipped(p)) return;
  if (p.tagName === 'OPTION' && !p.hasAttribute('value')) p.setAttribute('value', p.textContent);
  const out = t(v); done.set(n, out); if (out !== v) n.nodeValue = out;
}
function attrs(el) {
  for (const a of ['placeholder', 'title', 'aria-label', 'data-l']) { const v = el.getAttribute?.(a); if (v && hasLetters(v)) { const o = t(v); if (o !== v) el.setAttribute(a, o); } }
  if (el.tagName === 'INPUT' && ['submit', 'button'].includes(el.type) && el.value) el.value = t(el.value);
}

export function setLang(l) { store.set(l); location.reload(); }
let started = false;
export function startI18n() {
  if (started) return; started = true;
  document.documentElement.lang = lang;
  if (window.PEDALLA_I18N_DEBUG) { miss = new Set(); window.__i18nMiss = miss; }
  if (lang === 'tr') return;
  translateNode(document.body);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') { textNode(m.target); continue; }
      for (const n of m.addedNodes) translateNode(n);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  const tt = document.querySelector('title'); if (tt) tt.textContent = t(tt.textContent);
  // alert/confirm texts and toasts created from code go through the DOM, so they are covered too
}
export const langSwitch = () => `<div class="lang-pick no-i18n">${LANGS.map(([k, s, l]) => `<button type="button" data-ui-lang="${k}" title="${l}" class="${k === lang ? 'on' : ''}">${s}</button>`).join('')}</div>`;
export const bindLangSwitch = (root) => root.querySelectorAll('[data-ui-lang]').forEach((b) => (b.onclick = () => { if (b.dataset.uiLang !== lang) setLang(b.dataset.uiLang); }));
