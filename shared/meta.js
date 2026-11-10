// Pedalla Admin – shared metadata (used by server, browser demo and UI)
// Field types: text, textarea, number, money, date, datetime, select, ref, bool, email, tel, password

export const BIKE_STATUS = ['müsait', 'kirada', 'rezerve', 'serviste', 'arızalı', 'kayıp/çalıntı', 'hizmet dışı'];
export const BIKE_TYPES = ['Kargo bisikleti (Lastenrad)', 'E-Kargo bisikleti', 'E-Bike', 'Klasik bisiklet'];
export const RENTAL_STATUS = ['rezervasyon', 'aktif', 'tamamlandı', 'iptal'];
export const INVOICE_STATUS = ['açık', 'kısmi', 'ödendi', 'iptal'];
export const SERVICE_STATUS = ['kabul edildi', 'teşhis', 'parça bekliyor', 'onarımda', 'hazır', 'teslim edildi', 'iptal'];
export const SERVICE_TYPES = ['periyodik bakım', 'arıza', 'hasar', 'garanti', 'kaza'];
export const PAY_METHODS = ['banka havalesi', 'SEPA otomatik ödeme', 'kredi kartı', 'nakit', 'PayPal', 'depozitodan mahsup'];
export const PERIODS = ['gün', 'hafta', 'ay'];
export const ID_TYPES = ['Kimlik kartı (Personalausweis)', 'Pasaport', 'Oturum izni (Aufenthaltstitel)', 'Ehliyet'];
export const DOC_LANGS = [{ v: 'de', l: 'Almanca (Deutsch)' }, { v: 'en', l: 'İngilizce (English)' }];
export const DOC_TYPES = ['Kimlik ön yüz', 'Kimlik arka yüz', 'Pasaport', 'Oturum izni', 'Ehliyet', 'Adres belgesi (Meldebescheinigung)', 'Ticaret sicili / Gewerbeanmeldung', 'İmzalı sözleşme', 'Teslim fotoğrafı', 'Hasar fotoğrafı', 'Diğer'];
export const UI_LANGS = [{ v: 'tr', l: 'Türkçe' }, { v: 'de', l: 'Deutsch' }, { v: 'en', l: 'English' }];
export const REQUEST_TYPES = ['servis randevusu', 'arıza bildirimi', 'iade randevusu', 'kiralama uzatma', 'yeni kiralama'];
export const REQUEST_STATUS = ['yeni', 'onaylandı', 'tamamlandı', 'reddedildi', 'iptal'];
// documents a rider is expected to upload in the rider portal (passport replaces both ID sides)
export const RIDER_REQUIRED_DOCS = ['Kimlik ön yüz', 'Kimlik arka yüz', 'Adres belgesi (Meldebescheinigung)'];
export const CASH_IN = ['Fatura tahsilatı', 'Depozito tahsilatı', 'Servis / parça satışı', 'Kasaya para konuldu', 'Diğer gelir'];
export const CASH_OUT = ['Depozito iadesi', 'Masraf / malzeme', 'Yakıt / ulaşım', 'Personel avansı', 'Bankaya yatırıldı', 'Diğer gider'];
export const BIKE_COST_TYPES = ['kaza / hasar', 'dış servis / onarım', 'yedek parça (stok dışı)', 'sigorta', 'aksesuar / ekipman', 'nakliye', 'diğer'];
export const PART_CATEGORIES = ['fren', 'lastik/jant', 'zincir/aktarma', 'batarya', 'motor/elektrik', 'ışık', 'kargo kutusu', 'gidon/sele', 'aksesuar', 'diğer'];

export const ROLES = {
  admin: 'Yönetici',
  operasyon: 'Operasyon',
  servis: 'Servis teknisyeni',
  muhasebe: 'Muhasebe',
};

// Permission groups
export const PERMS = {
  dashboard: 'Özet ekranı',
  fleet: 'Filo / bisikletler / harita',
  rentals: 'Kiralamalar / sözleşmeler',
  customers: 'Müşteriler / sürücüler',
  finance: 'Faturalar / ödemeler / depozitolar',
  service: 'Servis / bakım',
  stock: 'Yedek parça / stok / tedarikçi',
  reports: 'Raporlar',
  admin: 'Kullanıcılar / roller / ayarlar / log',
};

// default role → perm → 'r' | 'w' | ''
export const DEFAULT_ROLE_PERMS = {
  admin: Object.fromEntries(Object.keys(PERMS).map((p) => [p, 'w'])),
  operasyon: { dashboard: 'r', fleet: 'w', rentals: 'w', customers: 'w', finance: 'r', service: 'w', stock: 'r', reports: 'r', admin: '' },
  servis: { dashboard: 'r', fleet: 'r', rentals: 'r', customers: 'r', finance: '', service: 'w', stock: 'w', reports: '', admin: '' },
  muhasebe: { dashboard: 'r', fleet: 'r', rentals: 'r', customers: 'w', finance: 'w', service: 'r', stock: 'r', reports: 'r', admin: '' },
};

