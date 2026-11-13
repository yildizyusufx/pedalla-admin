// Online identity check providers – the place where a video-/auto-ident service will be plugged in later.
//
// Today no provider is connected: riders upload their ID (front/back) and take a selfie at pick-up in the rider screen,
// staff compares them on the rider page ("Kimlik kontrolü") and ticks "Kimlik aslı görüldü / kopyası alındı".
//
// To connect a provider (e.g. IDnow, Veriff, Onfido, Ondato) later:
//   1. registerIdProvider('veriff', { label, start, parseWebhook }) in a small module imported by api/index.js / server.js,
//      reading its API keys from environment variables (never from the database).
//   2. start(rider, ctx) → { url, ref } : the provider's hosted verification page; the rider screen opens it.
//   3. parseWebhook({ body, headers }) → { ref, rider_id, verified: true|false, id_type, id_no, id_expiry, birth_date, nationality }
//      after checking the provider's signature (the webhook route is added together with the first provider).
//   4. Set "id_provider" in Settings to the provider name.
// Nothing here pretends to verify anyone: without a registered provider the rider screen shows no online-ident button.
const PROVIDERS = {};
export function registerIdProvider(name, impl) {
  if (!name || typeof impl?.start !== 'function' || typeof impl?.parseWebhook !== 'function') throw new Error('ID provider needs start and parseWebhook.');
  PROVIDERS[name] = impl;
}
export const idProvider = (name) => (name && PROVIDERS[name]) || null;
