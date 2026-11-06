// Pedalla Admin – API core. Runs on Node (node:sqlite) and in the browser demo (sql.js).
// db adapter: { all(sql, p), get(sql, p), run(sql, p) -> {changes, lastId}, exec(sql), tx(fn) }
import { RESOURCES, DEFAULT_ROLE_PERMS, DEFAULT_SETTINGS, PERMS, ROLES } from './meta.js';
import { SCHEMA, INTAKE_CHECKLIST } from './schema.js';

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
  // ---------- settings ----------
  // settings + role permissions are read once per request (see handle) and kept in memory
  let SETTINGS = { ...DEFAULT_SETTINGS }; let PERMS_CACHE = DEFAULT_ROLE_PERMS;
  const getSettings = async () => {
    const s = { ...DEFAULT_SETTINGS };
    for (const row of await db.all('SELECT key, value FROM settings')) s[row.key] = row.value;
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
    if (v === '' || v === undefined) return null;
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
    return await db.all(sql, p);
  }
  async function getOne(res, id) {
    const row = await db.get(`SELECT * FROM (${baseSql(res)}) AS t WHERE id = ?`, [id]);
    if (!row) err(404, 'Kayıt bulunamadı.');
    delete row.password_hash;
    return row;
  }
  function validate(res, body, partial) {
    for (const f of RESOURCES[res].fields) if (f.req && !partial && (body[f.k] === undefined || body[f.k] === '' || body[f.k] === null)) err(400, `"${f.l}" zorunludur.`);
  }
  async function insert(res, body, user) {
    validate(res, body);
    const fields = writable(res).filter((f) => body[f.k] !== undefined || f.def !== undefined);
    const vals = fields.map((f) => clean(f, body[f.k] !== undefined ? body[f.k] : f.def));
    const extra = {};
    if (res === 'users') { if (!body.password) err(400, 'Şifre zorunludur.'); extra.password_hash = hashPassword(body.password); }
    const cols = [...fields.map((f) => f.k), ...Object.keys(extra)];
    const r = await db.run(`INSERT INTO ${res} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, [...vals, ...Object.values(extra)]);
    await audit(user, 'oluşturma', res, r.lastId, RESOURCES[res].title?.(body) || '');
    return await getOne(res, r.lastId);
  }
  async function update(res, id, body, user) {
    await getOne(res, id);
    const fields = writable(res).filter((f) => body[f.k] !== undefined);
    const sets = fields.map((f) => `${f.k}=?`); const vals = fields.map((f) => clean(f, body[f.k]));
    if (res === 'users' && body.password) { sets.push('password_hash=?'); vals.push(hashPassword(body.password)); }
    if (sets.length) await db.run(`UPDATE ${res} SET ${sets.join(',')} WHERE id=?`, [...vals, id]);
    if (res === 'invoices') await recalcInvoice(id);
    await audit(user, 'güncelleme', res, id, fields.map((f) => f.k).join(', '));
    return await getOne(res, id);
  }
  async function remove(res, id, user) {
    const row = await getOne(res, id);
    if (res === 'bikes' && await db.get("SELECT 1 FROM rentals WHERE bike_id=? AND status IN ('aktif','rezervasyon')", [id])) err(409, 'Aktif kiralaması olan bisiklet silinemez.');
    if (res === 'customers' && await db.get('SELECT 1 FROM rentals WHERE customer_id=?', [id])) err(409, 'Kiralama geçmişi olan müşteri silinemez; kara listeye alabilir veya not düşebilirsiniz.');
    if (res === 'users' && user.id === Number(id)) err(409, 'Kendi kullanıcınızı silemezsiniz.');
    if (res === 'payments') { await db.run('DELETE FROM payments WHERE id=?', [id]); await recalcInvoice(row.invoice_id); await audit(user, 'silme', res, id); return { ok: true }; }
    try { await db.run(`DELETE FROM ${res} WHERE id=?`, [id]); } catch (e) { err(409, 'Bu kayda bağlı başka kayıtlar olduğu için silinemiyor.'); }
    await audit(user, 'silme', res, id, RESOURCES[res].title?.(row) || '');
    return { ok: true };
  }

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
    await audit(user, 'ödeme', 'invoices', inv.id, `${inv.invoice_no}: ${r2(body.amount)} €`);
    return await getOne('payments', r.lastId);
  }
  function lateFeeFor(inv) {
    if (!['açık', 'kısmi'].includes(inv.status) || inv.due_date >= today()) return 0;
    return r2(daysBetween(inv.due_date, today()) * Number(setting('late_fee_per_day') || 0));
  }

  // ---------- rentals ----------
  async function createRental(b, user) {
    for (const k of ['customer_id', 'bike_id', 'start_date', 'end_date']) if (!b[k]) err(400, 'Müşteri, bisiklet, başlangıç ve dönüş tarihleri zorunludur.');
    if (b.end_date < b.start_date) err(400, 'Dönüş tarihi başlangıçtan önce olamaz.');
    const cust = await db.get('SELECT * FROM customers WHERE id=?', [b.customer_id]) || err(404, 'Müşteri yok.');
    if (cust.blacklisted) err(409, 'Bu müşteri kara listede. Kiralama yapılamaz.');
    const bike = await db.get('SELECT * FROM bikes WHERE id=?', [b.bike_id]) || err(404, 'Bisiklet yok.');
    const reserve = b.start_date > today();
    if (!['müsait', 'rezerve'].includes(bike.status)) err(409, `Bisiklet şu an "${bike.status}" durumunda, kiralanamaz.`);
    const clash = await db.get("SELECT contract_no FROM rentals WHERE bike_id=? AND status IN ('aktif','rezervasyon') AND NOT (end_date < ? OR start_date > ?)", [b.bike_id, b.start_date, b.end_date]);
    if (clash) err(409, `Bu tarihlerde bisiklet ${clash.contract_no} ile çakışıyor.`);
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
      if (deposit > 0 && b.deposit_paid) await db.run('INSERT INTO deposits(rental_id,customer_id,date,type,amount,notes) VALUES(?,?,?,?,?,?)', [id, b.customer_id, b.start_date, 'tahsil', r2(deposit), 'Teslimde alındı']);
      await db.run('UPDATE bikes SET status=? WHERE id=?', [reserve ? 'rezerve' : 'kirada', b.bike_id]);
      await audit(user, 'kiralama', 'rentals', id, `${no} · ${bike.code} → ${cust.company_name || cust.name}`);
      if (!reserve) await billRental(id, user);
    });
    return await getOne('rentals', id);
  }
  async function activateRental(id, user) {
    const r = await getOne('rentals', id);
    if (r.status !== 'rezervasyon') err(409, 'Sadece rezervasyonlar başlatılabilir.');
    await db.run("UPDATE rentals SET status='aktif', start_date=? WHERE id=?", [r.start_date > today() ? today() : r.start_date, id]);
    await db.run("UPDATE bikes SET status='kirada' WHERE id=?", [r.bike_id]);
    await billRental(id, user); await audit(user, 'teslim', 'rentals', id, r.contract_no);
    return await getOne('rentals', id);
  }
  async function collectDeposit(id, b, user) {
    const r = await getOne('rentals', id);
    const amt = r2(b.amount ?? r.deposit_amount);
    await db.run('INSERT INTO deposits(rental_id,customer_id,date,type,amount,notes) VALUES(?,?,?,?,?,?)', [id, r.customer_id, b.date || today(), 'tahsil', amt, b.notes || 'Depozito tahsil edildi']);
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
      const held = r2(await db.get("SELECT COALESCE(SUM(CASE WHEN type='tahsil' THEN amount ELSE -amount END),0) AS s FROM deposits WHERE rental_id=?", [id]).s);
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
        if (refund > 0) await db.run('INSERT INTO deposits(rental_id,customer_id,date,type,amount,notes) VALUES(?,?,?,?,?,?)', [id, r.customer_id, date, 'iade', refund, 'İadede geri ödendi']);
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
    return { ...getOne('rentals', id), ...out };
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
    const r = await db.run(`INSERT INTO service_orders(order_no,bike_id,customer_id,rental_id,type,status,received_at,received_by,brought_by,km,battery_level,complaint,checklist,visual_condition,accessories,estimated_cost,estimated_ready,technician_id,labor_rate,billable,signature_name)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [no, b.bike_id, b.customer_id || null, b.rental_id || null, b.type || 'arıza', 'kabul edildi', b.received_at || nowTs(), user?.id,
      b.brought_by || null, b.km ?? bike.odometer_km, b.battery_level ?? bike.battery_level, b.complaint || '', JSON.stringify(b.checklist || {}), b.visual_condition || null,
      b.accessories || null, b.estimated_cost || null, b.estimated_ready || null, b.technician_id || null, Number(setting('labor_rate')) || 0, b.billable ? 1 : 0, b.signature_name || null]);
    if (bike.status !== 'kirada') await db.run("UPDATE bikes SET status='serviste' WHERE id=?", [b.bike_id]);
    await audit(user, 'servis kabul', 'service_orders', r.lastId, `${no} · ${bike.code}`);
    return await getOne('service_orders', r.lastId);
  }
  async function serviceDetail(id) {
    const s = await getOne('service_orders', id);
    s.checklist = JSON.parse(s.checklist || '{}');
    s.parts = await db.all('SELECT sp.*, p.sku, p.name, p.unit FROM service_parts sp JOIN parts p ON p.id=sp.part_id WHERE sp.service_id=?', [id]);
    s.bike = await db.get('SELECT * FROM bikes WHERE id=?', [s.bike_id]);
    s.customer = s.customer_id ? await db.get('SELECT * FROM customers WHERE id=?', [s.customer_id]) : null;
    s.received_by_name = (await db.get('SELECT name FROM users WHERE id=?', [s.received_by]))?.name;
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
    const next = addDays(today(), Number(setting('service_interval_days')) || 90);
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
    return { ok: true, bike_id: bike.id };
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
      overdue: fin ? await db.all("SELECT i.id, i.invoice_no, i.due_date, (i.total+i.late_fee-i.paid_amount) AS balance, COALESCE(c.company_name,c.name) AS customer, CAST(julianday(?)-julianday(i.due_date) AS INTEGER) AS days FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.status IN ('açık','kısmi') AND i.due_date < ? ORDER BY i.due_date LIMIT 8", [t, t]) : [],
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
    return b;
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
    r.late_days = r.status === 'aktif' ? Math.max(0, daysBetween(r.end_date, today())) : 0;
    r.late_return_fee_per_day = Number(setting('late_return_fee_per_day'));
    if (user && !can(user, 'finance')) { r.invoices = []; r.deposits = []; }
    return r;
  }
  async function customerDetail(id, user) {
    const c = await getOne('customers', id);
    c.riders = await list('riders', { customer_id: id });
    c.rentals = await list('rentals', { customer_id: id });
    c.invoices = await list('invoices', { customer_id: id });
    c.payments = await list('payments', { customer_id: id });
    c.balance = r2(c.invoices.filter((i) => ['açık', 'kısmi'].includes(i.status)).reduce((a, i) => a + i.balance, 0));
    c.overdue = r2(c.invoices.filter((i) => i.days_late > 0).reduce((a, i) => a + i.balance, 0));
    c.deposit_held = r2((await db.get("SELECT COALESCE(SUM(CASE WHEN type='tahsil' THEN amount ELSE -amount END),0) AS s FROM deposits WHERE customer_id=?", [id])).s);
    if (user && !can(user, 'finance')) { c.invoices = []; c.payments = []; c.balance = c.overdue = c.deposit_held = null; }
    return c;
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
        const s = await getSettings(); return ok(Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('seq_') && k !== 'role_perms')));
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
        const fn = { bikes: bikeDetail, rentals: rentalDetail, customers: customerDetail, invoices: invoiceDetail, service_orders: serviceDetail, parts: partDetail }[b];
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
        const x = await db.run('INSERT INTO deposits(rental_id,customer_id,date,type,amount,notes) VALUES(?,?,?,?,?,?)', [r.id, r.customer_id, body.date, body.type, r2(body.amount), body.notes || null]);
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
      // generic
      if (!RESOURCES[a]) err(404, 'Bilinmeyen kaynak.');
      const meta = RESOURCES[a];
      if (method === 'GET') { need(user, meta.perm); return ok(b ? await getOne(a, Number(b)) : await list(a, query)); }
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
  const publicSettings = async () => { const s = await getSettings(); return Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('seq_') && k !== 'role_perms' && k !== 'telemetry_key')); };

  return { handle, db, billRental, createRental, returnRental, createService, addServicePart, addPayment, addStockMove, telemetry, finishService, updateService, audit };
}
