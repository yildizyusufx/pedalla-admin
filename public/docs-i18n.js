// Printed documents (contract, invoice, service forms) in German or English.
// The panel itself stays Turkish; only what is handed to customers is translated.

export const DOC_LANG_LABEL = { de: 'DE', en: 'EN' };

const T = {
  de: {
    contract: 'MIETVERTRAG', invoice: 'RECHNUNG', intake: 'SERVICE-ANNAHMEFORMULAR', report: 'SERVICEBERICHT',
    lessor: 'Vermieter', renter: 'Mieter', company: 'Firma', address: 'Adresse', phone: 'Telefon', email: 'E-Mail', vat_id: 'USt-IdNr.',
    customer: 'Kunde', contact: 'Ansprechpartner', tax_no: 'Steuernummer', id_no: 'Ausweisnummer',
    rider_h: 'Übernehmende Person (Fahrer/in)', name: 'Name', birth: 'Geburtsdatum', nationality: 'Staatsangehörigkeit',
    id_type: 'Ausweisart', id_number: 'Ausweis- / Passnummer', valid_until: 'Gültig bis', license: 'Führerscheinnummer',
    id_seen: 'Original des Ausweises wurde vorgelegt, eine Kopie wurde angefertigt.',
    bike_h: 'Mietfahrrad und Übergabezustand', fleet_code: 'Flottennummer', make_model: 'Marke / Modell', type: 'Typ',
    frame_no: 'Rahmennummer', battery_no: 'Akkunummer', handover_date: 'Übergabedatum', handover_km: 'Kilometerstand bei Übergabe',
    battery: 'Akkustand', accessories: 'Zubehör',
    terms_h: 'Konditionen', period: 'Mietzeitraum', fee: 'Mietpreis', per: 'pro', plus_vat: 'zzgl. USt.', gross: 'brutto',
    deposit: 'Kaution', deposit_paid: 'bei Übergabe erhalten', payment_terms: 'Zahlungsziel', days_from_invoice: 'Tage ab Rechnungsdatum',
    late_return: 'Verspätete Rückgabe', late_payment: 'Verzugsgebühr', per_day: 'pro Tag',
    protocol_h: 'Übergabeprotokoll', protocol: 'Der Mieter bestätigt, das oben genannte Fahrrad samt Zubehör vollständig und in funktionsfähigem Zustand erhalten zu haben. Vorhandene Schäden:',
    sign_lessor: 'Vermieter', sign_renter: 'Mieter', sign_rider: 'Übernehmende Person', place_date: 'Ort, Datum',
    bill_to: 'Rechnungsadresse', invoice_no: 'Rechnungsnummer', date: 'Datum', due: 'Fällig am', contract_no: 'Vertragsnummer',
    service_period: 'Leistungszeitraum', description: 'Beschreibung', amount: 'Betrag', late_fee: 'Verzugsgebühr',
    subtotal: 'Zwischensumme (netto)', vat: 'USt.', total: 'Gesamtbetrag', paid: 'Bezahlt', balance: 'Offener Betrag',
    pay_note: (due, iban) => `Bitte überweisen Sie den Betrag bis zum ${due} ${iban ? `auf das Konto IBAN <b>${iban}</b>` : 'auf unser Geschäftskonto'} und geben Sie die Rechnungsnummer als Verwendungszweck an.`,
    received_at: 'Annahmedatum', received_by: 'Angenommen von', brought_by: 'Abgegeben von', service_type: 'Serviceart', fleet: 'Pedalla-Flotte',
    bike: 'Fahrrad', km: 'Kilometerstand', complaint: 'Beanstandung / Auftrag', checklist: 'Annahme-Checkliste', check: 'Prüfpunkt',
    ok: 'In Ordnung', issue: 'Mangel', missing: 'Fehlt', visual: 'Optischer Zustand / vorhandene Schäden', left_acc: 'Abgegebenes Zubehör',
    est_cost: 'Kostenschätzung', est_ready: 'Voraussichtlich fertig', diagnosis: 'Diagnose', work_done: 'Durchgeführte Arbeiten',
    received_delivered: 'Annahme / Rückgabe', item: 'Position', qty: 'Menge', unit_price: 'Einzelpreis', labor: 'Arbeitszeit', hours: 'Std.',
    total_net: 'Summe (netto)', technician: 'Techniker', received_sig: 'Empfangen von', handed_by: 'Abgegeben von', taken_by: 'Angenommen von',
  },
  en: {
    contract: 'RENTAL AGREEMENT', invoice: 'INVOICE', intake: 'SERVICE INTAKE FORM', report: 'SERVICE REPORT',
    lessor: 'Lessor', renter: 'Renter', company: 'Company', address: 'Address', phone: 'Phone', email: 'Email', vat_id: 'VAT ID',
    customer: 'Customer', contact: 'Contact person', tax_no: 'Tax number', id_no: 'ID number',
    rider_h: 'Person receiving the bike (rider)', name: 'Name', birth: 'Date of birth', nationality: 'Nationality',
    id_type: 'ID document', id_number: 'ID / passport number', valid_until: 'Valid until', license: 'Driving licence no.',
    id_seen: 'The original ID document was inspected and a copy was taken.',
    bike_h: 'Rented bike and condition at handover', fleet_code: 'Fleet code', make_model: 'Make / model', type: 'Type',
    frame_no: 'Frame number', battery_no: 'Battery number', handover_date: 'Handover date', handover_km: 'Odometer at handover',
    battery: 'Battery level', accessories: 'Accessories',
    terms_h: 'Terms', period: 'Rental period', fee: 'Rental fee', per: 'per', plus_vat: 'plus VAT', gross: 'gross',
    deposit: 'Deposit', deposit_paid: 'received at handover', payment_terms: 'Payment terms', days_from_invoice: 'days from invoice date',
    late_return: 'Late return fee', late_payment: 'Late payment fee', per_day: 'per day',
    protocol_h: 'Handover record', protocol: 'The renter confirms having received the bike and accessories listed above complete and in working order. Existing damage:',
    sign_lessor: 'Lessor', sign_renter: 'Renter', sign_rider: 'Person receiving the bike', place_date: 'Place, date',
    bill_to: 'Bill to', invoice_no: 'Invoice no.', date: 'Date', due: 'Due date', contract_no: 'Agreement no.',
    service_period: 'Service period', description: 'Description', amount: 'Amount', late_fee: 'Late payment fee',
    subtotal: 'Subtotal (net)', vat: 'VAT', total: 'Total', paid: 'Paid', balance: 'Balance due',
    pay_note: (due, iban) => `Please transfer the amount by ${due} ${iban ? `to IBAN <b>${iban}</b>` : 'to our business account'} and quote the invoice number as payment reference.`,
    received_at: 'Received on', received_by: 'Received by', brought_by: 'Dropped off by', service_type: 'Service type', fleet: 'Pedalla fleet',
    bike: 'Bike', km: 'Odometer', complaint: 'Complaint / request', checklist: 'Intake checklist', check: 'Check',
    ok: 'OK', issue: 'Issue', missing: 'Missing', visual: 'Visual condition / existing damage', left_acc: 'Accessories left',
    est_cost: 'Cost estimate', est_ready: 'Estimated ready', diagnosis: 'Diagnosis', work_done: 'Work carried out',
    received_delivered: 'Received / returned', item: 'Item', qty: 'Qty', unit_price: 'Unit price', labor: 'Labour', hours: 'h',
    total_net: 'Total (net)', technician: 'Technician', received_sig: 'Received by', handed_by: 'Dropped off by', taken_by: 'Received by',
  },
};

