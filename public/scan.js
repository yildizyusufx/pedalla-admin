// Document scanner: photograph paper documents page by page with the phone camera (or pick photos / a PDF),
// clean them up ("document" mode: grey, white paper, dark text), rotate / reorder / delete pages, and save everything
// as ONE PDF. Runs completely in the browser (no library); the PDF is kept under the 3 MB upload limit.
// Used by the panel (rental documents) and the rider screen.

const T = {
  tr: { title: 'Belge tara', add: 'Sayfa çek / ekle', hint: 'Belgeyi düz bir zemine koyun, üstten ve iyi ışıkta çekin. Her sayfa için tekrar "Sayfa çek" deyin.', mode_doc: 'Belge (siyah-beyaz)', mode_color: 'Renkli', save: 'PDF olarak kaydet', saving: 'PDF hazırlanıyor…', pages: 'sayfa', empty: 'Henüz sayfa yok.', rot: 'Döndür', del: 'Sil', left: 'Öne al', cancel: 'Vazgeç', type: 'Belge türü', name: 'Dosya adı', toobig: 'Belge çok büyük; daha az sayfa ile tekrar deneyin.', bad: 'Görsel okunamadı.' },
  de: { title: 'Dokument scannen', add: 'Seite aufnehmen', hint: 'Dokument flach hinlegen, von oben und bei gutem Licht fotografieren. Für jede Seite erneut „Seite aufnehmen“ tippen.', mode_doc: 'Dokument (S/W)', mode_color: 'Farbe', save: 'Als PDF speichern', saving: 'PDF wird erstellt…', pages: 'Seiten', empty: 'Noch keine Seiten.', rot: 'Drehen', del: 'Löschen', left: 'Nach vorne', cancel: 'Abbrechen', type: 'Dokumentart', name: 'Dateiname', toobig: 'Dokument zu groß – bitte mit weniger Seiten erneut versuchen.', bad: 'Bild konnte nicht gelesen werden.' },
  en: { title: 'Scan document', add: 'Take / add page', hint: 'Lay the document flat and photograph it from above in good light. Tap "Take page" again for every page.', mode_doc: 'Document (B/W)', mode_color: 'Colour', save: 'Save as PDF', saving: 'Creating PDF…', pages: 'pages', empty: 'No pages yet.', rot: 'Rotate', del: 'Delete', left: 'Move forward', cancel: 'Cancel', type: 'Document type', name: 'File name', toobig: 'Document too large – please try again with fewer pages.', bad: 'Could not read the image.' },
};
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MAX_BYTES = 2.9 * 1024 * 1024;

const loadImg = (file) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
// one page → canvas (max 1800 px), optionally cleaned up as a document
function renderPage(p, maxSide) {
  const img = p.img; const rot = ((p.rot % 360) + 360) % 360; const sw = img.naturalWidth || img.width; const sh = img.naturalHeight || img.height;
  const k = Math.min(1, maxSide / Math.max(sw, sh)); const w = Math.round(sw * k); const h = Math.round(sh * k);
  const c = document.createElement('canvas'); const side = rot === 90 || rot === 270;
  c.width = side ? h : w; c.height = side ? w : h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.translate(c.width / 2, c.height / 2); g.rotate((rot * Math.PI) / 180); g.drawImage(img, -w / 2, -h / 2, w, h); g.setTransform(1, 0, 0, 1, 0, 0);
  if (p.mode === 'doc') {
    const d = g.getImageData(0, 0, c.width, c.height); const a = d.data; const hist = new Uint32Array(256);
    for (let i = 0; i < a.length; i += 4) { const y = (a[i] * 299 + a[i + 1] * 587 + a[i + 2] * 114) / 1000 | 0; a[i] = y; hist[y]++; }
    // levels: darkest 2 % → black, paper (≈ 60 % brightest point) → white, then a soft curve that keeps handwriting and stamps
    const n = a.length / 4; let acc = 0; let lo = 0; let hi = 255;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * 0.02) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * 0.4) { hi = v; break; } }
    if (hi - lo < 40) { lo = Math.max(0, hi - 120); }
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) { const x = Math.min(1, Math.max(0, (v - lo) / Math.max(1, (hi - lo) * 0.92))); lut[v] = Math.round(255 * Math.pow(x, 1.6)); }
    for (let i = 0; i < a.length; i += 4) { const y = lut[a[i]]; a[i] = a[i + 1] = a[i + 2] = y; }
    g.putImageData(d, 0, 0);
  }
  return c;
}
const b64ToBytes = (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const bytesToB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

// minimal PDF: one page per JPEG (DCTDecode), page size = A4 width, height from the image ratio
export function jpegsToPdf(pages) {
  const enc = new TextEncoder(); const parts = []; const offsets = []; let len = 0;
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[\u0080-ÿ]/g, 'x'));
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); for (const b of [].concat(body)) push(b); push('\nendobj\n'); };
  const N = pages.length; const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${N} >>`);
  pages.forEach((p, i) => {
    const pn = 3 + i * 3; const W = 595.28; const H = Math.round((W * p.h / p.w) * 100) / 100;
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(pn, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${pn + 1} 0 R >> >> /Contents ${pn + 2} 0 R >>`);
    obj(pn + 1, [`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`, p.bytes, '\nendstream']);
    obj(pn + 2, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  const xref = len; const count = 3 + N * 3;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len); let o = 0; for (const b of parts) { out.set(b, o); o += b.length; }
  return out;
}

