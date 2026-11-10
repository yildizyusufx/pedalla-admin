// ============================================================
//  PEDALLA WEBSITE – general settings (edit here)
// ============================================================
export const SITE = {
  url: 'https://pedalla.bike',
  // admin panel that receives rental requests (rider portal API)
  api: 'https://admin.pedalla.bike/api/portal',
  portal: 'https://admin.pedalla.bike/portal.html',
  company: 'Pedalla',
  phone: '+49 176 72241488',
  whatsapp: '4917672241488',
  email: 'info@pedalla.bike', // TODO: echte E-Mail-Adresse eintragen
  address: { street: 'Missundestraße 50', zip: '22769', city: 'Hamburg', country: 'DE' },
  // pick-up / service point on the map
  // renters collect their bike here (shown in the booking box, summary and confirmation). lat/lng approximate – check on the map.
  stations: [{ name: 'Pedalla Hub Altona', lat: 53.5636, lng: 9.9425, street: 'Missundestraße 50', zip: '22769 Hamburg-Altona' }],
  // service area drawn on the map (centre + radius in metres)
  area: { lat: 53.5585, lng: 9.975, radius: 6500 },
  // prices in the admin panel are net (the rider portal shows "+ MwSt."). Set to 'gross' to show prices incl. 19 % VAT.
  priceMode: 'net',
  vat: 0.19,
  // rental periods offered in the booking box. Which ones are shown follows Ayarlar → Kiralama periyotları in the admin panel
  // (live from /api/portal/catalog); this list is only the fallback when the panel cannot be reached.
  periods: ['ay'],
  durations: { ay: [1, 3, 6, 12], hafta: [1, 2, 4, 8], 'gün': [1, 3, 7, 14] },
};
