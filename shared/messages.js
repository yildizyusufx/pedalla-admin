// Messages to riders (rider screen inbox + phone notifications of the Android app), in TR / DE / EN.
// A message is stored as code + params (rider_messages) and turned into text in the rider's language when read.

const V = { // Turkish values used inside messages → [de, en]
  'servis randevusu': ['Servicetermin', 'service appointment'], 'arıza bildirimi': ['Störungsmeldung', 'fault report'], 'iade randevusu': ['Rückgabetermin', 'return appointment'],
  'kiralama uzatma': ['Verlängerung', 'extension'], 'yeni kiralama': ['neue Miete', 'new rental'],
  'onaylandı': ['bestätigt', 'confirmed'], 'reddedildi': ['abgelehnt', 'declined'], 'tamamlandı': ['erledigt', 'done'], 'iptal': ['storniert', 'cancelled'], yeni: ['neu', 'new'],
  bisiklet: ['Fahrrad', 'bike'], selfie: ['Selfie', 'selfie'], 'selfie + bisiklet': ['Selfie + Fahrrad', 'selfie + bike'],
};
const tv = (lang, x) => (lang === 'tr' || !V[x] ? x : V[x][lang === 'de' ? 0 : 1]);

const T = {
  photo_request: {
    tr: ['Fotoğraf isteği', '{bike} için Pedalla bir fotoğraf istiyor ({kind}). Uygulamayı açıp çekin.{note}'],
    de: ['Foto-Anfrage', 'Pedalla bittet um ein Foto von {bike} ({kind}). Bitte App öffnen und aufnehmen.{note}'],
    en: ['Photo request', 'Pedalla asks for a photo of {bike} ({kind}). Open the app and take it.{note}'],
  },
  request_answer: {
    tr: ['Talebiniz: {status}', '"{type}" talebiniz {status}.{date}{note}'],
    de: ['Deine Anfrage: {status}', 'Deine Anfrage „{type}" wurde {status}.{date}{note}'],
    en: ['Your request: {status}', 'Your "{type}" request was {status}.{date}{note}'],
  },
  service_ready: {
    tr: ['Bisikletiniz hazır', '{bike} servisten hazır ({no}). Teslim alabilirsiniz.'],
    de: ['Dein Rad ist fertig', '{bike} ist aus dem Service fertig ({no}) und kann abgeholt werden.'],
    en: ['Your bike is ready', '{bike} is ready after service ({no}). You can pick it up.'],
  },
  report_received: {
    tr: ['Arıza bildiriminiz alındı', '{bike} için bildiriminiz servis kaydına dönüştü ({no}). Size dönüş yapacağız.'],
    de: ['Störungsmeldung erhalten', 'Deine Meldung zu {bike} ist als Serviceauftrag angelegt ({no}). Wir melden uns.'],
    en: ['Fault report received', 'Your report about {bike} is now service order {no}. We will get back to you.'],
  },
  invoice_new: {
    tr: ['Yeni kira dönemi', '{no} numaralı fatura oluşturuldu: {amount}, son ödeme {date}.'],
    de: ['Neuer Mietzeitraum', 'Rechnung {no} wurde erstellt: {amount}, fällig am {date}.'],
    en: ['New rental period', 'Invoice {no} was issued: {amount}, due on {date}.'],
  },
  invoice_due: {
    tr: ['Ödeme günü yaklaşıyor', '{no} numaralı faturanın son ödeme tarihi {date} ({when}). Tutar: {amount}.'],
    de: ['Zahlung bald fällig', 'Rechnung {no} ist am {date} fällig ({when}). Betrag: {amount}.'],
    en: ['Payment due soon', 'Invoice {no} is due on {date} ({when}). Amount: {amount}.'],
  },
  invoice_overdue: {
    tr: ['Ödeme gecikti', '{no} numaralı faturanın ödemesi {days} gün gecikti (son ödeme {date}). Açık tutar: {amount}. Lütfen ödeyin veya bize yazın.'],
    de: ['Zahlung überfällig', 'Rechnung {no} ist seit {days} Tagen überfällig (fällig am {date}). Offen: {amount}. Bitte bezahlen oder uns schreiben.'],
    en: ['Payment overdue', 'Invoice {no} is {days} days overdue (due on {date}). Balance: {amount}. Please pay or contact us.'],
  },
  payment_received: {
    tr: ['Ödeme alındı', '{no} için {amount} ödemeniz kaydedildi. Teşekkürler!'],
    de: ['Zahlung erhalten', 'Deine Zahlung von {amount} für {no} ist eingegangen. Danke!'],
    en: ['Payment received', 'Your payment of {amount} for {no} was received. Thank you!'],
  },
  service_due: {
    tr: ['Bakım zamanı', '{bike} için rutin bakım tarihi {date}. Uygulamadan servis randevusu alın.'],
    de: ['Inspektion fällig', 'Die Inspektion für {bike} ist am {date} fällig. Bitte in der App einen Servicetermin buchen.'],
    en: ['Service due', 'Routine service for {bike} is due on {date}. Please book an appointment in the app.'],
  },
  return_soon: {
    tr: ['Kiralama bitiyor', '{bike} kiralamanız {date} tarihinde bitiyor ({when}). Uygulamadan uzatabilir veya iade tarihi bildirebilirsiniz.'],
    de: ['Miete endet bald', 'Deine Miete für {bike} endet am {date} ({when}). Du kannst in der App verlängern oder einen Rückgabetermin melden.'],
    en: ['Rental ends soon', 'Your rental of {bike} ends on {date} ({when}). You can extend it or tell us your return date in the app.'],
  },
  return_late: {
    tr: ['İade gecikti', '{bike} için dönüş tarihi {date} idi ({days} gün geçti). Lütfen uzatın veya iade tarihi bildirin.'],
    de: ['Rückgabe überfällig', 'Die Rückgabe von {bike} war am {date} fällig ({days} Tage). Bitte verlängern oder Rückgabetermin melden.'],
    en: ['Return overdue', '{bike} was due back on {date} ({days} days ago). Please extend or tell us your return date.'],
  },
  extended: {
    tr: ['Kiralama uzatıldı', '{bike} kiralamanız {date} tarihine kadar uzatıldı.'],
    de: ['Miete verlängert', 'Deine Miete für {bike} wurde bis {date} verlängert.'],
    en: ['Rental extended', 'Your rental of {bike} was extended until {date}.'],
  },
  contract_sign: {
    tr: ['Sözleşmeni imzala', '{no} numaralı kira sözleşmen hazır. Uygulamada okuyup parmağınla imzalayabilirsin, ofise gelmene gerek yok.'],
    de: ['Mietvertrag unterschreiben', 'Dein Mietvertrag {no} ist fertig. Du kannst ihn in der App lesen und mit dem Finger unterschreiben – ohne Termin im Büro.'],
    en: ['Sign your rental agreement', 'Your rental agreement {no} is ready. Read it in the app and sign with your finger – no office visit needed.'],
  },
  referral_earned: {
    tr: ['Tavsiye ödülü kazandın 🎉', '{name} ilk kirasını ödedi. {amount} indirim bir sonraki faturandan düşülecek. Teşekkürler!'],
    de: ['Empfehlungsbonus verdient 🎉', '{name} hat die erste Miete bezahlt. {amount} Rabatt wird von deiner nächsten Rechnung abgezogen. Danke!'],
    en: ['Referral bonus earned 🎉', '{name} paid the first rent. {amount} off will be taken from your next invoice. Thank you!'],
  },
  review_request: {
    tr: ['Pedalla nasıl gidiyor?', 'Memnunsan Google\'da kısa bir yorum bırakır mısın? Diğer kuryelerin bizi bulmasına çok yardımcı olur. Bir sorun varsa bize yaz, hemen çözelim.'],
    de: ['Wie läuft es mit Pedalla?', 'Wenn du zufrieden bist: Hinterlässt du uns eine kurze Google-Bewertung? Das hilft anderen Kurieren sehr. Gibt es ein Problem, schreib uns – wir kümmern uns sofort.'],
    en: ['How is Pedalla going?', 'If you are happy, could you leave us a short Google review? It really helps other couriers find us. If something is wrong, write to us and we will fix it.'],
  },
  review_return: {
    tr: ['Teşekkürler!', 'Pedalla ile sürdüğün için teşekkürler. Deneyimini Google\'da paylaşırsan çok seviniriz.'],
    de: ['Danke!', 'Danke, dass du mit Pedalla unterwegs warst. Wir freuen uns sehr über eine Google-Bewertung.'],
    en: ['Thank you!', 'Thanks for riding with Pedalla. We would love a Google review of your experience.'],
  },
  sepa_prenote: {
    tr: ['SEPA otomatik ödeme', '{no} numaralı fatura için {amount} tutarı {date} tarihinde hesabından çekilecek (yetki no {ref}).'],
    de: ['SEPA-Lastschrift angekündigt', 'Für Rechnung {no} ziehen wir {amount} am {date} per Lastschrift ein (Mandatsreferenz {ref}).'],
    en: ['SEPA direct debit notice', 'For invoice {no} we will collect {amount} by direct debit on {date} (mandate reference {ref}).'],
  },
  custom: { tr: ['{title}', '{text}'], de: ['{title}', '{text}'], en: ['{title}', '{text}'] },
};
const DEFAULT_TITLE = { tr: 'Pedalla', de: 'Pedalla', en: 'Pedalla' };
const LOC = { tr: 'tr-TR', de: 'de-DE', en: 'en-IE' };
const dateFmt = (lang, s) => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return lang === 'en' ? `${d}/${m}/${y}` : `${d}.${m}.${y}`; };
const whenFmt = (lang, n) => (n === 0 ? { tr: 'bugün', de: 'heute', en: 'today' }[lang] : n === 1 ? { tr: 'yarın', de: 'morgen', en: 'tomorrow' }[lang] : { tr: `${n} gün sonra`, de: `in ${n} Tagen`, en: `in ${n} days` }[lang]);