const opt = (arr) => arr.map((v) => ({ v, l: v }));
// bike types are managed in Settings (one per line); the selects of bikes and price plans follow them
// rental periods switched on in Settings (gün / hafta / ay); at least one stays on
export const enabledPeriods = (settings) => { const on = String(settings?.rental_periods ?? 'ay').split(',').map((x) => x.trim()); const l = PERIODS.filter((p) => on.includes(p)); return l.length ? l : ['ay']; };
export function applyBikeTypes(settings) {
  const per = enabledPeriods(settings);
  RESOURCES.pricing_plans.fields.find((f) => f.k === 'period').o = opt(per);
  RESOURCES.rentals.fields.find((f) => f.k === 'period').o = opt(per);
  const list = String(settings?.bike_types || '').split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
  if (!list.length) return;
  RESOURCES.bikes.fields.find((f) => f.k === 'type').o = opt(list);
  RESOURCES.pricing_plans.fields.find((f) => f.k === 'bike_type').o = opt(list);
}

export const RESOURCES = {
  bikes: {
    label: 'Bisikletler', single: 'Bisiklet', perm: 'fleet', order: 'id DESC', search: ['code', 'brand', 'model', 'frame_no', 'gps_tracker_id', 'uid'],
    title: (r) => `${r.code} · ${r.brand || ''} ${r.model || ''}`,
    fields: [
      { k: 'code', l: 'Filo kodu', req: 1, list: 1 },
      { k: 'uid', l: 'QR kimliği', ro: 1 },
      { k: 'type', l: 'Tip', t: 'select', o: opt(BIKE_TYPES), list: 1 },
      { k: 'brand', l: 'Marka', list: 1 },
      { k: 'model', l: 'Model', list: 1 },
      { k: 'status', l: 'Durum', t: 'select', o: opt(BIKE_STATUS), def: 'müsait', list: 1, badge: 1 },
      { k: 'frame_no', l: 'Şasi no' },
      { k: 'battery_no', l: 'Batarya seri no' },
      { k: 'gps_tracker_id', l: 'GPS takip cihazı ID' },
      { k: 'color', l: 'Renk' },
      { k: 'year', l: 'Model yılı', t: 'number' },
      { k: 'purchase_date', l: 'Alış tarihi', t: 'date' },
      { k: 'purchase_price', l: 'Toplam satın alma maliyeti', t: 'money' },
      { k: 'location_name', l: 'Konum / depo', list: 1 },
      { k: 'lat', l: 'Enlem', t: 'number', step: 'any' },
      { k: 'lng', l: 'Boylam', t: 'number', step: 'any' },
      { k: 'battery_level', l: 'Batarya %', t: 'number', list: 1 },
      { k: 'odometer_km', l: 'Kilometre', t: 'number', list: 1 },
      { k: 'insurance_no', l: 'Sigorta poliçe no' },
      { k: 'insurance_until', l: 'Sigorta bitiş', t: 'date' },
      { k: 'last_service_date', l: 'Son servis', t: 'date' },
      { k: 'service_interval_days', l: 'Bakım periyodu (gün, boşsa Ayarlar\'daki)', t: 'number' },
      { k: 'next_service_date', l: 'Sonraki bakım (boşsa otomatik)', t: 'date', list: 1 },
      { k: 'notes', l: 'Notlar', t: 'textarea' },
    ],
  },
  customers: {
    label: 'Müşteriler', single: 'Müşteri', perm: 'customers', order: 'id DESC', search: ['name', 'company_name', 'email', 'phone', 'tax_no'],
    title: (r) => r.company_name || r.name,
    fields: [
      { k: 'type', l: 'Müşteri tipi', t: 'select', o: opt(['kurumsal', 'bireysel']), def: 'kurumsal', list: 1 },
      { k: 'name', l: 'Ad soyad / yetkili', req: 1, list: 1 },
      { k: 'company_name', l: 'Firma adı', list: 1 },
      { k: 'tax_no', l: 'Vergi no / USt-IdNr' },
      { k: 'id_no', l: 'Kimlik / pasaport no' },
      { k: 'email', l: 'E-posta', t: 'email', list: 1 },
      { k: 'phone', l: 'Telefon', t: 'tel', list: 1 },
      { k: 'address', l: 'Adres', t: 'textarea' },
      { k: 'city', l: 'Şehir', list: 1 },
      { k: 'iban', l: 'IBAN (SEPA)' },
      { k: 'doc_lang', l: 'Sözleşme / fatura dili', t: 'select', o: DOC_LANGS, def: 'de' },
      { k: 'id_verified', l: 'Kimlik doğrulandı', t: 'bool' },
      { k: 'blacklisted', l: 'Kara liste', t: 'bool', list: 1 },
      { k: 'notes', l: 'Notlar', t: 'textarea' },
    ],
  },
  riders: {
    label: 'Sürücüler (bisiklet kullanıcıları)', single: 'Sürücü', perm: 'customers', order: 'id DESC', search: ['name', 'phone', 'email', 'customer_label'],
    title: (r) => r.name,
    // rider's own balance = deposit held (+) − open invoices of the rider's rentals (−) − deposits not yet collected (−)
    listSql: `SELECT q.*, ROUND(q.deposit_held - q.open_balance - q.deposit_pending, 2) AS balance,
      CASE WHEN q.overdue > 0 THEN 'gecikmiş' WHEN q.due_soon > 0 THEN 'yaklaşan' WHEN q.inv_count > 0 THEN 'düzenli' ELSE NULL END AS pay_state FROM (SELECT r.*, CASE WHEN c.type='bireysel' THEN 'Doğrudan müşteri' ELSE COALESCE(c.company_name,c.name) END AS customer_label, c.type AS customer_type,
      (SELECT b.code FROM rentals x JOIN bikes b ON b.id=x.bike_id WHERE x.rider_id=r.id AND x.status='aktif' LIMIT 1) AS current_bike,
      (SELECT ROUND(COALESCE(SUM(i.total+i.late_fee-i.paid_amount),0),2) FROM invoices i JOIN rentals x ON x.id=i.rental_id WHERE x.rider_id=r.id AND i.status IN ('açık','kısmi')) AS open_balance,
      (SELECT ROUND(COALESCE(SUM(i.total+i.late_fee-i.paid_amount),0),2) FROM invoices i JOIN rentals x ON x.id=i.rental_id WHERE x.rider_id=r.id AND i.status IN ('açık','kısmi') AND i.due_date < date('now')) AS overdue,
      (SELECT ROUND(COALESCE(SUM(i.total+i.late_fee-i.paid_amount),0),2) FROM invoices i JOIN rentals x ON x.id=i.rental_id WHERE x.rider_id=r.id AND i.status IN ('açık','kısmi') AND i.due_date BETWEEN date('now') AND date('now','+7 days')) AS due_soon,
      (SELECT COUNT(*) FROM invoices i JOIN rentals x ON x.id=i.rental_id WHERE x.rider_id=r.id AND i.status<>'iptal') AS inv_count,
      (SELECT ROUND(COALESCE(SUM(CASE d.type WHEN 'tahsil' THEN d.amount ELSE -d.amount END),0),2) FROM deposits d JOIN rentals x ON x.id=d.rental_id WHERE x.rider_id=r.id) AS deposit_held,
      (SELECT ROUND(COALESCE(SUM(x.deposit_amount),0),2) FROM rentals x WHERE x.rider_id=r.id AND x.status IN ('aktif','rezervasyon') AND x.deposit_status='bekliyor') AS deposit_pending
      FROM riders r LEFT JOIN customers c ON c.id=r.customer_id) AS q`,
    fields: [
      { k: 'customer_id', l: 'Bağlı firma (boş bırakılırsa sürücü doğrudan müşteri olur)', t: 'ref', ref: 'customers', list: 1, show: 'customer_label' },
      { k: 'name', l: 'Ad soyad', req: 1, list: 1 },
      { k: 'phone', l: 'Telefon', t: 'tel', list: 1 },
      { k: 'pay_state', l: 'Ödeme durumu', ro: 1, list: 1 },
      { k: 'balance', l: 'Bakiye', t: 'money', ro: 1, list: 1 },
      { k: 'email', l: 'E-posta', t: 'email' },
      { k: 'id_type', l: 'Kimlik türü', t: 'select', o: opt(ID_TYPES) },
      { k: 'id_no', l: 'Kimlik / pasaport no', list: 1 },
      { k: 'id_expiry', l: 'Kimlik geçerlilik tarihi', t: 'date' },
      { k: 'birth_date', l: 'Doğum tarihi', t: 'date' },
      { k: 'nationality', l: 'Uyruk' },
      { k: 'license_no', l: 'Ehliyet no (varsa)' },
      { k: 'address', l: 'Adres', t: 'textarea' },
      { k: 'id_checked', l: 'Kimlik aslı görüldü / kopyası alındı', t: 'bool', list: 1 },
      { k: 'trained', l: 'Kargo bisikleti eğitimi aldı', t: 'bool', list: 1 },
      { k: 'active', l: 'Aktif', t: 'bool', def: 1, list: 1 },
      { k: 'current_bike', l: 'Şu anki bisiklet', ro: 1, list: 1 },
      { k: 'portal_email', l: 'Sürücü ekranı giriş e-postası', t: 'email' },
      { k: 'portal_password', l: 'Sürücü ekranı şifresi (değiştirmek için yazın)', t: 'password' },
      { k: 'portal_active', l: 'Sürücü ekranına giriş açık', t: 'bool', list: 1 },
      { k: 'lang', l: 'Sürücü ekranı dili', t: 'select', o: UI_LANGS },
      { k: 'notes', l: 'Notlar', t: 'textarea' },
    ],
  },
  pricing_plans: {
    label: 'Tarifeler', single: 'Tarife', perm: 'rentals', order: 'id DESC', search: ['name'],
    title: (r) => r.name,
    fields: [
      { k: 'name', l: 'Tarife adı', req: 1, list: 1 },
      { k: 'bike_type', l: 'Bisiklet tipi', t: 'select', o: opt(BIKE_TYPES), list: 1 },
      { k: 'period', l: 'Periyot', t: 'select', o: opt(PERIODS), def: 'ay', list: 1 },
      { k: 'price', l: 'Periyot ücreti (net)', t: 'money', req: 1, list: 1 },
      { k: 'deposit', l: 'Depozito', t: 'money', list: 1 },
      { k: 'km_included', l: 'Dahil km (0 = sınırsız)', t: 'number' },
      { k: 'active', l: 'Aktif', t: 'bool', def: 1, list: 1 },
    ],
  },
  rentals: {
    label: 'Kiralamalar', single: 'Kiralama', perm: 'rentals', order: 'id DESC', search: ['contract_no', 'customer_label', 'bike_code', 'rider_name'],
    title: (r) => r.contract_no,
    listSql: `SELECT r.*, b.code AS bike_code, COALESCE(c.company_name,c.name) AS customer_label, rd.name AS rider_name,
      CASE WHEN r.status='aktif' AND r.end_date < date('now') THEN 1 ELSE 0 END AS is_late,
      (SELECT COALESCE(SUM(i.total + i.late_fee - i.paid_amount),0) FROM invoices i WHERE i.rental_id=r.id AND i.status IN ('açık','kısmi')) AS open_balance
      FROM rentals r LEFT JOIN bikes b ON b.id=r.bike_id LEFT JOIN customers c ON c.id=r.customer_id LEFT JOIN riders rd ON rd.id=r.rider_id`,
    noCreate: 1, // custom flow
    fields: [
      { k: 'contract_no', l: 'Sözleşme no', ro: 1, list: 1 },
      { k: 'customer_id', l: 'Müşteri', t: 'ref', ref: 'customers', req: 1, list: 1, show: 'customer_label' },
      { k: 'rider_id', l: 'Sürücü (kullanıcı)', t: 'ref', ref: 'riders', list: 1, show: 'rider_name' },
      { k: 'bike_id', l: 'Bisiklet', t: 'ref', ref: 'bikes', req: 1, list: 1, show: 'bike_code' },
      { k: 'plan_id', l: 'Tarife', t: 'ref', ref: 'pricing_plans' },
      { k: 'start_date', l: 'Başlangıç', t: 'date', req: 1, list: 1 },
      { k: 'end_date', l: 'Planlanan dönüş', t: 'date', req: 1, list: 1 },
      { k: 'returned_at', l: 'İade tarihi', t: 'date', ro: 1 },
      { k: 'period', l: 'Faturalama periyodu', t: 'select', o: opt(PERIODS), def: 'ay' },
      { k: 'rate', l: 'Periyot ücreti (net)', t: 'money', req: 1, list: 1 },
      { k: 'deposit_amount', l: 'Depozito', t: 'money', list: 1 },
      { k: 'deposit_status', l: 'Depozito durumu', t: 'select', o: opt(['bekliyor', 'alındı', 'iade edildi', 'kısmi iade', 'mahsup edildi']), ro: 1 },
      { k: 'status', l: 'Durum', t: 'select', o: opt(RENTAL_STATUS), list: 1, badge: 1, ro: 1 },
      { k: 'start_km', l: 'Teslim km', t: 'number' },
      { k: 'end_km', l: 'İade km', t: 'number', ro: 1 },
      { k: 'start_battery', l: 'Teslim batarya %', t: 'number' },
      { k: 'accessories', l: 'Teslim edilen aksesuarlar', t: 'textarea' },
      { k: 'return_condition', l: 'İade durumu', t: 'textarea', ro: 1 },
      { k: 'damage_fee', l: 'Hasar bedeli', t: 'money', ro: 1 },
      { k: 'notes', l: 'Notlar', t: 'textarea' },
    ],
  },
  invoices: {
    label: 'Faturalar', single: 'Fatura', perm: 'finance', order: 'issue_date DESC, id DESC', search: ['invoice_no', 'customer_label', 'contract_no'],
    title: (r) => r.invoice_no,
    listSql: `SELECT i.*, COALESCE(c.company_name,c.name) AS customer_label, c.name AS customer_name, c.phone AS customer_phone, c.doc_lang AS customer_lang, r.contract_no,
      CASE WHEN i.status IN ('açık','kısmi') AND i.due_date < date('now') THEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) ELSE 0 END AS days_late,
      (i.total + i.late_fee - i.paid_amount) AS balance
      FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id LEFT JOIN rentals r ON r.id=i.rental_id`,
    fields: [
      { k: 'invoice_no', l: 'Fatura no', ro: 1, list: 1 },
      { k: 'customer_id', l: 'Müşteri', t: 'ref', ref: 'customers', req: 1, list: 1, show: 'customer_label' },
      { k: 'rental_id', l: 'Kiralama', t: 'ref', ref: 'rentals', show: 'contract_no', list: 1 },
      { k: 'issue_date', l: 'Fatura tarihi', t: 'date', req: 1, list: 1 },
      { k: 'due_date', l: 'Vade', t: 'date', req: 1, list: 1 },
      { k: 'period_start', l: 'Dönem başı', t: 'date' },
      { k: 'period_end', l: 'Dönem sonu', t: 'date' },
      { k: 'description', l: 'Açıklama', req: 1 },
      { k: 'net', l: 'Net tutar', t: 'money', req: 1 },
      { k: 'vat_rate', l: 'KDV %', t: 'number', def: 19 },
      { k: 'total', l: 'Toplam (brüt)', t: 'money', ro: 1, list: 1 },
      { k: 'late_fee', l: 'Gecikme bedeli', t: 'money', ro: 1 },
      { k: 'paid_amount', l: 'Ödenen', t: 'money', ro: 1, list: 1 },
      { k: 'balance', l: 'Kalan', t: 'money', ro: 1, list: 1 },
      { k: 'days_late', l: 'Gecikme (gün)', t: 'number', ro: 1, list: 1 },
      { k: 'status', l: 'Durum', t: 'select', o: opt(INVOICE_STATUS), ro: 1, list: 1, badge: 1 },
    ],
  },
  payments: {
    label: 'Ödemeler', single: 'Ödeme', perm: 'finance', order: 'date DESC, id DESC', search: ['reference', 'invoice_no', 'customer_label'],
    title: (r) => `Ödeme #${r.id}`,
    listSql: `SELECT p.*, i.invoice_no, COALESCE(c.company_name,c.name) AS customer_label FROM payments p
      LEFT JOIN invoices i ON i.id=p.invoice_id LEFT JOIN customers c ON c.id=p.customer_id`,
    fields: [
      { k: 'invoice_id', l: 'Fatura', t: 'ref', ref: 'invoices', req: 1, list: 1, show: 'invoice_no' },
      { k: 'customer_label', l: 'Müşteri', ro: 1, list: 1 },
      { k: 'date', l: 'Tarih', t: 'date', req: 1, list: 1 },
      { k: 'amount', l: 'Tutar', t: 'money', req: 1, list: 1 },
      { k: 'method', l: 'Yöntem', t: 'select', o: opt(PAY_METHODS), list: 1 },
      { k: 'reference', l: 'Referans / dekont no', list: 1 },
      { k: 'notes', l: 'Not', t: 'textarea' },
    ],
  },
  deposits: {
    noBulk: 1, label: 'Depozito hareketleri', single: 'Depozito hareketi', perm: 'finance', order: 'date DESC, id DESC', search: ['contract_no', 'customer_label', 'notes'],
    title: (r) => `Depozito #${r.id}`,
    listSql: `SELECT d.*, r.contract_no, COALESCE(c.company_name,c.name) AS customer_label FROM deposits d
      LEFT JOIN rentals r ON r.id=d.rental_id LEFT JOIN customers c ON c.id=d.customer_id`,
    fields: [
      { k: 'rental_id', l: 'Kiralama', t: 'ref', ref: 'rentals', req: 1, list: 1, show: 'contract_no' },
      { k: 'customer_label', l: 'Müşteri', ro: 1, list: 1 },
      { k: 'date', l: 'Tarih', t: 'date', req: 1, list: 1 },
      { k: 'type', l: 'Hareket', t: 'select', o: opt(['tahsil', 'iade', 'kesinti']), req: 1, list: 1, badge: 1 },
      { k: 'amount', l: 'Tutar', t: 'money', req: 1, list: 1 },
      { k: 'notes', l: 'Açıklama', list: 1 },
    ],
  },
  service_orders: {
    label: 'Servis kayıtları', single: 'Servis kaydı', perm: 'service', order: 'id DESC', search: ['order_no', 'bike_code', 'complaint', 'customer_label'],
    title: (r) => r.order_no,
    noCreate: 1,
    listSql: `SELECT s.*, b.code AS bike_code, u.name AS technician_name, COALESCE(c.company_name,c.name) AS customer_label,
      (SELECT COALESCE(SUM(qty*unit_price),0) FROM service_parts sp WHERE sp.service_id=s.id) AS parts_total
      FROM service_orders s LEFT JOIN bikes b ON b.id=s.bike_id LEFT JOIN users u ON u.id=s.technician_id LEFT JOIN customers c ON c.id=s.customer_id`,
    fields: [
      { k: 'order_no', l: 'Servis no', ro: 1, list: 1 },
      { k: 'bike_id', l: 'Bisiklet', t: 'ref', ref: 'bikes', req: 1, list: 1, show: 'bike_code' },
      { k: 'type', l: 'Servis tipi', t: 'select', o: opt(SERVICE_TYPES), list: 1 },
      { k: 'status', l: 'Durum', t: 'select', o: opt(SERVICE_STATUS), list: 1, badge: 1 },
      { k: 'received_at', l: 'Kabul tarihi', t: 'datetime', list: 1 },
      { k: 'customer_id', l: 'Getiren müşteri', t: 'ref', ref: 'customers', show: 'customer_label' },
      { k: 'brought_by', l: 'Teslim eden kişi' },
      { k: 'km', l: 'Kabul km', t: 'number' },
      { k: 'battery_level', l: 'Kabul batarya %', t: 'number' },
      { k: 'complaint', l: 'Şikayet / talep', t: 'textarea', req: 1 },
      { k: 'visual_condition', l: 'Görsel durum / mevcut hasarlar', t: 'textarea' },
      { k: 'accessories', l: 'Bırakılan aksesuarlar (şarj aleti, kilit, anahtar…)', t: 'textarea' },
      { k: 'estimated_cost', l: 'Tahmini maliyet', t: 'money' },
      { k: 'estimated_ready', l: 'Tahmini hazır olma', t: 'date' },
      { k: 'technician_id', l: 'Teknisyen', t: 'ref', ref: 'users', list: 1, show: 'technician_name' },
      { k: 'diagnosis', l: 'Teşhis', t: 'textarea' },
      { k: 'work_done', l: 'Yapılan işlemler', t: 'textarea' },
      { k: 'labor_hours', l: 'İşçilik (saat)', t: 'number', step: '0.25' },
      { k: 'labor_rate', l: 'Saatlik işçilik ücreti', t: 'money' },
      { k: 'parts_total', l: 'Parça toplamı', t: 'money', ro: 1, list: 1 },
      { k: 'billable', l: 'Müşteriye faturalanacak', t: 'bool' },
      { k: 'signature_name', l: 'Kabul formunu imzalayan' },
      { k: 'delivered_at', l: 'Teslim tarihi', t: 'datetime', ro: 1 },
    ],
  },
  parts: {
    label: 'Yedek parçalar', single: 'Yedek parça', perm: 'stock', order: 'id DESC', search: ['sku', 'name', 'compatible', 'location'],
    title: (r) => `${r.sku} · ${r.name}`,
    listSql: `SELECT p.*, s.name AS supplier_name, CASE WHEN p.stock <= p.min_stock THEN 1 ELSE 0 END AS low FROM parts p LEFT JOIN suppliers s ON s.id=p.supplier_id`,
    fields: [
      { k: 'sku', l: 'Stok kodu', req: 1, list: 1 },
      { k: 'name', l: 'Parça adı', req: 1, list: 1 },
      { k: 'category', l: 'Kategori', t: 'select', o: opt(PART_CATEGORIES), list: 1 },
      { k: 'compatible', l: 'Uyumlu modeller' },
      { k: 'unit', l: 'Birim', def: 'adet' },
      { k: 'cost', l: 'Alış fiyatı', t: 'money', list: 1 },
      { k: 'price', l: 'Satış / servis fiyatı', t: 'money', list: 1 },
      { k: 'stock', l: 'Stok', t: 'number', list: 1, ro: 1 },
      { k: 'min_stock', l: 'Min. stok (uyarı)', t: 'number', def: 2, list: 1 },
      { k: 'location', l: 'Raf / konum', list: 1 },
      { k: 'supplier_id', l: 'Tedarikçi', t: 'ref', ref: 'suppliers', show: 'supplier_name', list: 1 },
      { k: 'notes', l: 'Notlar', t: 'textarea' },
    ],
  },
  stock_moves: {
    noBulk: 1, label: 'Stok hareketleri', single: 'Stok hareketi', perm: 'stock', order: 'date DESC, id DESC', search: ['part_name', 'sku', 'ref'],
    title: (r) => `Hareket #${r.id}`,
    listSql: `SELECT m.*, p.sku, p.name AS part_name, u.name AS user_name FROM stock_moves m LEFT JOIN parts p ON p.id=m.part_id LEFT JOIN users u ON u.id=m.user_id`,
    noEdit: 1,
    fields: [
      { k: 'part_id', l: 'Parça', t: 'ref', ref: 'parts', req: 1, list: 1, show: 'part_name' },
      { k: 'date', l: 'Tarih', t: 'date', req: 1, list: 1 },
      { k: 'type', l: 'Hareket', t: 'select', o: opt(['giriş', 'çıkış', 'sayım düzeltme']), req: 1, list: 1, badge: 1 },
      { k: 'qty', l: 'Miktar (düzeltmede yeni stok)', t: 'number', req: 1, list: 1 },
      { k: 'unit_cost', l: 'Birim maliyet', t: 'money' },
      { k: 'ref', l: 'Belge / referans', list: 1 },
      { k: 'user_name', l: 'Kullanıcı', ro: 1, list: 1 },
      { k: 'notes', l: 'Not' },
    ],
  },
  portal_requests: {
    label: 'Sürücü talepleri', single: 'Talep', perm: 'rentals', order: 'id DESC', search: ['rider_name', 'customer_label', 'bike_code', 'notes', 'type'],
    title: (r) => `Talep #${r.id ?? ''}`, noCreate: 1,
    listSql: `SELECT q.*, rd.name AS rider_name, rd.phone AS rider_phone, COALESCE(c.company_name,c.name) AS customer_label, b.code AS bike_code, x.contract_no, s.order_no
      FROM portal_requests q LEFT JOIN riders rd ON rd.id=q.rider_id LEFT JOIN customers c ON c.id=q.customer_id LEFT JOIN bikes b ON b.id=q.bike_id
      LEFT JOIN rentals x ON x.id=q.rental_id LEFT JOIN service_orders s ON s.id=q.service_id`,
    fields: [
      { k: 'created_at', l: 'Geliş', t: 'datetime', ro: 1, list: 1 },
      { k: 'rider_name', l: 'Sürücü', ro: 1, list: 1 },
      { k: 'customer_label', l: 'Müşteri', ro: 1, list: 1 },
      { k: 'bike_code', l: 'Bisiklet', ro: 1, list: 1 },
      { k: 'type', l: 'Talep', t: 'select', o: opt(REQUEST_TYPES), list: 1, ro: 1 },
      { k: 'preferred_date', l: 'İstenen tarih', t: 'date', list: 1 },
      { k: 'preferred_time', l: 'İstenen saat' },
      { k: 'bike_type', l: 'İstenen bisiklet tipi', ro: 1 },
      { k: 'notes', l: 'Sürücünün notu', t: 'textarea', ro: 1 },
      { k: 'status', l: 'Durum', t: 'select', o: opt(REQUEST_STATUS), list: 1, badge: 1 },
      { k: 'admin_note', l: 'Sürücüye cevap (sürücü ekranında görünür)', t: 'textarea' },
    ],
  },
  cash_moves: {
    label: 'Kasa', single: 'Kasa hareketi', perm: 'finance', order: 'date DESC, id DESC', search: ['category', 'description', 'user_name'],
    title: (r) => `Kasa #${r.id}`, noCreate: 1, noEdit: 1,
    listSql: `SELECT m.*, u.name AS user_name, p.invoice_id, i.invoice_no, r.contract_no FROM cash_moves m LEFT JOIN users u ON u.id=m.user_id
      LEFT JOIN payments p ON p.id=m.payment_id LEFT JOIN invoices i ON i.id=p.invoice_id LEFT JOIN rentals r ON r.id=m.rental_id`,
    fields: [
      { k: 'date', l: 'Tarih', t: 'date', req: 1, list: 1 },
      { k: 'type', l: 'Hareket', t: 'select', o: opt(['giriş', 'çıkış', 'sayım farkı']), req: 1, list: 1, badge: 1 },
      { k: 'category', l: 'Kategori', list: 1 },
      { k: 'description', l: 'Açıklama', list: 1 },
      { k: 'amount', l: 'Tutar', t: 'money', req: 1, list: 1 },
      { k: 'user_name', l: 'Kullanıcı', ro: 1, list: 1 },
    ],
  },
  bike_costs: {
    label: 'Bisiklet giderleri', single: 'Bisiklet gideri', perm: 'fleet', order: 'date DESC, id DESC', search: ['category', 'description', 'bike_code'],
    title: (r) => `Gider #${r.id ?? ''}`,
    listSql: `SELECT g.*, b.code AS bike_code, u.name AS user_name FROM bike_costs g LEFT JOIN bikes b ON b.id=g.bike_id LEFT JOIN users u ON u.id=g.user_id`,
    fields: [
      { k: 'bike_id', l: 'Bisiklet', t: 'ref', ref: 'bikes', req: 1, list: 1, show: 'bike_code' },
      { k: 'date', l: 'Tarih', t: 'date', req: 1, list: 1 },
      { k: 'category', l: 'Gider türü', t: 'select', o: opt(BIKE_COST_TYPES), req: 1, list: 1 },
      { k: 'amount', l: 'Tutar (net)', t: 'money', req: 1, list: 1 },
      { k: 'description', l: 'Açıklama', list: 1 },
      { k: 'user_name', l: 'Kullanıcı', ro: 1, list: 1 },
    ],
  },
  suppliers: {
    label: 'Tedarikçiler', single: 'Tedarikçi', perm: 'stock', order: 'id DESC', search: ['name', 'contact', 'email'],
    title: (r) => r.name,
    fields: [
      { k: 'name', l: 'Firma', req: 1, list: 1 },
      { k: 'contact', l: 'Yetkili', list: 1 },
      { k: 'phone', l: 'Telefon', t: 'tel', list: 1 },
      { k: 'email', l: 'E-posta', t: 'email', list: 1 },
      { k: 'lead_days', l: 'Teslim süresi (gün)', t: 'number' },
      { k: 'notes', l: 'Notlar', t: 'textarea' },
    ],
  },
  users: {
    label: 'Kullanıcılar', single: 'Kullanıcı', perm: 'admin', order: 'id DESC', search: ['name', 'email'],
    title: (r) => r.name,
    listSql: `SELECT id, name, email, role, active, last_login, created_at FROM users`,
    fields: [
      { k: 'name', l: 'Ad soyad', req: 1, list: 1 },
      { k: 'email', l: 'E-posta (giriş)', t: 'email', req: 1, list: 1 },
      { k: 'role', l: 'Rol', t: 'select', o: Object.entries(ROLES).map(([v, l]) => ({ v, l })), req: 1, list: 1, badge: 1 },
      { k: 'password', l: 'Şifre (değiştirmek için doldurun)', t: 'password' },
      { k: 'active', l: 'Aktif', t: 'bool', def: 1, list: 1 },
      { k: 'last_login', l: 'Son giriş', t: 'datetime', ro: 1, list: 1 },
    ],
  },
  audit_log: {
    label: 'İşlem geçmişi', single: 'Kayıt', perm: 'admin', order: 'id DESC', search: ['action', 'entity', 'details', 'user_name'],
    readonly: 1,
    listSql: `SELECT a.*, u.name AS user_name FROM audit_log a LEFT JOIN users u ON u.id=a.user_id`,
    fields: [
      { k: 'ts', l: 'Zaman', t: 'datetime', list: 1 },
      { k: 'user_name', l: 'Kullanıcı', list: 1 },
      { k: 'action', l: 'İşlem', list: 1, badge: 1 },
      { k: 'entity', l: 'Kayıt tipi', list: 1 },
      { k: 'entity_id', l: 'ID', list: 1 },
      { k: 'details', l: 'Detay', list: 1 },
    ],
  },
};

