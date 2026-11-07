// Pedalla rider portal (sürücü ekranı) – mobile first, TR / DE / EN
import { tval } from './i18n-values.js';
import { DOC_TYPES } from './shared/meta.js';

const L = {
  tr: {
    note_ph_rent: 'Örn. kurye işi için kullanacağım, haftada 5 gün; teslim almak için uygun saatim…', note_ph_return: 'Örn. bisikleti hangi saatte getirebileceğiniz, iade adresi…', note_ph_extend: 'Örn. ne kadar uzatmak istediğiniz…',
    no_account: 'Hesabınız yok mu?', signup: 'Kayıt ol', signup_h: 'Sürücü kaydı', signup_sub: 'Bilgilerinizi girin, hesabınızı oluşturun ve hemen kiralama talebi gönderin.', have_account: 'Zaten hesabınız var mı?', full_name: 'Ad soyad', birth: 'Doğum tarihi', nationality: 'Uyruk', address: 'Adres', id_type: 'Kimlik türü', id_no: 'Kimlik / pasaport no', pw_hint: 'En az 6 karakter', consent: 'Bilgilerimin kiralama ve sözleşme için Pedalla tarafından işlenmesini kabul ediyorum. Kimliğimin aslını teslimde göstereceğim.', create_acc: 'Hesabı oluştur', email_taken: 'Bu e-posta ile zaten bir hesap var. Giriş yapın.', welcome_new: 'Hesabınız oluşturuldu. Şimdi kiralama talebi gönderebilir ve kimlik belgelerinizi yükleyebilirsiniz.', rent_cta: 'Bisiklet kiralamak ister misiniz?', rent_btn: 'Kiralama talebi gönder', bike_type: 'Bisiklet tipi', any_type: 'Fark etmez', period: 'Kiralama süresi birimi', duration: 'Süre', p_day: 'Gün', p_week: 'Hafta', p_month: 'Ay', start: 'Başlangıç tarihi', price_from: 'Tarife', deposit_l: 'depozito', vat_note: '+ KDV', optional: '(isteğe bağlı)', signup_closed: 'Yeni kayıt şu an kapalı. Lütfen bizimle iletişime geçin.',
    loc_h: 'Konum paylaşımı', loc_text: 'Bisikletin güvenliği ve hızlı yardım için, bu ekran açıkken telefonunuzun konumu Pedalla ile paylaşılır. İstediğiniz zaman Profil\'den kapatabilirsiniz.', loc_allow: 'Konumu paylaş', loc_later: 'Şimdi değil', loc_on: 'Konum paylaşılıyor', loc_off: 'Konum paylaşılmıyor', loc_stop: 'Paylaşımı durdur', loc_denied: 'Konum izni verilmedi. Telefon ayarlarından tarayıcıya konum izni verin.', loc_last: 'son gönderim',
    title: 'Sürücü ekranı', login_h: 'Sürücü girişi', login_sub: 'Pedalla\'nın size verdiği e-posta ve şifre ile giriş yapın.', email: 'E-posta', password: 'Şifre', login: 'Giriş yap',
    logout: 'Çıkış yap', hello: 'Merhaba', home: 'Ana sayfa', requests: 'Talepler', payments: 'Ödemeler', docs: 'Belgeler', profile: 'Profil',
    notices: 'Bildirimler', no_notices: 'Şu an her şey yolunda. Yeni bildirim yok.', my_bike: 'Bisikletim', no_rental: 'Şu an aktif bir kiralamanız yok.',
    contract: 'Sözleşme', until: 'Dönüş tarihi', battery: 'Batarya', km: 'Kilometre', next_service: 'Sonraki bakım', deposit: 'Depozito', plan: 'Tarife',
    quick: 'Hızlı işlemler', q_service: 'Servis randevusu', q_fault: 'Arıza bildir', q_return: 'İade randevusu', q_extend: 'Uzatma iste',
    next_payment: 'Sıradaki ödeme', due: 'Son ödeme', nothing_due: 'Açık ödemeniz yok.', next_charge: 'Sonraki kira dönemi', from: 'başlangıç',
    open_balance: 'Açık bakiye', overdue: 'Gecikmiş', invoices: 'Faturalar', paid_list: 'Yapılan ödemeler', no_payments: 'Henüz ödeme yok.', no_invoices: 'Fatura yok.',
    pay_how: 'Nasıl ödenir?', pay_text: 'Tutarı banka havalesi ile gönderin ve açıklamaya fatura numarasını yazın.', iban: 'IBAN', receiver: 'Alıcı',
    company_pays: 'Kira ödemeleriniz bağlı olduğunuz firma ({c}) tarafından yapılıyor. Fatura bilgileri burada gösterilmez.',
    new_req: 'Yeni talep', req_type: 'Talep türü', date: 'Tarih', time: 'Saat', any_time: 'Fark etmez', note: 'Not', note_ph: 'Örn. ön fren ses yapıyor, sabah 10\'dan sonra uygunum…',
    send: 'Gönder', sent: 'Talebiniz gönderildi. Size dönüş yapacağız.', my_reqs: 'Taleplerim', no_reqs: 'Henüz talebiniz yok.', cancel: 'İptal et', cancelled: 'Talep iptal edildi',
    reply: 'Pedalla cevabı', services: 'Servis geçmişi', no_services: 'Servis kaydı yok.', est_ready: 'Tahmini hazır',
    req_docs: 'İstenen belgeler', upload: 'Belge yükle', doc_type: 'Belge türü', file: 'Dosya (fotoğraf veya PDF)', take_photo: 'Fotoğraf çek / dosya seç', uploaded: 'Belge yüklendi, teşekkürler!',
    my_docs: 'Yüklenen belgeler', no_docs: 'Henüz belge yüklemediniz.', missing: 'Eksik', done: 'Tamam', all_docs_ok: 'Tüm belgeleriniz tamam. Teşekkürler!', open: 'Aç',
    file_big: 'Dosya çok büyük (en fazla 3 MB).', file_type: 'Sadece JPG, PNG veya PDF yüklenebilir.',
    my_info: 'Bilgilerim', name: 'Ad soyad', phone: 'Telefon', id_doc: 'Kimlik', valid: 'geçerli', save: 'Kaydet', saved: 'Kaydedildi',
    lang: 'Dil', change_pw: 'Şifre değiştir', cur_pw: 'Mevcut şifre', new_pw: 'Yeni şifre (en az 6 karakter)', contact: 'Pedalla ile iletişim', call: 'Ara', write: 'WhatsApp',
    days: '{n} gün', today: 'bugün', tomorrow: 'yarın', loading: 'Yükleniyor…', err: 'Bir hata oldu',
    n_return_late: '{bike} bisikletinin dönüş tarihi {date} idi ({n} gün gecikme). Lütfen iade randevusu alın veya uzatma isteyin.',
    n_return_soon: '{bike} bisikletinin kiralaması {date} tarihinde bitiyor ({when}). Uzatmak veya iade randevusu almak ister misiniz?',
    n_service_due: '{bike} için rutin bakım zamanı yaklaştı: {date} ({when}). Hemen randevu alın.',
    n_service_overdue: '{bike} için rutin bakım tarihi geçti ({date}). Lütfen servis randevusu alın.',
    n_battery_low: '{bike} bataryası düşük: %{pct}. Lütfen şarj edin.', n_deposit_open: '{amount} depozito henüz ödenmedi.',
    n_reservation: '{bike} bisikleti {date} tarihinde sizin için hazır olacak.',
    n_invoice_overdue: '{no} numaralı faturanın son ödeme tarihi geçti ({date}, {n} gün). Açık tutar: {amount}.',
    n_invoice_due: '{no} numaralı fatura {date} tarihine kadar ödenmeli ({when}). Tutar: {amount}.',
    n_docs_missing: 'Eksik belgeler: {docs}. Lütfen "Belgeler" bölümünden yükleyin.', n_id_expired: 'Kimliğinizin süresi doldu ({date}). Lütfen yenisini yükleyin.',
    n_id_expiring: 'Kimliğinizin süresi {date} tarihinde doluyor. Yenilediğinizde lütfen yükleyin.',
    n_request_ok: '"{type}" talebiniz onaylandı{date}.{note}', n_request_no: '"{type}" talebiniz kabul edilemedi.{note}', n_request_done: '"{type}" talebiniz tamamlandı.{note}',
    n_service_ready: '{bike} bisikletiniz servisten hazır ({no}). Teslim alabilirsiniz.',
  },
  de: {
    note_ph_rent: 'z. B. für Kurierfahrten, 5 Tage pro Woche; wann ich das Rad abholen kann…', note_ph_return: 'z. B. wann Sie das Rad zurückbringen können…', note_ph_extend: 'z. B. um wie lange Sie verlängern möchten…',
    no_account: 'Noch kein Konto?', signup: 'Registrieren', signup_h: 'Fahrer-Registrierung', signup_sub: 'Daten eingeben, Konto anlegen und direkt eine Mietanfrage senden.', have_account: 'Schon ein Konto?', full_name: 'Vor- und Nachname', birth: 'Geburtsdatum', nationality: 'Staatsangehörigkeit', address: 'Adresse', id_type: 'Ausweisart', id_no: 'Ausweis- / Passnummer', pw_hint: 'Mindestens 6 Zeichen', consent: 'Ich bin einverstanden, dass Pedalla meine Daten für Miete und Vertrag verarbeitet. Meinen Ausweis zeige ich bei der Übergabe im Original.', create_acc: 'Konto anlegen', email_taken: 'Mit dieser E-Mail gibt es bereits ein Konto. Bitte anmelden.', welcome_new: 'Ihr Konto wurde angelegt. Sie können jetzt eine Mietanfrage senden und Ihre Ausweisdokumente hochladen.', rent_cta: 'Möchten Sie ein Fahrrad mieten?', rent_btn: 'Mietanfrage senden', bike_type: 'Fahrradtyp', any_type: 'Egal', period: 'Mieteinheit', duration: 'Dauer', p_day: 'Tag', p_week: 'Woche', p_month: 'Monat', start: 'Startdatum', price_from: 'Tarif', deposit_l: 'Kaution', vat_note: '+ MwSt.', optional: '(optional)', signup_closed: 'Neue Registrierungen sind derzeit geschlossen. Bitte kontaktieren Sie uns.',
    loc_h: 'Standortfreigabe', loc_text: 'Zur Sicherheit des Fahrrads und für schnelle Hilfe wird der Standort Ihres Handys mit Pedalla geteilt, solange diese Seite geöffnet ist. Sie können es jederzeit im Profil ausschalten.', loc_allow: 'Standort teilen', loc_later: 'Nicht jetzt', loc_on: 'Standort wird geteilt', loc_off: 'Standort wird nicht geteilt', loc_stop: 'Freigabe beenden', loc_denied: 'Keine Standortberechtigung. Bitte in den Handy-Einstellungen dem Browser den Standort erlauben.', loc_last: 'zuletzt gesendet',
    title: 'Fahrerbereich', login_h: 'Fahrer-Login', login_sub: 'Melde dich mit der E-Mail und dem Passwort an, die du von Pedalla bekommen hast.', email: 'E-Mail', password: 'Passwort', login: 'Anmelden',
    logout: 'Abmelden', hello: 'Hallo', home: 'Start', requests: 'Anfragen', payments: 'Zahlungen', docs: 'Dokumente', profile: 'Profil',
    notices: 'Hinweise', no_notices: 'Alles in Ordnung. Keine neuen Hinweise.', my_bike: 'Mein Rad', no_rental: 'Du hast derzeit keine aktive Miete.',
    contract: 'Vertrag', until: 'Rückgabe am', battery: 'Akku', km: 'Kilometer', next_service: 'Nächste Inspektion', deposit: 'Kaution', plan: 'Tarif',
    quick: 'Schnellzugriff', q_service: 'Servicetermin', q_fault: 'Störung melden', q_return: 'Rückgabetermin', q_extend: 'Verlängern',
    next_payment: 'Nächste Zahlung', due: 'Fällig am', nothing_due: 'Keine offenen Zahlungen.', next_charge: 'Nächster Mietzeitraum', from: 'ab',
    open_balance: 'Offener Betrag', overdue: 'Überfällig', invoices: 'Rechnungen', paid_list: 'Geleistete Zahlungen', no_payments: 'Noch keine Zahlungen.', no_invoices: 'Keine Rechnungen.',
    pay_how: 'So bezahlst du', pay_text: 'Überweise den Betrag und gib die Rechnungsnummer als Verwendungszweck an.', iban: 'IBAN', receiver: 'Empfänger',
    company_pays: 'Deine Miete bezahlt deine Firma ({c}). Rechnungen werden hier nicht angezeigt.',
    new_req: 'Neue Anfrage', req_type: 'Art der Anfrage', date: 'Datum', time: 'Uhrzeit', any_time: 'Egal', note: 'Notiz', note_ph: 'z. B. Vorderbremse quietscht, ab 10 Uhr möglich…',
    send: 'Senden', sent: 'Deine Anfrage wurde gesendet. Wir melden uns.', my_reqs: 'Meine Anfragen', no_reqs: 'Noch keine Anfragen.', cancel: 'Stornieren', cancelled: 'Anfrage storniert',
    reply: 'Antwort von Pedalla', services: 'Service-Historie', no_services: 'Keine Serviceaufträge.', est_ready: 'Voraussichtlich fertig',
    req_docs: 'Benötigte Dokumente', upload: 'Dokument hochladen', doc_type: 'Dokumentart', file: 'Datei (Foto oder PDF)', take_photo: 'Foto aufnehmen / Datei wählen', uploaded: 'Dokument hochgeladen, danke!',
    my_docs: 'Hochgeladene Dokumente', no_docs: 'Noch keine Dokumente hochgeladen.', missing: 'Fehlt', done: 'OK', all_docs_ok: 'Alle Dokumente vollständig. Danke!', open: 'Öffnen',
    file_big: 'Datei zu groß (max. 3 MB).', file_type: 'Nur JPG, PNG oder PDF.',
    my_info: 'Meine Daten', name: 'Name', phone: 'Telefon', id_doc: 'Ausweis', valid: 'gültig bis', save: 'Speichern', saved: 'Gespeichert',
    lang: 'Sprache', change_pw: 'Passwort ändern', cur_pw: 'Aktuelles Passwort', new_pw: 'Neues Passwort (mind. 6 Zeichen)', contact: 'Kontakt zu Pedalla', call: 'Anrufen', write: 'WhatsApp',
    days: '{n} Tage', today: 'heute', tomorrow: 'morgen', loading: 'Wird geladen…', err: 'Es ist ein Fehler aufgetreten',
    n_return_late: 'Die Rückgabe von {bike} war am {date} fällig ({n} Tage verspätet). Bitte buche einen Rückgabetermin oder frage eine Verlängerung an.',
    n_return_soon: 'Die Miete für {bike} endet am {date} ({when}). Möchtest du verlängern oder einen Rückgabetermin buchen?',
    n_service_due: 'Die regelmäßige Inspektion für {bike} steht an: {date} ({when}). Buche jetzt einen Termin.',
    n_service_overdue: 'Die Inspektion für {bike} ist überfällig ({date}). Bitte buche einen Servicetermin.',
    n_battery_low: 'Akku von {bike} ist niedrig: {pct} %. Bitte aufladen.', n_deposit_open: 'Die Kaution von {amount} ist noch offen.',
    n_reservation: '{bike} ist ab {date} für dich reserviert.',
    n_invoice_overdue: 'Rechnung {no} war am {date} fällig ({n} Tage überfällig). Offen: {amount}.',
    n_invoice_due: 'Rechnung {no} ist bis {date} zu bezahlen ({when}). Betrag: {amount}.',
    n_docs_missing: 'Fehlende Dokumente: {docs}. Bitte unter „Dokumente" hochladen.', n_id_expired: 'Dein Ausweis ist abgelaufen ({date}). Bitte lade den neuen hoch.',
    n_id_expiring: 'Dein Ausweis läuft am {date} ab. Bitte lade den neuen hoch, sobald du ihn hast.',
    n_request_ok: 'Deine Anfrage „{type}" wurde bestätigt{date}.{note}', n_request_no: 'Deine Anfrage „{type}" konnte nicht angenommen werden.{note}', n_request_done: 'Deine Anfrage „{type}" ist erledigt.{note}',
    n_service_ready: 'Dein Rad {bike} ist fertig ({no}) und kann abgeholt werden.',
  },
  en: {
    note_ph_rent: 'e.g. for courier work, 5 days a week; when I can pick up the bike…', note_ph_return: 'e.g. when you can bring the bike back…', note_ph_extend: 'e.g. how long you would like to extend…',
    no_account: 'No account yet?', signup: 'Sign up', signup_h: 'Rider sign-up', signup_sub: 'Enter your details, create your account and send a rental request right away.', have_account: 'Already have an account?', full_name: 'Full name', birth: 'Date of birth', nationality: 'Nationality', address: 'Address', id_type: 'ID type', id_no: 'ID / passport no.', pw_hint: 'At least 6 characters', consent: 'I agree that Pedalla processes my data for the rental and contract. I will show my original ID at handover.', create_acc: 'Create account', email_taken: 'An account with this e-mail already exists. Please log in.', welcome_new: 'Your account has been created. You can now send a rental request and upload your ID documents.', rent_cta: 'Would you like to rent a bike?', rent_btn: 'Send rental request', bike_type: 'Bike type', any_type: 'Any', period: 'Rental unit', duration: 'Duration', p_day: 'Day', p_week: 'Week', p_month: 'Month', start: 'Start date', price_from: 'Rate', deposit_l: 'deposit', vat_note: '+ VAT', optional: '(optional)', signup_closed: 'New sign-ups are closed right now. Please contact us.',
    loc_h: 'Location sharing', loc_text: 'For the bike\'s safety and quick help, your phone\'s location is shared with Pedalla while this screen is open. You can turn it off any time in Profile.', loc_allow: 'Share location', loc_later: 'Not now', loc_on: 'Location is being shared', loc_off: 'Location is not shared', loc_stop: 'Stop sharing', loc_denied: 'Location permission denied. Allow location for your browser in the phone settings.', loc_last: 'last sent',
    title: 'Rider area', login_h: 'Rider login', login_sub: 'Sign in with the e-mail and password you received from Pedalla.', email: 'E-mail', password: 'Password', login: 'Sign in',
    logout: 'Sign out', hello: 'Hi', home: 'Home', requests: 'Requests', payments: 'Payments', docs: 'Documents', profile: 'Profile',
    notices: 'Notifications', no_notices: 'All good. No new notifications.', my_bike: 'My bike', no_rental: 'You have no active rental right now.',
    contract: 'Agreement', until: 'Return by', battery: 'Battery', km: 'Odometer', next_service: 'Next service', deposit: 'Deposit', plan: 'Plan',
    quick: 'Quick actions', q_service: 'Book service', q_fault: 'Report a problem', q_return: 'Book return', q_extend: 'Extend rental',
    next_payment: 'Next payment', due: 'Due', nothing_due: 'Nothing to pay right now.', next_charge: 'Next rental period', from: 'from',
    open_balance: 'Open balance', overdue: 'Overdue', invoices: 'Invoices', paid_list: 'Payments made', no_payments: 'No payments yet.', no_invoices: 'No invoices.',
    pay_how: 'How to pay', pay_text: 'Transfer the amount and quote the invoice number as payment reference.', iban: 'IBAN', receiver: 'Payee',
    company_pays: 'Your rent is paid by your company ({c}). Invoices are not shown here.',
    new_req: 'New request', req_type: 'Request type', date: 'Date', time: 'Time', any_time: 'Any time', note: 'Note', note_ph: 'e.g. front brake squeaks, available after 10am…',
    send: 'Send', sent: 'Your request was sent. We will get back to you.', my_reqs: 'My requests', no_reqs: 'No requests yet.', cancel: 'Cancel', cancelled: 'Request cancelled',
    reply: 'Reply from Pedalla', services: 'Service history', no_services: 'No service orders.', est_ready: 'Estimated ready',
    req_docs: 'Required documents', upload: 'Upload document', doc_type: 'Document type', file: 'File (photo or PDF)', take_photo: 'Take photo / choose file', uploaded: 'Document uploaded, thank you!',
    my_docs: 'Uploaded documents', no_docs: 'No documents uploaded yet.', missing: 'Missing', done: 'Done', all_docs_ok: 'All documents complete. Thank you!', open: 'Open',
    file_big: 'File too large (max 3 MB).', file_type: 'Only JPG, PNG or PDF.',
    my_info: 'My details', name: 'Name', phone: 'Phone', id_doc: 'ID', valid: 'valid until', save: 'Save', saved: 'Saved',
    lang: 'Language', change_pw: 'Change password', cur_pw: 'Current password', new_pw: 'New password (min. 6 characters)', contact: 'Contact Pedalla', call: 'Call', write: 'WhatsApp',
    days: '{n} days', today: 'today', tomorrow: 'tomorrow', loading: 'Loading…', err: 'Something went wrong',
    n_return_late: '{bike} was due back on {date} ({n} days late). Please book a return or ask for an extension.',
    n_return_soon: 'Your rental of {bike} ends on {date} ({when}). Would you like to extend or book a return?',
    n_service_due: 'Routine service for {bike} is coming up: {date} ({when}). Book an appointment now.',
    n_service_overdue: 'Routine service for {bike} is overdue ({date}). Please book a service appointment.',
    n_battery_low: 'Battery of {bike} is low: {pct}%. Please charge it.', n_deposit_open: 'The deposit of {amount} has not been paid yet.',
    n_reservation: '{bike} will be ready for you on {date}.',
    n_invoice_overdue: 'Invoice {no} was due on {date} ({n} days overdue). Balance: {amount}.',
    n_invoice_due: 'Invoice {no} is due by {date} ({when}). Amount: {amount}.',
    n_docs_missing: 'Missing documents: {docs}. Please upload them under "Documents".', n_id_expired: 'Your ID expired on {date}. Please upload the new one.',
    n_id_expiring: 'Your ID expires on {date}. Please upload the new one once you have it.',
    n_request_ok: 'Your "{type}" request was confirmed{date}.{note}', n_request_no: 'Your "{type}" request could not be accepted.{note}', n_request_done: 'Your "{type}" request is done.{note}',
    n_service_ready: 'Your bike {bike} is ready ({no}). You can pick it up.',
  },
};
const LANGS = [['tr', 'TR'], ['de', 'DE'], ['en', 'EN']];
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
const guessLang = () => { const n = (navigator.language || 'de').slice(0, 2); return L[n] ? n : 'de'; };
// hand-off from the public website: portal.html?lang=de#t=<token>&go=requests logs the rider straight in
const handoff = new URLSearchParams(location.hash.startsWith('#t=') ? location.hash.slice(1) : '');
const qlang = new URLSearchParams(location.search).get('lang');
if (qlang && L[qlang]) store.set('pedalla_rider_lang', qlang);
if (handoff.get('t')) { store.set('pedalla_rider_token', handoff.get('t')); history.replaceState(null, '', location.pathname + location.search + '#' + (handoff.get('go') || 'home')); }
let lang = store.get('pedalla_rider_lang') || guessLang();
let token = store.get('pedalla_rider_token');
let data = null; let tab = (location.hash.slice(1) || 'home');