export const MESSAGE_CODES = Object.keys(T);

// → { title, body } in the rider's language
export function renderMessage(code, params = {}, lang = 'de') {
  const L = ['tr', 'de', 'en'].includes(lang) ? lang : 'de';
  const tpl = (T[code] || T.custom)[L];
  const p = { ...params };
  if (p.amount != null && typeof p.amount === 'number') p.amount = new Intl.NumberFormat(LOC[L], { style: 'currency', currency: 'EUR' }).format(p.amount);
  if (p.date) p.date = dateFmt(L, p.date);
  if (p.days != null && code !== 'invoice_overdue' && code !== 'return_late') p.when = whenFmt(L, Number(p.days));
  for (const k of ['type', 'status', 'kind']) if (p[k]) p[k] = tv(L, p[k]);
  if (code === 'request_answer') {
    p.date = params.date ? ` (${dateFmt(L, params.date)})` : '';
    p.note = params.note ? ` “${params.note}”` : '';
  }
  if (code === 'photo_request') p.note = params.note ? ` “${params.note}”` : '';
  if (code === 'custom') p.title = params.title || DEFAULT_TITLE[L];
  const fill = (s) => String(s).replace(/\{(\w+)\}/g, (m, k) => (p[k] ?? ''));
  return { title: fill(tpl[0]), body: fill(tpl[1]) };
}