export const DEFAULT_SETTINGS = {
  rental_periods: 'ay',
  portal_signup: '1',
  bike_types: BIKE_TYPES.join('\n'),
  company_name: 'Pedalla GmbH',
  company_address: 'Missundestraße 50, 22769 Hamburg',
  // where renters collect their bike (website booking, rider screen)
  pickup_address: 'Missundestraße 50, 22769 Hamburg-Altona',
  company_phone: '+49 176 72241488',
  company_email: 'info@pedalla.bike',
  company_tax_no: '',
  company_iban: '',
  currency: 'EUR',
  vat_rate: '19',
  payment_terms_days: '14',
  late_fee_per_day: '2.50',
  late_return_fee_per_day: '25',
  service_interval_days: '90',
  service_interval_km: '1500',
  labor_rate: '55',
  low_battery_alert: '20',
  map_center_lat: '53.5600',
  map_center_lng: '9.9500',
  contract_terms: 'Kiracı, bisikleti özenle kullanmayı, yalnızca sözleşmede adı geçen sürücülere kullandırmayı ve her hasarı derhal bildirmeyi kabul eder. Bakım, onarım ve sigorta kiralama bedeline dahildir; kullanıcı hatasından kaynaklanan hasarlar ve kayıp/çalıntı durumunda muafiyet tutarı kiracıya faturalanır. Geciken iadelerde günlük gecikme bedeli uygulanır. Depozito, bisikletin eksiksiz ve hasarsız iadesinden sonra 7 iş günü içinde iade edilir.',
  doc_lang: 'de',
  contract_terms_de: 'Der Mieter verpflichtet sich, das Fahrrad sorgfältig zu behandeln, es nur den im Vertrag genannten Fahrern zu überlassen und jeden Schaden unverzüglich zu melden. Wartung, Reparatur und Versicherung sind im Mietpreis enthalten; durch unsachgemäßen Gebrauch verursachte Schäden sowie die Selbstbeteiligung bei Verlust oder Diebstahl werden dem Mieter in Rechnung gestellt. Bei verspäteter Rückgabe wird eine tägliche Verzugsgebühr berechnet. Die Kaution wird innerhalb von 7 Werktagen nach vollständiger und schadenfreier Rückgabe erstattet.',
  contract_terms_en: 'The renter agrees to handle the bike with care, to let only the riders named in this agreement use it and to report any damage immediately. Maintenance, repairs and insurance are included in the rental fee; damage caused by misuse and the deductible in case of loss or theft are charged to the renter. A daily late fee applies to late returns. The deposit is refunded within 7 working days after the bike has been returned complete and undamaged.',
  service_terms_de: 'Die Kostenschätzung dient nur zur Information; Arbeiten, die die Schätzung um mehr als 20 % übersteigen, werden nur nach Zustimmung des Kunden ausgeführt. Für Fahrräder, die nicht innerhalb von 14 Tagen nach Fertigmeldung abgeholt werden, kann eine Lagergebühr berechnet werden.',
  service_terms_en: 'The cost estimate is for information only; work exceeding the estimate by more than 20% is carried out only with the customer\'s approval. A storage fee may be charged for bikes not collected within 14 days after notification that they are ready.',
  whatsapp_de: 'Hallo {name}, die Rechnung {invoice_no} über {amount} war am {due_date} fällig. Bitte überweisen Sie den Betrag auf {iban} (Verwendungszweck: {invoice_no}). Vielen Dank! {company}',
  whatsapp_en: 'Hello {name}, invoice {invoice_no} for {amount} was due on {due_date}. Please transfer the amount to {iban} (reference: {invoice_no}). Thank you! {company}',
  service_terms: 'Servise bırakılan bisiklet için tahmini maliyet bilgilendirme amaçlıdır; tahmini tutarın %20 üzerine çıkacak işlemler için müşteri onayı alınır. Hazır olduğu bildirildikten sonra 14 gün içinde teslim alınmayan bisikletler için depolama ücreti uygulanabilir.',
};
