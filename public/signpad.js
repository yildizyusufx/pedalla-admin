// Finger / mouse signature pad (hand-over protocols, contract e-signature). value() → PNG data URL on white, or null when empty.
export function signPad(el) {
  const c = el.querySelector('canvas'); const ctx = c.getContext('2d'); let drawing = false; let dirty = false;
  const fit = () => { const r = c.getBoundingClientRect(); const k = window.devicePixelRatio || 1; c.width = Math.round(r.width * k); c.height = Math.round(r.height * k); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111'; dirty = false; };
  const pos = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  c.addEventListener('pointerdown', (e) => { drawing = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); e.preventDefault(); });
  c.addEventListener('pointermove', (e) => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); dirty = true; e.preventDefault(); });
  const end = () => { drawing = false; }; c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  el.querySelector('[data-clear]').onclick = () => { ctx.clearRect(0, 0, c.width, c.height); dirty = false; };
  setTimeout(fit, 30);
  // white background so the signature also prints on dark paper settings; scaled down to keep the upload small
  return {
    value: () => {
      if (!dirty) return null;
      const k = Math.min(1, 900 / c.width); const o = document.createElement('canvas'); o.width = Math.round(c.width * k); o.height = Math.round(c.height * k);
      const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/png');
    },
  };
}
export const padHtml = (name, label, clear = 'Temizle') => `<div class="sigpad" data-pad="${name}"><span class="lbl">${label}</span><canvas></canvas><button type="button" class="btn xs ghost" data-clear>${clear}</button></div>`;