// Turkish values stored in the database → German / English
const VALUES = {
  de: {
    gün: 'Tag', hafta: 'Woche', ay: 'Monat',
    'Kimlik kartı (Personalausweis)': 'Personalausweis', Pasaport: 'Reisepass', 'Oturum izni (Aufenthaltstitel)': 'Aufenthaltstitel', Ehliyet: 'Führerschein',
    'Kargo bisikleti (Lastenrad)': 'Lastenrad', 'E-Kargo bisikleti': 'E-Lastenrad', 'E-Bike': 'E-Bike', 'Klasik bisiklet': 'Fahrrad',
    'periyodik bakım': 'Inspektion', arıza: 'Störung', hasar: 'Schaden', garanti: 'Garantie', kaza: 'Unfall',
    'Frenler (ön/arka)': 'Bremsen (vorne/hinten)', 'Lastikler ve hava basıncı': 'Reifen und Luftdruck', 'Zincir / kayış': 'Kette / Riemen', Vites: 'Schaltung',
    'Işıklar (ön/arka)': 'Beleuchtung (vorne/hinten)', 'Zil / korna': 'Klingel', 'Batarya ve şarj soketi': 'Akku und Ladebuchse', 'Ekran / kumanda': 'Display / Bedienteil',
    'Motor desteği': 'Motorunterstützung', 'Kargo kutusu / kilit': 'Transportbox / Schloss', 'Ayaklık (sehpa)': 'Ständer', 'Gövde / boya': 'Rahmen / Lack',
  },
  en: {
    gün: 'day', hafta: 'week', ay: 'month',
    'Kimlik kartı (Personalausweis)': 'National ID card', Pasaport: 'Passport', 'Oturum izni (Aufenthaltstitel)': 'Residence permit', Ehliyet: 'Driving licence',
    'Kargo bisikleti (Lastenrad)': 'Cargo bike', 'E-Kargo bisikleti': 'E-cargo bike', 'E-Bike': 'E-bike', 'Klasik bisiklet': 'Bicycle',
    'periyodik bakım': 'Scheduled maintenance', arıza: 'Fault', hasar: 'Damage', garanti: 'Warranty', kaza: 'Accident',
    'Frenler (ön/arka)': 'Brakes (front/rear)', 'Lastikler ve hava basıncı': 'Tyres and pressure', 'Zincir / kayış': 'Chain / belt', Vites: 'Gears',
    'Işıklar (ön/arka)': 'Lights (front/rear)', 'Zil / korna': 'Bell', 'Batarya ve şarj soketi': 'Battery and charging port', 'Ekran / kumanda': 'Display / controls',
    'Motor desteği': 'Motor assist', 'Kargo kutusu / kilit': 'Cargo box / lock', 'Ayaklık (sehpa)': 'Kickstand', 'Gövde / boya': 'Frame / paint',
  },
};