const t = (k, p = {}) => String(L[lang][k] ?? L.de[k] ?? k).replace(/\{(\w+)\}/g, (m, x) => (p[x] ?? ''));
const v = (x) => tval(lang, x);
const cv = (x) => { const s = v(x); return s ? s.charAt(0).toLocaleUpperCase(lang) + s.slice(1) : s; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOC = { tr: 'tr-TR', de: 'de-DE', en: 'en-IE' };
const money = (n) => new Intl.NumberFormat(LOC[lang], { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
const num = (n) => (n == null ? '—' : new Intl.NumberFormat(LOC[lang], { maximumFractionDigits: 0 }).format(Number(n)));
const date = (s) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-'); return lang === 'en' ? `${d}/${m}/${y}` : `${d}.${m}.${y}`; };
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const when = (days) => (days === 0 ? t('today') : days === 1 ? t('tomorrow') : t('days', { n: days }));
const root = () => document.getElementById('root');

async function api(method, path, body) {
  const r = await fetch('api/portal/' + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== 'login') { setToken(null); render(); throw new Error(j.error || 'login'); }
  if (r.status >= 400) throw new Error(j.error || t('err'));
  return j;
}
const setToken = (x) => { token = x; store.set('pedalla_rider_token', x); if (!x) data = null; };
function toast(msg, kind = 'ok') {
  const el = document.createElement('div'); el.className = `toast t-${kind}`; el.textContent = msg; document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10); setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}
const guard = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { if (e.message !== 'login') toast(e.message, 'err'); } };
const setLang = async (l) => {
  lang = l; store.set('pedalla_rider_lang', l); document.documentElement.lang = l;
  if (token && data && data.rider.lang !== l) { try { data = await api('PUT', 'me', { lang: l }); } catch {} }
  render();
};
const langSw = () => `<div class="p-lang">${LANGS.map(([k, l]) => `<button type="button" data-lang="${k}" class="${k === lang ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const bindLang = (el) => el.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => setLang(b.dataset.lang)));

const IC = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>', req: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  pay: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>', docs: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h5"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', bike: '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16 10 8h5l3 8M10 8 8 5H6M12 16l3-8"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>', alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  back: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-2"/>', plus: '<path d="M12 6v12M6 12h12"/>', cam: '<path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/>',
  phone: '<path d="M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  check: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
};
const ic = (n) => `<svg viewBox="0 0 24 24" class="ic" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ''}</svg>`;
const badge = (s) => `<span class="badge b-${{ aktif: 'brand', rezervasyon: 'info', 'açık': 'warn', 'kısmi': 'info', 'ödendi': 'ok', yeni: 'info', 'onaylandı': 'ok', 'reddedildi': 'danger', 'tamamlandı': 'muted', iptal: 'muted', 'hazır': 'ok', 'teslim edildi': 'muted' }[s] || 'warn'}">${esc(v(s))}</span>`;

