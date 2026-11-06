// ============================================================
//  BIKE MODELS shown on the website.
//  Live prices, deposits, availability and the list of bike types come from the admin panel
//  (Ayarlar → Bisiklet tipleri + Fiyat planları). This file only adds the marketing text.
//  `match` is tested against the bike type name in the admin panel.
//  `fallbackPrice` is shown only when the admin panel cannot be reached.
// ============================================================
export const MODELS = [
  {
    id: 'fat', match: /^e-?bike|fat|city/i, adminType: 'E-Bike', image: 'img/ebike-fat.webp', fallbackPrice: 129, fallbackDeposit: 300,
    name: 'Pedalla Fat',
    tag: { de: 'Bestseller', en: 'Bestseller', tr: 'En çok tercih edilen' },
    desc: {
      de: 'Kompaktes Fatbike-Pedelec mit Frontkorb und Gepäckträger. Stabil auf Kopfsteinpflaster, wendig im Stadtverkehr.',
      en: 'Compact fat-tyre pedelec with front basket and rear rack. Stable on cobblestones, nimble in city traffic.',
      tr: 'Ön sepetli ve arka bagajlı kompakt fat-tyre e-bisiklet. Parke taşında sağlam, şehir trafiğinde çevik.',
    },
    specs: {
      de: ['20″ Fatbike-Reifen', 'Bis zu 25 km/h Motorunterstützung', 'Hydraulische Scheibenbremsen', 'Frontkorb + Gepäckträger', 'LED-Licht vorne & hinten'],
      en: ['20″ fat tyres', 'Motor assistance up to 25 km/h', 'Hydraulic disc brakes', 'Front basket + rear rack', 'LED front & rear lights'],
      tr: ['20″ kalın lastikler', '25 km/s\'e kadar motor desteği', 'Hidrolik disk frenler', 'Ön sepet + arka bagaj', 'Önde ve arkada LED ışık'],
    },
  },
  {
    id: 'cargo-e', match: /e-?(kargo|cargo)/i, adminType: 'E-Kargo bisikleti', image: 'img/cargo.svg', fallbackPrice: 349, fallbackDeposit: 750,
    name: 'Pedalla Cargo E',
    tag: { de: 'Für Lieferdienste', en: 'For delivery', tr: 'Kuryeler için' },
    desc: {
      de: 'Elektrisches Lastenrad mit großer Transportbox. Gebaut für den täglichen Lieferalltag – Schicht für Schicht.',
      en: 'Electric cargo bike with a large transport box. Built for daily delivery work – shift after shift.',
      tr: 'Büyük taşıma kutulu elektrikli kargo bisikleti. Her gün, vardiya vardiya teslimat için üretildi.',
    },
    specs: {
      de: ['Große, abschließbare Transportbox', 'Bis zu 25 km/h Motorunterstützung', 'Verstärkter Rahmen für schwere Lasten', 'Scheibenbremsen', 'Werbefläche auf der Box möglich'],
      en: ['Large lockable transport box', 'Motor assistance up to 25 km/h', 'Reinforced frame for heavy loads', 'Disc brakes', 'Advertising space on the box'],
      tr: ['Büyük, kilitlenebilir taşıma kutusu', '25 km/s\'e kadar motor desteği', 'Ağır yükler için güçlendirilmiş şasi', 'Disk frenler', 'Kutu üzerinde reklam alanı'],
    },
  },
  {
    id: 'cargo', match: /lasten|kargo|cargo/i, adminType: 'Kargo bisikleti (Lastenrad)', image: 'img/cargo.svg', fallbackPrice: 289, fallbackDeposit: 500,
    name: 'Pedalla Lastenrad',
    tag: { de: 'Viel Platz', en: 'Lots of space', tr: 'Geniş hacim' },
    desc: {
      de: 'Robustes Lastenrad für Einkäufe, Werkzeug oder Pakete. Viel Stauraum zum fairen Monatspreis.',
      en: 'Sturdy cargo bike for shopping, tools or parcels. Plenty of space at a fair monthly price.',
      tr: 'Alışveriş, alet veya paketler için sağlam kargo bisikleti. Uygun aylık fiyata bol hacim.',
    },
    specs: {
      de: ['Große Ladefläche', 'Stabiler Ständer', 'Scheibenbremsen', 'Wartung inklusive'],
      en: ['Large loading area', 'Stable kickstand', 'Disc brakes', 'Maintenance included'],
      tr: ['Geniş yük alanı', 'Sağlam ayak', 'Disk frenler', 'Bakım dahil'],
    },
  },
];
// used for bike types that have no entry above
export const GENERIC = {
  image: 'img/ebike.svg',
  desc: {
    de: 'Zuverlässiges Rad aus unserer Hamburger Flotte – gewartet, versichert und startklar.',
    en: 'Reliable bike from our Hamburg fleet – serviced, insured and ready to ride.',
    tr: 'Hamburg filomuzdan güvenilir bir bisiklet – bakımlı, sigortalı ve yola hazır.',
  },
};
