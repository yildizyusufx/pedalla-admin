// Online payment providers – the place where card / SEPA collection will be plugged in later.
//
// Today no provider is connected: riders pay by bank transfer (the rider screen shows IBAN, reference and a
// GiroCode QR that banking apps can scan) and staff record payments by hand or with the bank statement import.
//
// To connect a provider (e.g. Stripe, Mollie or GoCardless) later:
//   1. registerProvider('stripe', { label, createLink, parseWebhook }) in a small module imported by api/index.js / server.js,
//      reading its secret keys from environment variables (never from the database).
//   2. createLink(invoice, ctx) → { url, ref } : a hosted checkout / payment page for one invoice. The rider screen shows an
//      "Online bezahlen" button when an invoice has a pay_link.
//   3. parseWebhook({ body, headers }) → { invoice_no | ref, amount, paid: true|false, ref, method } after verifying the provider's
//      signature. POST /api/payments/webhook/<provider> then records the payment on the invoice (idempotent per ref).
//   4. Set "pay_provider" in Settings to the provider name.
// Nothing here pretends to take money: without a registered provider there are no payment links and the webhook answers 404.

const PROVIDERS = {};
export function registerProvider(name, impl) {
  if (!name || typeof impl?.createLink !== 'function' || typeof impl?.parseWebhook !== 'function') throw new Error('Provider needs createLink and parseWebhook.');
  PROVIDERS[name] = impl;
}
export const provider = (name) => (name && PROVIDERS[name]) || null;
export const providerNames = () => Object.keys(PROVIDERS);

// EPC QR code ("GiroCode") payload for a SEPA credit transfer – scanned by German/European banking apps.
// https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
export function epcPayload({ name, iban, bic = '', amount, reference }) {
  const clean = (s, n) => String(s || '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
  const ib = String(iban || '').replace(/\s+/g, '').toUpperCase();
  if (!ib || !name) return null;
  const amt = Number(amount) > 0 ? 'EUR' + (Math.round(Number(amount) * 100) / 100).toFixed(2) : '';
  return ['BCD', '002', '1', 'SCT', clean(bic, 11), clean(name, 70), ib, amt, '', '', clean(reference, 140), ''].join('\n');
}

// --- bank statement import: find invoice numbers and amounts in pasted CSV / text lines ---
const NUM_RE = /-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})(?!\d)|-?\d+(?:\.\d{2})(?!\d)|-?\d+,\d{2}(?!\d)/g;
export function parseAmount(s) {
  let x = String(s).replace(/\s/g, '');
  if (/,\d{2}$/.test(x)) x = x.replace(/\./g, '').replace(',', '.');
  else x = x.replace(/,/g, '');
  const n = Number(x); return Number.isFinite(n) ? n : null;
}
export function parseDate(line) {
  let m = line.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/); if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = line.match(/\b(\d{2})\.(\d{2})\.(\d{2})\b/); if (m) return `20${m[3]}-${m[2]}-${m[1]}`;
  m = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
// all money amounts in a line (positive only: incoming payments)
export function amountsIn(line) {
  const noDates = line.replace(/\b\d{2}\.\d{2}\.\d{2,4}\b/g, ' ').replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ').replace(/[A-Z]{2}\d{2}[A-Z0-9 ]{10,30}/g, ' ');
  return (noDates.match(NUM_RE) || []).map(parseAmount).filter((n) => n != null && n > 0);
}
// small stable hash so the same statement line is never booked twice
export function lineHash(s) {
  let h = 0x811c9dc5; const str = String(s).replace(/\s+/g, ' ').trim();
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36) + ':' + str.length;
}
