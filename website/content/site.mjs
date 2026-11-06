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
  address: { street: 'Stresemannstraße 250–252', zip: '22769', city: 'Hamburg', country: 'DE' },
  // pick-up / service point on the map
  stations: [{ name: 'Pedalla Hub Altona', lat: 53.5621, lng: 9.9205, street: 'Stresemannstraße 250–252', zip: '22769 Hamburg' }],
  // service area drawn on the map (centre + radius in metres)
  area: { lat: 53.5585, lng: 9.975, radius: 6500 },
  // prices in the admin panel are net (the rider portal shows "+ MwSt."). Set to 'gross' to show prices incl. 19 % VAT.
  priceMode: 'net',
  vat: 0.19,
  durations: [1, 3, 6, 12],
};
