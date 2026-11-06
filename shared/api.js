// Pedalla Admin – API core. Runs on Node (node:sqlite) and in the browser demo (sql.js).
// db adapter: { all(sql, p), get(sql, p), run(sql, p) -> {changes, lastId}, exec(sql), tx(fn) }
import { RESOURCES, DEFAULT_ROLE_PERMS, DEFAULT_SETTINGS, PERMS, ROLES, REQUEST_TYPES, RIDER_REQUIRED_DOCS, ID_TYPES, enabledPeriods } from './meta.js';
import { SCHEMA, INTAKE_CHECKLIST, MIGRATIONS } from './schema.js';

export class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const err = (s, m) => { throw new ApiError(s, m); };

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const today = () => new Date().toISOString().slice(0, 10);
const nowTs = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
export function addDays(d, n) { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
export function addPeriod(d, period, n = 1) {
  if (period === 'gün') return addDays(d, n);
  if (period === 'hafta') return addDays(d, 7 * n);
  const x = new Date(d + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10);
}
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);

export async function createApi(db, { hashPassword, verifyPassword, randomToken }) {
  await db.exec(SCHEMA);
  for (const [table, cols] of Object.entries(MIGRATIONS)) {
    const have = new Set((await db.all(`PRAGMA table_info(${table})`)).map((c) => c.name));
    for (const [col, type] of Object.entries(cols)) if (!have.has(col)) await db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  }
  // every bike gets a fixed random QR id (printed on its sticker)
  const newUid = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
  for (const b of await db.all("SELECT id FROM bikes WHERE uid IS NULL OR uid=''")) await db.run('UPDATE bikes SET uid=? WHERE id=?', [newUid(), b.id]);
  await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS ix_bike_uid ON bikes(uid)');
  // ---------- settings ----------
  // settings + role permissions are read once per request (see handle) and kept in memory
  let SETTINGS = { ...DEFAULT_SETTINGS }; let PERMS_CACHE = DEFAULT_ROLE_PERMS;
  const getSettings = async () => {
    const s = { ...DEFAULT_SETTINGS };
    for (const row of await db.all("SELECT key, value FROM settings WHERE key NOT LIKE 'img_type:%'")) s[row.key] = row.value;
    SETTINGS = s; PERMS_CACHE = s.role_perms ? JSON.parse(s.role_perms) : DEFAULT_ROLE_PERMS;
    return s;
  };
  const setting = (k) => SETTINGS[k];
  const rolePerms = () => PERMS_CACHE;
  const nextNo = async (prefix, onDate = today()) => {
    const year = onDate.slice(0, 4);
    const key = `seq_${prefix}_${year}`;
    const cur = Number((await db.get('SELECT value FROM settings WHERE key=?', [key]))?.value || 0) + 1;
    await db.run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, String(cur)]);
    return `${prefix}-${year}-${String(cur).padStart(4, '0')}`;
  };
  const audit = async (user, action, entity, id, details = '') =>
    await db.run('INSERT INTO audit_log(ts,user_id,action,entity,entity_id,details) VALUES(?,?,?,?,?,?)', [nowTs(), user?.id ?? null, action, entity, id ?? null, String(details).slice(0, 500)]);

  // ---------- auth ----------
  const can = (user, perm, level = 'r') => {
    if (!user) return false;
    const p = rolePerms()[user.role]?.[perm] || '';
    return level === 'r' ? p === 'r' || p === 'w' : p === 'w';
  };
  const need = (user, perm, level = 'r') => { if (!can(user, perm, level)) err(403, 'Bu işlem için yetkiniz yok.'); };
  const userFromToken = async (token) => {
    if (!token) return null;
    const s = await db.get('SELECT * FROM sessions WHERE token=? AND expires > ?', [token, nowTs()]);
    if (!s) return null;
    const u = await db.get('SELECT id,name,email,role,active FROM users WHERE id=?', [s.user_id]);
    return u && u.active ? u : null;
  };

  // ---------- generic CRUD ----------
  const baseSql = (res) => RESOURCES[res].listSql || `SELECT * FROM ${res}`;
  const writable = (res) => RESOURCES[res].fields.filter((f) => !f.ro && f.t !== 'password' && !(f.show && f.k === f.show));
  const clean = (f, v) => {
    if (v === '' || v === undefined || v === null) return null;
    if (f.t === 'bool') return v ? 1 : 0;
    if (['number', 'money', 'ref'].includes(f.t)) { const n = Number(v); return Number.isFinite(n) ? n : null; }
    return String(v);
  };
  async function list(res, q = {}) {
    const meta = RESOURCES[res];
    const where = []; const p = [];
    if (q.q) { where.push('(' + meta.search.map((c) => `COALESCE(${c},'') LIKE ?`).join(' OR ') + ')'); meta.search.forEach(() => p.push(`%${q.q}%`)); }
    for (const [k, v] of Object.entries(q)) {
      if (['q', 'limit', 'offset', 'sort'].includes(k) || v === '' || v == null) continue;
      if (!/^[a-z_]+$/.test(k)) continue;
      if (k === 'overdue') { where.push("status IN ('açık','kısmi') AND due_date < date('now')"); continue; }
      if (k === 'late') { where.push("status='aktif' AND end_date < date('now')"); continue; }
      if (k === 'low') { where.push('stock <= min_stock'); continue; }
      if (k === 'open') { where.push("status NOT IN ('teslim edildi','iptal')"); continue; }
      where.push(`${k} = ?`); p.push(v);
    }
    const sort = q.sort && /^[a-z_]+( (asc|desc))?$/i.test(q.sort) ? q.sort : meta.order;
    const limit = Math.min(Number(q.limit) || 500, 5000);
    const sql = `SELECT * FROM (${baseSql(res)}) AS t ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${sort} LIMIT ${limit}`;
    const rows = await db.all(sql, p);
    for (const r of rows) { delete r.password_hash; delete r.portal_password_hash; }
    return rows;
  }
  async function getOne(res, id) {
    const row = await db.get(`SELECT * FROM (${baseSql(res)}) AS t WHERE id = ?`, [id]);
    if (!row) err(404, 'Kayıt bulunamadı.');
    delete row.password_hash; delete row.portal_password_hash;
    return row;
  }
  function validate(res, body, partial) {
    for (const f of RESOURCES[res].fields) if (f.req && !partial && (body[f.k] === undefined || body[f.k] === '' || body[f.k] === null)) err(400, `"${f.l}" zorunludur.`);
  }
  // a rider without a company becomes a direct (individual) customer
  async function directCustomer(p, user) {
    if (!p?.name) err(400, 'Sürücünün adı zorunludur.');
    const r = await db.run("INSERT INTO customers(type,name,phone,email,id_no,address,id_verified,doc_lang) VALUES('bireysel',?,?,?,?,?,?,?)",
      [p.name, p.phone || null, p.email || null, p.id_no || null, p.address || null, p.id_checked ? 1 : 0, p.doc_lang || setting('doc_lang') || 'de']);
    await audit(user, 'oluşturma', 'customers', r.lastId, `${p.name} (doğrudan müşteri)`);
    return r.lastId;
  }
  // rider portal login: e-mail must be unique, password is stored hashed; setting a password opens the portal
  async function riderPortalFields(body, extra, id) {
    if (body.portal_email !== undefined) {
      body.portal_email = String(body.portal_email || '').trim().toLowerCase() || null;
      if (body.portal_email && await db.get('SELECT 1 FROM riders WHERE lower(portal_email)=? AND id<>?', [body.portal_email, id || 0])) err(409, 'Bu e-posta başka bir sürücünün girişinde kullanılıyor.');
    }
    if (body.portal_password) {
      if (String(body.portal_password).length < 6) err(400, 'Sürücü şifresi en az 6 karakter olmalı.');
      const email = body.portal_email || (id ? (await db.get('SELECT portal_email FROM riders WHERE id=?', [id]))?.portal_email : null);
      if (!email) err(400, 'Şifre için önce sürücü ekranı giriş e-postasını girin.');
      extra.portal_password_hash = hashPassword(String(body.portal_password));
      if (body.portal_active === undefined || body.portal_active === '') body.portal_active = 1;
    }
  }
  // next service date = last service (or purchase / today) + the bike's own interval (or the default from Settings)
  async function fixServiceDate(id, recalc) {
    const b = await db.get('SELECT id, last_service_date, purchase_date, next_service_date, service_interval_days FROM bikes WHERE id=?', [id]);
    if (!b || (!recalc && b.next_service_date)) return;
    const days = Number(b.service_interval_days) || Number(setting('service_interval_days')) || 90;
    await db.run('UPDATE bikes SET next_service_date=? WHERE id=?', [addDays([b.last_service_date, b.purchase_date].find((x) => /^\d{4}-\d{2}-\d{2}/.test(x || '')) || today(), days), id]);
  }
  async function insert(res, body, user) {
    const rx = {}; if (res === 'riders') await riderPortalFields(body, rx, null);
    if (res === 'riders' && !body.customer_id) body.customer_id = await directCustomer(body, user);
    validate(res, body);
    const fields = writable(res).filter((f) => body[f.k] !== undefined || f.def !== undefined);
    const vals = fields.map((f) => clean(f, body[f.k] !== undefined ? body[f.k] : f.def));
    const extra = { ...rx };
    if (res === 'users') { if (!body.password) err(400, 'Şifre zorunludur.'); extra.password_hash = hashPassword(body.password); }
    if (res === 'bikes') extra.uid = newUid();
    if (res === 'bike_costs') extra.user_id = user?.id ?? null;
    const cols = [...fields.map((f) => f.k), ...Object.keys(extra)];
    const r = await db.run(`INSERT INTO ${res} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, [...vals, ...Object.values(extra)]);
    if (res === 'bikes') await fixServiceDate(r.lastId, false);
    await audit(user, 'oluşturma', res, r.lastId, RESOURCES[res].title?.(body) || '');
    return await getOne(res, r.lastId);
  }
  async function update(res, id, body, user) {
    const before = await getOne(res, id);
    const rx = {}; if (res === 'riders') await riderPortalFields(body, rx, id);
    const fields = writable(res).filter((f) => body[f.k] !== undefined);
    const sets = fields.map((f) => `${f.k}=?`); const vals = fields.map((f) => clean(f, body[f.k]));
    if (res === 'users' && body.password) { sets.push('password_hash=?'); vals.push(hashPassword(body.password)); }
    for (const [k, v] of Object.entries(rx)) { sets.push(`${k}=?`); vals.push(v); }
    if (res === 'portal_requests' && body.status !== undefined) { sets.push('handled_by=?', 'handled_at=?'); vals.push(user?.id ?? null, nowTs()); }
    if (sets.length) await db.run(`UPDATE ${res} SET ${sets.join(',')} WHERE id=?`, [...vals, id]);
    if (res === 'invoices') await recalcInvoice(id);
    if (res === 'bikes') {
      const intervalChanged = body.service_interval_days !== undefined && Number(body.service_interval_days || 0) !== Number(before.service_interval_days || 0);
      const dateTyped = body.next_service_date !== undefined && body.next_service_date && body.next_service_date !== before.next_service_date;
      await fixServiceDate(id, intervalChanged && !dateTyped);
    }
    if (res === 'riders' && (rx.portal_password_hash || String(body.portal_active) === '0')) await db.run('DELETE FROM rider_sessions WHERE rider_id=?', [id]);
    await audit(user, 'güncelleme', res, id, fields.map((f) => f.k).join(', '));
    return await getOne(res, id);
  }
  const REFS = {};
  async function refsTo(res) {
    if (!REFS[res]) {
      const out = [];
      for (const { name } of await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
        for (const f of await db.all(`PRAGMA foreign_key_list(${name})`)) if (f.table === res && name !== res) out.push([name, f.from]);
      REFS[res] = out;
    }
    return REFS[res];
  }
  async function remove(res, id, user) {
    const row = await getOne(res, id);
    if (res === 'bikes' && await db.get("SELECT 1 FROM rentals WHERE bike_id=? AND status IN ('aktif','rezervasyon')", [id])) err(409, 'Aktif kiralaması olan bisiklet silinemez.');
    if (res === 'customers' && await db.get('SELECT 1 FROM rentals WHERE customer_id=?', [id])) err(409, 'Kiralama geçmişi olan müşteri silinemez; kara listeye alabilir veya not düşebilirsiniz.');
    if (res === 'users' && user.id === Number(id)) err(409, 'Kendi kullanıcınızı silemezsiniz.');
    if (res === 'payments') { await db.run('DELETE FROM cash_moves WHERE payment_id=?', [id]); await db.run('DELETE FROM payments WHERE id=?', [id]); await recalcInvoice(row.invoice_id); await audit(user, 'silme', res, id); return { ok: true }; }
    // linked records block the delete (checked here too, because Turso does not enforce foreign keys)
    const cleanup = { bikes: ['bike_locations', 'bike_costs'], riders: ['portal_requests'] }[res] || [];
    for (const [t, col] of await refsTo(res)) {
      if (cleanup.includes(t)) continue;
      if (await db.get(`SELECT 1 FROM ${t} WHERE ${col}=? LIMIT 1`, [id])) err(409, `Bu kayda bağlı ${(RESOURCES[t]?.label || t).toLocaleLowerCase('tr')} olduğu için silinemiyor.`);
    }
    try {
      for (const t of cleanup) await db.run(`DELETE FROM ${t} WHERE ${t === 'portal_requests' ? 'rider_id' : 'bike_id'}=?`, [id]);
      if (res === 'riders') await db.run('DELETE FROM rider_sessions WHERE rider_id=?', [id]);
      const own = { riders: 'rider', customers: 'customer', rentals: 'rental' }[res];
      if (own) await db.run('DELETE FROM documents WHERE owner_type=? AND owner_id=?', [own, id]);
      await db.run(`DELETE FROM ${res} WHERE id=?`, [id]);
    } catch (e) { err(409, 'Bu kayda bağlı başka kayıtlar olduğu için silinemiyor.'); }
    await audit(user, 'silme', res, id, RESOURCES[res].title?.(row) || '');
    return { ok: true };
  }

  // ---------- cash register (kasa) ----------
  async function cashMove({ date, type, amount, category, description, payment_id = null, deposit_id = null, rental_id = null }, user) {
    if (!['giriş', 'çıkış', 'sayım farkı'].includes(type)) err(400, 'Geçersiz kasa hareketi.');
    if (type !== 'sayım farkı' && !(Number(amount) > 0)) err(400, 'Tutar sıfırdan büyük olmalı.');
    const r = await db.run('INSERT INTO cash_moves(date,type,amount,category,description,payment_id,deposit_id,rental_id,user_id) VALUES(?,?,?,?,?,?,?,?,?)',
      [date || today(), type, r2(amount), category || null, description || null, payment_id, deposit_id, rental_id, user?.id ?? null]);
    await audit(user, 'kasa', 'cash_moves', r.lastId, `${type} ${r2(amount)} € ${category || ''}`);
    return r.lastId;
  }
  const cashSigned = "CASE type WHEN 'çıkış' THEN -amount ELSE amount END";
  async function cashSummary(q = {}) {
    const t = today(); const m0 = t.slice(0, 7) + '-01';
    const one = async (sql, p = []) => r2(Object.values((await db.get(sql, p)) || {})[0] || 0);
    const from = q.from || addDays(t, -30); const to = q.to || t;
    const rows = await list('cash_moves', { limit: 2000, ...(q.q ? { q: q.q } : {}) });
    return {
      balance: await one(`SELECT COALESCE(SUM(${cashSigned}),0) FROM cash_moves`),
      today_in: await one("SELECT COALESCE(SUM(amount),0) FROM cash_moves WHERE type='giriş' AND date=?", [t]),
      today_out: await one("SELECT COALESCE(SUM(amount),0) FROM cash_moves WHERE type='çıkış' AND date=?", [t]),
      month_in: await one("SELECT COALESCE(SUM(amount),0) FROM cash_moves WHERE type='giriş' AND date>=?", [m0]),
      month_out: await one("SELECT COALESCE(SUM(amount),0) FROM cash_moves WHERE type='çıkış' AND date>=?", [m0]),
      opening: await one(`SELECT COALESCE(SUM(${cashSigned}),0) FROM cash_moves WHERE date < ?`, [from]),
      last_count: await db.get("SELECT date, description FROM cash_moves WHERE type='sayım farkı' ORDER BY id DESC LIMIT 1") || null,
      from, to,
      rows: rows.filter((r) => r.date >= from && r.date <= to),
    };
  }
  // deposits; cash ones also go to the cash register
  async function depositMove({ rental_id, customer_id, date, type, amount, notes, method }, user) {
    const x = await db.run('INSERT INTO deposits(rental_id,customer_id,date,type,amount,notes,method) VALUES(?,?,?,?,?,?,?)', [rental_id, customer_id, date || today(), type, r2(amount), notes || null, method || null]);
    if (method === 'nakit' && ['tahsil', 'iade'].includes(type) && amount > 0) {
      const r = await db.get('SELECT contract_no FROM rentals WHERE id=?', [rental_id]);
      await cashMove({ date, type: type === 'tahsil' ? 'giriş' : 'çıkış', amount, category: type === 'tahsil' ? 'Depozito tahsilatı' : 'Depozito iadesi', description: `${r?.contract_no || ''} ${notes || ''}`.trim(), deposit_id: x.lastId, rental_id }, user);
    }
    return x.lastId;
  }

  // ---------- documents (ID copies, signed contracts…) ----------
  const DOC_OWNERS = { customer: ['customers', 'customers'], rider: ['riders', 'customers'], rental: ['rentals', 'rentals'] };
  const DOC_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  async function addDocument(b, user) {
    const own = DOC_OWNERS[b.owner_type] || err(400, 'Geçersiz belge sahibi.');
    await getOne(own[0], Number(b.owner_id));
    if (!DOC_MIME.includes(b.mime)) err(400, 'Sadece JPEG, PNG veya PDF yüklenebilir.');
    const data = String(b.data || '').replace(/^data:[^,]*,/, '');
    const size = Math.floor(data.length * 3 / 4);
    if (!size) err(400, 'Dosya boş.');
    if (size > 3 * 1024 * 1024) err(413, 'Dosya çok büyük (en fazla 3 MB). PDF ise sıkıştırın veya fotoğraf olarak yükleyin.');
    const r = await db.run('INSERT INTO documents(owner_type,owner_id,doc_type,name,mime,size,data,notes,uploaded_by) VALUES(?,?,?,?,?,?,?,?,?)',
      [b.owner_type, Number(b.owner_id), b.doc_type || 'Diğer', String(b.name || 'belge').slice(0, 120), b.mime, size, data, b.notes || null, user?.id ?? null]);
    await audit(user, 'belge', own[0], Number(b.owner_id), `${b.doc_type || ''} ${b.name || ''}`);
    return r.lastId;
  }
  const listDocuments = (type, id) => db.all('SELECT d.id, d.owner_type, d.owner_id, d.doc_type, d.name, d.mime, d.size, d.notes, d.created_at, u.name AS uploaded_by_name FROM documents d LEFT JOIN users u ON u.id=d.uploaded_by WHERE d.owner_type=? AND d.owner_id=? ORDER BY d.id DESC', [type, id]);

  // ---------- finance ----------
  async function recalcInvoice(id) {
    const inv = await db.get('SELECT * FROM invoices WHERE id=?', [id]);
    if (!inv) return;
    const vat = r2(inv.net * (inv.vat_rate || 0) / 100); const total = r2(inv.net + vat);
    const paid = r2((await db.get('SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE invoice_id=?', [id])).s);
    let status = inv.status === 'iptal' ? 'iptal' : paid <= 0 ? 'açık' : paid + 0.005 >= total + (inv.late_fee || 0) ? 'ödendi' : 'kısmi';
    await db.run('UPDATE invoices SET vat=?, total=?, paid_amount=?, status=? WHERE id=?', [vat, total, paid, status, id]);
  }
  async function createInvoice({ customer_id, rental_id = null, service_id = null, description, net, period_start = null, period_end = null, issue_date = today() }, user) {
    const vat_rate = Number(setting('vat_rate')) || 0;
    const due = addDays(issue_date, Number(setting('payment_terms_days')) || 14);
    const no = await nextNo('F', issue_date);
    const r = await db.run(`INSERT INTO invoices(invoice_no,rental_id,customer_id,service_id,issue_date,due_date,period_start,period_end,description,net,vat_rate)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`, [no, rental_id, customer_id, service_id, issue_date, due, period_start, period_end, description, r2(net), vat_rate]);
    await recalcInvoice(r.lastId);
    await audit(user, 'fatura', 'invoices', r.lastId, `${no} ${description}`);
    return r.lastId;
  }
  // Create period invoices for a rental up to `until` (inclusive of the period that starts on/before until)
  async function billRental(rentalId, user, until = today()) {
    const r = await db.get('SELECT * FROM rentals WHERE id=?', [rentalId]);
    if (!r || !['aktif'].includes(r.status) || !r.rate) return 0;
    const bike = await db.get('SELECT code FROM bikes WHERE id=?', [r.bike_id]);
    const last = (await db.get('SELECT MAX(period_end) AS pe FROM invoices WHERE rental_id=? AND period_end IS NOT NULL AND status<>\'iptal\'', [rentalId]))?.pe;
    let start = last ? addDays(last, 1) : r.start_date; let n = 0;
    while (start <= until && start <= r.end_date && n < 60) {
      let end = addDays(addPeriod(start, r.period), -1);
      if (end > r.end_date) end = r.end_date;
      await createInvoice({ customer_id: r.customer_id, rental_id: r.id, description: `Kiralama ${r.contract_no} · ${bike?.code} · ${start} – ${end}`, net: r.rate, period_start: start, period_end: end, issue_date: start }, user);
      start = addDays(end, 1); n++;
    }
    return n;
  }
  async function addPayment(body, user) {
    validate('payments', body);
    const inv = await db.get('SELECT * FROM invoices WHERE id=?', [body.invoice_id]) || err(404, 'Fatura bulunamadı.');
    if (inv.status === 'iptal') err(409, 'İptal edilmiş faturaya ödeme girilemez.');
    const r = await db.run('INSERT INTO payments(invoice_id,customer_id,date,amount,method,reference,notes,created_by) VALUES(?,?,?,?,?,?,?,?)',
      [inv.id, inv.customer_id, body.date || today(), r2(body.amount), body.method || null, body.reference || null, body.notes || null, user?.id]);
    await recalcInvoice(inv.id);
    if (body.method === 'nakit') {
      const c = await db.get('SELECT COALESCE(company_name,name) AS n FROM customers WHERE id=?', [inv.customer_id]);
      await cashMove({ date: body.date || today(), type: 'giriş', amount: body.amount, category: 'Fatura tahsilatı', description: `${inv.invoice_no} · ${c?.n || ''}`, payment_id: r.lastId, rental_id: inv.rental_id }, user);
    }
    await audit(user, 'ödeme', 'invoices', inv.id, `${inv.invoice_no}: ${r2(body.amount)} €`);
    return await getOne('payments', r.lastId);
  }
  function lateFeeFor(inv) {
    if (!['açık', 'kısmi'].includes(inv.status) || inv.due_date >= today()) return 0;
    return r2(daysBetween(inv.due_date, today()) * Number(setting('late_fee_per_day') || 0));
  }

  // ---------- rentals ----------
  async function createRental(b, user) {
    if (b.customer_id === 'new') {
      if (!b.rider?.name || !b.rider?.phone) err(400, 'Yeni bireysel müşteri için teslim alan kişinin adı ve telefonu zorunludur.');
      b.customer_id = await directCustomer({ ...b.rider, doc_lang: b.doc_lang }, user);
      b.rider.id = null;
    }
    for (const k of ['customer_id', 'bike_id', 'start_date', 'end_date']) if (!b[k]) err(400, 'Müşteri, bisiklet, başlangıç ve dönüş tarihleri zorunludur.');
    if (b.end_date < b.start_date) err(400, 'Dönüş tarihi başlangıçtan önce olamaz.');
    const cust = await db.get('SELECT * FROM customers WHERE id=?', [b.customer_id]) || err(404, 'Müşteri yok.');
    if (cust.blacklisted) err(409, 'Bu müşteri kara listede. Kiralama yapılamaz.');
    const bike = await db.get('SELECT * FROM bikes WHERE id=?', [b.bike_id]) || err(404, 'Bisiklet yok.');
    const reserve = b.start_date > today();
    if (!['müsait', 'rezerve'].includes(bike.status)) err(409, `Bisiklet şu an "${bike.status}" durumunda, kiralanamaz.`);
    const clash = await db.get("SELECT contract_no FROM rentals WHERE bike_id=? AND status IN ('aktif','rezervasyon') AND NOT (end_date < ? OR start_date > ?)", [b.bike_id, b.start_date, b.end_date]);
    if (clash) err(409, `Bu tarihlerde bisiklet ${clash.contract_no} ile çakışıyor.`);
    if (b.rider && typeof b.rider === 'object') {
      const rd = b.rider;
      if (!rd.name || !rd.phone || !rd.id_type || !rd.id_no) err(400, 'Teslim alan kişinin adı, telefonu, kimlik türü ve kimlik numarası zorunludur.');
      const vals = [rd.name, rd.phone, rd.email || null, rd.id_type, rd.id_no, rd.id_expiry || null, rd.birth_date || null, rd.nationality || null, rd.address || null, rd.license_no || null, rd.id_checked ? 1 : 0];
      if (rd.id) {
        const ex = await db.get('SELECT * FROM riders WHERE id=?', [rd.id]) || err(404, 'Sürücü bulunamadı.');
        if (String(ex.customer_id) !== String(b.customer_id)) err(400, 'Seçilen sürücü bu müşteriye bağlı değil.');
        await db.run('UPDATE riders SET name=?, phone=?, email=COALESCE(?,email), id_type=?, id_no=?, id_expiry=?, birth_date=?, nationality=?, address=?, license_no=?, id_checked=? WHERE id=?', [...vals, rd.id]);
        b.rider_id = rd.id;
      } else {
        b.rider_id = (await db.run('INSERT INTO riders(customer_id,name,phone,email,id_type,id_no,id_expiry,birth_date,nationality,address,license_no,id_checked,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1)', [b.customer_id, ...vals])).lastId;
        await audit(user, 'oluşturma', 'riders', b.rider_id, rd.name);
      }
    }
    if (!reserve) {
      const rider = b.rider_id ? await db.get('SELECT * FROM riders WHERE id=?', [b.rider_id]) : null;
      if (!rider || !rider.id_no) err(400, 'Bisikleti teslim alan kişinin kimlik bilgileri zorunludur (sürücü seçin ve kimlik no girin).');
    }
    let plan = b.plan_id ? await db.get('SELECT * FROM pricing_plans WHERE id=?', [b.plan_id]) : null;
    const rate = b.rate !== undefined && b.rate !== '' ? Number(b.rate) : plan?.price || 0;
    const deposit = b.deposit_amount !== undefined && b.deposit_amount !== '' ? Number(b.deposit_amount) : plan?.deposit || 0;
    let id;
    await db.tx(async () => {
      const no = await nextNo('K');
      const r = await db.run(`INSERT INTO rentals(contract_no,customer_id,rider_id,bike_id,plan_id,start_date,end_date,period,rate,deposit_amount,deposit_status,status,start_km,start_battery,accessories,notes,created_by)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [no, b.customer_id, b.rider_id || null, b.bike_id, b.plan_id || null, b.start_date, b.end_date,
        b.period || plan?.period || 'ay', r2(rate), r2(deposit), deposit > 0 ? (b.deposit_paid ? 'alındı' : 'bekliyor') : 'bekliyor',
        reserve ? 'rezervasyon' : 'aktif', b.start_km ?? bike.odometer_km, b.start_battery ?? bike.battery_level, b.accessories || null, b.notes || null, user?.id]);
      id = r.lastId;
      if (deposit > 0 && b.deposit_paid) await depositMove({ rental_id: id, customer_id: b.customer_id, date: b.start_date > today() ? today() : b.start_date, type: 'tahsil', amount: deposit, notes: 'Teslimde alındı', method: b.deposit_method }, user);
      await db.run('UPDATE bikes SET status=? WHERE id=?', [reserve ? 'rezerve' : 'kirada', b.bike_id]);
      await audit(user, 'kiralama', 'rentals', id, `${no} · ${bike.code} → ${cust.company_name || cust.name}`);
      if (!reserve) await billRental(id, user);
    });
    return await getOne('rentals', id);
  }
  async function activateRental(id, user) {
    const r = await getOne('rentals', id);
    if (r.status !== 'rezervasyon') err(409, 'Sadece rezervasyonlar başlatılabilir.');
    const rider = r.rider_id ? await db.get('SELECT id_no FROM riders WHERE id=?', [r.rider_id]) : null;
    if (!rider?.id_no) err(400, 'Teslimden önce bisikleti teslim alan kişiyi ve kimlik bilgilerini girin (Düzenle).');
    await db.run("UPDATE rentals SET status='aktif', start_date=? WHERE id=?", [r.start_date > today() ? today() : r.start_date, id]);
    await db.run("UPDATE bikes SET status='kirada' WHERE id=?", [r.bike_id]);
    await billRental(id, user); await audit(user, 'teslim', 'rentals', id, r.contract_no);
    return await getOne('rentals', id);
  }
  async function collectDeposit(id, b, user) {
    const r = await getOne('rentals', id);
    const amt = r2(b.amount ?? r.deposit_amount);
    await depositMove({ rental_id: id, customer_id: r.customer_id, date: b.date || today(), type: 'tahsil', amount: amt, notes: b.notes || 'Depozito tahsil edildi', method: b.method }, user);
    await db.run("UPDATE rentals SET deposit_status='alındı' WHERE id=?", [id]);
    await audit(user, 'depozito', 'rentals', id, `Tahsil ${amt} €`);
    return await getOne('rentals', id);
  }
  async function returnRental(id, b, user) {
    const r = await getOne('rentals', id);
    if (r.status !== 'aktif') err(409, 'Sadece aktif kiralamalar iade alınabilir.');
    const date = b.returned_at || today();
    const damage = r2(b.damage_fee || 0);
    const lateDays = Math.max(0, daysBetween(r.end_date, date));
    const lateFee = b.charge_late === false ? 0 : r2(lateDays * Number(setting('late_return_fee_per_day') || 0));
    const out = { late_days: lateDays };
    await db.tx(async () => {
      // close billing up to return date; shorten end
      await db.run("UPDATE rentals SET status='tamamlandı', returned_at=?, end_km=?, return_condition=?, damage_fee=? WHERE id=?",
        [date, b.end_km ?? null, b.return_condition || null, damage, id]);
      if (lateFee > 0) await createInvoice({ customer_id: r.customer_id, rental_id: id, description: `Geç iade bedeli ${r.contract_no} · ${lateDays} gün`, net: lateFee / (1 + Number(setting('vat_rate')) / 100) }, user);
      let damageInv = null;
      if (damage > 0) damageInv = await createInvoice({ customer_id: r.customer_id, rental_id: id, description: `Hasar bedeli ${r.contract_no}: ${b.return_condition || ''}`.slice(0, 200), net: damage }, user);
      // deposit settlement
      const held = r2((await db.get("SELECT COALESCE(SUM(CASE WHEN type='tahsil' THEN amount ELSE -amount END),0) AS s FROM deposits WHERE rental_id=?", [id])).s);
      if (held > 0) {
        let deduct = 0;
        if (b.deduct_from_deposit) {
          const open = await db.all("SELECT * FROM invoices WHERE customer_id=? AND rental_id=? AND status IN ('açık','kısmi') ORDER BY issue_date", [r.customer_id, id]);
          for (const inv of open) {
            const due = r2(inv.total + inv.late_fee - inv.paid_amount); const take = Math.min(due, r2(held - deduct));
            if (take <= 0) break;
            await db.run('INSERT INTO payments(invoice_id,customer_id,date,amount,method,reference,created_by) VALUES(?,?,?,?,?,?,?)', [inv.id, r.customer_id, date, take, 'depozitodan mahsup', r.contract_no, user?.id]);
            await recalcInvoice(inv.id); deduct = r2(deduct + take);
          }
          if (deduct > 0) await db.run('INSERT INTO deposits(rental_id,customer_id,date,type,amount,notes) VALUES(?,?,?,?,?,?)', [id, r.customer_id, date, 'kesinti', deduct, 'Açık faturalara mahsup']);
        }
        const refund = r2(held - deduct);
        if (refund > 0) await depositMove({ rental_id: id, customer_id: r.customer_id, date, type: 'iade', amount: refund, notes: 'İadede geri ödendi', method: b.refund_method }, user);
        await db.run('UPDATE rentals SET deposit_status=? WHERE id=?', [deduct > 0 ? (refund > 0 ? 'kısmi iade' : 'mahsup edildi') : 'iade edildi', id]);
        out.deposit_refund = refund; out.deposit_deducted = deduct;
      }
      const needService = damage > 0 || b.send_to_service;
      await db.run('UPDATE bikes SET status=?, odometer_km=COALESCE(?, odometer_km), location_name=COALESCE(?, location_name) WHERE id=?',
        [needService ? 'serviste' : 'müsait', b.end_km ?? null, b.location_name || 'Depo Hamburg', r.bike_id]);
      if (needService) {
        const so = await createService({ bike_id: r.bike_id, customer_id: r.customer_id, rental_id: id, type: damage > 0 ? 'hasar' : 'periyodik bakım', km: b.end_km, complaint: `İade kontrolü (${r.contract_no}): ${b.return_condition || 'kontrol'}`, brought_by: 'İade' }, user, true);
        out.service_id = so.id;
      }
      await audit(user, 'iade', 'rentals', id, `${r.contract_no} gecikme ${lateDays} gün, hasar ${damage} €`);
    });
    return { ...(await getOne('rentals', id)), ...out };
  }
  async function extendRental(id, b, user) {
    const r = await getOne('rentals', id);
    if (!['aktif', 'rezervasyon'].includes(r.status)) err(409, 'Sadece aktif kiralamalar uzatılabilir.');
    if (!b.end_date || b.end_date <= r.end_date) err(400, 'Yeni dönüş tarihi mevcut tarihten sonra olmalı.');
    await db.run('UPDATE rentals SET end_date=? WHERE id=?', [b.end_date, id]);
    await audit(user, 'uzatma', 'rentals', id, `${r.end_date} → ${b.end_date}`);
    await billRental(id, user);
    return await getOne('rentals', id);
  }
  async function cancelRental(id, user) {
    const r = await getOne('rentals', id);
    if (r.status !== 'rezervasyon') err(409, 'Sadece rezervasyonlar iptal edilebilir.');
    await db.run("UPDATE rentals SET status='iptal' WHERE id=?", [id]);
    await db.run("UPDATE bikes SET status='müsait' WHERE id=? AND status='rezerve'", [r.bike_id]);
    await audit(user, 'iptal', 'rentals', id, r.contract_no);
    return await getOne('rentals', id);
  }

  // ---------- service ----------
  async function createService(b, user, internal = false) {
    if (!b.bike_id) err(400, 'Bisiklet seçin.');
    if (!internal && !b.complaint) err(400, 'Şikayet / talep zorunludur.');
    const bike = await db.get('SELECT * FROM bikes WHERE id=?', [b.bike_id]) || err(404, 'Bisiklet yok.');
    const no = await nextNo('S');
    const r = await db.run(`INSERT INTO service_orders(order_no,bike_id,customer_id,rental_id,brought_by_rider_id,type,status,received_at,received_by,brought_by,km,battery_level,complaint,checklist,visual_condition,accessories,estimated_cost,estimated_ready,technician_id,labor_rate,billable,signature_name)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [no, b.bike_id, b.customer_id || null, b.rental_id || null, b.brought_by_rider_id || null, b.type || 'arıza', 'kabul edildi', b.received_at || nowTs(), user?.id,
      b.brought_by || null, b.km ?? bike.odometer_km, b.battery_level ?? bike.battery_level, b.complaint || '', JSON.stringify(b.checklist || {}), b.visual_condition || null,
      b.accessories || null, b.estimated_cost || null, b.estimated_ready || null, b.technician_id || null, Number(setting('labor_rate')) || 0, b.billable ? 1 : 0, b.signature_name || null]);
    if (bike.status !== 'kirada') await db.run("UPDATE bikes SET status='serviste' WHERE id=?", [b.bike_id]);
    await audit(user, 'servis kabul', 'service_orders', r.lastId, `${no} · ${bike.code}`);
    if (b.request_id) await db.run("UPDATE portal_requests SET service_id=?, status=CASE WHEN status='yeni' THEN 'onaylandı' ELSE status END, handled_by=?, handled_at=? WHERE id=?", [r.lastId, user?.id ?? null, nowTs(), Number(b.request_id)]);
    return await getOne('service_orders', r.lastId);
  }
  async function serviceDetail(id) {
    const s = await getOne('service_orders', id);
    s.checklist = JSON.parse(s.checklist || '{}');
    s.parts = await db.all('SELECT sp.*, p.sku, p.name, p.unit FROM service_parts sp JOIN parts p ON p.id=sp.part_id WHERE sp.service_id=?', [id]);
    s.bike = await db.get('SELECT * FROM bikes WHERE id=?', [s.bike_id]);
    s.customer = s.customer_id ? await db.get('SELECT * FROM customers WHERE id=?', [s.customer_id]) : null;
    s.received_by_name = (await db.get('SELECT name FROM users WHERE id=?', [s.received_by]))?.name;
    s.brought_by_rider = s.brought_by_rider_id ? await db.get('SELECT * FROM riders WHERE id=?', [s.brought_by_rider_id]) : null;
    s.labor_total = r2((s.labor_hours || 0) * (s.labor_rate || 0));
    s.grand_total = r2(s.labor_total + s.parts_total);
    s.checklist_items = INTAKE_CHECKLIST;
    return s;
  }
  async function updateService(id, b, user) {
    const s = await getOne('service_orders', id);
    if (b.checklist) await db.run('UPDATE service_orders SET checklist=? WHERE id=?', [JSON.stringify(b.checklist), id]);
    await update('service_orders', id, b, user);
    if (b.status && b.status !== s.status) {
      if (b.status === 'teslim edildi') await finishService(id, user);
      await audit(user, 'servis durumu', 'service_orders', id, `${s.status} → ${b.status}`);
    }
    return await serviceDetail(id);
  }
  async function finishService(id, user) {
    const s = await serviceDetail(id);
    await db.run('UPDATE service_orders SET delivered_at=? WHERE id=?', [nowTs(), id]);
    const active = await db.get("SELECT 1 FROM rentals WHERE bike_id=? AND status='aktif'", [s.bike_id]);
    const next = addDays(today(), Number(s.bike.service_interval_days) || Number(setting('service_interval_days')) || 90);
    await db.run('UPDATE bikes SET status=?, last_service_date=?, next_service_date=?, odometer_km=MAX(COALESCE(odometer_km,0), COALESCE(?,0)) WHERE id=?',
      [active ? 'kirada' : 'müsait', today(), next, s.km, s.bike_id]);
    if (s.billable && s.customer_id && !s.invoice_id && s.grand_total > 0) {
      const inv = await createInvoice({ customer_id: s.customer_id, service_id: id, rental_id: s.rental_id, description: `Servis ${s.order_no} · ${s.bike.code}: ${s.work_done || s.complaint}`.slice(0, 200), net: s.grand_total }, user);
      await db.run('UPDATE service_orders SET invoice_id=? WHERE id=?', [inv, id]);
    }
  }
  async function addServicePart(id, b, user) {
    const s = await getOne('service_orders', id);
    if (['teslim edildi', 'iptal'].includes(s.status)) err(409, 'Kapanmış servis kaydına parça eklenemez.');
    const part = await db.get('SELECT * FROM parts WHERE id=?', [b.part_id]) || err(404, 'Parça yok.');
    const qty = Number(b.qty) || 1;
    if (part.stock < qty) err(409, `Yetersiz stok: ${part.name} için stokta ${part.stock} ${part.unit} var.`);
    await db.tx(async () => {
      await db.run('INSERT INTO service_parts(service_id,part_id,qty,unit_price) VALUES(?,?,?,?)', [id, part.id, qty, b.unit_price ?? part.price]);
      await db.run('UPDATE parts SET stock=stock-? WHERE id=?', [qty, part.id]);
      await db.run('INSERT INTO stock_moves(part_id,date,type,qty,unit_cost,ref,service_id,user_id) VALUES(?,?,?,?,?,?,?,?)', [part.id, today(), 'çıkış', qty, part.cost, s.order_no, id, user?.id]);
    });
    await audit(user, 'parça kullanımı', 'service_orders', id, `${part.sku} x${qty}`);
    return await serviceDetail(id);
  }
  async function removeServicePart(spId, user) {
    const sp = await db.get('SELECT sp.*, s.order_no, s.status FROM service_parts sp JOIN service_orders s ON s.id=sp.service_id WHERE sp.id=?', [spId]) || err(404, 'Kayıt yok.');
    if (['teslim edildi', 'iptal'].includes(sp.status)) err(409, 'Kapanmış servis kaydı değiştirilemez.');
    await db.tx(async () => {
      await db.run('DELETE FROM service_parts WHERE id=?', [spId]);
      await db.run('UPDATE parts SET stock=stock+? WHERE id=?', [sp.qty, sp.part_id]);
      await db.run('INSERT INTO stock_moves(part_id,date,type,qty,ref,service_id,user_id,notes) VALUES(?,?,?,?,?,?,?,?)', [sp.part_id, today(), 'giriş', sp.qty, sp.order_no, sp.service_id, user?.id, 'Servisten iade']);
    });
    return await serviceDetail(sp.service_id);
  }

  // ---------- stock ----------
  async function addStockMove(b, user) {
    validate('stock_moves', b);
    const part = await db.get('SELECT * FROM parts WHERE id=?', [b.part_id]) || err(404, 'Parça yok.');
    const qty = Number(b.qty);
    let delta = b.type === 'giriş' ? qty : b.type === 'çıkış' ? -qty : qty - part.stock;
    if (part.stock + delta < 0) err(409, 'Stok eksiye düşemez.');
    await db.tx(async () => {
      await db.run('INSERT INTO stock_moves(part_id,date,type,qty,unit_cost,ref,user_id,notes) VALUES(?,?,?,?,?,?,?,?)', [part.id, b.date || today(), b.type, b.type === 'sayım düzeltme' ? delta : qty, b.unit_cost || part.cost, b.ref || null, user?.id, b.notes || null]);
      await db.run('UPDATE parts SET stock=stock+? WHERE id=?', [delta, part.id]);
      if (b.type === 'giriş' && b.unit_cost) await db.run('UPDATE parts SET cost=? WHERE id=?', [Number(b.unit_cost), part.id]);
    });
    await audit(user, 'stok', 'parts', part.id, `${b.type} ${qty}`);
    return await getOne('parts', part.id);
  }

  // ---------- telemetry / map ----------
  async function telemetry(b) {
    const bike = (b.bike_id && await db.get('SELECT * FROM bikes WHERE id=?', [b.bike_id])) || (b.tracker_id && await db.get('SELECT * FROM bikes WHERE gps_tracker_id=?', [b.tracker_id]));
    if (!bike) err(404, 'Bisiklet / takip cihazı bulunamadı.');
    const ts = b.ts || nowTs();
    await db.run('INSERT INTO bike_locations(bike_id,ts,lat,lng,battery,speed) VALUES(?,?,?,?,?,?)', [bike.id, ts, b.lat, b.lng, b.battery ?? bike.battery_level, b.speed ?? 0]);
    await db.run('UPDATE bikes SET lat=?, lng=?, battery_level=COALESCE(?,battery_level), last_seen=?, odometer_km=odometer_km+COALESCE(?,0) WHERE id=?', [b.lat, b.lng, b.battery ?? null, ts, b.km_delta ?? null, bike.id]);
    return { ok: true, bike_id: bike.id, lock: !!bike.lock_requested };
  }
  async function simulate() {
    // moves rented bikes a little – for demo / testing without real GPS trackers
    const bikes = await db.all("SELECT * FROM bikes WHERE status='kirada' AND lat IS NOT NULL");
    await db.tx(async () => {
      for (const b of bikes) {
        const lat = b.lat + (Math.random() - 0.5) * 0.006; const lng = b.lng + (Math.random() - 0.5) * 0.01;
        await telemetry({ bike_id: b.id, lat: r6(lat), lng: r6(lng), battery: Math.max(3, (b.battery_level || 80) - Math.round(Math.random() * 3)), speed: Math.round(Math.random() * 22), km_delta: r2(Math.random() * 1.5) });
      }
    });
    return { moved: bikes.length };
  }
  const r6 = (n) => Math.round(n * 1e6) / 1e6;
  // quick actions from the map / bike page. lock_requested is sent back to the GPS tracker on its next ping (telemetry → lock: true)
  async function bikeAction(id, b, user) {
    const bike = await getOne('bikes', id);
    const active = await db.get("SELECT id FROM rentals WHERE bike_id=? AND status='aktif'", [id]);
    const stamp = nowTs().slice(0, 16); const note = String(b.note || '').trim().slice(0, 300);
    const addNote = (txt) => db.run('UPDATE bikes SET notes=? WHERE id=?', [`[${stamp}] ${txt}${note ? ': ' + note : ''}\n${bike.notes || ''}`.trim().slice(0, 4000), id]);
    if (b.action === 'stop') {
      await db.run('UPDATE bikes SET lock_requested=1, status=? WHERE id=?', [active ? bike.status : 'hizmet dışı', id]);
      await addNote('Durduruldu (kilit komutu)');
    } else if (b.action === 'stolen') {
      await db.run("UPDATE bikes SET lock_requested=1, status='kayıp/çalıntı', stolen_at=? WHERE id=?", [nowTs(), id]);
      const loc = bike.lat != null ? ` · son konum ${r6(bike.lat)}, ${r6(bike.lng)} (${bike.last_seen || '—'})` : '';
      await addNote('Çalıntı bildirildi' + loc);
    } else if (b.action === 'resume') {
      const st = active ? 'kirada' : ['hizmet dışı', 'kayıp/çalıntı'].includes(bike.status) ? 'müsait' : bike.status;
      await db.run('UPDATE bikes SET lock_requested=0, stolen_at=NULL, status=? WHERE id=?', [st, id]);
      await addNote(bike.status === 'kayıp/çalıntı' ? 'Bulundu, tekrar aktif' : 'Tekrar aktif');
    } else err(400, 'Bilinmeyen işlem.');
    await audit(user, { stop: 'durdurma', stolen: 'çalıntı bildirimi', resume: 'aktifleştirme' }[b.action], 'bikes', id, `${bike.code}${note ? ' · ' + note : ''}`);
    return await getOne('bikes', id);
  }
  // parts at or under minimum stock, grouped by supplier, with a suggested order quantity
  async function reorderList() {
    const rows = await db.all(`SELECT p.id, p.sku, p.name, p.category, p.unit, p.cost, p.stock, p.min_stock, p.location, p.supplier_id,
        s.name AS supplier_name, s.contact AS supplier_contact, s.phone AS supplier_phone, s.email AS supplier_email, s.lead_days
      FROM parts p LEFT JOIN suppliers s ON s.id=p.supplier_id WHERE p.stock <= p.min_stock ORDER BY s.name IS NULL, s.name, p.name`);
    for (const r of rows) { r.suggested = Math.max(1, Math.ceil(r.min_stock * 2 - r.stock)); r.line_total = r2(r.suggested * (r.cost || 0)); }
    return { date: today(), items: rows, total: r2(rows.reduce((a, r) => a + r.line_total, 0)) };
  }

  // ---------- notifications ----------
  async function notifications(user) {
    const n = []; const t = today();
    const add = (level, perm, title, text, link) => { if (can(user, perm)) n.push({ level, title, text, link }); };
    for (const i of await db.all("SELECT i.*, COALESCE(c.company_name,c.name) AS cl FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.status IN ('açık','kısmi') AND i.due_date < ? ORDER BY i.due_date", [t]))
      add(daysBetween(i.due_date, t) > 14 ? 'danger' : 'warn', 'finance', 'Geciken ödeme', `${i.invoice_no} · ${i.cl} · ${r2(i.total + i.late_fee - i.paid_amount)} € · ${daysBetween(i.due_date, t)} gün`, `#/invoices/${i.id}`);
    for (const r of await db.all("SELECT r.*, b.code, COALESCE(c.company_name,c.name) AS cl FROM rentals r JOIN bikes b ON b.id=r.bike_id JOIN customers c ON c.id=r.customer_id WHERE r.status='aktif' AND r.end_date < ?", [t]))
      add('danger', 'rentals', 'Geciken iade', `${r.code} · ${r.cl} · dönüş ${r.end_date}`, `#/rentals/${r.id}`);
    for (const r of await db.all("SELECT r.*, b.code, COALESCE(c.company_name,c.name) AS cl FROM rentals r JOIN bikes b ON b.id=r.bike_id JOIN customers c ON c.id=r.customer_id WHERE r.status='aktif' AND r.end_date BETWEEN ? AND ?", [t, addDays(t, 3)]))
      add('info', 'rentals', 'Yaklaşan iade', `${r.code} · ${r.cl} · ${r.end_date}`, `#/rentals/${r.id}`);
    for (const r of await db.all("SELECT r.*, COALESCE(c.company_name,c.name) AS cl FROM rentals r JOIN customers c ON c.id=r.customer_id WHERE r.status IN ('aktif','rezervasyon') AND r.deposit_amount>0 AND r.deposit_status='bekliyor'"))
      add('warn', 'finance', 'Depozito alınmadı', `${r.contract_no} · ${r.cl} · ${r.deposit_amount} €`, `#/rentals/${r.id}`);
    for (const p of await db.all('SELECT * FROM parts WHERE stock <= min_stock ORDER BY stock'))
      add(p.stock <= 0 ? 'danger' : 'warn', 'stock', 'Kritik stok', `${p.sku} ${p.name}: ${p.stock} ${p.unit} (min ${p.min_stock})`, `#/parts/${p.id}`);
    for (const b of await db.all("SELECT * FROM bikes WHERE status='kayıp/çalıntı'"))
      add('danger', 'fleet', 'Çalıntı / kayıp bisiklet', `${b.code}${b.stolen_at ? ' · ' + b.stolen_at.slice(0, 10) : ''}${b.last_seen ? ' · son sinyal ' + b.last_seen : ''}`, `#/bikes/${b.id}`);
    for (const b of await db.all("SELECT * FROM bikes WHERE next_service_date <= ? AND status NOT IN ('serviste','hizmet dışı','kayıp/çalıntı')", [addDays(t, 7)]))
      add(b.next_service_date < t ? 'warn' : 'info', 'service', 'Bakım zamanı', `${b.code}: ${b.next_service_date}`, `#/bikes/${b.id}`);
    for (const b of await db.all("SELECT * FROM bikes WHERE battery_level < ? AND status='kirada'", [Number(setting('low_battery_alert')) || 20]))
      add('info', 'fleet', 'Düşük batarya', `${b.code}: %${b.battery_level}`, `#/bikes/${b.id}`);
    for (const b of await db.all("SELECT * FROM bikes WHERE status='kirada' AND (last_seen IS NULL OR last_seen < datetime('now','-1 day'))"))
      add('warn', 'fleet', 'GPS sinyali yok', `${b.code}: son sinyal ${b.last_seen || '—'}`, `#/bikes/${b.id}`);
    for (const b of await db.all("SELECT * FROM bikes WHERE insurance_until IS NOT NULL AND insurance_until <= ?", [addDays(t, 30)]))
      add('warn', 'fleet', 'Sigorta bitiyor', `${b.code}: ${b.insurance_until}`, `#/bikes/${b.id}`);
    for (const s of await db.all("SELECT s.*, b.code FROM service_orders s JOIN bikes b ON b.id=s.bike_id WHERE s.status NOT IN ('teslim edildi','iptal') AND s.estimated_ready < ?", [t]))
      add('warn', 'service', 'Servis gecikti', `${s.order_no} · ${s.code} · tahmini ${s.estimated_ready}`, `#/service/${s.id}`);
    for (const x of await db.all("SELECT id, name, created_at FROM riders WHERE self_registered=1 AND id_checked=0 AND active=1 ORDER BY id DESC LIMIT 30"))
      add('info', 'customers', 'Yeni sürücü kaydı', `${x.name} · ${String(x.created_at || '').slice(0, 10)} · kimlik kontrolü bekliyor`, `#/riders/${x.id}`);
    for (const q of await db.all("SELECT q.*, rd.name AS rn, b.code FROM portal_requests q LEFT JOIN riders rd ON rd.id=q.rider_id LEFT JOIN bikes b ON b.id=q.bike_id WHERE q.status='yeni' ORDER BY q.id"))
      add('info', 'rentals', 'Yeni sürücü talebi', `${q.rn} · ${q.type}${q.code ? ' · ' + q.code : ''}${q.preferred_date ? ' · ' + q.preferred_date : ''}`, `#/portal_requests/${q.id}`);
    const rank = { danger: 0, warn: 1, info: 2 };
    return n.sort((a, b) => rank[a.level] - rank[b.level]);
  }

  // ---------- dashboard & reports ----------
  async function dashboard(user) {
    const t = today(); const m0 = t.slice(0, 7) + '-01';
    const one = async (sql, p = []) => Object.values((await db.get(sql, p)) || {})[0] || 0;
    const fleet = await db.all('SELECT status, COUNT(*) AS n FROM bikes GROUP BY status');
    const total = fleet.reduce((a, x) => a + x.n, 0);
    const rented = fleet.find((x) => x.status === 'kirada')?.n || 0;
    const months = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(t + 'T00:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    const inv = Object.fromEntries((await db.all("SELECT substr(issue_date,1,7) AS m, SUM(net) AS s FROM invoices WHERE status<>'iptal' GROUP BY m")).map((x) => [x.m, x.s]));
    const pay = Object.fromEntries((await db.all("SELECT substr(date,1,7) AS m, SUM(amount) AS s FROM payments GROUP BY m")).map((x) => [x.m, x.s]));
    const fin = can(user, 'finance');
    return {
      kpi: {
        bikes_total: total, bikes_rented: rented, utilization: total ? Math.round((rented / total) * 100) : 0,
        bikes_available: fleet.find((x) => x.status === 'müsait')?.n || 0,
        bikes_service: (fleet.find((x) => x.status === 'serviste')?.n || 0) + (fleet.find((x) => x.status === 'arızalı')?.n || 0),
        active_rentals: await one("SELECT COUNT(*) FROM rentals WHERE status='aktif'"),
        reservations: await one("SELECT COUNT(*) FROM rentals WHERE status='rezervasyon'"),
        late_returns: await one("SELECT COUNT(*) FROM rentals WHERE status='aktif' AND end_date < ?", [t]),
        customers: await one('SELECT COUNT(*) FROM customers'),
        open_service: await one("SELECT COUNT(*) FROM service_orders WHERE status NOT IN ('teslim edildi','iptal')"),
        low_stock: await one('SELECT COUNT(*) FROM parts WHERE stock <= min_stock'),
        ...(fin ? {
          revenue_month: r2(await one("SELECT SUM(net) FROM invoices WHERE status<>'iptal' AND issue_date >= ?", [m0])),
          collected_month: r2(await one('SELECT SUM(amount) FROM payments WHERE date >= ?', [m0])),
          receivables: r2(await one("SELECT SUM(total+late_fee-paid_amount) FROM invoices WHERE status IN ('açık','kısmi')")),
          overdue_amount: r2(await one("SELECT SUM(total+late_fee-paid_amount) FROM invoices WHERE status IN ('açık','kısmi') AND due_date < ?", [t])),
          overdue_count: await one("SELECT COUNT(*) FROM invoices WHERE status IN ('açık','kısmi') AND due_date < ?", [t]),
          deposits_held: r2(await one("SELECT SUM(CASE WHEN type='tahsil' THEN amount ELSE -amount END) FROM deposits")),
          mrr: r2(await one("SELECT SUM(CASE period WHEN 'ay' THEN rate WHEN 'hafta' THEN rate*52.0/12 ELSE rate*30 END) FROM rentals WHERE status='aktif'")),
          stock_value: r2(await one('SELECT SUM(stock*cost) FROM parts')),
        } : {}),
      },
      fleet,
      by_type: await db.all("SELECT type, COUNT(*) AS n, SUM(status='kirada') AS rented FROM bikes GROUP BY type"),
      monthly: fin ? months.map((m) => ({ m, invoiced: r2(inv[m] || 0), collected: r2(pay[m] || 0) })) : [],
      late_returns: await db.all("SELECT r.id, r.contract_no, r.end_date, b.code, COALESCE(c.company_name,c.name) AS customer FROM rentals r JOIN bikes b ON b.id=r.bike_id JOIN customers c ON c.id=r.customer_id WHERE r.status='aktif' AND r.end_date < ? ORDER BY r.end_date", [t]),
      overdue: fin ? await db.all("SELECT i.id, i.invoice_no, i.due_date, (i.total+i.late_fee-i.paid_amount) AS balance, COALESCE(c.company_name,c.name) AS customer, c.name AS customer_name, c.phone AS customer_phone, c.doc_lang AS customer_lang, CAST(julianday(?)-julianday(i.due_date) AS INTEGER) AS days FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.status IN ('açık','kısmi') AND i.due_date < ? ORDER BY i.due_date LIMIT 8", [t, t]) : [],
      upcoming_returns: await db.all("SELECT r.id, r.contract_no, r.end_date, b.code, COALESCE(c.company_name,c.name) AS customer FROM rentals r JOIN bikes b ON b.id=r.bike_id JOIN customers c ON c.id=r.customer_id WHERE r.status='aktif' AND r.end_date BETWEEN ? AND ? ORDER BY r.end_date LIMIT 8", [t, addDays(t, 14)]),
      open_service: await db.all("SELECT s.id, s.order_no, s.status, s.type, s.estimated_ready, b.code FROM service_orders s JOIN bikes b ON b.id=s.bike_id WHERE s.status NOT IN ('teslim edildi','iptal') ORDER BY s.received_at LIMIT 8"),
      low_stock: await db.all('SELECT id, sku, name, stock, min_stock, unit FROM parts WHERE stock <= min_stock ORDER BY stock LIMIT 8'),
      recent: await db.all('SELECT a.ts, a.action, a.details, u.name AS user FROM audit_log a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 10'),
    };
  }
  async function reports(q) {
    const from = q.from || addDays(today(), -365); const to = q.to || today();
    const days = Math.max(1, daysBetween(from, to) + 1);
    const util = await db.all(`SELECT b.id, b.code, b.type, b.model, b.status,
        COALESCE((SELECT SUM(julianday(MIN(COALESCE(r.returned_at, r.end_date, ?), ?)) - julianday(MAX(r.start_date, ?)) + 1) FROM rentals r
          WHERE r.bike_id=b.id AND r.status IN ('aktif','tamamlandı') AND r.start_date <= ? AND COALESCE(r.returned_at, r.end_date) >= ?),0) AS rented_days,
        COALESCE((SELECT SUM(i.net) FROM invoices i JOIN rentals r ON r.id=i.rental_id WHERE r.bike_id=b.id AND i.status<>'iptal' AND i.issue_date BETWEEN ? AND ?),0) AS revenue,
        COALESCE((SELECT SUM(sp.qty*p.cost) FROM service_parts sp JOIN parts p ON p.id=sp.part_id JOIN service_orders s ON s.id=sp.service_id WHERE s.bike_id=b.id AND s.received_at BETWEEN ? AND ?),0)
          + COALESCE((SELECT SUM(s.labor_hours*s.labor_rate) FROM service_orders s WHERE s.bike_id=b.id AND s.received_at BETWEEN ? AND ?),0) AS service_cost,
        (SELECT COUNT(*) FROM service_orders s WHERE s.bike_id=b.id AND s.received_at BETWEEN ? AND ?) AS service_count
      FROM bikes b ORDER BY b.code`, [to, to, from, to, from, from, to, from, to + ' 23:59', from, to + ' 23:59', from, to + ' 23:59']);
    util.forEach((u) => { u.rented_days = Math.round(u.rented_days); u.utilization = Math.round((u.rented_days / days) * 100); u.revenue = r2(u.revenue); u.service_cost = r2(u.service_cost); u.margin = r2(u.revenue - u.service_cost); });
    return {
      from, to,
      revenue_by_month: await db.all("SELECT substr(issue_date,1,7) AS m, ROUND(SUM(net),2) AS net, ROUND(SUM(total),2) AS gross, ROUND(SUM(paid_amount),2) AS paid FROM invoices WHERE status<>'iptal' AND issue_date BETWEEN ? AND ? GROUP BY m ORDER BY m", [from, to]),
      top_customers: await db.all("SELECT c.id, COALESCE(c.company_name,c.name) AS customer, COUNT(DISTINCT r.id) AS rentals, ROUND(COALESCE(SUM(i.net),0),2) AS revenue, ROUND(COALESCE(SUM(CASE WHEN i.status IN ('açık','kısmi') THEN i.total+i.late_fee-i.paid_amount END),0),2) AS open FROM customers c LEFT JOIN invoices i ON i.customer_id=c.id AND i.issue_date BETWEEN ? AND ? AND i.status<>'iptal' LEFT JOIN rentals r ON r.id=i.rental_id GROUP BY c.id ORDER BY revenue DESC LIMIT 20", [from, to]),
      utilization: util,
      parts_usage: await db.all("SELECT p.sku, p.name, p.category, SUM(m.qty) AS qty, ROUND(SUM(m.qty*COALESCE(m.unit_cost,p.cost)),2) AS cost FROM stock_moves m JOIN parts p ON p.id=m.part_id WHERE m.type='çıkış' AND m.date BETWEEN ? AND ? GROUP BY p.id ORDER BY qty DESC", [from, to]),
      service_by_type: await db.all("SELECT type, COUNT(*) AS n, ROUND(AVG(julianday(COALESCE(delivered_at, datetime('now'))) - julianday(received_at)),1) AS avg_days FROM service_orders WHERE received_at BETWEEN ? AND ? GROUP BY type", [from, to + ' 23:59']),
      aging: await db.all(`SELECT CASE WHEN due_date >= date('now') THEN 'vadesi gelmemiş' WHEN julianday('now')-julianday(due_date) <= 30 THEN '1–30 gün'
          WHEN julianday('now')-julianday(due_date) <= 60 THEN '31–60 gün' ELSE '60+ gün' END AS bucket, COUNT(*) AS n, ROUND(SUM(total+late_fee-paid_amount),2) AS amount
          FROM invoices WHERE status IN ('açık','kısmi') GROUP BY bucket`),
    };
  }

  // ---------- details ----------
  async function bikeDetail(id, user) {
    const b = await getOne('bikes', id);
    b.current = await db.get(`SELECT r.*, COALESCE(c.company_name,c.name) AS customer_label, c.phone AS customer_phone, rd.name AS rider_name, rd.phone AS rider_phone
      FROM rentals r JOIN customers c ON c.id=r.customer_id LEFT JOIN riders rd ON rd.id=r.rider_id WHERE r.bike_id=? AND r.status IN ('aktif','rezervasyon') ORDER BY r.status='aktif' DESC LIMIT 1`, [id]) || null;
    b.rentals = await list('rentals', { bike_id: id });
    b.services = await list('service_orders', { bike_id: id });
    b.track = await db.all('SELECT ts, lat, lng, battery, speed FROM bike_locations WHERE bike_id=? ORDER BY ts DESC LIMIT 200', [id]);
    if (user && !can(user, 'rentals')) b.rentals = [];
    b.revenue = r2((await db.get("SELECT COALESCE(SUM(i.net),0) AS s FROM invoices i JOIN rentals r ON r.id=i.rental_id WHERE r.bike_id=? AND i.status<>'iptal'", [id])).s);
    b.costs = await list('bike_costs', { bike_id: id });
    b.economics = await bikeEconomics(b);
    if (user && !can(user, 'finance')) { b.economics = null; b.revenue = null; }
    return b;
  }
  // profitability: net income (rental + service invoices, not cancelled) minus parts used and recorded costs, against the purchase cost
  async function bikeEconomics(b) {
    const one = async (sql) => Number((await db.get(sql, [b.id, b.id]))?.s) || 0;
    const income = await one("SELECT COALESCE(SUM(i.net),0) AS s FROM invoices i WHERE i.status<>'iptal' AND (i.rental_id IN (SELECT id FROM rentals WHERE bike_id=?) OR i.service_id IN (SELECT id FROM service_orders WHERE bike_id=?))");
    const parts = await one("SELECT COALESCE(SUM(sp.qty*p.cost),0) AS s FROM service_parts sp JOIN parts p ON p.id=sp.part_id JOIN service_orders s ON s.id=sp.service_id WHERE s.bike_id=? AND s.status<>'iptal' AND ?>0");
    const other = await one('SELECT COALESCE(SUM(amount),0) AS s FROM bike_costs WHERE bike_id=? AND ?>0');
    const labor = await one("SELECT COALESCE(SUM(labor_hours*labor_rate),0) AS s FROM service_orders WHERE bike_id=? AND status<>'iptal' AND ?>0");
    const purchase = Number(b.purchase_price) || 0;
    const net = r2(income - parts - other);
    const since = b.purchase_date || (await db.get('SELECT MIN(start_date) AS d FROM rentals WHERE bike_id=?', [b.id]))?.d || String(b.created_at || today()).slice(0, 10);
    const months = Math.max(1, daysBetween(since, today()) / 30.44);
    const monthly = r2(net / months);
    const remaining = r2(purchase - net);
    return {
      purchase, income: r2(income), parts_cost: r2(parts), other_cost: r2(other), labor_cost: r2(labor), net, since,
      profit: r2(net - purchase), pct: purchase > 0 ? Math.round((net / purchase) * 100) : null,
      monthly, payback_months: remaining > 0 && monthly > 0 ? Math.ceil(remaining / monthly) : null,
      by_category: await db.all('SELECT category, ROUND(SUM(amount),2) AS amount FROM bike_costs WHERE bike_id=? GROUP BY category ORDER BY amount DESC', [b.id]),
    };
  }
  async function rentalDetail(id, user) {
    const r = await getOne('rentals', id);
    r.customer = await db.get('SELECT * FROM customers WHERE id=?', [r.customer_id]);
    r.rider = r.rider_id ? await db.get('SELECT * FROM riders WHERE id=?', [r.rider_id]) : null;
    r.bike = await db.get('SELECT * FROM bikes WHERE id=?', [r.bike_id]);
    r.plan = r.plan_id ? await db.get('SELECT * FROM pricing_plans WHERE id=?', [r.plan_id]) : null;
    r.invoices = await list('invoices', { rental_id: id });
    r.deposits = await db.all('SELECT * FROM deposits WHERE rental_id=? ORDER BY date, id', [id]);
    r.deposit_held = r2(r.deposits.reduce((a, d) => a + (d.type === 'tahsil' ? d.amount : -d.amount), 0));
    r.services = await list('service_orders', { rental_id: id });
    r.documents = await listDocuments('rental', id);
    r.rider_documents = r.rider_id ? await listDocuments('rider', r.rider_id) : [];
    r.late_days = r.status === 'aktif' ? Math.max(0, daysBetween(r.end_date, today())) : 0;
    r.late_return_fee_per_day = Number(setting('late_return_fee_per_day'));
    if (user && !can(user, 'finance')) { r.invoices = []; r.deposits = []; }
    return r;
  }
  async function customerDetail(id, user) {
    const c = await getOne('customers', id);
    c.riders = await list('riders', { customer_id: id });
    c.documents = await listDocuments('customer', id);
    c.rentals = await list('rentals', { customer_id: id });
    c.invoices = await list('invoices', { customer_id: id });
    c.payments = await list('payments', { customer_id: id });
    c.balance = r2(c.invoices.filter((i) => ['açık', 'kısmi'].includes(i.status)).reduce((a, i) => a + i.balance, 0));
    c.overdue = r2(c.invoices.filter((i) => i.days_late > 0).reduce((a, i) => a + i.balance, 0));
    c.deposit_held = r2((await db.get("SELECT COALESCE(SUM(CASE WHEN type='tahsil' THEN amount ELSE -amount END),0) AS s FROM deposits WHERE customer_id=?", [id])).s);
    if (user && !can(user, 'finance')) { c.invoices = []; c.payments = []; c.balance = c.overdue = c.deposit_held = null; }
    return c;
  }
  async function riderDetail(id, user) {
    const r = await getOne('riders', id);
    r.customer = r.customer_id ? await db.get('SELECT * FROM customers WHERE id=?', [r.customer_id]) : null;
    r.rentals = await list('rentals', { rider_id: id });
    r.documents = await listDocuments('rider', id);
    r.requests = await list('portal_requests', { rider_id: id, limit: 50 });
    r.invoices = await db.all(`SELECT * FROM (${baseSql('invoices')}) AS t WHERE rental_id IN (SELECT id FROM rentals WHERE rider_id=?) ORDER BY issue_date DESC, id DESC`, [id]);
    r.deposits = await db.all('SELECT d.*, x.contract_no FROM deposits d JOIN rentals x ON x.id=d.rental_id WHERE x.rider_id=? ORDER BY d.date DESC, d.id DESC', [id]);
    if (user && !can(user, 'finance')) { r.invoices = []; r.deposits = []; for (const k of ['balance', 'open_balance', 'overdue', 'due_soon', 'pay_state', 'deposit_held', 'deposit_pending']) r[k] = null; }
    return r;
  }
  async function invoiceDetail(id) {
    const i = await getOne('invoices', id);
    i.customer = await db.get('SELECT * FROM customers WHERE id=?', [i.customer_id]);
    i.rental = i.rental_id ? await db.get('SELECT r.*, b.code AS bike_code FROM rentals r LEFT JOIN bikes b ON b.id=r.bike_id WHERE r.id=?', [i.rental_id]) : null;
    i.payments = await db.all('SELECT * FROM payments WHERE invoice_id=? ORDER BY date', [id]);
    i.suggested_late_fee = lateFeeFor(i);
    return i;
  }
  async function partDetail(id) {
    const p = await getOne('parts', id);
    p.moves = await list('stock_moves', { part_id: id, limit: 200 });
    p.used_in = await db.all('SELECT s.id, s.order_no, b.code, sp.qty, s.received_at FROM service_parts sp JOIN service_orders s ON s.id=sp.service_id JOIN bikes b ON b.id=s.bike_id WHERE sp.part_id=? ORDER BY s.id DESC LIMIT 50', [id]);
    return p;
  }

  // ---------- rider portal (sürücü ekranı) ----------
  // Riders sign in with the e-mail/password set by staff. They only ever see their own rentals, bikes,
  // documents and requests; invoices/payments only when they are the paying (individual) customer.
  const PORTAL_REQ = REQUEST_TYPES;
  const riderFromToken = async (token) => {
    if (!token) return null;
    const s = await db.get('SELECT * FROM rider_sessions WHERE token=? AND expires > ?', [token, nowTs()]);
    if (!s) return null;
    const r = await db.get('SELECT * FROM riders WHERE id=?', [s.rider_id]);
    return r && r.portal_active && r.active ? r : null;
  };
  const portalUser = (r) => ({ id: null, name: `${r.name} (sürücü ekranı)`, rider_id: r.id });
  async function portalData(r) {
    const t = today();
    const cust = r.customer_id ? await db.get('SELECT id,type,name,company_name,phone,email,doc_lang FROM customers WHERE id=?', [r.customer_id]) : null;
    const payer = !!cust && cust.type === 'bireysel';
    const rentals = await db.all(`SELECT x.id, x.contract_no, x.status, x.start_date, x.end_date, x.returned_at, x.period, x.rate, x.deposit_amount, x.deposit_status, x.customer_id,
        b.id AS bike_id, b.code AS bike_code, b.type AS bike_type, b.brand, b.model, b.color, b.battery_level, b.odometer_km, b.next_service_date, b.last_service_date, b.status AS bike_status, p.name AS plan_name
      FROM rentals x JOIN bikes b ON b.id=x.bike_id LEFT JOIN pricing_plans p ON p.id=x.plan_id WHERE x.rider_id=? ORDER BY CASE x.status WHEN 'aktif' THEN 0 WHEN 'rezervasyon' THEN 1 ELSE 2 END, x.start_date DESC LIMIT 20`, [r.id]);
    const vatRate = Number(setting('vat_rate')) || 0;
    for (const x of rentals) {
      x.late_days = x.status === 'aktif' ? Math.max(0, daysBetween(x.end_date, t)) : 0;
      x.deposit_held = r2((await db.get("SELECT COALESCE(SUM(CASE WHEN type='tahsil' THEN amount ELSE -amount END),0) AS s FROM deposits WHERE rental_id=?", [x.id])).s);
      if (x.status === 'aktif' && payer) {
        const last = (await db.get("SELECT MAX(period_end) AS pe FROM invoices WHERE rental_id=? AND period_end IS NOT NULL AND status<>'iptal'", [x.id]))?.pe;
        const next = last ? addDays(last, 1) : x.start_date;
        if (next <= x.end_date) x.next_charge = { date: next, amount: r2(x.rate * (1 + vatRate / 100)) };
      }
    }
    const rentalIds = rentals.map((x) => x.id);
    const inList = (ids) => (ids.length ? ids.join(',') : '0');
    const invoices = payer ? await db.all(`SELECT id, invoice_no, issue_date, due_date, description, total, late_fee, paid_amount, status, (total+late_fee-paid_amount) AS balance,
        CASE WHEN status IN ('açık','kısmi') AND due_date < ? THEN CAST(julianday(?)-julianday(due_date) AS INTEGER) ELSE 0 END AS days_late
      FROM invoices WHERE customer_id=? AND status<>'iptal' ORDER BY issue_date DESC, id DESC LIMIT 36`, [t, t, cust.id]) : [];
    for (const i of invoices) i.balance = r2(i.balance);
    const payments = payer ? await db.all('SELECT p.date, p.amount, p.method, i.invoice_no FROM payments p LEFT JOIN invoices i ON i.id=p.invoice_id WHERE p.customer_id=? ORDER BY p.date DESC, p.id DESC LIMIT 30', [cust.id]) : [];
    const services = await db.all(`SELECT s.id, s.order_no, s.type, s.status, s.received_at, s.estimated_ready, s.delivered_at, s.complaint, b.code AS bike_code
      FROM service_orders s JOIN bikes b ON b.id=s.bike_id WHERE s.brought_by_rider_id=? OR s.rental_id IN (${inList(rentalIds)}) ORDER BY s.id DESC LIMIT 20`, [r.id]);
    const requests = await db.all('SELECT q.id, q.type, q.status, q.preferred_date, q.preferred_time, q.notes, q.admin_note, q.bike_type, q.period, q.duration, q.created_at, q.handled_at, b.code AS bike_code FROM portal_requests q LEFT JOIN bikes b ON b.id=q.bike_id WHERE q.rider_id=? ORDER BY q.id DESC LIMIT 30', [r.id]);
    const documents = await listDocuments('rider', r.id);
    for (const d of documents) delete d.uploaded_by_name;
    const have = new Set(documents.map((d) => d.doc_type));
    const required = RIDER_REQUIRED_DOCS.filter((d) => !(have.has('Pasaport') && /^Kimlik/.test(d)));
    const missing = required.filter((d) => !have.has(d));
    // notifications (codes; the portal translates them)
    const n = []; const add = (level, code, p = {}) => n.push({ level, code, ...p });
    for (const x of rentals.filter((y) => y.status === 'aktif')) {
      if (x.late_days > 0) add('danger', 'return_late', { bike: x.bike_code, date: x.end_date, days: x.late_days });
      else if (x.end_date <= addDays(t, 7)) add('warn', 'return_soon', { bike: x.bike_code, date: x.end_date, days: daysBetween(t, x.end_date) });
      if (x.next_service_date && x.next_service_date <= addDays(t, 14)) add(x.next_service_date < t ? 'warn' : 'info', x.next_service_date < t ? 'service_overdue' : 'service_due', { bike: x.bike_code, date: x.next_service_date, days: daysBetween(t, x.next_service_date) });
      if (x.battery_level != null && x.battery_level < (Number(setting('low_battery_alert')) || 20)) add('info', 'battery_low', { bike: x.bike_code, pct: x.battery_level });
      if (x.deposit_amount > 0 && x.deposit_status === 'bekliyor') add('warn', 'deposit_open', { amount: x.deposit_amount });
    }
    for (const x of rentals.filter((y) => y.status === 'rezervasyon')) add('info', 'reservation', { bike: x.bike_code, date: x.start_date });
    for (const i of invoices.filter((y) => ['açık', 'kısmi'].includes(y.status))) {
      if (i.days_late > 0) add('danger', 'invoice_overdue', { no: i.invoice_no, amount: i.balance, date: i.due_date, days: i.days_late });
      else if (i.due_date <= addDays(t, 7)) add('warn', 'invoice_due', { no: i.invoice_no, amount: i.balance, date: i.due_date, days: daysBetween(t, i.due_date) });
    }
    if (missing.length) add('warn', 'docs_missing', { docs: missing });
    if (r.id_expiry && r.id_expiry < addDays(t, 30)) add(r.id_expiry < t ? 'danger' : 'warn', r.id_expiry < t ? 'id_expired' : 'id_expiring', { date: r.id_expiry });
    for (const q of requests.filter((y) => y.handled_at && y.handled_at >= addDays(t, -7) && ['onaylandı', 'reddedildi', 'tamamlandı'].includes(y.status))) add(q.status === 'reddedildi' ? 'warn' : 'ok', 'request_' + ({ 'onaylandı': 'ok', 'reddedildi': 'no', 'tamamlandı': 'done' })[q.status], { type: q.type, date: q.preferred_date, note: q.admin_note });
    for (const sv of services.filter((y) => y.status === 'hazır')) add('ok', 'service_ready', { no: sv.order_no, bike: sv.bike_code });
    const rank = { danger: 0, warn: 1, info: 2, ok: 3 };
    n.sort((a, b) => rank[a.level] - rank[b.level]);
    const open = invoices.filter((i) => ['açık', 'kısmi'].includes(i.status));
    return {
      rider: { id: r.id, name: r.name, phone: r.phone, email: r.email, portal_email: r.portal_email, lang: r.lang || cust?.doc_lang || setting('doc_lang') || 'de', id_type: r.id_type, id_no: r.id_no, id_expiry: r.id_expiry, address: r.address, birth_date: r.birth_date, nationality: r.nationality },
      customer: cust ? { name: cust.company_name || cust.name, type: cust.type } : null, payer,
      rentals, invoices, payments, services, requests, documents, required_docs: required, missing_docs: missing, notifications: n,
      summary: { open_balance: r2(open.reduce((a, i) => a + i.balance, 0)), overdue: r2(open.filter((i) => i.days_late > 0).reduce((a, i) => a + i.balance, 0)), next_due: open.slice().sort((a, b) => (a.due_date < b.due_date ? -1 : 1))[0] || null },
      company: { name: setting('company_name'), phone: setting('company_phone'), email: setting('company_email'), address: setting('company_address'), iban: setting('company_iban') },
      request_types: PORTAL_REQ,
      bike_types: String(setting('bike_types') || '').split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean),
      plans: (await db.all('SELECT bike_type, period, price, deposit FROM pricing_plans WHERE active=1 ORDER BY bike_type, price')).filter((p) => enabledPeriods(SETTINGS).includes(p.period)),
      periods: enabledPeriods(SETTINGS),
      vat_rate: vatRate, self_registered: !!r.self_registered,
    };
  }
  async function portalHandle(seg, method, body, token) {
    const [, b, c] = seg;
    if (b === 'config' && method === 'GET') return ok({ signup: setting('portal_signup') !== '0', company: setting('company_name'), id_types: ID_TYPES });
    if (b === 'bike-types' && method === 'GET') return ok(await bikeTypeList());
    if (b === 'signup' && method === 'POST') {
      // self-registration from the rider screen: creates a rider + an individual customer; staff checks the ID before renting
      if (setting('portal_signup') === '0') err(403, 'Kayıt şu an kapalı. Lütfen bizimle iletişime geçin.');
      if (body.website) err(400, 'Geçersiz istek.'); // honeypot for bots
      const s = (k, n = 120) => String(body[k] ?? '').trim().slice(0, n);
      const email = s('email').toLowerCase();
      if (s('name').length < 3 || !/\s/.test(s('name'))) err(400, 'Ad ve soyadınızı yazın.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err(400, 'Geçerli bir e-posta yazın.');
      if (String(body.password || '').length < 6) err(400, 'Şifre en az 6 karakter olmalı.');
      if (s('phone').replace(/\D/g, '').length < 6) err(400, 'Telefon numaranızı yazın.');
      if (!body.consent) err(400, 'Devam etmek için bilgilendirmeyi onaylayın.');
      if (await db.get('SELECT 1 FROM riders WHERE lower(portal_email)=?', [email])) err(409, 'Bu e-posta ile zaten bir hesap var. Giriş yapın.');
      const recent = (await db.get("SELECT COUNT(*) AS n FROM riders WHERE self_registered=1 AND created_at > datetime('now','-1 hour')"))?.n || 0;
      if (recent > 30) err(429, 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.');
      const lang = ['tr', 'de', 'en'].includes(body.lang) ? body.lang : 'de';
      const p = { name: s('name'), phone: s('phone', 40), email, address: s('address', 300) || null, id_no: s('id_no', 40) || null, doc_lang: lang === 'tr' ? 'de' : lang };
      const sys = { id: null };
      const cid = await directCustomer(p, sys);
      const x = await db.run(`INSERT INTO riders(customer_id,name,phone,email,address,birth_date,nationality,id_type,id_no,active,trained,id_checked,portal_email,portal_password_hash,portal_active,lang,self_registered)
        VALUES(?,?,?,?,?,?,?,?,?,1,0,0,?,?,1,?,1)`, [cid, p.name, p.phone, email, p.address, s('birth_date', 10) || null, s('nationality', 60) || null, ID_TYPES.includes(body.id_type) ? body.id_type : null, p.id_no, email, hashPassword(String(body.password)), lang]);
      await audit({ id: null }, 'sürücü kaydı', 'riders', x.lastId, `${p.name} sürücü ekranından kayıt oldu`);
      const tok = randomToken(); const exp = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 19).replace('T', ' ');
      await db.run('INSERT INTO rider_sessions(token,rider_id,expires) VALUES(?,?,?)', [tok, x.lastId, exp]);
      await db.run('UPDATE riders SET portal_last_login=? WHERE id=?', [nowTs(), x.lastId]);
      return ok({ token: tok });
    }
    if (b === 'login' && method === 'POST') {
      const r = await db.get('SELECT * FROM riders WHERE lower(portal_email)=lower(?)', [String(body.email || '').trim()]);
      if (!r || !r.portal_active || !r.active || !r.portal_password_hash || !verifyPassword(body.password || '', r.portal_password_hash)) err(401, 'E-posta veya şifre hatalı.');
      const tok = randomToken(); const exp = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 19).replace('T', ' ');
      await db.run('INSERT INTO rider_sessions(token,rider_id,expires) VALUES(?,?,?)', [tok, r.id, exp]);
      await db.run('UPDATE riders SET portal_last_login=? WHERE id=?', [nowTs(), r.id]);
      return ok({ token: tok });
    }
    const r = await riderFromToken(token);
    if (!r) err(401, 'Oturum açın.');
    if (b === 'logout') { await db.run('DELETE FROM rider_sessions WHERE token=?', [token]); return ok({ ok: true }); }
    if (b === 'me' && method === 'GET') return ok(await portalData(r));
    if (b === 'location' && method === 'POST') {
      // phone location sent from the rider screen (only while it is open and the rider allowed it)
      const lat = Number(body.lat), lng = Number(body.lng), acc = Number(body.acc);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) err(400, 'Geçersiz konum.');
      await db.run('UPDATE riders SET last_lat=?, last_lng=?, last_loc_at=?, last_loc_acc=? WHERE id=?', [r6(lat), r6(lng), nowTs(), Number.isFinite(acc) ? Math.round(acc) : null, r.id]);
      return ok({ ok: true });
    }
    if (b === 'me' && method === 'PUT') {
      if (body.lang && ['tr', 'de', 'en'].includes(body.lang)) await db.run('UPDATE riders SET lang=? WHERE id=?', [body.lang, r.id]);
      if (body.phone !== undefined) await db.run('UPDATE riders SET phone=? WHERE id=?', [String(body.phone || '').slice(0, 40) || null, r.id]);
      if (body.new_password) {
        if (!verifyPassword(body.current_password || '', r.portal_password_hash)) err(400, 'Mevcut şifre hatalı.');
        if (String(body.new_password).length < 6) err(400, 'Yeni şifre en az 6 karakter olmalı.');
        await db.run('UPDATE riders SET portal_password_hash=? WHERE id=?', [hashPassword(String(body.new_password)), r.id]);
        await db.run('DELETE FROM rider_sessions WHERE rider_id=? AND token<>?', [r.id, token]);
      }
      return ok(await portalData(await db.get('SELECT * FROM riders WHERE id=?', [r.id])));
    }
    if (b === 'requests' && method === 'POST' && !c) {
      if (!PORTAL_REQ.includes(body.type)) err(400, 'Geçersiz talep türü.');
      let rental = null;
      if (body.rental_id) rental = await db.get('SELECT * FROM rentals WHERE id=? AND rider_id=?', [Number(body.rental_id), r.id]) || err(404, 'Kiralama bulunamadı.');
      else if (body.type !== 'yeni kiralama') rental = await db.get("SELECT * FROM rentals WHERE rider_id=? AND status IN ('aktif','rezervasyon') ORDER BY status='aktif' DESC, id DESC LIMIT 1", [r.id]);
      if (body.type !== 'yeni kiralama' && !rental) err(400, 'Aktif kiralamanız yok.');
      if (body.preferred_date && body.preferred_date < today()) err(400, 'Geçmiş bir tarih seçilemez.');
      if (['servis randevusu', 'iade randevusu', 'kiralama uzatma', 'yeni kiralama'].includes(body.type) && !body.preferred_date) err(400, 'Tarih seçin.');
      let rent = {};
      if (body.type === 'yeni kiralama') {
        const types = String(setting('bike_types') || '').split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
        rent = { bike_type: types.includes(body.bike_type) ? body.bike_type : null, period: enabledPeriods(SETTINGS).includes(body.period) ? body.period : enabledPeriods(SETTINGS)[0], duration: Math.min(52, Math.max(1, Math.round(Number(body.duration) || 1))) };
        if (await db.get("SELECT 1 FROM portal_requests WHERE rider_id=? AND type='yeni kiralama' AND status='yeni'", [r.id])) err(409, 'Bekleyen bir kiralama talebiniz zaten var.');
      }
      const x = await db.run('INSERT INTO portal_requests(rider_id,customer_id,rental_id,bike_id,type,preferred_date,preferred_time,notes,bike_type,period,duration) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        [r.id, rental?.customer_id || r.customer_id, rental?.id || null, rental?.bike_id || null, body.type, body.preferred_date || null, String(body.preferred_time || '').slice(0, 20) || null, String(body.notes || '').slice(0, 1000) || null, rent.bike_type ?? null, rent.period ?? null, rent.duration ?? null]);
      await audit(portalUser(r), 'sürücü talebi', 'portal_requests', x.lastId, `${r.name}: ${body.type}`);
      return ok(await portalData(r));
    }
    if (b === 'requests' && method === 'POST' && seg[3] === 'cancel') {
      const q = await db.get('SELECT * FROM portal_requests WHERE id=? AND rider_id=?', [Number(c), r.id]) || err(404, 'Talep bulunamadı.');
      if (q.status !== 'yeni') err(409, 'Sadece yeni talepler iptal edilebilir.');
      await db.run("UPDATE portal_requests SET status='iptal', handled_at=? WHERE id=?", [nowTs(), q.id]);
      return ok(await portalData(r));
    }
    if (b === 'documents' && method === 'POST' && !c) {
      await addDocument({ ...body, owner_type: 'rider', owner_id: r.id, notes: 'Sürücü ekranından yüklendi' }, null);
      return ok(await portalData(r));
    }
    if (b === 'documents' && method === 'GET' && c) {
      const d = await db.get("SELECT * FROM documents WHERE id=? AND owner_type='rider' AND owner_id=?", [Number(c), r.id]) || err(404, 'Belge bulunamadı.');
      return ok(d);
    }
    err(404, 'Bulunamadı.');
  }

  // ---------- router ----------
  const permOf = (res) => RESOURCES[res]?.perm;
  async function handle({ method, path, query = {}, body = {}, token }) {
    try {
      await getSettings();
      const seg = path.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
      const [a, b, c] = seg;
      if (a === 'login' && method === 'POST') {
        const u = await db.get('SELECT * FROM users WHERE lower(email)=lower(?)', [body.email || '']);
        if (!u || !u.active || !verifyPassword(body.password || '', u.password_hash)) err(401, 'E-posta veya şifre hatalı.');
        const tok = randomToken(); const exp = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 19).replace('T', ' ');
        await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)', [tok, u.id, exp]);
        await db.run('UPDATE users SET last_login=? WHERE id=?', [nowTs(), u.id]);
        await audit(u, 'giriş', 'users', u.id);
        return ok({ token: tok });
      }
      if (a === 'telemetry' && method === 'POST') {
        // GPS trackers authenticate with the shared device key from settings
        const key = setting('telemetry_key');
        if (key && body.key !== key && !await userFromToken(token)) err(401, 'Geçersiz cihaz anahtarı.');
        if (Array.isArray(body.points)) { const out = []; for (const pt of body.points) out.push(await telemetry(pt)); return ok(out); }
        return ok(await telemetry(body));
      }
      if (a === 'portal') return await portalHandle(seg, method, body, token);
      const user = await userFromToken(token);
      if (!user) err(401, 'Oturum açın.');
      if (a === 'logout') { await db.run('DELETE FROM sessions WHERE token=?', [token]); return ok({ ok: true }); }
      if (a === 'me') return ok({ user, perms: rolePerms()[user.role], roles: ROLES, settings: await publicSettings() });
      if (a === 'dashboard') { need(user, 'dashboard'); return ok(await dashboard(user)); }
      if (a === 'notifications') return ok(await notifications(user));
      if (a === 'reports') { need(user, 'reports'); return ok(await reports(query)); }
      if (a === 'simulate' && method === 'POST') { need(user, 'fleet', 'w'); return ok(await simulate()); }
      if (a === 'lookup' && b === 'users') {
        // staff list (names only) – needed by every role for technician / assignee pickers
        return ok((await list('users', { ...query, active: 1 })).map((r) => ({ id: r.id, label: r.name, raw: { id: r.id, name: r.name, role: r.role } })));
      }
      if (a === 'lookup') {
        need(user, permOf(b) || 'admin');
        const meta = RESOURCES[b];
        return ok((await list(b, { ...query, limit: 2000 })).map((r) => ({ id: r.id, label: meta.title ? meta.title(r) : r.name, raw: r })));
      }
      if (a === 'settings') {
        need(user, 'admin', method === 'GET' ? 'r' : 'w');
        if (method === 'PUT') {
          for (const [k, v] of Object.entries(body)) if (k in DEFAULT_SETTINGS || k === 'telemetry_key') await db.run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [k, String(v ?? '')]);
          await audit(user, 'ayarlar', 'settings', null, Object.keys(body).join(', '));
        }
        const s = await getSettings(); return ok(Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('seq_') && !k.startsWith('img_type:') && k !== 'role_perms')));
      }
      if (a === 'wipe' && method === 'POST') {
        // removes all business data (sample/test data); keeps settings, roles and the signed-in admin
        need(user, 'admin', 'w');
        if (!/^s[iıİI]l$/i.test(String(body.confirm || '').trim())) err(400, 'Onay için SİL yazın.');
        const keep = new Set(['settings', 'users', 'sessions']);
        const tables = (await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")).map((t) => t.name).filter((t) => !keep.has(t));
        const deps = {};
        for (const t of tables) deps[t] = (await db.all(`PRAGMA foreign_key_list(${t})`)).map((f) => f.table).filter((x) => x !== t && tables.includes(x));
        const order = []; const seen = new Set();
        const visit = (t) => { if (seen.has(t)) return; seen.add(t); deps[t].forEach(visit); order.push(t); };
        tables.forEach(visit);
        const counts = {};
        await db.tx(async () => {
          for (const t of order.reverse()) counts[t] = (await db.run(`DELETE FROM ${t}`)).changes;
          await db.run("DELETE FROM settings WHERE key LIKE 'seq\\_%' ESCAPE '\\'");
          if (body.keep_users !== true) {
            await db.run('DELETE FROM sessions WHERE user_id <> ?', [user.id]);
            counts.users = (await db.run('DELETE FROM users WHERE id <> ?', [user.id])).changes;
          }
        });
        await audit(user, 'veri silme', 'system', null, 'Tüm örnek/test verileri silindi');
        return ok({ deleted: counts });
      }
      if (a === 'bike-types') {
        // bike type pictures (shown to riders); stored as settings keys img_type:<name>, never sent with /me
        if (method === 'PUT') {
          need(user, 'admin', 'w');
          const type = String(body.type || '').trim(); if (!type) err(400, 'Tip seçin.');
          if (body.data) { if (!/^data:image\/(jpeg|png|webp);base64,/.test(body.data) || body.data.length > 700000) err(400, 'Görsel JPG/PNG olmalı ve en fazla ~500 KB.'); await db.run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', ['img_type:' + type, body.data]); }
          else await db.run('DELETE FROM settings WHERE key=?', ['img_type:' + type]);
          await audit(user, 'ayarlar', 'settings', null, `Bisiklet tipi görseli: ${type}`);
        }
        return ok(await bikeTypeList());
      }
      if (a === 'roles') {
        if (method === 'PUT') {
          need(user, 'admin', 'w');
          const next = body; next.admin = DEFAULT_ROLE_PERMS.admin; // admin always full
          await db.run("INSERT INTO settings(key,value) VALUES('role_perms',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [JSON.stringify(next)]);
          await audit(user, 'yetki', 'roles', null, 'Rol yetkileri güncellendi');
          await getSettings();
        }
        need(user, 'admin');
        return ok({ roles: ROLES, perms: PERMS, matrix: rolePerms() });
      }
      // detail endpoints
      if (a === 'detail') {
        const fn = { bikes: bikeDetail, rentals: rentalDetail, riders: riderDetail, customers: customerDetail, invoices: invoiceDetail, service_orders: serviceDetail, parts: partDetail }[b];
        if (!fn) err(404, 'Bilinmeyen detay.');
        need(user, permOf(b));
        return ok(await fn(Number(c), user));
      }
      // custom actions
      if (a === 'rentals' && method === 'POST' && !b) { need(user, 'rentals', 'w'); return ok(await createRental(body, user)); }
      if (a === 'rentals' && method === 'POST' && c) {
        need(user, 'rentals', 'w');
        const id = Number(b);
        if (c === 'return') return ok(await returnRental(id, body, user));
        if (c === 'extend') return ok(await extendRental(id, body, user));
        if (c === 'activate') return ok(await activateRental(id, user));
        if (c === 'cancel') return ok(await cancelRental(id, user));
        if (c === 'deposit') { need(user, 'finance', 'w'); return ok(await collectDeposit(id, body, user)); }
        if (c === 'bill') { need(user, 'finance', 'w'); return ok({ created: await billRental(id, user) }); }
      }
      if (a === 'bikes' && b === 'by-uid' && method === 'GET') {
        if (!can(user, 'fleet') && !can(user, 'service')) err(403, 'Bu işlem için yetkiniz yok.');
        const bk = await db.get('SELECT id, code, uid, status FROM bikes WHERE uid=? OR code=?', [String(c || '').toUpperCase(), String(c || '')]) || err(404, 'Bu QR koduna ait bisiklet bulunamadı.');
        return ok(bk);
      }
      if (a === 'bikes' && method === 'POST' && c === 'action') { need(user, 'fleet', 'w'); return ok(await bikeAction(Number(b), body, user)); }
      if (a === 'parts' && b === 'reorder' && method === 'GET') { need(user, 'stock'); return ok(await reorderList()); }
      if (a === 'invoices' && method === 'POST' && b === 'generate') {
        need(user, 'finance', 'w');
        let created = 0; for (const r of await db.all("SELECT id FROM rentals WHERE status='aktif'")) created += await billRental(r.id, user);
        return ok({ created });
      }
      if (a === 'invoices' && method === 'POST' && !b) {
        need(user, 'finance', 'w'); validate('invoices', body);
        const id = await createInvoice({ ...body, net: Number(body.net) }, user);
        if (body.due_date) await db.run('UPDATE invoices SET due_date=? WHERE id=?', [body.due_date, id]);
        return ok(await getOne('invoices', id));
      }
      if (a === 'invoices' && method === 'POST' && c) {
        need(user, 'finance', 'w'); const id = Number(b);
        const inv = await getOne('invoices', id);
        if (c === 'late-fee') { await db.run('UPDATE invoices SET late_fee=? WHERE id=?', [r2(body.amount ?? lateFeeFor(inv)), id]); await recalcInvoice(id); await audit(user, 'gecikme bedeli', 'invoices', id, String(body.amount ?? '')); }
        if (c === 'remind') { await db.run('UPDATE invoices SET reminders_sent=reminders_sent+1, last_reminder_at=? WHERE id=?', [nowTs(), id]); await audit(user, 'hatırlatma', 'invoices', id, `${inv.invoice_no} ${body.channel || 'e-posta'}`); }
        if (c === 'cancel') { if (inv.paid_amount > 0) err(409, 'Ödemesi olan fatura iptal edilemez.'); await db.run("UPDATE invoices SET status='iptal' WHERE id=?", [id]); await audit(user, 'iptal', 'invoices', id, inv.invoice_no); }
        return ok(await invoiceDetail(id));
      }
      if (a === 'payments' && method === 'POST') { need(user, 'finance', 'w'); return ok(await addPayment(body, user)); }
      if (a === 'deposits' && method === 'POST') {
        need(user, 'finance', 'w'); validate('deposits', body);
        const r = await getOne('rentals', body.rental_id);
        const x = { lastId: await depositMove({ rental_id: r.id, customer_id: r.customer_id, date: body.date, type: body.type, amount: body.amount, notes: body.notes, method: body.method }, user) };
        if (body.type === 'tahsil') await db.run("UPDATE rentals SET deposit_status='alındı' WHERE id=?", [r.id]);
        await audit(user, 'depozito', 'rentals', r.id, `${body.type} ${body.amount}`);
        return ok(await getOne('deposits', x.lastId));
      }
      if (a === 'service_orders') {
        if (method === 'POST' && !b) { need(user, 'service', 'w'); return ok(await createService(body, user)); }
        if (method === 'PUT' && b) { need(user, 'service', 'w'); return ok(await updateService(Number(b), body, user)); }
        if (method === 'POST' && c === 'parts') { need(user, 'service', 'w'); return ok(await addServicePart(Number(b), body, user)); }
      }
      if (a === 'service_parts' && method === 'DELETE') { need(user, 'service', 'w'); return ok(await removeServicePart(Number(b), user)); }
      if (a === 'stock_moves' && method === 'POST') { need(user, 'stock', 'w'); return ok(await addStockMove(body, user)); }
      if (a === 'parts' && method === 'POST' && !b && body.stock) {
        need(user, 'stock', 'w'); const p = await insert('parts', body, user);
        await addStockMove({ part_id: p.id, type: 'giriş', qty: body.stock, unit_cost: body.cost, ref: 'Açılış stoğu' }, user);
        return ok(await getOne('parts', p.id));
      }
      if (a === 'cash') {
        need(user, 'finance', method === 'GET' ? 'r' : 'w');
        if (method === 'GET') return ok(await cashSummary(query));
        if (method === 'POST' && b === 'count') {
          const cur = (await cashSummary()).balance; const counted = r2(Number(body.counted));
          if (!Number.isFinite(counted)) err(400, 'Sayılan tutarı girin.');
          const diff = r2(counted - cur);
          await cashMove({ date: body.date || today(), type: 'sayım farkı', amount: diff, category: 'Gün sonu sayımı', description: `Sayılan ${counted} €, beklenen ${cur} €${body.notes ? ' · ' + body.notes : ''}` }, user);
          return ok({ diff, counted, expected: cur });
        }
        if (method === 'POST') { const id = await cashMove({ ...body, type: body.type, amount: Number(body.amount) }, user); return ok(await getOne('cash_moves', id)); }
        if (method === 'DELETE' && b) {
          const m = await getOne('cash_moves', Number(b));
          if (m.payment_id || m.deposit_id) err(409, 'Bu hareket bir ödeme veya depozitodan otomatik oluştu; ilgili ödemeyi silin.');
          await db.run('DELETE FROM cash_moves WHERE id=?', [m.id]); await audit(user, 'silme', 'cash_moves', m.id, `${m.type} ${m.amount}`);
          return ok({ ok: true });
        }
      }
      if (a === 'documents') {
        if (method === 'GET' && !b) { const own = DOC_OWNERS[query.owner_type] || err(400, 'Geçersiz belge sahibi.'); need(user, own[1]); return ok(await listDocuments(query.owner_type, Number(query.owner_id))); }
        const doc = b ? await db.get('SELECT * FROM documents WHERE id=?', [Number(b)]) || err(404, 'Belge bulunamadı.') : null;
        const perm = (DOC_OWNERS[doc?.owner_type || body.owner_type] || err(400, 'Geçersiz belge sahibi.'))[1];
        if (method === 'GET') { need(user, perm); return ok(doc); }
        need(user, perm, 'w');
        if (method === 'POST' && !b) { const id = await addDocument(body, user); return ok({ id }); }
        if (method === 'DELETE') { await db.run('DELETE FROM documents WHERE id=?', [doc.id]); await audit(user, 'belge silme', doc.owner_type, doc.owner_id, doc.name); return ok({ ok: true }); }
      }
      // generic
      if (!RESOURCES[a]) err(404, 'Bilinmeyen kaynak.');
      const meta = RESOURCES[a];
      if (method === 'GET') {
        need(user, meta.perm);
        const out = b ? await getOne(a, Number(b)) : await list(a, query);
        if (a === 'riders' && !can(user, 'finance')) for (const x of [out].flat()) for (const k of ['balance', 'open_balance', 'overdue', 'due_soon', 'pay_state', 'deposit_held', 'deposit_pending']) delete x[k];
        return ok(out);
      }
      need(user, meta.perm, 'w');
      if (meta.readonly) err(405, 'Salt okunur.');
      if (method === 'POST' && !b) return ok(await insert(a, body, user));
      if (method === 'PUT' && b) return ok(await update(a, Number(b), body, user));
      if (method === 'DELETE' && b) return ok(await remove(a, Number(b), user));
      err(405, 'Desteklenmeyen işlem.');
    } catch (e) {
      if (e instanceof ApiError) return { status: e.status, body: { error: e.message } };
      const msg = String(e.message || e);
      if (/UNIQUE/i.test(msg)) return { status: 409, body: { error: 'Bu değer zaten kayıtlı (benzersiz olmalı).' } };
      return { status: 500, body: { error: msg } };
    }
  }
  const ok = (body) => ({ status: 200, body });
  const publicSettings = async () => { const s = await getSettings(); return Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('seq_') && !k.startsWith('img_type:') && k !== 'role_perms' && k !== 'telemetry_key')); };
  const typeNames = () => String(setting('bike_types') || '').split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
  async function bikeTypeList() {
    const imgs = Object.fromEntries((await db.all("SELECT key, value FROM settings WHERE key LIKE 'img_type:%'")).map((r) => [r.key.slice(9), r.value]));
    return typeNames().map((name) => ({ name, image: imgs[name] || null }));
  }

  return { handle, db, billRental, createRental, returnRental, createService, addServicePart, addPayment, addStockMove, telemetry, finishService, updateService, audit };
}