// ---------- screens ----------
function loginView() {
  root().innerHTML = `<div class="p-login"><div class="p-login-card">${langSw()}<img class="p-logo" src="img/logo.png" alt="pedalla">
    <h1>${t('login_h')}</h1><p class="muted">${t('login_sub')}</p>
    <form id="lf"><label class="field"><span>${t('email')}</span><input name="email" type="email" autocomplete="username" required inputmode="email"></label>
    <label class="field"><span>${t('password')}</span><input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn primary p-big">${t('login')}</button></form><p class="p-alt" id="su" hidden>${t('no_account')} <a href="#signup">${t('signup')}</a></p></div></div>`;
  bindLang(root());
  api('GET', 'config').then((c) => { cfg = c; const el = root().querySelector('#su'); if (el && c.signup) el.hidden = false; }).catch(() => {});
  root().querySelector('#lf').onsubmit = guard(async (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    const r = await api('POST', 'login', { email: f.get('email'), password: f.get('password') }); setToken(r.token); await load();
  });
}

let cfg = null;
function signupView() {
  const types = cfg?.id_types || [];
  root().innerHTML = `<div class="p-login"><div class="p-login-card">${langSw()}<img class="p-logo" src="img/logo.png" alt="pedalla">
    <h1>${t('signup_h')}</h1><p class="muted">${t('signup_sub')}</p>
    ${cfg && !cfg.signup ? `<div class="p-card p-empty">${t('signup_closed')}</div>` : `<form id="sgf" autocomplete="on">
    <label class="field"><span>${t('full_name')} *</span><input name="name" required minlength="3" autocomplete="name"></label>
    <label class="field"><span>${t('email')} *</span><input name="email" type="email" required autocomplete="email" inputmode="email"></label>
    <label class="field"><span>${t('phone')} *</span><input name="phone" type="tel" required autocomplete="tel"></label>
    <label class="field"><span>${t('password')} *</span><input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="${esc(t('pw_hint'))}"></label>
    <div class="p-row"><label class="field"><span>${t('birth')}</span><input name="birth_date" type="date" max="${todayISO()}" autocomplete="bday"></label>
    <label class="field"><span>${t('nationality')}</span><input name="nationality" autocomplete="country-name"></label></div>
    <label class="field"><span>${t('address')}</span><input name="address" autocomplete="street-address"></label>
    <div class="p-row"><label class="field"><span>${t('id_type')}</span><select name="id_type"><option value="">—</option>${types.map((x) => `<option value="${esc(x)}">${esc(v(x))}</option>`).join('')}</select></label>
    <label class="field"><span>${t('id_no')}</span><input name="id_no"></label></div>
    <input name="website" class="p-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <label class="p-check"><input type="checkbox" name="consent" required><span>${t('consent')}</span></label>
    <button class="btn primary p-big">${t('create_acc')}</button></form>`}
    <p class="p-alt">${t('have_account')} <a href="#login">${t('login')}</a></p></div></div>`;
  bindLang(root());
  root().querySelector('#sgf')?.addEventListener('submit', guard(async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); f.consent = !!f.consent; f.lang = lang;
    try { const r = await api('POST', 'signup', f); setToken(r.token); fresh = true; history.replaceState(null, '', '#home'); tab = 'home'; await load(); }
    catch (x) { throw new Error(/zaten bir hesap/.test(x.message) ? t('email_taken') : x.message); }
  }));
}
let fresh = false; let btypes = null;
function notice(n) {
  const p = { ...n, n: n.days, when: n.days != null ? when(n.days) : '', date: date(n.date), amount: n.amount != null ? money(n.amount) : '', type: v(n.type), bike: `<b>${esc(n.bike)}</b>`, no: `<b>${esc(n.no)}</b>` };
  if (n.code === 'docs_missing') p.docs = n.docs.map(v).join(', ');
  if (n.code.startsWith('request_')) { p.date = n.date ? ` (${date(n.date)})` : ''; p.note = n.note ? ` ${t('reply')}: “${esc(n.note)}”` : ''; }
  const act = { service_due: 'servis randevusu', service_overdue: 'servis randevusu', return_soon: 'kiralama uzatma', return_late: 'iade randevusu' }[n.code];
  const go = n.code === 'docs_missing' || n.code.startsWith('id_') ? 'docs' : n.code.startsWith('invoice') ? 'pay' : null;
  return `<div class="p-note l-${n.level}"><div class="p-note-ic">${ic(n.level === 'ok' ? 'check' : n.level === 'info' ? 'bell' : 'alert')}</div><div><p>${t('n_' + n.code, p)}</p>
    ${act ? `<button class="btn sm" data-new="${act}">${esc(cv(act))}</button>` : ''}${go ? `<button class="btn sm" data-tab="${go}">${t(go === 'docs' ? 'upload' : 'payments')}</button>` : ''}</div></div>`;
}
function bikeCard(x) {
  return `<div class="p-card p-bike"><div class="p-bike-h">${ic('bike')}<div><b>${esc(x.bike_code)}</b> ${badge(x.status)}<small>${esc(v(x.bike_type) || '')} · ${esc([x.brand, x.model].filter(Boolean).join(' '))}</small></div></div>
    <dl class="p-dl"><div><dt>${t('contract')}</dt><dd>${esc(x.contract_no)}</dd></div><div><dt>${t('until')}</dt><dd class="${x.late_days ? 't-danger' : ''}">${date(x.end_date)}</dd></div>
    ${x.battery_level != null ? `<div><dt>${t('battery')}</dt><dd>${x.battery_level} %</dd></div>` : ''}<div><dt>${t('km')}</dt><dd>${num(x.odometer_km)} km</dd></div>
    <div><dt>${t('next_service')}</dt><dd class="${x.next_service_date && x.next_service_date <= addDays(todayISO(), 14) ? 't-warn' : ''}">${date(x.next_service_date)}</dd></div>
    ${x.deposit_amount ? `<div><dt>${t('deposit')}</dt><dd>${money(x.deposit_held || 0)} / ${money(x.deposit_amount)}</dd></div>` : ''}${x.plan_name ? `<div><dt>${t('plan')}</dt><dd>${esc(x.plan_name)}</dd></div>` : ''}</dl></div>`;
}
function homeView() {
  const d = data; const act = d.rentals.filter((x) => ['aktif', 'rezervasyon'].includes(x.status));
  const nd = d.summary.next_due; const nc = d.rentals.find((x) => x.next_charge)?.next_charge;
  return `${locDenied && store.get(LOC_KEY) !== 'off' && navigator.geolocation ? `<section class="p-card p-loc"><b>📍 ${t('loc_h')}</b><p class="muted">${t('loc_denied')}</p><div class="p-row"><button class="btn primary" data-loc="on">${t('loc_allow')}</button><button class="btn ghost" data-loc="off">${t('loc_later')}</button></div></section>` : ''}<section><h2 class="p-h">${t('notices')}</h2>${d.notifications.length ? d.notifications.map(notice).join('') : `<div class="p-card p-empty">${ic('check')} ${t('no_notices')}</div>`}</section>
  ${fresh || (d.self_registered && !d.rentals.length && !d.requests.length) ? `<div class="p-card p-welcome">${ic('check')} ${t('welcome_new')}</div>` : ''}
  <section><h2 class="p-h">${t('my_bike')}</h2>${act.length ? act.map(bikeCard).join('') : `<div class="p-card p-empty">${t('no_rental')}${d.requests.some((q) => q.type === 'yeni kiralama' && q.status === 'yeni') ? '' : `<p><b>${t('rent_cta')}</b></p><button class="btn primary p-big" data-new="yeni kiralama">${ic('bike')} ${t('rent_btn')}</button>`}</div>`}</section>
  ${act.length ? `<section><h2 class="p-h">${t('quick')}</h2><div class="p-quick">
    <button data-new="servis randevusu">${ic('wrench')}<span>${t('q_service')}</span></button><button data-new="arıza bildirimi">${ic('alert')}<span>${t('q_fault')}</span></button>
    <button data-new="iade randevusu">${ic('back')}<span>${t('q_return')}</span></button><button data-new="kiralama uzatma">${ic('plus')}<span>${t('q_extend')}</span></button></div></section>` : ''}
  ${d.payer ? `<section><h2 class="p-h">${t('next_payment')}</h2><div class="p-card" data-tab="pay">${nd ? `<div class="p-pay-big ${nd.days_late ? 't-danger' : ''}">${money(nd.balance)}</div><div class="muted">${esc(nd.invoice_no)} · ${t('due')} ${date(nd.due_date)}</div>` : `<div class="muted">${t('nothing_due')}</div>`}
    ${nc ? `<div class="p-sub">${t('next_charge')}: <b>${money(nc.amount)}</b> · ${t('from')} ${date(nc.date)}</div>` : ''}</div></section>` : ''}`;
}
function requestsView(pre) {
  const d = data; const types = d.request_types.filter((x) => x !== 'yeni kiralama' || true);
  const min = todayISO();
  return `<section><h2 class="p-h">${t('new_req')}</h2><form class="p-card p-form" id="rf">
    <label class="field"><span>${t('req_type')}</span><select name="type">${types.map((x) => `<option value="${esc(x)}" ${x === pre ? 'selected' : ''}>${esc(cv(x))}</option>`).join('')}</select></label>
    <div class="p-row"><label class="field"><span>${t('date')}</span><input name="preferred_date" type="date" min="${min}" value="${addDays(min, 1)}"></label>
    <label class="field"><span>${t('time')}</span><select name="preferred_time"><option value="">${t('any_time')}</option>${['09:00–12:00', '12:00–15:00', '15:00–18:00'].map((x) => `<option>${x}</option>`).join('')}</select></label></div>
    <div class="rent-only" ${pre === 'yeni kiralama' || (!pre && types[0] === 'yeni kiralama') ? '' : 'hidden'}>
      <div class="field"><span>${t('bike_type')}</span><div class="p-types">${(btypes || (d.bike_types || []).map((name) => ({ name }))).map((x, i) => `<label class="p-type"><input type="radio" name="bike_type" value="${esc(x.name)}" ${i === 0 ? 'checked' : ''}><div class="p-type-img">${x.image ? `<img src="${x.image}" alt="" loading="lazy">` : ic('bike')}</div><span>${esc(v(x.name))}</span></label>`).join('')}<label class="p-type"><input type="radio" name="bike_type" value=""><div class="p-type-img p-type-any">?</div><span>${t('any_type')}</span></label></div></div>
      <div class="p-row"><label class="field"><span>${t('period')}</span><select name="period">${(d.periods || ['ay']).map((p) => `<option value="${p}" ${p === 'ay' ? 'selected' : ''}>${t({ 'gün': 'p_day', hafta: 'p_week', ay: 'p_month' }[p])}</option>`).join('')}</select></label>
      <label class="field"><span>${t('duration')}</span><input name="duration" type="number" min="1" max="52" value="1"></label></div>
      <div class="p-price muted" id="pprice"></div></div>
    <label class="field"><span>${t('note')}</span><textarea name="notes" rows="3" placeholder="${esc(t('note_ph'))}"></textarea></label>
    <button class="btn primary p-big">${t('send')}</button></form></section>
  <section><h2 class="p-h">${t('my_reqs')}</h2>${d.requests.length ? d.requests.map((q) => `<div class="p-card p-item"><div class="p-item-h"><b>${esc(cv(q.type))}</b>${badge(q.status)}</div>
    <div class="muted">${q.bike_code ? esc(q.bike_code) + ' · ' : ''}${q.preferred_date ? date(q.preferred_date) : ''}${q.preferred_time ? ' · ' + esc(q.preferred_time) : ''}${q.type === 'yeni kiralama' ? ` · ${esc(v(q.bike_type) || t('any_type'))} · ${q.duration || 1} × ${t({ 'gün': 'p_day', hafta: 'p_week', ay: 'p_month' }[q.period] || 'p_month')}` : ''}</div>
    ${q.notes ? `<p>${esc(q.notes)}</p>` : ''}${q.admin_note ? `<p class="p-reply"><b>${t('reply')}:</b> ${esc(q.admin_note)}</p>` : ''}
    ${q.status === 'yeni' ? `<button class="btn sm ghost" data-cancel="${q.id}">${t('cancel')}</button>` : ''}</div>`).join('') : `<div class="p-card p-empty">${t('no_reqs')}</div>`}</section>
  <section><h2 class="p-h">${t('services')}</h2>${d.services.length ? d.services.map((s) => `<div class="p-card p-item"><div class="p-item-h"><b>${esc(s.order_no)} · ${esc(s.bike_code)}</b>${badge(s.status)}</div>
    <div class="muted">${esc(v(s.type))} · ${date(s.received_at)}${s.estimated_ready && !['teslim edildi', 'iptal'].includes(s.status) ? ` · ${t('est_ready')} ${date(s.estimated_ready)}` : ''}</div>${s.complaint ? `<p>${esc(s.complaint)}</p>` : ''}</div>`).join('') : `<div class="p-card p-empty">${t('no_services')}</div>`}</section>`;
}
function paymentsView() {
  const d = data;
  if (!d.payer) return `<div class="p-card p-empty">${t('company_pays', { c: esc(d.customer?.name || '') })}</div>`;
  const open = d.invoices.filter((i) => ['açık', 'kısmi'].includes(i.status)); const done = d.invoices.filter((i) => !['açık', 'kısmi'].includes(i.status));
  const inv = (i) => `<div class="p-card p-item"><div class="p-item-h"><b>${esc(i.invoice_no)}</b>${i.days_late ? `<span class="badge b-danger">${t('overdue')} · ${t('days', { n: i.days_late })}</span>` : badge(i.status)}</div>
    <div class="p-item-row"><span class="muted">${date(i.issue_date)} · ${t('due')} ${date(i.due_date)}</span><b>${money(['açık', 'kısmi'].includes(i.status) ? i.balance : i.total)}</b></div></div>`;
  return `<div class="p-kpis"><div class="p-card"><small>${t('open_balance')}</small><b>${money(d.summary.open_balance)}</b></div><div class="p-card ${d.summary.overdue ? 'l-danger' : ''}"><small>${t('overdue')}</small><b>${money(d.summary.overdue)}</b></div></div>
  ${open.length ? `<section><h2 class="p-h">${t('invoices')}</h2>${open.map(inv).join('')}<div class="p-card p-howto"><b>${t('pay_how')}</b><p>${t('pay_text')}</p>
    <dl class="p-dl">${d.company.name ? `<div><dt>${t('receiver')}</dt><dd>${esc(d.company.name)}</dd></div>` : ''}${d.company.iban ? `<div><dt>${t('iban')}</dt><dd class="mono">${esc(d.company.iban)}</dd></div>` : ''}</dl></div></section>` : `<div class="p-card p-empty">${ic('check')} ${t('nothing_due')}</div>`}
  <section><h2 class="p-h">${t('paid_list')}</h2>${d.payments.length ? `<div class="p-card p-list">${d.payments.map((p) => `<div class="p-item-row"><span>${date(p.date)} · ${esc(p.invoice_no || '')}<small class="muted"> ${esc(v(p.method) || '')}</small></span><b>${money(p.amount)}</b></div>`).join('')}</div>` : `<div class="p-card p-empty">${t('no_payments')}</div>`}</section>
  ${done.length ? `<section><h2 class="p-h">${t('invoices')} · ${esc(v('ödendi'))}</h2>${done.slice(0, 12).map(inv).join('')}</section>` : ''}`;
}
function docsView() {
  const d = data; const have = new Set(d.documents.map((x) => x.doc_type));
  const types = [...d.missing_docs, ...DOC_TYPES.filter((x) => !d.missing_docs.includes(x) && !['İmzalı sözleşme', 'Teslim fotoğrafı', 'Ticaret sicili / Gewerbeanmeldung'].includes(x))];
  return `<section><h2 class="p-h">${t('req_docs')}</h2><div class="p-card p-list">${d.required_docs.map((x) => `<div class="p-item-row"><span>${esc(v(x))}</span>${have.has(x) ? `<span class="t-ok">${ic('check')} ${t('done')}</span>` : `<span class="t-danger">${ic('x')} ${t('missing')}</span>`}</div>`).join('')}
    ${!d.missing_docs.length ? `<p class="t-ok">${t('all_docs_ok')}</p>` : ''}</div></section>
  <section><h2 class="p-h">${t('upload')}</h2><form class="p-card p-form" id="df">
    <label class="field"><span>${t('doc_type')}</span><select name="doc_type">${types.map((x) => `<option value="${esc(x)}">${esc(v(x))}</option>`).join('')}</select></label>
    <label class="p-file"><input type="file" name="file" accept="image/*,application/pdf" required>${ic('cam')}<span id="fname">${t('take_photo')}</span></label>
    <button class="btn primary p-big">${t('upload')}</button></form></section>
  <section><h2 class="p-h">${t('my_docs')}</h2>${d.documents.length ? `<div class="p-card p-list">${d.documents.map((x) => `<div class="p-item-row"><span>${esc(v(x.doc_type))}<small class="muted"> · ${date(x.created_at)}</small></span><button class="btn sm ghost" data-doc="${x.id}">${t('open')}</button></div>`).join('')}</div>` : `<div class="p-card p-empty">${t('no_docs')}</div>`}</section>`;
}
function profileView() {
  const d = data; const r = d.rider; const c = d.company; const wa = (c.phone || '').replace(/[^\d]/g, '').replace(/^0/, '49');
  return `<section><h2 class="p-h">${t('my_info')}</h2><form class="p-card p-form" id="pf">
    <dl class="p-dl"><div><dt>${t('name')}</dt><dd>${esc(r.name)}</dd></div><div><dt>${t('email')}</dt><dd>${esc(r.portal_email)}</dd></div>
    ${r.id_type ? `<div><dt>${t('id_doc')}</dt><dd>${esc(v(r.id_type))} ${esc(r.id_no || '')}${r.id_expiry ? ` · ${t('valid')} ${date(r.id_expiry)}` : ''}</dd></div>` : ''}</dl>
    <label class="field"><span>${t('phone')}</span><input name="phone" type="tel" value="${esc(r.phone || '')}"></label>
    <button class="btn p-big">${t('save')}</button></form></section>
  <section><h2 class="p-h">${t('lang')}</h2><div class="p-card">${langSw()}</div></section>
  ${navigator.geolocation ? `<section><h2 class="p-h">📍 ${t('loc_h')}</h2><div class="p-card"><p>${locOn() ? `<b class="t-ok">${t('loc_on')}</b>${locSent ? ` <small class="muted">· ${t('loc_last')} ${locSent}</small>` : ''}` : `<b>${t('loc_off')}</b>`}</p><p class="muted">${t('loc_text')}</p>${locOn() ? `<button class="btn" data-loc="off">${t('loc_stop')}</button>` : `<button class="btn primary" data-loc="on">${t('loc_allow')}</button>`}</div></section>` : ''}
  <section><h2 class="p-h">${t('change_pw')}</h2><form class="p-card p-form" id="pw">
    <label class="field"><span>${t('cur_pw')}</span><input name="current_password" type="password" autocomplete="current-password" required></label>
    <label class="field"><span>${t('new_pw')}</span><input name="new_password" type="password" minlength="6" autocomplete="new-password" required></label>
    <button class="btn p-big">${t('change_pw')}</button></form></section>
  <section><h2 class="p-h">${t('contact')}</h2><div class="p-card p-contact"><b>${esc(c.name)}</b><small class="muted">${esc(c.address || '')}</small>
    <div class="p-row">${c.phone ? `<a class="btn" href="tel:${esc(c.phone)}">${ic('phone')} ${t('call')}</a><a class="btn wa" href="https://wa.me/${wa}" target="_blank" rel="noopener">${t('write')}</a>` : ''}${c.email ? `<a class="btn" href="mailto:${esc(c.email)}">${ic('mail')}</a>` : ''}</div></div></section>
  <button class="btn ghost p-big" id="lo">${t('logout')}</button>`;
}