export const docT = (lang) => T[lang] || T.de;
export const tv = (lang, v) => (v == null ? v : VALUES[lang]?.[v] ?? v);
export const docLangOf = (customer, settings) => (T[customer?.doc_lang] ? customer.doc_lang : T[settings?.doc_lang] ? settings.doc_lang : 'de');

const LOCALE = { de: 'de-DE', en: 'en-IE' };
export const dMoney = (lang, v) => new Intl.NumberFormat(LOCALE[lang] || 'de-DE', { style: 'currency', currency: 'EUR' }).format(Number(v) || 0);
export const dNum = (lang, v, d = 0) => (v == null || v === '' ? '—' : new Intl.NumberFormat(LOCALE[lang] || 'de-DE', { maximumFractionDigits: d }).format(Number(v)));
export const dDate = (lang, v) => {
  if (!v) return '—';
  const [y, m, d] = String(v).slice(0, 10).split('-');
  return lang === 'en' ? `${d}/${m}/${y}` : `${d}.${m}.${y}`;
};
export const dDateTime = (lang, v) => (v ? `${dDate(lang, v)} ${String(v).slice(11, 16)}` : '—');

// Invoice descriptions are generated in Turkish by the API; translate the known patterns.
export function invoiceText(lang, text) {
  if (!text || lang === 'tr') return text;
  const de = lang === 'de';
  return String(text)
    .replace(/^Kiralama (\S+) · (\S+) · (\d{4}-\d{2}-\d{2}) – (\d{4}-\d{2}-\d{2})/, (m, k, b, a, z) => `${de ? 'Miete' : 'Rental'} ${k} · ${b} · ${dDate(lang, a)} – ${dDate(lang, z)}`)
    .replace(/^Geç iade bedeli (\S+) · (\d+) gün/, (m, k, n) => (de ? `Gebühr verspätete Rückgabe ${k} · ${n} Tage` : `Late return fee ${k} · ${n} days`))
    .replace(/^Hasar bedeli (\S+):/, (m, k) => (de ? `Schadensersatz ${k}:` : `Damage charge ${k}:`))
    .replace(/^Servis (\S+)/, (m, k) => (de ? `Service ${k}` : `Service ${k}`));
}
