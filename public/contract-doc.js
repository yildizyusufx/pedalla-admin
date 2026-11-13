// Printable rental agreement (Mietvertrag) in German or English – used by the panel (print / PDF) and the rider screen
// (read + sign). Electronic signatures are drawn into the signature boxes, with the evidence listed below.
import { docT, tv, dMoney, dNum, dDate, dDateTime } from './docs-i18n.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dl = (pairs) => `<dl class="dl">${pairs.filter(Boolean).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v ?? '—'}</dd>`).join('')}</dl>`;
const termsFor = (s, key, lang) => s[`${key}_${lang}`] || s[key] || '';

// latest signature per role that still matches the current contract
export function validSigns(r) {
  const out = {}; for (const x of r.signs || []) if (x.valid) out[x.role] = x;
  return out;
}

export function contractHtml(r, s, lang = 'de', { header = '' } = {}) {
  const c = r.customer || {}; const rd = r.rider || {}; const t = docT(lang);
  const M = (v) => dMoney(lang, v); const D = (v) => dDate(lang, v);
  const vat = Number(s.vat_rate) || 0;
  const sg = validSigns(r); const individual = c.type === 'bireysel';
  const renterSign = sg['kiracı'] || (individual ? sg['sürücü'] : null);
  const box = (label, name, x) => `<div class="${x ? 'signed' : ''}"><b>${x ? `<img src="${x.sign}" alt="">` : ''}</b><span>${label} · ${esc(name || '')}${x ? `<br><small>${t.esign_at} ${dDateTime(lang, x.created_at)}</small>` : ''}</span></div>`;
  const ins = r.insurance_plan ? [t.insurance, `${esc(r.insurance_plan)} · ${Number(r.insurance_fee) > 0 ? `${M(r.insurance_fee)} ${t.per} ${esc(tv(lang, r.period))} ${t.plus_vat}` : t.insurance_incl}${r.insurance_deductible != null ? ` · ${t.deductible}: ${M(r.insurance_deductible)}` : ''}`] : null;
  const ch = (x) => (/sürücü/.test(x.channel || '') ? t.ch_portal : t.ch_panel);
  const evidence = (r.signs || []).filter((x) => x.sign);
  return `<div class="doc">${header || `<h2 class="doc-title">${t.contract} <small>${esc(r.contract_no)}</small></h2>`}
    <div class="doc-2"><div><h3>${t.lessor}</h3>${dl([[t.company, esc(s.company_name)], [t.address, esc(s.company_address)], [t.phone, esc(s.company_phone)], [t.email, esc(s.company_email)], s.company_tax_no ? [t.vat_id, esc(s.company_tax_no)] : null])}</div>
    <div><h3>${t.renter}</h3>${dl([[t.customer, esc(c.company_name || c.name)], c.company_name ? [t.contact, esc(c.name)] : null, [t.address, esc(c.address)], [c.company_name ? t.tax_no : t.id_no, esc(c.tax_no || c.id_no)], [t.phone, esc(c.phone)], [t.email, esc(c.email)]])}</div></div>
    <h3>${t.rider_h}</h3>
    <div class="doc-2">${dl([[t.name, esc(rd.name)], [t.birth, D(rd.birth_date)], [t.nationality, esc(rd.nationality)], [t.phone, esc(rd.phone)]])}
    ${dl([[t.id_type, esc(tv(lang, rd.id_type))], [t.id_number, esc(rd.id_no)], [t.valid_until, D(rd.id_expiry)], [t.license, esc(rd.license_no)], [t.address, esc(rd.address)]])}</div>
    <p class="small" style="margin-top:6px">${rd.id_checked ? '☒' : '☐'} ${t.id_seen}</p>
    <h3>${t.bike_h}</h3>
    <div class="doc-2">${dl([[t.fleet_code, esc(r.bike?.code)], [t.make_model, `${esc(r.bike?.brand)} ${esc(r.bike?.model)}`], [t.type, esc(tv(lang, r.bike?.type))], [t.frame_no, esc(r.bike?.frame_no)], [t.battery_no, esc(r.bike?.battery_no)]])}
    ${dl([[t.handover_date, D(r.start_date)], [t.handover_km, dNum(lang, r.start_km)], [t.battery, r.start_battery != null ? r.start_battery + ' %' : '—'], [t.accessories, esc(r.accessories)]])}</div>
    <h3>${t.terms_h}</h3>${dl([[t.period, `${D(r.start_date)} – ${D(r.end_date)}`], [t.fee, `${M(r.rate)} ${t.per} ${esc(tv(lang, r.period))} ${t.plus_vat} ${vat} % (${t.gross} ${M(r.rate * (1 + vat / 100))})`], ins, [t.deposit, `${M(r.deposit_amount)}${r.deposit_status === 'alındı' ? ' · ' + t.deposit_paid : ''}`], [t.payment_terms, `${esc(s.payment_terms_days)} ${t.days_from_invoice}`], [t.late_return, `${M(s.late_return_fee_per_day)} ${t.per_day}`], [t.late_payment, `${M(s.late_fee_per_day)} ${t.per_day}`]])}
    <p class="small">${esc(termsFor(s, 'contract_terms', lang))}</p>
    <h3>${t.protocol_h}</h3><p class="small">${t.protocol}</p><div class="box" style="min-height:40px">${esc(r.notes || '')}</div>
    <div class="sign three">${box(`${t.sign_lessor} · ${esc(s.company_name)}`, sg['kiraya veren']?.name, sg['kiraya veren'])}${box(t.sign_renter, renterSign?.name || c.company_name || c.name, renterSign)}${box(t.sign_rider, sg['sürücü']?.name || rd.name, sg['sürücü'])}</div>
    ${evidence.length ? `<div class="esign-ev"><h3>${t.esign_h}</h3><p class="small">${t.esign_note}</p><table class="small"><tbody>${evidence.map((x) => `<tr class="${x.valid ? '' : 'stale'}"><td><b>${esc(x.name)}</b></td><td>${dDateTime(lang, x.created_at)}</td><td>${t.esign_via} ${ch(x)}</td><td>${x.ip ? `${t.esign_ip} ${esc(x.ip)}` : ''}</td><td class="mono">${esc(String(x.doc_hash || '').slice(0, 16))}…</td></tr>${x.valid ? '' : `<tr class="stale"><td colspan="5">${t.esign_changed}</td></tr>`}`).join('')}</tbody></table>
      ${r.sign_state?.hash ? `<p class="small muted">${t.esign_hash}: <span class="mono">${esc(r.sign_state.hash)}</span></p>` : ''}</div>` : `<div class="doc-2" style="margin-top:18px"><div class="fill"><span>${t.place_date}</span><i></i></div><div></div></div>`}</div>`;
}