const TABS = [['home', 'home', 'home'], ['req', 'requests', 'req'], ['pay', 'payments', 'pay'], ['docs', 'docs', 'docs'], ['me', 'profile', 'me']];
function shell(pre) {
  const d = data; if (!TABS.some(([k]) => k === tab)) tab = 'home';
  const body = { home: homeView, req: () => requestsView(pre), pay: paymentsView, docs: docsView, me: profileView }[tab]();
  const dots = { home: d.notifications.filter((n) => n.level === 'danger' || n.level === 'warn').length, docs: d.missing_docs.length, pay: d.invoices.filter((i) => i.days_late).length };
  root().innerHTML = `<header class="p-top"><img src="img/logo.png" alt="pedalla" class="p-top-logo"><span class="p-top-tag">${t('title')}</span><span class="grow"></span>${tab === 'me' ? '' : langSw()}</header>
  <main class="p-main">${tab === 'home' ? `<div class="p-hello">${t('hello')}, <b>${esc(d.rider.name.split(' ')[0])}</b> 👋</div>` : `<h1 class="p-title">${t(TABS.find(([k]) => k === tab)[1])}</h1>`}${body}</main>
  <nav class="p-nav">${TABS.map(([k, l, i]) => `<a href="#${k}" class="${k === tab ? 'on' : ''}">${ic(i)}<span>${t(l)}</span>${dots[k] ? `<i class="p-dot">${dots[k]}</i>` : ''}</a>`).join('')}</nav>`;
  bind();
  if (pre) root().querySelector('#rf')?.scrollIntoView({ block: 'start' });
}
function bind() {
  const el = root(); bindLang(el);
  el.querySelectorAll('[data-new]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); tab = 'req'; history.replaceState(null, '', '#req'); shell(b.dataset.new); }));
  el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { location.hash = b.dataset.tab; }));
  el.querySelector('#rf')?.addEventListener('submit', guard(async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); if (f.type === 'arıza bildirimi' && !f.preferred_date) delete f.preferred_date;
    data = await api('POST', 'requests', f); toast(t('sent')); shell();
  }));
  const rf = el.querySelector('#rf');
  if (rf) {
    const price = () => {
      const pl = (data.plans || []).filter((x) => x.period === rf.period.value && (!rf.bike_type.value || x.bike_type === rf.bike_type.value)).sort((a, b) => a.price - b.price)[0];
      el.querySelector('#pprice').innerHTML = pl ? `${t('price_from')}: <b>${money(pl.price)}</b> / ${t({ 'gün': 'p_day', hafta: 'p_week', ay: 'p_month' }[pl.period])} ${t('vat_note')} · ${t('deposit_l')} ${money(pl.deposit)}` : '';
    };
    const tog = () => { const rent = rf.type.value === 'yeni kiralama'; el.querySelector('.rent-only').hidden = !rent; rf.notes.placeholder = t(rent ? 'note_ph_rent' : rf.type.value === 'iade randevusu' ? 'note_ph_return' : rf.type.value === 'kiralama uzatma' ? 'note_ph_extend' : 'note_ph'); price(); };
    rf.type.addEventListener('change', tog); rf.addEventListener('change', (e) => { if (e.target.name === 'bike_type' || e.target.name === 'period') price(); }); tog();
  }
  el.querySelectorAll('[data-cancel]').forEach((b) => (b.onclick = guard(async () => { data = await api('POST', `requests/${b.dataset.cancel}/cancel`); toast(t('cancelled')); shell(); })));
  const fi = el.querySelector('#df input[type=file]');
  if (fi) fi.onchange = () => { el.querySelector('#fname').textContent = fi.files[0]?.name || t('take_photo'); };
  el.querySelector('#df')?.addEventListener('submit', guard(async (e) => {
    e.preventDefault(); const file = fi.files[0]; if (!file) return;
    if (!/^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/.test(file.type) && !/\.(jpe?g|png|pdf|heic)$/i.test(file.name)) throw new Error(t('file_type'));
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = t('loading');
    try {
      const f = await fileToData(file);
      data = await api('POST', 'documents', { doc_type: e.target.doc_type.value, name: f.name, mime: f.mime, data: f.data }); toast(t('uploaded')); shell();
    } finally { btn.disabled = false; }
  }));
  el.querySelectorAll('[data-doc]').forEach((b) => (b.onclick = guard(async () => {
    const w = window.open('', '_blank'); const d = await api('GET', `documents/${b.dataset.doc}`);
    const bin = atob(d.data); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: d.mime })); if (w) w.location = url; else location.href = url;
  })));
  el.querySelector('#pf')?.addEventListener('submit', guard(async (e) => { e.preventDefault(); data = await api('PUT', 'me', { phone: e.target.phone.value }); toast(t('saved')); shell(); }));
  el.querySelector('#pw')?.addEventListener('submit', guard(async (e) => { e.preventDefault(); data = await api('PUT', 'me', Object.fromEntries(new FormData(e.target))); toast(t('saved')); shell(); }));
  el.querySelectorAll('[data-loc]').forEach((b) => (b.onclick = () => { store.set(LOC_KEY, b.dataset.loc); if (b.dataset.loc === 'on') { locDenied = false; startLoc(true); } else stopLoc(); shell(); }));
  el.querySelector('#lo')?.addEventListener('click', guard(async () => { await api('POST', 'logout').catch(() => {}); stopLoc(); setToken(null); render(); }));
}
// photos are resized in the browser so uploads stay small on mobile data
async function fileToData(file) {
  const read = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  if (file.type.startsWith('image/') && (file.size > 900 * 1024 || !/jpeg|png/.test(file.type))) {
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
      const k = Math.min(1, 2000 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/jpeg', 0.85); return { name: file.name.replace(/\.\w+$/, '') + '.jpg', mime: 'image/jpeg', data: url };
    } catch {}
  }
  if (file.size > 3 * 1024 * 1024) throw new Error(t('file_big'));
  return { name: file.name, mime: file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : 'image/jpeg'), data: await read(file) };
}

