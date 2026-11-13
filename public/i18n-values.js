// Values stored in the database in Turkish (statuses, types, categories) → German / English.
// Used by the rider portal and by the admin panel language switch.
// [de, en]
export const VALUES = {
  // bike photo history
  'bisiklet': ['Fahrrad', 'bike'], 'selfie': ['Selfie', 'selfie'], 'selfie + bisiklet': ['Selfie + Fahrrad', 'selfie + bike'], 'gönderildi': ['gesendet', 'sent'],
  // bike status
  'müsait': ['verfügbar', 'available'], 'kirada': ['vermietet', 'rented'], 'rezerve': ['reserviert', 'reserved'], 'serviste': ['im Service', 'in service'],
  'arızalı': ['defekt', 'faulty'], 'kayıp/çalıntı': ['verloren/gestohlen', 'lost/stolen'], 'hizmet dışı': ['außer Betrieb', 'out of service'],
  // bike types
  'Kargo bisikleti (Lastenrad)': ['Lastenrad', 'Cargo bike'], 'E-Kargo bisikleti': ['E-Lastenrad', 'E-cargo bike'], 'E-Bike': ['E-Bike', 'E-bike'], 'Klasik bisiklet': ['Fahrrad', 'Bicycle'],
  // rental status
  'rezervasyon': ['Reservierung', 'reservation'], 'aktif': ['aktiv', 'active'], 'tamamlandı': ['abgeschlossen', 'completed'], 'iptal': ['storniert', 'cancelled'],
  // invoice status
  'açık': ['offen', 'open'], 'kısmi': ['teilbezahlt', 'part-paid'], 'ödendi': ['bezahlt', 'paid'],
  // deposits
  'tahsil': ['erhalten', 'received'], 'iade': ['erstattet', 'refunded'], 'kesinti': ['Abzug', 'deduction'], 'bekliyor': ['ausstehend', 'pending'], 'alındı': ['erhalten', 'received'],
  'iade edildi': ['erstattet', 'refunded'], 'kısmi iade': ['teilweise erstattet', 'partly refunded'], 'mahsup edildi': ['verrechnet', 'offset'],
  // service status & type
  'kabul edildi': ['angenommen', 'received'], 'teşhis': ['Diagnose', 'diagnosis'], 'parça bekliyor': ['wartet auf Teile', 'waiting for parts'], 'onarımda': ['in Reparatur', 'in repair'],
  'hazır': ['fertig', 'ready'], 'teslim edildi': ['übergeben', 'handed over'],
  'periyodik bakım': ['Inspektion', 'Scheduled maintenance'], 'arıza': ['Störung', 'Fault'], 'hasar': ['Schaden', 'Damage'], 'garanti': ['Garantie', 'Warranty'], 'kaza': ['Unfall', 'Accident'],
  // periods
  'gün': ['Tag', 'day'], 'hafta': ['Woche', 'week'], 'ay': ['Monat', 'month'],
  // ID types
  'Kimlik kartı (Personalausweis)': ['Personalausweis', 'National ID card'], 'Pasaport': ['Reisepass', 'Passport'], 'Oturum izni (Aufenthaltstitel)': ['Aufenthaltstitel', 'Residence permit'], 'Ehliyet': ['Führerschein', 'Driving licence'],
  // document types
  'Kimlik ön yüz': ['Ausweis Vorderseite', 'ID card front'], 'Kimlik arka yüz': ['Ausweis Rückseite', 'ID card back'], 'Oturum izni': ['Aufenthaltstitel', 'Residence permit'],
  'Adres belgesi (Meldebescheinigung)': ['Meldebescheinigung', 'Proof of address (Meldebescheinigung)'], 'Ticaret sicili / Gewerbeanmeldung': ['Gewerbeanmeldung / Handelsregister', 'Business registration'],
  'İmzalı sözleşme': ['Unterschriebener Vertrag', 'Signed agreement'], 'Teslim fotoğrafı': ['Übergabefoto', 'Handover photo'], 'Hasar fotoğrafı': ['Schadensfoto', 'Damage photo'], 'Diğer': ['Sonstiges', 'Other'],
  // payment methods
  'banka havalesi': ['Überweisung', 'bank transfer'], 'SEPA otomatik ödeme': ['SEPA-Lastschrift', 'SEPA direct debit'], 'kredi kartı': ['Kreditkarte', 'credit card'], 'nakit': ['bar', 'cash'],
  'PayPal': ['PayPal', 'PayPal'], 'depozitodan mahsup': ['mit Kaution verrechnet', 'offset against deposit'],
  // rider requests
  'servis randevusu': ['Servicetermin', 'Service appointment'], 'arıza bildirimi': ['Störung melden', 'Report a problem'], 'iade randevusu': ['Rückgabetermin', 'Return appointment'],
  'kiralama uzatma': ['Mietverlängerung', 'Rental extension'], 'yeni kiralama': ['Neue Anmietung', 'New rental'],
  'yeni': ['neu', 'new'], 'onaylandı': ['bestätigt', 'confirmed'], 'reddedildi': ['abgelehnt', 'declined'],
  // customers / cash / stock / roles
  'kurumsal': ['Firma', 'company'], 'bireysel': ['Privatperson', 'individual'], 'giriş': ['Eingang', 'in'], 'çıkış': ['Ausgang', 'out'], 'sayım düzeltme': ['Inventurkorrektur', 'count correction'],
  'sayım farkı': ['Zähldifferenz', 'count difference'], 'pasif': ['inaktiv', 'inactive'], 'gecikmede': ['überfällig', 'overdue'], 'kara liste': ['Sperrliste', 'blacklist'],
  'adet': ['Stk.', 'pcs'], 'fren': ['Bremse', 'brakes'], 'lastik/jant': ['Reifen/Felge', 'tyre/rim'], 'zincir/aktarma': ['Kette/Antrieb', 'chain/drivetrain'], 'batarya': ['Akku', 'battery'],
  'motor/elektrik': ['Motor/Elektrik', 'motor/electrics'], 'ışık': ['Licht', 'lights'], 'kargo kutusu': ['Transportbox', 'cargo box'], 'gidon/sele': ['Lenker/Sattel', 'handlebar/saddle'],
  'aksesuar': ['Zubehör', 'accessory'], 'diğer': ['Sonstiges', 'other'],
  'Fatura tahsilatı': ['Rechnungszahlung', 'Invoice payment'], 'Depozito tahsilatı': ['Kautionseingang', 'Deposit received'], 'Servis / parça satışı': ['Service / Teileverkauf', 'Service / parts sale'],
  'Kasaya para konuldu': ['Bargeld eingelegt', 'Cash added'], 'Diğer gelir': ['Sonstige Einnahme', 'Other income'], 'Depozito iadesi': ['Kautionsrückzahlung', 'Deposit refund'],
  'Masraf / malzeme': ['Ausgaben / Material', 'Expenses / material'], 'Yakıt / ulaşım': ['Fahrtkosten', 'Travel / fuel'], 'Personel avansı': ['Personalvorschuss', 'Staff advance'],
  'Bankaya yatırıldı': ['Bei der Bank eingezahlt', 'Deposited at bank'], 'Diğer gider': ['Sonstige Ausgabe', 'Other expense'], 'Gün sonu sayımı': ['Tagesabschluss', 'End-of-day count'],
  'Yönetici': ['Administrator', 'Administrator'], 'Operasyon': ['Betrieb', 'Operations'], 'Servis teknisyeni': ['Servicetechniker', 'Service technician'], 'Muhasebe': ['Buchhaltung', 'Accounting'],
  'Doğrudan müşteri': ['Direktkunde', 'Direct customer'],
  // ---- quick actions, QR, order list, profitability
  "kaza / hasar": ["Unfall / Schaden", "accident / damage"],
  "dış servis / onarım": ["Externe Werkstatt / Reparatur", "external service / repair"],
  "yedek parça (stok dışı)": ["Ersatzteil (nicht aus Lager)", "spare part (not from stock)"],
  "sigorta": ["Versicherung", "insurance"],
  "aksesuar / ekipman": ["Zubehör / Ausrüstung", "accessories / equipment"],
  "nakliye": ["Transport", "transport"],
  "durdurma": ["Stoppen", "stop"],
  "çalıntı bildirimi": ["Diebstahlmeldung", "theft report"],
  "aktifleştirme": ["Aktivierung", "reactivation"],
  // ---- fault reports, payment plan, hand-over protocol
  'lastik / patlak': ['Reifen / Platten', 'tyre / puncture'], 'batarya / şarj': ['Akku / Laden', 'battery / charging'], 'motor / elektrik': ['Motor / Elektrik', 'motor / electrics'],
  'zincir / vites': ['Kette / Schaltung', 'chain / gears'], 'kilit / anahtar': ['Schloss / Schlüssel', 'lock / key'], 'kaza': ['Unfall', 'accident'], 'hasar / kırık': ['Schaden / Bruch', 'damage / broken'],
  'planlandı': ['geplant', 'scheduled'], 'gecikmiş': ['überfällig', 'overdue'],
  'çizik': ['Kratzer', 'scratch'], 'ezik': ['Delle', 'dent'], 'kırık': ['Bruch', 'broken'], 'eksik': ['fehlt', 'missing'], 'kir / leke': ['Schmutz / Fleck', 'dirt / stain'],
  'teslim': ['Übergabe', 'handover'], 'sürücü ekranı': ['Fahrer-App', 'rider app'],
};
const IDX = { de: 0, en: 1 };
export const tval = (lang, v) => (v == null || lang === 'tr' || !(lang in IDX) ? v : VALUES[v]?.[IDX[lang]] ?? v);