async function buildPdf(pages) {
  // try decreasing quality / size until the PDF fits the upload limit
  for (const [side, q] of [[1800, 0.72], [1600, 0.62], [1400, 0.55], [1200, 0.5], [1000, 0.45]]) {
    const jp = pages.map((p) => { const c = renderPage(p, side); return { w: c.width, h: c.height, bytes: b64ToBytes(c.toDataURL('image/jpeg', q).split(',')[1]) }; });
    const pdf = jpegsToPdf(jp);
    if (pdf.length <= MAX_BYTES) return pdf;
  }
  return null;
}

/**
 * Opens the scanner. opts: { lang, types: [..], type, name, onSave: async ({ mime, data, name, doc_type, pages }) => {} }
 */
export function openScanner(opts = {}) {
  const L = T[opts.lang] || T.tr; const pages = [];
  document.querySelector('.scan-bg')?.remove();
  const bg = document.createElement('div'); bg.className = 'scan-bg';
  bg.innerHTML = `<div class="scan" role="dialog" aria-modal="true"><div class="scan-h"><b>📄 ${esc(opts.title || L.title)}</b><button type="button" class="scan-x" aria-label="${L.cancel}">✕</button></div>
    <div class="scan-b"><p class="scan-hint">${L.hint}</p>
    <div class="scan-row">${opts.types?.length ? `<label class="field"><span>${L.type}</span><select name="doc_type">${opts.types.map(([v, l]) => `<option value="${esc(v)}" ${v === opts.type ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>` : ''}
      <label class="field"><span>${L.name}</span><input name="name" value="${esc(opts.name || 'scan')}"></label></div>
    <div class="scan-modes"><label><input type="radio" name="mode" value="doc" checked> ${L.mode_doc}</label><label><input type="radio" name="mode" value="color"> ${L.mode_color}</label></div>
    <div class="scan-pages"></div>
    <div class="scan-acts"><label class="btn primary scan-add">📷 ${L.add}<input type="file" accept="image/*" capture="environment" hidden></label><label class="btn ghost scan-add2">🖼️<input type="file" accept="image/*" multiple hidden></label>
      <span class="grow"></span><button type="button" class="btn primary scan-save" disabled>${L.save}</button></div></div></div>`;
  document.body.appendChild(bg); setTimeout(() => bg.classList.add('show'), 10);
  const close = () => { bg.classList.remove('show'); setTimeout(() => bg.remove(), 200); pages.forEach((p) => URL.revokeObjectURL(p.img.src)); };
  bg.querySelector('.scan-x').onclick = close;
  const box = bg.querySelector('.scan-pages'); const save = bg.querySelector('.scan-save');
  const mode = () => bg.querySelector('input[name=mode]:checked').value;
  const draw = () => {
    box.innerHTML = pages.length ? pages.map((p, i) => `<figure class="scan-pg"><img src="${p.thumb}" alt=""><figcaption>${i + 1}</figcaption><div class="scan-pg-a">
      <button type="button" data-rot="${i}" title="${L.rot}">⟳</button>${i ? `<button type="button" data-left="${i}" title="${L.left}">◀</button>` : ''}<button type="button" data-del="${i}" title="${L.del}">✕</button></div></figure>`).join('') : `<p class="muted">${L.empty}</p>`;
    save.disabled = !pages.length; save.textContent = pages.length ? `${L.save} · ${pages.length} ${L.pages}` : L.save;
    box.querySelectorAll('[data-rot]').forEach((b) => (b.onclick = () => { const p = pages[b.dataset.rot]; p.rot += 90; p.thumb = renderPage(p, 360).toDataURL('image/jpeg', 0.7); draw(); }));
    box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { pages.splice(Number(b.dataset.del), 1); draw(); }));
    box.querySelectorAll('[data-left]').forEach((b) => (b.onclick = () => { const i = Number(b.dataset.left); [pages[i - 1], pages[i]] = [pages[i], pages[i - 1]]; draw(); }));
  };
  bg.querySelectorAll('input[name=mode]').forEach((r) => (r.onchange = () => { pages.forEach((p) => { p.mode = mode(); p.thumb = renderPage(p, 360).toDataURL('image/jpeg', 0.7); }); draw(); }));
  const add = async (files) => {
    for (const f of files) {
      try { const img = await loadImg(f); const p = { img, rot: 0, mode: mode() }; p.thumb = renderPage(p, 360).toDataURL('image/jpeg', 0.7); pages.push(p); }
      catch { (opts.toast || alert)(L.bad); }
    }
    draw();
  };
  bg.querySelectorAll('input[type=file]').forEach((inp) => (inp.onchange = async () => { const fs = [...inp.files]; inp.value = ''; await add(fs); }));
  save.onclick = async () => {
    save.disabled = true; const label = save.textContent; save.textContent = L.saving;
    try {
      const pdf = await buildPdf(pages); if (!pdf) throw new Error(L.toobig);
      const name = (bg.querySelector('[name=name]').value.trim() || 'scan').replace(/\.pdf$/i, '') + '.pdf';
      await opts.onSave?.({ mime: 'application/pdf', data: 'data:application/pdf;base64,' + bytesToB64(pdf), name, doc_type: bg.querySelector('[name=doc_type]')?.value, pages: pages.length, size: pdf.length });
      close();
    } catch (e) { (opts.toast || alert)(e.message, 'err'); save.disabled = false; save.textContent = label; }
  };
  draw();
  return { close };
}