// ---- location sharing (only while this screen is open; the browser asks the rider for permission) ----
const LOC_KEY = 'pedalla_rider_loc';
// asked automatically after login (the browser shows its own permission popup); then sent again every 5 minutes while open
const locOn = () => store.get(LOC_KEY) !== 'off' && !locDenied;
let locTimer = null; let locSent = ''; let locDenied = false;
function sendLoc(ask) {
  navigator.geolocation.getCurrentPosition(async (p) => {
    locDenied = false;
    try { await api('POST', 'location', { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }); locSent = new Date().toTimeString().slice(0, 5); if (data && tab === 'me') shell(); } catch {}
  }, (e) => { if (e.code === 1) { locDenied = true; stopLoc(); if (ask) toast(t('loc_denied'), 'err'); if (data) shell(); } }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 30000 });
}
function startLoc(ask) {
  if (!navigator.geolocation || !token) return;
  sendLoc(ask);
  if (locTimer == null) locTimer = setInterval(() => { if (document.visibilityState === 'visible') sendLoc(false); }, 5 * 60000);
}
function stopLoc() { clearInterval(locTimer); locTimer = null; }
async function load() {
  root().innerHTML = '<div class="loading"><div class="pdl-loader" role="status" aria-label="Loading"></div></div>';
  data = await api('GET', 'me');
  if (!btypes) api('GET', 'bike-types').then((x) => { btypes = x; if (tab === 'req') shell(); }).catch(() => {});
  if (store.get(LOC_KEY) !== 'off') startLoc(false);
  if (!store.get('pedalla_rider_lang') && data.rider.lang && L[data.rider.lang]) { lang = data.rider.lang; document.documentElement.lang = lang; }
  if (data.rider.lang && data.rider.lang !== lang && store.get('pedalla_rider_lang')) api('PUT', 'me', { lang }).catch(() => {});
  render();
}
function render() { document.title = `Pedalla · ${t('title')}`; if (!token) return location.hash === '#signup' ? (cfg ? signupView() : api('GET', 'config').then((c) => { cfg = c; signupView(); }).catch(() => signupView())) : loginView(); if (!data) return load().catch((e) => { if (e.message !== 'login') { toast(e.message, 'err'); } }); shell(); }
export function boot() {
  document.documentElement.lang = lang;
  window.addEventListener('hashchange', () => { tab = location.hash.slice(1) || 'home'; if (!token) return render(); if (data) { shell(); window.scrollTo(0, 0); } });
  render();
}
