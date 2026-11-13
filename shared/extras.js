// Pedalla – features added in Nov 2026 on top of the API core (shared/api.js):
//   • electronic contract signature (rider screen + office tablet) with evidence (time, IP, device, SHA-256 of the signed terms)
//   • referral programme (codes, credits taken off the next rent invoices)
//   • review request (Google) in the rider screen / phone app
//   • SEPA direct debit: mandates in the rider screen + pain.008 collection file for the bank (no payment provider needed)
//   • insurance packages, GPS tracker adapters (Traccar, OsmAnd)
//   • privacy / GDPR: data export for riders, deletion request, anonymising, retention of pick-up selfies
//   • backup: the whole database as JSON, in chunks (Vercel answers at most ~4.5 MB per request)
// createApi() builds this with its own helpers (ctx) and calls the hooks from its routes.
import { insurancePlans, CONSENT_VERSION } from './meta.js';
import { idProvider } from './idcheck.js';

const SIGN_ROLES = ['sürücü', 'kiracı', 'kiraya veren'];
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
export async function sha256(text) { return hex(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)))); }
const rnd = (n, abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(n)), (x) => abc[x % abc.length]).join('');

// ---------- IBAN ----------
export function ibanValid(iban) {
  const s = String(iban || '').replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  if (s.startsWith('DE') && s.length !== 22) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let m = 0; for (const ch of r) m = (m * 10 + Number(ch)) % 97;
  return m === 1;
}
export const maskIban = (iban) => { const s = String(iban || '').replace(/\s+/g, ''); return s ? `${s.slice(0, 4)} •••• •••• ${s.slice(-4)}` : ''; };
// SEPA files allow only a small Latin character set
const sepaTxt = (s, n = 70) => String(s ?? '').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[çÇ]/g, 'c').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9 /?:().,'+-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// pain.008.001.08 (SEPA Core direct debit), IBAN only (BIC "NOTPROVIDED"), one payment block per sequence type
export function sepaXml({ msgId, created, creditor, creditorIban, creditorId, collectionDate, items }) {
  const sum = (l) => l.reduce((a, x) => a + Math.round(x.amount * 100), 0) / 100;
  const groups = ['FRST', 'RCUR'].map((seq) => [seq, items.filter((x) => x.seq === seq)]).filter(([, l]) => l.length);
  const tx = (x) => `
      <DrctDbtTxInf>
        <PmtId><EndToEndId>${xmlEsc(sepaTxt(x.e2e, 35))}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${x.amount.toFixed(2)}</InstdAmt>
        <DrctDbtTx><MndtRltdInf><MndtId>${xmlEsc(sepaTxt(x.mandateRef, 35))}</MndtId><DtOfSgntr>${x.mandateDate}</DtOfSgntr></MndtRltdInf></DrctDbtTx>
        <DbtrAgt><FinInstnId>${x.bic ? `<BICFI>${xmlEsc(x.bic)}</BICFI>` : '<Othr><Id>NOTPROVIDED</Id></Othr>'}</FinInstnId></DbtrAgt>
        <Dbtr><Nm>${xmlEsc(sepaTxt(x.debtor, 70))}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${x.iban}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${xmlEsc(sepaTxt(x.text, 140))}</Ustrd></RmtInf>
      </DrctDbtTxInf>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${xmlEsc(msgId)}</MsgId><CreDtTm>${created}</CreDtTm><NbOfTxs>${items.length}</NbOfTxs><CtrlSum>${sum(items).toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${xmlEsc(sepaTxt(creditor))}</Nm></InitgPty>
    </GrpHdr>${groups.map(([seq, l], i) => `
    <PmtInf>
      <PmtInfId>${xmlEsc(`${msgId}-${i + 1}`)}</PmtInfId><PmtMtd>DD</PmtMtd><BtchBookg>true</BtchBookg><NbOfTxs>${l.length}</NbOfTxs><CtrlSum>${sum(l).toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>${seq}</SeqTp></PmtTpInf>
      <ReqdColltnDt>${collectionDate}</ReqdColltnDt>
      <Cdtr><Nm>${xmlEsc(sepaTxt(creditor))}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${creditorIban}</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId><Id><PrvtId><Othr><Id>${xmlEsc(creditorId)}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>${l.map(tx).join('')}
    </PmtInf>`).join('')}
  </CstmrDrctDbtInitn>
</Document>
`;
}

// mandate text shown in the rider screen and printed with the evidence (German is the legally relevant version)
export const MANDATE_TEXT = {
  de: (c, id, ref) => `SEPA-Lastschriftmandat. Ich ermächtige ${c} (Gläubiger-ID ${id || '—'}), Zahlungen von meinem Konto mittels Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die von ${c} auf mein Konto gezogenen Lastschriften einzulösen. Mandatsreferenz: ${ref}. Hinweis: Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung des belasteten Betrages verlangen. Es gelten dabei die mit meinem Kreditinstitut vereinbarten Bedingungen. Die Frist für die Vorabankündigung (Pre-Notification) wird auf einen Tag verkürzt.`,
  en: (c, id, ref) => `SEPA Direct Debit Mandate. By signing this mandate, I authorise ${c} (creditor ID ${id || '—'}) to send instructions to my bank to debit my account and my bank to debit my account in accordance with the instructions from ${c}. Mandate reference: ${ref}. I am entitled to a refund from my bank under the terms and conditions of my agreement with my bank; a refund must be claimed within eight weeks starting from the date on which my account was debited. The pre-notification period is reduced to one day.`,
};

export function createExtras(x) {
  const { db, err, setting, settings, getOne, audit, notifyRider, nowTs, today, addDays, daysBetween, r2, can, need, listDocuments, recalcInvoice, addPayment, backupToken } = x;
  const reqInfo = (h = {}) => ({ ip: String(h['x-forwarded-for'] || h['x-real-ip'] || h['x-client-ip'] || '').split(',')[0].trim().slice(0, 64) || null, ua: String(h['user-agent'] || '').slice(0, 300) || null });

  // ================= electronic contract signature =================
  // The signed content is described by "facts" (parties, bike, dates, money, terms). Its SHA-256 is stored with each signature,
  // so a later change of the rental (price, dates, terms) is visible: the contract then has to be signed again.
  async function contractFacts(rentalId, lang) {
    const r = await db.get(`SELECT x.*, b.code AS bike_code, b.brand, b.model, b.frame_no, b.battery_no, b.type AS bike_type,
        c.name AS c_name, c.company_name, c.address AS c_address, c.tax_no, c.id_no AS c_id_no, c.type AS c_type, c.doc_lang,
        rd.name AS rd_name, rd.id_type, rd.id_no, rd.birth_date, rd.address AS rd_address
      FROM rentals x JOIN bikes b ON b.id=x.bike_id JOIN customers c ON c.id=x.customer_id LEFT JOIN riders rd ON rd.id=x.rider_id WHERE x.id=?`, [rentalId]);
    if (!r) err(404, 'Kiralama bulunamadı.');
    const L = ['de', 'en'].includes(lang) ? lang : (['de', 'en'].includes(r.doc_lang) ? r.doc_lang : 'de');
    return {
      lang: L, facts: {
        contract: r.contract_no, lessor: setting('company_name'), lessor_address: setting('company_address'),
        renter: r.company_name || r.c_name, renter_address: r.c_address, renter_id: r.tax_no || r.c_id_no || null,
        rider: r.rd_name, rider_id: [r.id_type, r.id_no].filter(Boolean).join(' '), rider_birth: r.birth_date, rider_address: r.rd_address,
        bike: [r.bike_code, r.brand, r.model, r.frame_no].filter(Boolean).join(' · '), start: r.start_date, end: r.end_date, period: r.period,
        rate: r2(r.rate), vat: Number(setting('vat_rate')) || 0, deposit: r2(r.deposit_amount), insurance: r.insurance_plan || null, insurance_fee: r2(r.insurance_fee || 0),
        deductible: r.insurance_deductible ?? null, payment_terms_days: setting('payment_terms_days'), late_return_fee: setting('late_return_fee_per_day'), late_fee: setting('late_fee_per_day'),
        terms: setting(`contract_terms_${L}`) || setting('contract_terms') || '',
      }, rental: r,
    };
  }
  const factsHash = async (facts) => sha256(JSON.stringify(facts));
  async function signList(rentalId, withImages = true) {
    return db.all(`SELECT s.id, s.role, s.name, ${withImages ? 's.sign,' : ''} s.channel, s.doc_hash, s.doc_lang, s.ip, s.ua, s.rider_id, s.user_id, s.created_at, u.name AS user_name
      FROM contract_signs s LEFT JOIN users u ON u.id=s.user_id WHERE s.rental_id=? ORDER BY s.id`, [rentalId]);
  }
  // state of a rental's signatures: latest per role, whether it still matches the current contract, complete or not
  async function signState(rentalId) {
    const { facts, lang, rental } = await contractFacts(rentalId);
    const hash = await factsHash(facts);
    const all = await signList(rentalId);
    const latest = {}; for (const s of all) latest[s.role] = s;
    for (const s of Object.values(latest)) {
      // a signature made in the other document language is checked against that language's terms
      s.valid = s.doc_hash === (s.doc_lang && s.doc_lang !== lang ? await factsHash((await contractFacts(rentalId, s.doc_lang)).facts) : hash);
    }
    const individual = rental.c_type === 'bireysel';
    const riderOk = !!latest['sürücü']?.valid; const renterOk = individual ? riderOk : !!latest['kiracı']?.valid;
    return { hash, lang, signs: all, latest, individual, rider_ok: riderOk, renter_ok: renterOk, complete: riderOk && renterOk, changed: Object.values(latest).some((s) => !s.valid) };
  }
  const signPng = (d) => { if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(String(d || '')) || String(d).length > 400000) err(400, 'İmza okunamadı, tekrar imzalayın.'); return String(d); };
  async function signContract(rentalId, { role, name, sign, channel, lang, rider_id = null, user = null, headers = {} }) {
    if (!SIGN_ROLES.includes(role)) err(400, 'Geçersiz imza rolü.');
    const r = await db.get('SELECT * FROM rentals WHERE id=?', [rentalId]) || err(404, 'Kiralama bulunamadı.');
    if (!['rezervasyon', 'aktif'].includes(r.status)) err(409, 'Sadece rezervasyon veya aktif kiralamalar imzalanabilir.');
    const { facts, lang: L } = await contractFacts(rentalId, lang);
    if (role !== 'kiraya veren' && !facts.rider) err(400, 'Önce kiralamaya sürücüyü (teslim alan kişi) ekleyin.');
    const nm = String(name || '').trim().slice(0, 120); if (nm.length < 3) err(400, 'İmzalayan kişinin adını yazın.');
    const { ip, ua } = reqInfo(headers);
    const hash = await factsHash(facts);
    const x = await db.run('INSERT INTO contract_signs(rental_id,role,name,sign,channel,doc_hash,doc_lang,facts,ip,ua,rider_id,user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [rentalId, role, nm, signPng(sign), channel, hash, L, JSON.stringify(facts), ip, ua, rider_id, user?.id ?? null, nowTs()]);
    const st = await signState(rentalId);
    await db.run('UPDATE rentals SET signed_at=? WHERE id=?', [st.complete ? (r.signed_at && !st.changed ? r.signed_at : nowTs()) : null, rentalId]);
    await audit(user || { id: null }, 'e-imza', 'rentals', rentalId, `${r.contract_no} · ${role} · ${nm} · ${channel} · ${hash.slice(0, 12)}`);
    return { id: x.lastId, state: st };
  }
  // ask the rider to sign when a rental with a rider and a rider-screen login is created
  async function askToSign(rentalId) {
    if (setting('esign') === '0') return;
    const r = await db.get("SELECT x.id, x.rider_id, x.contract_no, rd.portal_active FROM rentals x JOIN riders rd ON rd.id=x.rider_id WHERE x.id=? AND x.status IN ('rezervasyon','aktif')", [rentalId]);
    if (r?.portal_active) await notifyRider(r.rider_id, 'contract_sign', { no: r.contract_no }, { link: 'home', level: 'warn', dedupe: `sign:${rentalId}` });
  }
  // contract data for the rider screen (same shape the panel uses to draw the printable contract)
  async function contractView(rentalId) {
    const r = await db.get('SELECT * FROM rentals WHERE id=?', [rentalId]) || err(404, 'Kiralama bulunamadı.');
    r.customer = await db.get('SELECT id,type,name,company_name,address,tax_no,id_no,phone,email,doc_lang FROM customers WHERE id=?', [r.customer_id]);
    r.rider = r.rider_id ? await db.get('SELECT id,name,phone,birth_date,nationality,id_type,id_no,id_expiry,license_no,address,id_checked FROM riders WHERE id=?', [r.rider_id]) : null;
    r.bike = await db.get('SELECT id,code,brand,model,type,frame_no,battery_no FROM bikes WHERE id=?', [r.bike_id]);
    const st = await signState(rentalId);
    r.signs = st.signs.map((s) => ({ ...s, valid: st.latest[s.role]?.id === s.id ? st.latest[s.role].valid : false }));
    r.sign_state = { complete: st.complete, rider_ok: st.rider_ok, renter_ok: st.renter_ok, individual: st.individual, changed: st.changed, hash: st.hash, lang: st.lang };
    return r;
  }
  const docSettings = () => Object.fromEntries(['company_name', 'company_address', 'company_phone', 'company_email', 'company_tax_no', 'vat_rate', 'payment_terms_days', 'late_return_fee_per_day', 'late_fee_per_day',
    'contract_terms', 'contract_terms_de', 'contract_terms_en'].map((k) => [k, setting(k)]));

  // ================= referral programme =================
  const refOn = () => setting('referral_on') !== '0';
  async function refCode(rider) {
    if (rider.ref_code) return rider.ref_code;
    const base = String(rider.name || 'PDL').split(/\s+/)[0].normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 5) || 'PDL';
    for (let i = 0; i < 8; i++) {
      const code = base + rnd(3, '23456789');
      if (!await db.get('SELECT 1 FROM riders WHERE ref_code=?', [code])) { await db.run('UPDATE riders SET ref_code=? WHERE id=?', [code, rider.id]); return code; }
    }
    const code = rnd(8); await db.run('UPDATE riders SET ref_code=? WHERE id=?', [code, rider.id]); return code;
  }
  async function addCredit({ customer_id, rider_id = null, amount, reason, referral_id = null }, user) {
    const a = r2(amount); if (!(a > 0)) return null;
    const x = await db.run('INSERT INTO credits(customer_id,rider_id,amount,left_amount,reason,referral_id,user_id,created_at) VALUES(?,?,?,?,?,?,?,?)', [customer_id, rider_id, a, a, String(reason || '').slice(0, 200), referral_id, user?.id ?? null, nowTs()]);
    return x.lastId;
  }
  // at sign-up: link the new rider to the one who invited them; the friend's welcome discount is booked as credit right away
  async function applyReferral(newRider, code) {
    if (!refOn() || !code) return null;
    const ref = await db.get('SELECT id, name, customer_id FROM riders WHERE upper(ref_code)=? AND id<>? AND active=1', [String(code).trim().toUpperCase().slice(0, 20), newRider.id]);
    if (!ref) return null;
    const reward = Number(setting('referral_reward')) || 0; const friend = Number(setting('referral_friend_reward')) || 0;
    const x = await db.run('INSERT OR IGNORE INTO referrals(referrer_id,referred_id,status,reward,friend_reward,created_at) VALUES(?,?,?,?,?,?)', [ref.id, newRider.id, 'bekliyor', reward, friend, nowTs()]);
    if (!x.changes) return null;
    await db.run('UPDATE riders SET referred_by=? WHERE id=?', [ref.id, newRider.id]);
    if (friend > 0 && newRider.customer_id) await addCredit({ customer_id: newRider.customer_id, rider_id: newRider.id, amount: friend, reason: `Tavsiye indirimi (${ref.name} davet etti)`, referral_id: x.lastId });
    await audit({ id: null }, 'tavsiye', 'riders', newRider.id, `${ref.name} → ${newRider.name}`);
    return x.lastId;
  }
  // a referral is earned once the friend has paid a rent invoice; the inviter's reward becomes credit (individual) or is noted for payout (company rider)
  async function checkReferrals() {
    if (!refOn()) return 0;
    let n = 0;
    for (const q of await db.all(`SELECT f.*, a.name AS ref_name, a.customer_id AS ref_cust, c.type AS ref_type, b.name AS friend_name FROM referrals f
        JOIN riders a ON a.id=f.referrer_id JOIN riders b ON b.id=f.referred_id LEFT JOIN customers c ON c.id=a.customer_id
        WHERE f.status='bekliyor' AND EXISTS (SELECT 1 FROM invoices i JOIN rentals x ON x.id=i.rental_id WHERE x.rider_id=f.referred_id AND i.status='ödendi' AND i.period_start IS NOT NULL)`)) {
      let note = null;
      if (q.reward > 0 && q.ref_cust && q.ref_type === 'bireysel') await addCredit({ customer_id: q.ref_cust, rider_id: q.referrer_id, amount: q.reward, reason: `Tavsiye ödülü: ${q.friend_name}`, referral_id: q.id });
      else if (q.reward > 0) note = 'Davet eden firma sürücüsü: ödül elden / manuel verilecek';
      await db.run("UPDATE referrals SET status='kazanıldı', earned_at=?, note=COALESCE(?,note) WHERE id=?", [nowTs(), note, q.id]);
      await notifyRider(q.referrer_id, 'referral_earned', { name: String(q.friend_name || '').split(' ')[0], amount: q.reward }, { link: 'me', level: 'ok', dedupe: `ref_earned:${q.id}` });
      await audit({ id: null }, 'tavsiye ödülü', 'riders', q.referrer_id, `${q.ref_name}: ${q.friend_name} ilk ödemesini yaptı · ${q.reward} €${note ? ' · ' + note : ''}`);
      n++;
    }
    return n;
  }
  const creditLeft = async (customerId) => r2((await db.get('SELECT COALESCE(SUM(left_amount),0) AS s FROM credits WHERE customer_id=?', [customerId]))?.s);
  // takes open credits off a (rent period) invoice: lowers its net amount and notes the discount in the description
  async function applyCredits(invoiceId) {
    const inv = await db.get('SELECT * FROM invoices WHERE id=?', [invoiceId]); if (!inv || inv.net <= 0) return 0;
    let room = r2(inv.net); let used = 0;
    for (const c of await db.all('SELECT * FROM credits WHERE customer_id=? AND left_amount > 0.004 ORDER BY id', [inv.customer_id])) {
      if (room <= 0) break;
      const take = r2(Math.min(room, c.left_amount));
      await db.run('UPDATE credits SET left_amount=? WHERE id=?', [r2(c.left_amount - take), c.id]);
      await db.run('INSERT INTO credit_uses(credit_id,invoice_id,amount,created_at) VALUES(?,?,?,?)', [c.id, inv.id, take, nowTs()]);
      room = r2(room - take); used = r2(used + take);
    }
    if (used > 0) {
      await db.run('UPDATE invoices SET net=?, description=? WHERE id=?', [r2(inv.net - used), `${inv.description} · Rabatt/Gutschrift −${used.toFixed(2)} € (netto)`.slice(0, 300), inv.id]);
      await recalcInvoice(inv.id);
    }
    return used;
  }
  async function referralInfo(r) {
    if (!refOn()) return null;
    const code = await refCode(r);
    const rows = await db.all('SELECT f.status, f.created_at, f.earned_at, f.reward, rd.name FROM referrals f JOIN riders rd ON rd.id=f.referred_id WHERE f.referrer_id=? ORDER BY f.id DESC LIMIT 30', [r.id]);
    const site = String(setting('site_url') || '').replace(/\/+$/, '');
    return {
      code, link: site ? `${site}/?ref=${code}` : null, reward: Number(setting('referral_reward')) || 0, friend_reward: Number(setting('referral_friend_reward')) || 0,
      invited: rows.length, earned: rows.filter((q) => q.status === 'kazanıldı').length, credit: r.customer_id ? await creditLeft(r.customer_id) : 0,
      friends: rows.map((q) => ({ name: String(q.name || '').split(' ')[0], status: q.status, date: q.earned_at || q.created_at })),
    };
  }

  // ================= insurance =================
  const plans = () => insurancePlans(settings());
  const planFor = (name) => plans().find((p) => p.name === name) || null;

  // ================= SEPA direct debit =================
  const sepaOn = () => setting('sepa_on') === '1';
  async function activeMandate(customerId) { return db.get("SELECT * FROM sepa_mandates WHERE customer_id=? AND status='aktif' ORDER BY id DESC LIMIT 1", [customerId]); }
  async function createMandate({ customer_id, rider_id = null, holder, iban, bic = null, signed_at = null, headers = {} }, user) {
    const ib = String(iban || '').replace(/\s+/g, '').toUpperCase();
    if (!ibanValid(ib)) err(400, 'IBAN geçersiz, lütfen kontrol edin.');
    const h = String(holder || '').trim().slice(0, 70); if (h.length < 3) err(400, 'Hesap sahibinin adını yazın.');
    const bc = String(bic || '').replace(/\s+/g, '').toUpperCase(); if (bc && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bc)) err(400, 'BIC geçersiz.');
    const { ip, ua } = reqInfo(headers);
    const now = nowTs();
    await db.run("UPDATE sepa_mandates SET status='iptal', revoked_at=? WHERE customer_id=? AND status='aktif'", [now, customer_id]);
    const ref = `PDL${String(customer_id).padStart(5, '0')}${rnd(5, '0123456789')}`;
    const x = await db.run('INSERT INTO sepa_mandates(customer_id,rider_id,holder,iban,bic,mandate_ref,signed_at,ip,ua,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [customer_id, rider_id, h, ib, bc || null, ref, signed_at || now, ip, ua, 'aktif', now]);
    await db.run("UPDATE rentals SET pay_method='SEPA otomatik ödeme' WHERE customer_id=? AND status IN ('aktif','rezervasyon')", [customer_id]);
    await audit(user || { id: null }, 'SEPA yetkisi', 'customers', customer_id, `${ref} · ${maskIban(ib)} · ${h}`);
    return db.get('SELECT * FROM sepa_mandates WHERE id=?', [x.lastId]);
  }
  async function revokeMandate(customerId, user) {
    const m = await activeMandate(customerId); if (!m) return null;
    await db.run("UPDATE sepa_mandates SET status='iptal', revoked_at=? WHERE id=?", [nowTs(), m.id]);
    await db.run("UPDATE rentals SET pay_method='banka havalesi' WHERE customer_id=? AND status IN ('aktif','rezervasyon') AND pay_method='SEPA otomatik ödeme'", [customerId]);
    await audit(user || { id: null }, 'SEPA yetkisi iptal', 'customers', customerId, m.mandate_ref);
    return m;
  }
  // open invoices that can go into a collection file: customer has an active mandate, due by the collection date, not already in an open file
  async function sepaCandidates(collectionDate) {
    return db.all(`SELECT i.id, i.invoice_no, i.due_date, i.description, ROUND(i.total + i.late_fee - i.paid_amount, 2) AS balance, i.customer_id, COALESCE(c.company_name, c.name) AS customer_label,
        m.id AS mandate_id, m.mandate_ref, m.holder, m.iban, m.bic, m.signed_at, m.first_used_at
      FROM invoices i JOIN customers c ON c.id=i.customer_id JOIN sepa_mandates m ON m.customer_id=i.customer_id AND m.status='aktif'
      WHERE i.status IN ('açık','kısmi') AND i.due_date <= ? AND (i.pay_provider IS NULL OR i.pay_provider<>'sepa' OR i.pay_ref IS NULL)
        AND (i.total + i.late_fee - i.paid_amount) > 0.004 ORDER BY i.due_date, i.id`, [collectionDate]);
  }
  async function sepaCreate(b, user) {
    if (!setting('sepa_creditor_id')) err(400, 'Önce Ayarlar → SEPA bölümüne Gläubiger-ID (alacaklı kimlik no) girin.');
    if (!ibanValid(setting('company_iban'))) err(400, 'Önce Ayarlar → Şirket bölümüne geçerli şirket IBAN\'ı girin.');
    const lead = Math.max(1, Number(setting('sepa_lead_days')) || 5);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.collection_date || '')) ? b.collection_date : addDays(today(), lead);
    if (date < addDays(today(), 1)) err(400, 'Tahsil tarihi en erken yarın olabilir.');
    const ids = new Set((b.invoice_ids || []).map(Number));
    const rows = (await sepaCandidates(date)).filter((r) => !ids.size || ids.has(r.id));
    if (!rows.length) err(400, 'Bu tarih için SEPA ile çekilecek açık fatura yok.');
    const msgId = `PDL-${today().replace(/-/g, '')}-${rnd(6, '0123456789')}`;
    const items = rows.map((r) => ({ invoice_id: r.id, e2e: r.invoice_no, amount: r2(r.balance), mandateRef: r.mandate_ref, mandateDate: String(r.signed_at).slice(0, 10), seq: r.first_used_at ? 'RCUR' : 'FRST',
      debtor: r.holder, iban: r.iban, bic: r.bic, text: `${setting('company_name')} Rechnung ${r.invoice_no}`, mandate_id: r.mandate_id, customer_id: r.customer_id }));
    const total = r2(items.reduce((a, i) => a + i.amount, 0));
    const x = await db.run('INSERT INTO sepa_batches(msg_id,collection_date,count,total,items,status,user_id,created_at) VALUES(?,?,?,?,?,?,?,?)', [msgId, date, items.length, total, JSON.stringify(items), 'oluşturuldu', user?.id ?? null, nowTs()]);
    for (const it of items) {
      await db.run("UPDATE invoices SET pay_provider='sepa', pay_ref=? WHERE id=?", [`SEPA:${x.lastId}`, it.invoice_id]);
      await db.run('UPDATE sepa_mandates SET first_used_at=COALESCE(first_used_at, ?) WHERE id=?', [nowTs(), it.mandate_id]);
      // pre-notification to the rider (individual customers)
      const rd = await db.get("SELECT rd.id FROM riders rd JOIN customers c ON c.id=rd.customer_id WHERE c.id=? AND c.type='bireysel' ORDER BY rd.id LIMIT 1", [it.customer_id]);
      if (rd) await notifyRider(rd.id, 'sepa_prenote', { no: it.e2e, amount: it.amount, date, ref: it.mandateRef }, { link: 'pay', level: 'info', dedupe: `sepa:${x.lastId}:${it.invoice_id}` });
    }
    await audit(user, 'SEPA dosyası', 'sepa_batches', x.lastId, `${msgId} · ${items.length} fatura · ${total} € · ${date}`);
    return { ...(await sepaBatch(x.lastId)), xml: await sepaBatchXml(x.lastId) };
  }
  async function sepaBatch(id) { const b = await db.get('SELECT * FROM sepa_batches WHERE id=?', [id]) || err(404, 'SEPA dosyası bulunamadı.'); b.items = JSON.parse(b.items || '[]'); return b; }
  async function sepaBatchXml(id) {
    const b = await sepaBatch(id);
    return sepaXml({ msgId: b.msg_id, created: b.created_at.replace(' ', 'T'), creditor: setting('company_name'), creditorIban: String(setting('company_iban') || '').replace(/\s+/g, '').toUpperCase(), creditorId: setting('sepa_creditor_id'), collectionDate: b.collection_date, items: b.items });
  }
  async function sepaSettle(id, b, user) {
    const bt = await sepaBatch(id); if (bt.status !== 'oluşturuldu') err(409, 'Bu dosya zaten kapatıldı.');
    const failed = new Set((b.failed_ids || []).map(Number)); let paid = 0;
    for (const it of bt.items) {
      const inv = await db.get('SELECT * FROM invoices WHERE id=?', [it.invoice_id]); if (!inv) continue;
      await db.run('UPDATE invoices SET pay_ref=NULL, pay_provider=NULL WHERE id=?', [inv.id]);
      if (failed.has(inv.id) || !['açık', 'kısmi'].includes(inv.status)) continue;
      const amt = r2(Math.min(it.amount, inv.total + inv.late_fee - inv.paid_amount)); if (amt <= 0) continue;
      await addPayment({ invoice_id: inv.id, date: b.date || bt.collection_date, amount: amt, method: 'SEPA otomatik ödeme', reference: bt.msg_id }, user); paid++;
    }
    await db.run("UPDATE sepa_batches SET status='tahsil edildi', settled_at=? WHERE id=?", [nowTs(), id]);
    await audit(user, 'SEPA tahsil', 'sepa_batches', id, `${bt.msg_id} · ${paid} ödeme${failed.size ? ` · ${failed.size} iade/başarısız` : ''}`);
    return { paid, failed: failed.size };
  }
  async function sepaCancel(id, user) {
    const bt = await sepaBatch(id); if (bt.status !== 'oluşturuldu') err(409, 'Sadece kapatılmamış dosya iptal edilebilir.');
    await db.run("UPDATE invoices SET pay_ref=NULL, pay_provider=NULL WHERE pay_ref=?", [`SEPA:${id}`]);
    await db.run("UPDATE sepa_batches SET status='iptal', settled_at=? WHERE id=?", [nowTs(), id]);
    await audit(user, 'SEPA dosyası iptal', 'sepa_batches', id, bt.msg_id);
    return { ok: true };
  }
  const mandateOut = (m) => (m ? { id: m.id, holder: m.holder, iban: maskIban(m.iban), mandate_ref: m.mandate_ref, signed_at: m.signed_at, status: m.status, first_used_at: m.first_used_at } : null);

  // ================= review request =================
  async function reviewNudges() {
    const url = String(setting('review_url') || '').trim(); if (!/^https?:\/\//.test(url)) return 0;
    const days = Math.max(1, Number(setting('review_after_days')) || 14); let n = 0;
    for (const r of await db.all("SELECT DISTINCT rider_id FROM rentals WHERE status='aktif' AND rider_id IS NOT NULL AND start_date <= ?", [addDays(today(), -days)])) {
      if (await notifyRider(r.rider_id, 'review_request', { url }, { link: url, level: 'info', dedupe: `review:${r.rider_id}` })) n++;
    }
    return n;
  }
  async function reviewOnReturn(rentalId) {
    const url = String(setting('review_url') || '').trim(); if (!/^https?:\/\//.test(url)) return;
    const r = await db.get('SELECT rider_id FROM rentals WHERE id=?', [rentalId]); if (!r?.rider_id) return;
    await notifyRider(r.rider_id, 'review_return', { url }, { link: url, level: 'info', dedupe: `review_ret:${r.rider_id}` });
  }

  // ================= privacy / GDPR =================
  async function retention() {
    const months = Number(setting('retention_selfie_months')); if (!(months > 0)) return 0;
    const cut = addDays(today(), -Math.round(months * 30.4));
    const x = await db.run(`DELETE FROM bike_photos WHERE kind='selfie' AND rental_id IN (SELECT id FROM rentals WHERE status IN ('tamamlandı','iptal') AND COALESCE(returned_at, end_date) < ?)`, [cut]);
    await db.run('DELETE FROM rider_sessions WHERE expires < ?', [nowTs()]); await db.run('DELETE FROM sessions WHERE expires < ?', [nowTs()]);
    if (x.changes) await audit({ id: null }, 'saklama süresi', 'bike_photos', null, `${x.changes} eski teslim alma selfie'si silindi (${months} ay)`);
    return x.changes;
  }
  // everything stored about a rider (Art. 15/20 DSGVO), without file contents
  async function riderExport(r) {
    const strip = (o) => { if (!o) return o; const c = { ...o }; delete c.portal_password_hash; return c; };
    const cust = r.customer_id ? await db.get('SELECT * FROM customers WHERE id=?', [r.customer_id]) : null;
    const rentals = await db.all('SELECT * FROM rentals WHERE rider_id=?', [r.id]);
    const ids = rentals.map((x) => x.id).join(',') || '0';
    const own = cust?.type === 'bireysel';
    return {
      exported_at: nowTs(), controller: { name: setting('company_name'), address: setting('company_address'), email: setting('company_email') },
      rider: strip(r), customer: own ? cust : (cust ? { name: cust.company_name || cust.name, type: cust.type } : null), rentals,
      invoices: own ? await db.all('SELECT * FROM invoices WHERE customer_id=?', [cust.id]) : [], payments: own ? await db.all('SELECT * FROM payments WHERE customer_id=?', [cust.id]) : [],
      deposits: await db.all(`SELECT * FROM deposits WHERE rental_id IN (${ids})`),
      handovers: (await db.all(`SELECT id, rental_id, kind, km, battery, checklist, damages, accessories, notes, rider_name, created_at FROM handovers WHERE rental_id IN (${ids})`)),
      contract_signatures: await db.all(`SELECT rental_id, role, name, channel, doc_hash, doc_lang, ip, ua, created_at FROM contract_signs WHERE rental_id IN (${ids})`),
      documents: await db.all("SELECT id, doc_type, name, mime, size, created_at FROM documents WHERE owner_type='rider' AND owner_id=?", [r.id]),
      photos: await db.all('SELECT id, bike_id, rental_id, kind, stage, note, lat, lng, created_at FROM bike_photos WHERE rider_id=?', [r.id]),
      requests: await db.all('SELECT * FROM portal_requests WHERE rider_id=?', [r.id]), messages: await db.all('SELECT id, code, params, created_at, read_at FROM rider_messages WHERE rider_id=?', [r.id]),
      referrals: await db.all('SELECT * FROM referrals WHERE referrer_id=? OR referred_id=?', [r.id, r.id]),
      sepa_mandates: own ? (await db.all('SELECT holder, iban, mandate_ref, signed_at, status, revoked_at FROM sepa_mandates WHERE customer_id=?', [cust.id])) : [],
      note: 'Dateiinhalte (Ausweisfotos, Fotos) können auf Anfrage zusätzlich herausgegeben werden.',
    };
  }
  async function anonymizeRider(id, user) {
    const r = await db.get('SELECT * FROM riders WHERE id=?', [id]) || err(404, 'Sürücü bulunamadı.');
    if (r.anonymized_at) err(409, 'Bu sürücü zaten anonimleştirildi.');
    if (await db.get("SELECT 1 FROM rentals WHERE rider_id=? AND status IN ('aktif','rezervasyon')", [id])) err(409, 'Aktif kiralaması veya rezervasyonu olan sürücü anonimleştirilemez.');
    if (await db.get("SELECT 1 FROM invoices i JOIN rentals x ON x.id=i.rental_id WHERE x.rider_id=? AND i.status IN ('açık','kısmi')", [id])) err(409, 'Açık faturası olan sürücü anonimleştirilemez. Önce faturaları kapatın.');
    await db.tx(async () => {
      await db.run("DELETE FROM documents WHERE owner_type='rider' AND owner_id=?", [id]);
      await db.run("DELETE FROM bike_photos WHERE rider_id=? AND kind='selfie'", [id]);
      await db.run('UPDATE bike_photos SET lat=NULL, lng=NULL WHERE rider_id=?', [id]);
      await db.run('DELETE FROM rider_messages WHERE rider_id=?', [id]); await db.run('DELETE FROM rider_sessions WHERE rider_id=?', [id]);
      await db.run(`UPDATE riders SET name=?, phone=NULL, email=NULL, id_no=NULL, id_type=NULL, id_expiry=NULL, birth_date=NULL, nationality=NULL, address=NULL, license_no=NULL, notes=NULL,
        portal_email=NULL, portal_password_hash=NULL, portal_active=0, active=0, last_lat=NULL, last_lng=NULL, last_loc_at=NULL, ref_code=NULL, anonymized_at=? WHERE id=?`, [`Silindi #${id}`, nowTs(), id]);
      // an individual customer used only by this rider: contact data goes, name + address stay for the invoices (§ 147 AO, 10 years)
      const c = r.customer_id ? await db.get("SELECT * FROM customers WHERE id=? AND type='bireysel'", [r.customer_id]) : null;
      if (c && !(await db.get('SELECT 1 FROM riders WHERE customer_id=? AND id<>? AND anonymized_at IS NULL', [c.id, id]))) {
        await db.run("DELETE FROM documents WHERE owner_type='customer' AND owner_id=?", [c.id]);
        await db.run('UPDATE customers SET phone=NULL, email=NULL, id_no=NULL, iban=NULL, notes=? WHERE id=?', ['DSGVO: kişisel veriler silindi; ad ve adres faturalar için saklanıyor (10 yıl).', c.id]);
      }
      await db.run("UPDATE portal_requests SET status='tamamlandı', admin_note=COALESCE(admin_note,'Veriler silindi'), handled_at=? WHERE rider_id=? AND type='hesap silme' AND status='yeni'", [nowTs(), id]);
    });
    await audit(user, 'DSGVO anonimleştirme', 'riders', id, r.name);
    return { ok: true };
  }

  // ================= backup =================
  const SKIP = new Set(['sessions', 'rider_sessions']);
  async function backupTables() {
    const tables = (await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).map((t) => t.name).filter((t) => !SKIP.has(t));
    const out = [];
    for (const t of tables) out.push({ name: t, count: Number((await db.get(`SELECT COUNT(*) AS n FROM ${t}`))?.n) || 0 });
    return out;
  }
  async function backupChunk(table, after = 0) {
    const tables = (await backupTables()).map((t) => t.name);
    if (!tables.includes(table)) err(400, 'Bilinmeyen tablo.');
    const rows = []; let size = 0; let last = Number(after) || 0;
    // rows come in pieces of ≤ ~2.5 MB so every answer stays under Vercel's response limit
    for (;;) {
      const part = await db.all(`SELECT rowid AS __rowid, * FROM ${table} WHERE rowid > ? ORDER BY rowid LIMIT 50`, [last]);
      if (!part.length) return { table, rows, next: null };
      for (const row of part) {
        const s = JSON.stringify(row).length;
        if (rows.length && size + s > 2.5e6) return { table, rows, next: last };
        rows.push(row); size += s; last = row.__rowid;
      }
    }
  }
  const backupAuth = async (user, token) => (backupToken && token === backupToken) || (user && can(user, 'admin', 'w'));

  // ================= GPS trackers: other formats → telemetry() =================
  // Traccar "event/position forwarding" (forward.json) and the OsmAnd protocol (Traccar Client app, many trackers)
  function trackerPoint(kind, q, body) {
    const kn = (v) => (v == null || v === '' ? 0 : Math.round(Number(v) * 1.852 * 10) / 10); // knots → km/h
    if (kind === 'traccar') {
      const p = body.position || body; const d = body.device || {};
      return { tracker_id: String(d.uniqueId || p.deviceId || body.uniqueId || ''), lat: Number(p.latitude), lng: Number(p.longitude), speed: kn(p.speed), battery: p.attributes?.batteryLevel != null ? Math.round(Number(p.attributes.batteryLevel)) : null,
        ts: p.fixTime ? String(p.fixTime).slice(0, 19).replace('T', ' ') : null };
    }
    const v = { ...q, ...body };
    return { tracker_id: String(v.id || v.deviceid || ''), lat: Number(v.lat), lng: Number(v.lon ?? v.lng), speed: kn(v.speed), battery: v.batt != null ? Math.round(Number(v.batt)) : null, ts: null };
  }

  // ================= hooks used by api.js =================
  async function portalExtras(r, rentals, cust) {
    const payer = cust?.type === 'bireysel';
    const sign = [];
    if (setting('esign') !== '0') {
      for (const x of rentals.filter((y) => ['aktif', 'rezervasyon'].includes(y.status))) {
        const st = await signState(x.id);
        if (!st.latest['sürücü']?.valid) sign.push({ rental_id: x.id, contract_no: x.contract_no, bike: x.bike_code, changed: !!st.latest['sürücü'] });
        x.signed = !!st.latest['sürücü']?.valid;
      }
    }
    for (const x of rentals) { const y = await db.get('SELECT insurance_plan, insurance_fee, insurance_deductible FROM rentals WHERE id=?', [x.id]); Object.assign(x, y); }
    const m = payer ? await activeMandate(cust.id) : null;
    return {
      sign_tasks: sign, esign: setting('esign') !== '0',
      referral: await referralInfo(r),
      sepa: payer && sepaOn() ? { on: true, mandate: mandateOut(m), creditor_id: setting('sepa_creditor_id'), company: setting('company_name'), text_de: MANDATE_TEXT.de(setting('company_name'), setting('sepa_creditor_id'), m?.mandate_ref || '…'), text_en: MANDATE_TEXT.en(setting('company_name'), setting('sepa_creditor_id'), m?.mandate_ref || '…') } : null,
      insurance_plans: plans(), privacy_url: setting('privacy_url') || null, review_url: setting('review_url') || null,
      id_check: { provider: !!idProvider(setting('id_provider')), verified: !!r.id_checked },
      credit: payer && cust ? await creditLeft(cust.id) : 0,
      deletion_requested: !!(await db.get("SELECT 1 FROM portal_requests WHERE rider_id=? AND type='hesap silme' AND status='yeni'", [r.id])),
    };
  }
  async function daily() {
    return { referrals: await checkReferrals(), reviews: await reviewNudges(), retention: await retention() };
  }

  // the rider sees all signatures of their contract, but the evidence (IP, device) only of their own
  const forRider = (v) => ({ ...v, signs: v.signs.map((s) => (s.role === 'sürücü' ? s : { ...s, ip: null, ua: null })) });
  // rider-screen routes: /api/portal/<b>/<c>/<d>
  async function portalRoute(seg, method, body, r, headers, reload) {
    const [, b, c, d] = seg;
    if (b === 'contract' && c && method === 'GET') {
      const x = await db.get("SELECT id FROM rentals WHERE id=? AND rider_id=?", [Number(c), r.id]) || err(404, 'Kiralama bulunamadı.');
      return { rental: forRider(await contractView(x.id)), settings: docSettings() };
    }
    if (b === 'contract' && c && d === 'sign' && method === 'POST') {
      if (setting('esign') === '0') err(403, 'Online imza şu an kapalı.');
      const x = await db.get("SELECT id FROM rentals WHERE id=? AND rider_id=?", [Number(c), r.id]) || err(404, 'Kiralama bulunamadı.');
      if (!body.accept) err(400, 'Sözleşme koşullarını onaylayın.');
      await signContract(x.id, { role: 'sürücü', name: body.name || r.name, sign: body.sign, channel: 'sürücü ekranı', lang: body.lang, rider_id: r.id, headers });
      return { ...(await reload()), rental: forRider(await contractView(x.id)) };
    }
    if (b === 'sepa' && method === 'POST') {
      if (!sepaOn()) err(403, 'SEPA otomatik ödeme şu an kapalı.');
      const cust = r.customer_id ? await db.get('SELECT * FROM customers WHERE id=?', [r.customer_id]) : null;
      if (!cust || cust.type !== 'bireysel') err(403, 'Kira bedelini firmanız ödüyor.');
      if (!body.accept) err(400, 'Lastschriftmandat onaylanmalı.');
      await createMandate({ customer_id: cust.id, rider_id: r.id, holder: body.holder, iban: body.iban, headers }, { id: null, name: `${r.name} (sürücü ekranı)` });
      return reload();
    }
    if (b === 'sepa' && method === 'DELETE') { if (r.customer_id) await revokeMandate(r.customer_id, { id: null, name: `${r.name} (sürücü ekranı)` }); return reload(); }
    if (b === 'privacy' && c === 'export' && method === 'GET') return riderExport(r);
    if (b === 'privacy' && c === 'delete' && method === 'POST') {
      if (!await db.get("SELECT 1 FROM portal_requests WHERE rider_id=? AND type='hesap silme' AND status='yeni'", [r.id])) {
        await db.run('INSERT INTO portal_requests(rider_id,customer_id,type,notes,status) VALUES(?,?,?,?,?)', [r.id, r.customer_id, 'hesap silme', String(body.notes || '').slice(0, 500) || 'DSGVO: Löschung meiner Daten beantragt', 'yeni']);
        await audit({ id: null, name: `${r.name} (sürücü ekranı)` }, 'hesap silme talebi', 'riders', r.id, r.name);
      }
      return reload();
    }
    if (b === 'id-check' && method === 'POST') {
      const pv = idProvider(setting('id_provider')); if (!pv) err(404, 'Online kimlik doğrulama bağlı değil.');
      const out = await pv.start(r, { company: setting('company_name') });
      return { url: out.url };
    }
    return undefined;
  }

  // panel routes (signed-in staff)
  async function adminRoute(seg, method, query, body, user, headers) {
    const [a, b, c, d] = seg;
    if (a === 'rentals' && b && c === 'sign' && method === 'POST') {
      need(user, 'rentals', 'w');
      await signContract(Number(b), { role: body.role, name: body.name, sign: body.sign, channel: 'panel (yerinde)', lang: body.lang, user, headers });
      return contractView(Number(b));
    }
    if (a === 'rentals' && b && c === 'signs' && method === 'GET') { need(user, 'rentals'); return contractView(Number(b)); }
    if (a === 'rentals' && b && c === 'ask-sign' && method === 'POST') {
      need(user, 'rentals', 'w'); const r = await getOne('rentals', Number(b));
      if (!r.rider_id) err(400, 'Kiralamada sürücü yok.');
      const rd = await db.get('SELECT portal_active, portal_email FROM riders WHERE id=?', [r.rider_id]);
      await notifyRider(r.rider_id, 'contract_sign', { no: r.contract_no }, { link: 'home', level: 'warn', user });
      return { ok: true, portal: !!(rd?.portal_active && rd?.portal_email) };
    }
    if (a === 'contract_signs' && b && method === 'DELETE') {
      need(user, 'admin', 'w'); const s = await db.get('SELECT * FROM contract_signs WHERE id=?', [Number(b)]) || err(404, 'İmza bulunamadı.');
      await db.run('DELETE FROM contract_signs WHERE id=?', [s.id]);
      const st = await signState(s.rental_id); await db.run('UPDATE rentals SET signed_at=? WHERE id=?', [st.complete ? nowTs() : null, s.rental_id]);
      await audit(user, 'e-imza silme', 'rentals', s.rental_id, `${s.role} · ${s.name}`); return { ok: true };
    }
    if (a === 'insurance-plans' && method === 'GET') return plans();
    if (a === 'referrals' && method === 'GET' && !b) {
      need(user, 'customers');
      return db.all(`SELECT f.*, a.name AS referrer_name, a.ref_code, b.name AS referred_name, b.phone AS referred_phone,
          (SELECT COUNT(*) FROM rentals x WHERE x.rider_id=f.referred_id) AS rentals FROM referrals f JOIN riders a ON a.id=f.referrer_id JOIN riders b ON b.id=f.referred_id ORDER BY f.id DESC LIMIT 500`);
    }
    if (a === 'referrals' && b && c === 'cancel' && method === 'POST') {
      need(user, 'customers', 'w'); await db.run("UPDATE referrals SET status='iptal', note=? WHERE id=? AND status='bekliyor'", [String(body.note || 'İptal edildi').slice(0, 200), Number(b)]);
      await db.run('UPDATE credits SET left_amount=0 WHERE referral_id=? AND left_amount=amount', [Number(b)]);
      await audit(user, 'tavsiye iptal', 'referrals', Number(b)); return { ok: true };
    }
    if (a === 'credits') {
      need(user, 'finance', method === 'GET' ? 'r' : 'w');
      if (method === 'GET') return db.all(`SELECT k.*, COALESCE(c.company_name,c.name) AS customer_label, rd.name AS rider_name, u.name AS user_name FROM credits k JOIN customers c ON c.id=k.customer_id
        LEFT JOIN riders rd ON rd.id=k.rider_id LEFT JOIN users u ON u.id=k.user_id ${query.customer_id ? 'WHERE k.customer_id=?' : ''} ORDER BY k.id DESC LIMIT 500`, query.customer_id ? [Number(query.customer_id)] : []);
      if (method === 'POST') { await getOne('customers', Number(body.customer_id)); const id = await addCredit({ customer_id: Number(body.customer_id), amount: body.amount, reason: body.reason || 'Manuel indirim / iyi niyet' }, user) || err(400, 'Tutar girin.'); await audit(user, 'indirim kredisi', 'customers', Number(body.customer_id), `${body.amount} € · ${body.reason || ''}`); return { id }; }
      if (method === 'DELETE' && b) { await db.run('UPDATE credits SET left_amount=0 WHERE id=?', [Number(b)]); await audit(user, 'kredi iptal', 'credits', Number(b)); return { ok: true }; }
    }
    if (a === 'sepa') {
      need(user, 'finance', method === 'GET' ? 'r' : 'w');
      if (b === 'candidates' && method === 'GET') { const date = /^\d{4}-\d{2}-\d{2}$/.test(String(query.date || '')) ? query.date : addDays(today(), Math.max(1, Number(setting('sepa_lead_days')) || 5)); return { date, rows: (await sepaCandidates(date)).map((r) => ({ ...r, iban: maskIban(r.iban) })), creditor_id: setting('sepa_creditor_id'), iban_ok: ibanValid(setting('company_iban')), on: sepaOn() }; }
      if (b === 'batches' && method === 'GET' && !c) return (await db.all('SELECT b.id, b.msg_id, b.collection_date, b.count, b.total, b.status, b.created_at, b.settled_at, u.name AS user_name FROM sepa_batches b LEFT JOIN users u ON u.id=b.user_id ORDER BY b.id DESC LIMIT 100'));
      if (b === 'batches' && method === 'POST' && !c) return sepaCreate(body, user);
      if (b === 'batches' && c && method === 'GET') { const bt = await sepaBatch(Number(c)); bt.items = bt.items.map((i) => ({ ...i, iban: maskIban(i.iban) })); return { ...bt, xml: await sepaBatchXml(Number(c)) }; }
      if (b === 'batches' && c && method === 'POST' && d === 'settle') return sepaSettle(Number(c), body, user);
      if (b === 'batches' && c && method === 'POST' && d === 'cancel') return sepaCancel(Number(c), user);
      if (b === 'mandates' && method === 'GET') return (await db.all(`SELECT m.*, COALESCE(c.company_name,c.name) AS customer_label FROM sepa_mandates m JOIN customers c ON c.id=m.customer_id ${query.customer_id ? 'WHERE m.customer_id=?' : ''} ORDER BY m.id DESC LIMIT 300`, query.customer_id ? [Number(query.customer_id)] : [])).map((m) => ({ ...m, iban: maskIban(m.iban) }));
      if (b === 'mandates' && method === 'POST' && !c) { await getOne('customers', Number(body.customer_id)); return mandateOut(await createMandate({ customer_id: Number(body.customer_id), holder: body.holder, iban: body.iban, bic: body.bic, signed_at: body.signed_at ? `${body.signed_at} 00:00:00` : null, headers }, user)); }
      if (b === 'mandates' && c && method === 'DELETE') { const m = await db.get('SELECT * FROM sepa_mandates WHERE id=?', [Number(c)]) || err(404, 'Yetki bulunamadı.'); await revokeMandate(m.customer_id, user); return { ok: true }; }
    }
    if (a === 'riders' && b && c === 'anonymize' && method === 'POST') {
      need(user, 'admin', 'w');
      if (String(body.confirm || '').trim().toUpperCase() !== 'SİL' && String(body.confirm || '').trim().toUpperCase() !== 'SIL') err(400, 'Onay için SİL yazın.');
      return anonymizeRider(Number(b), user);
    }
    if (a === 'riders' && b && c === 'export' && method === 'GET') { need(user, 'customers'); const r = await db.get('SELECT * FROM riders WHERE id=?', [Number(b)]) || err(404, 'Sürücü bulunamadı.'); return riderExport(r); }
    if (a === 'riders' && b && c === 'growth' && method === 'GET') {
      need(user, 'customers'); const r = await db.get('SELECT * FROM riders WHERE id=?', [Number(b)]) || err(404, 'Sürücü bulunamadı.');
      const cust = r.customer_id ? await db.get('SELECT type FROM customers WHERE id=?', [r.customer_id]) : null;
      return { referral: await referralInfo(r), referred_by: r.referred_by ? await db.get('SELECT id, name FROM riders WHERE id=?', [r.referred_by]) : null, consent_at: r.consent_at, consent_version: r.consent_version,
        mandate: cust?.type === 'bireysel' ? mandateOut(await activeMandate(r.customer_id)) : null, review_url: setting('review_url') || null, anonymized_at: r.anonymized_at,
        selfie: await db.get("SELECT id, thumb, created_at FROM bike_photos WHERE rider_id=? AND kind='selfie' ORDER BY id DESC LIMIT 1", [r.id]) };
    }
    return undefined;
  }

  return {
    reqInfo, contractFacts, signState, signContract, askToSign, contractView, docSettings, signList,
    refCode, applyReferral, checkReferrals, applyCredits, creditLeft, addCredit, referralInfo,
    plans, planFor, activeMandate, createMandate, sepaCandidates, sepaXml, mandateOut,
    reviewNudges, reviewOnReturn, retention, riderExport, anonymizeRider,
    backupTables, backupChunk, backupAuth, trackerPoint,
    portalExtras, daily, portalRoute, adminRoute, CONSENT_VERSION,
  };
}
