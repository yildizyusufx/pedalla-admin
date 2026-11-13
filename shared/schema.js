export const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'operasyon', active INTEGER DEFAULT 1, last_login TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY, type TEXT DEFAULT 'kurumsal', name TEXT NOT NULL, company_name TEXT, tax_no TEXT, id_no TEXT,
  email TEXT, phone TEXT, address TEXT, city TEXT, iban TEXT, id_verified INTEGER DEFAULT 0, blacklisted INTEGER DEFAULT 0,
  notes TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS riders (
  id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), name TEXT NOT NULL, phone TEXT, email TEXT, id_no TEXT,
  trained INTEGER DEFAULT 0, active INTEGER DEFAULT 1, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS bikes (
  id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, type TEXT, brand TEXT, model TEXT, frame_no TEXT, battery_no TEXT,
  gps_tracker_id TEXT, color TEXT, year INTEGER, purchase_date TEXT, purchase_price REAL, status TEXT DEFAULT 'müsait',
  location_name TEXT, lat REAL, lng REAL, battery_level INTEGER, last_seen TEXT, odometer_km REAL DEFAULT 0,
  insurance_no TEXT, insurance_until TEXT, last_service_date TEXT, next_service_date TEXT, notes TEXT,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS bike_locations (
  id INTEGER PRIMARY KEY, bike_id INTEGER REFERENCES bikes(id), ts TEXT, lat REAL, lng REAL, battery INTEGER, speed REAL);
CREATE INDEX IF NOT EXISTS ix_loc_bike ON bike_locations(bike_id, ts);
CREATE TABLE IF NOT EXISTS pricing_plans (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, bike_type TEXT, period TEXT DEFAULT 'ay', price REAL NOT NULL, deposit REAL DEFAULT 0,
  km_included INTEGER DEFAULT 0, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS rentals (
  id INTEGER PRIMARY KEY, contract_no TEXT UNIQUE, customer_id INTEGER REFERENCES customers(id), rider_id INTEGER REFERENCES riders(id),
  bike_id INTEGER REFERENCES bikes(id), plan_id INTEGER REFERENCES pricing_plans(id), start_date TEXT, end_date TEXT, returned_at TEXT,
  period TEXT DEFAULT 'ay', rate REAL DEFAULT 0, deposit_amount REAL DEFAULT 0, deposit_status TEXT DEFAULT 'bekliyor',
  status TEXT DEFAULT 'aktif', start_km REAL, end_km REAL, start_battery INTEGER, accessories TEXT, return_condition TEXT,
  damage_fee REAL DEFAULT 0, notes TEXT, created_by INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY, invoice_no TEXT UNIQUE, rental_id INTEGER REFERENCES rentals(id), customer_id INTEGER REFERENCES customers(id),
  service_id INTEGER, issue_date TEXT, due_date TEXT, period_start TEXT, period_end TEXT, description TEXT, net REAL DEFAULT 0,
  vat_rate REAL DEFAULT 19, vat REAL DEFAULT 0, total REAL DEFAULT 0, paid_amount REAL DEFAULT 0, late_fee REAL DEFAULT 0,
  status TEXT DEFAULT 'açık', reminders_sent INTEGER DEFAULT 0, last_reminder_at TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY, invoice_id INTEGER REFERENCES invoices(id), customer_id INTEGER REFERENCES customers(id), date TEXT,
  amount REAL NOT NULL, method TEXT, reference TEXT, notes TEXT, created_by INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY, rental_id INTEGER REFERENCES rentals(id), customer_id INTEGER REFERENCES customers(id), date TEXT,
  type TEXT NOT NULL, amount REAL NOT NULL, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, contact TEXT, phone TEXT, email TEXT, lead_days INTEGER, notes TEXT);
CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT, compatible TEXT, unit TEXT DEFAULT 'adet',
  cost REAL DEFAULT 0, price REAL DEFAULT 0, stock REAL DEFAULT 0, min_stock REAL DEFAULT 0, location TEXT,
  supplier_id INTEGER REFERENCES suppliers(id), notes TEXT);
CREATE TABLE IF NOT EXISTS stock_moves (
  id INTEGER PRIMARY KEY, part_id INTEGER REFERENCES parts(id), date TEXT, type TEXT, qty REAL, unit_cost REAL, ref TEXT,
  service_id INTEGER, user_id INTEGER, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS service_orders (
  id INTEGER PRIMARY KEY, order_no TEXT UNIQUE, bike_id INTEGER REFERENCES bikes(id), customer_id INTEGER REFERENCES customers(id),
  rental_id INTEGER REFERENCES rentals(id), type TEXT, status TEXT DEFAULT 'kabul edildi', received_at TEXT, received_by INTEGER,
  brought_by TEXT, km REAL, battery_level INTEGER, complaint TEXT, checklist TEXT, visual_condition TEXT, accessories TEXT,
  estimated_cost REAL, estimated_ready TEXT, technician_id INTEGER REFERENCES users(id), diagnosis TEXT, work_done TEXT,
  labor_hours REAL DEFAULT 0, labor_rate REAL DEFAULT 0, billable INTEGER DEFAULT 0, signature_name TEXT, delivered_at TEXT,
  invoice_id INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS service_parts (
  id INTEGER PRIMARY KEY, service_id INTEGER REFERENCES service_orders(id), part_id INTEGER REFERENCES parts(id), qty REAL, unit_price REAL);
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY, owner_type TEXT NOT NULL, owner_id INTEGER NOT NULL, doc_type TEXT, name TEXT, mime TEXT, size INTEGER,
  data TEXT, notes TEXT, uploaded_by INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS ix_doc_owner ON documents(owner_type, owner_id);
CREATE TABLE IF NOT EXISTS cash_moves (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, category TEXT, description TEXT,
  payment_id INTEGER, deposit_id INTEGER, rental_id INTEGER, user_id INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS ix_cash_date ON cash_moves(date);
CREATE TABLE IF NOT EXISTS rider_sessions (token TEXT PRIMARY KEY, rider_id INTEGER NOT NULL, expires TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS portal_requests (
  id INTEGER PRIMARY KEY, rider_id INTEGER REFERENCES riders(id), customer_id INTEGER, rental_id INTEGER, bike_id INTEGER, type TEXT NOT NULL,
  preferred_date TEXT, preferred_time TEXT, notes TEXT, status TEXT DEFAULT 'yeni', admin_note TEXT, service_id INTEGER,
  handled_by INTEGER, handled_at TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS bike_costs (
  id INTEGER PRIMARY KEY, bike_id INTEGER NOT NULL REFERENCES bikes(id), date TEXT NOT NULL, category TEXT, amount REAL NOT NULL,
  description TEXT, user_id INTEGER, created_at TEXT DEFAULT (datetime('now')));
-- bike photo history: pick-up selfies, bike photos sent from the rider screen (on request or at pick-up) and staff photos.
-- data = full JPEG (resized in the browser), thumb = small JPEG for the timeline
CREATE TABLE IF NOT EXISTS bike_photos (
  id INTEGER PRIMARY KEY, bike_id INTEGER NOT NULL REFERENCES bikes(id), rider_id INTEGER, rental_id INTEGER, request_id INTEGER,
  kind TEXT DEFAULT 'bisiklet', stage TEXT, mime TEXT, size INTEGER, data TEXT, thumb TEXT, note TEXT, lat REAL, lng REAL,
  uploaded_by INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS ix_photo_bike ON bike_photos(bike_id, id);
CREATE INDEX IF NOT EXISTS ix_photo_rider ON bike_photos(rider_id, id);
CREATE INDEX IF NOT EXISTS ix_photo_rental ON bike_photos(rental_id, id);
-- photo requests from staff to the rider of a bike ("bisikletin fotoğrafını çek")
CREATE TABLE IF NOT EXISTS photo_requests (
  id INTEGER PRIMARY KEY, bike_id INTEGER NOT NULL REFERENCES bikes(id), rider_id INTEGER, rental_id INTEGER, kind TEXT DEFAULT 'bisiklet',
  note TEXT, status TEXT DEFAULT 'bekliyor', requested_by INTEGER, done_at TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS ix_preq_rider ON photo_requests(rider_id, status);
-- messages to riders: shown in the rider screen inbox and sent as phone notifications by the Android app.
-- code + params are turned into TR/DE/EN text when read (shared/messages.js), dedupe stops the daily job from sending twice
CREATE TABLE IF NOT EXISTS rider_messages (
  id INTEGER PRIMARY KEY, rider_id INTEGER NOT NULL, code TEXT NOT NULL, params TEXT, link TEXT, level TEXT DEFAULT 'info', dedupe TEXT,
  created_by INTEGER, created_at TEXT DEFAULT (datetime('now')), read_at TEXT, pushed_at TEXT);
CREATE INDEX IF NOT EXISTS ix_msg_rider ON rider_messages(rider_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_msg_dedupe ON rider_messages(dedupe);
-- hand-over and return protocols (Übergabe-/Rückgabeprotokoll): km, battery, checklist, damage marks on a bike drawing, two signatures
CREATE TABLE IF NOT EXISTS handovers (
  id INTEGER PRIMARY KEY, rental_id INTEGER NOT NULL REFERENCES rentals(id), bike_id INTEGER NOT NULL REFERENCES bikes(id), kind TEXT NOT NULL,
  km REAL, battery INTEGER, checklist TEXT, damages TEXT, accessories TEXT, notes TEXT, rider_name TEXT, rider_sign TEXT, staff_sign TEXT,
  staff_id INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS ix_handover_rental ON handovers(rental_id, id);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY, ts TEXT DEFAULT (datetime('now')), user_id INTEGER, action TEXT, entity TEXT, entity_id INTEGER, details TEXT);
`;

// Checklist items printed on the service intake form (Servis kabul formu)
export const INTAKE_CHECKLIST = [
  'Frenler (ön/arka)', 'Lastikler ve hava basıncı', 'Zincir / kayış', 'Vites', 'Işıklar (ön/arka)', 'Zil / korna',
  'Batarya ve şarj soketi', 'Ekran / kumanda', 'Motor desteği', 'Kargo kutusu / kilit', 'Ayaklık (sehpa)', 'Gövde / boya',
];

// Columns added after the first release. createApi adds any that are missing (works on existing databases too).
export const MIGRATIONS = {
  riders: { self_registered: 'INTEGER DEFAULT 0', last_lat: 'REAL', last_lng: 'REAL', last_loc_at: 'TEXT', last_loc_acc: 'REAL', portal_email: 'TEXT', portal_password_hash: 'TEXT', portal_active: 'INTEGER DEFAULT 0', portal_last_login: 'TEXT', lang: 'TEXT', id_type: 'TEXT', id_expiry: 'TEXT', birth_date: 'TEXT', nationality: 'TEXT', address: 'TEXT', license_no: 'TEXT', id_checked: 'INTEGER DEFAULT 0' },
  service_orders: { brought_by_rider_id: 'INTEGER', report_id: 'INTEGER', urgent: 'INTEGER DEFAULT 0' },
  customers: { doc_lang: "TEXT DEFAULT 'de'" },
  deposits: { method: 'TEXT' },
  users: { lang: 'TEXT' },
  portal_requests: { bike_type: 'TEXT', period: 'TEXT', duration: 'INTEGER', category: 'TEXT', rideable: 'INTEGER' },
  bikes: { service_interval_days: 'INTEGER', uid: 'TEXT', lock_requested: 'INTEGER DEFAULT 0', stolen_at: 'TEXT' },
  rentals: { pay_method: 'TEXT', return_notice_date: 'TEXT', return_notice_at: 'TEXT' },
  invoices: { pay_link: 'TEXT', pay_provider: 'TEXT', pay_ref: 'TEXT' },
  payments: { import_hash: 'TEXT', provider: 'TEXT' },
  bike_photos: { handover_id: 'INTEGER', service_id: 'INTEGER' },
};
export const ID_TYPES = ['Kimlik kartı (Personalausweis)', 'Pasaport', 'Oturum izni (Aufenthaltstitel)', 'Ehliyet'];
