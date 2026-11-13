// Impressum + Datenschutz (German, legally required in Germany).
// ⚠️ DRAFT: fill in every [BITTE ERGÄNZEN] and have it checked before going live.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TODO = '<mark>[BITTE ERGÄNZEN]</mark>';

export function legalPage(name, SITE, V) {
  const a = SITE.address;
  const body = name === 'impressum' ? `
    <h1>Impressum</h1>
    <p class="muted">Angaben gemäß § 5 DDG</p>
    <p><b>Pedalla</b> – Firmierung / Rechtsform ${TODO}<br>${esc(a.street)}<br>${a.zip} ${a.city}<br>Deutschland</p>
    <h2>Vertreten durch</h2><p>${TODO}</p>
    <h2>Kontakt</h2><p>Telefon: <a href="tel:${SITE.phone.replace(/\s/g, '')}">${SITE.phone}</a><br>E-Mail: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
    <h2>Registereintrag</h2><p>Registergericht: ${TODO}<br>Registernummer: ${TODO}</p>
    <h2>Umsatzsteuer-ID</h2><p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG: ${TODO}</p>
    <h2>Verantwortlich für den Inhalt</h2><p>${TODO}, Anschrift wie oben</p>
    <h2>Verbraucherstreitbeilegung</h2><p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>`
    : `
    <h1>Datenschutzerklärung</h1>
    <p class="warn">Entwurf – bitte vor Veröffentlichung rechtlich prüfen lassen.</p>
    <h2>1. Verantwortlicher</h2><p>Pedalla ${TODO}, ${esc(a.street)}, ${a.zip} ${a.city}, E-Mail: ${SITE.email}, Telefon: ${SITE.phone}</p>
    <h2>2. Hosting</h2><p>Diese Website wird bei Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, USA) gehostet. Beim Aufruf werden technisch notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser) in Server-Logfiles verarbeitet (Art. 6 Abs. 1 lit. f DSGVO). Mit Vercel besteht ein Vertrag zur Auftragsverarbeitung; die Übermittlung in die USA stützt sich auf das EU-US Data Privacy Framework bzw. Standardvertragsklauseln.</p>
    <h2>3. Keine Cookies, kein Tracking</h2><p>Wir setzen keine Cookies und keine Analyse- oder Werbe-Tools ein. Schriftarten werden von unserem eigenen Server geladen.</p>
    <h2>4. Karte</h2><p>Für die Flottenkarte laden wir Kartenkacheln der OpenStreetMap Foundation (St John’s Innovation Centre, Cambridge, UK; tile.openstreetmap.org). Dabei wird Ihre IP-Adresse an den Kartenanbieter übertragen (Art. 6 Abs. 1 lit. f DSGVO – ansprechende Darstellung unseres Angebots).</p>
    <h2>5. Mietanfrage und Fahrerkonto</h2><p>Wenn Sie ein Rad anfragen, verarbeiten wir Name, E-Mail, Telefonnummer, optional Adresse und Nachricht sowie Ihre Wunschdaten, um die Anfrage zu bearbeiten und den Mietvertrag vorzubereiten (Art. 6 Abs. 1 lit. b DSGVO). Dabei wird ein Fahrerkonto angelegt; das Passwort wird nur verschlüsselt (gehasht) gespeichert. Die Daten werden in unserer Datenbank bei Turso (ChiselStrike Inc.) in der Region Frankfurt (EU) gespeichert. Ausweisdokumente, die Sie im Fahrerkonto hochladen, nutzen wir ausschließlich zur Identitätsprüfung für den Vertrag.</p>
    <h2>6. Fahrer-App und Fahrerkonto im Detail</h2>
    <p><b>Identität und Dokumente:</b> Ausweis/Pass, Führerschein (falls vorhanden), Aufenthaltstitel und ein Selfie zum Abgleich mit dem Ausweis verarbeiten wir zur Identitätsprüfung vor der Übergabe (Art. 6 Abs. 1 lit. b und lit. f DSGVO – Schutz vor Betrug und Diebstahl). Das Selfie löschen wir spätestens nach Ende der Miete plus der in unserem System eingestellten Frist (Standard: 6 Monate). Setzen wir künftig einen externen Dienst zur Online-Ausweisprüfung ein, informieren wir hier vorher über den Anbieter.</p>
    <p><b>Fotos:</b> Fotos vom Rad bei Übergabe, Rückgabe, Schadensmeldung oder auf unsere Anfrage dienen der Dokumentation des Zustands (Art. 6 Abs. 1 lit. b DSGVO).</p>
    <p><b>Standort:</b> Unsere Räder können mit einem GPS-Tracker ausgestattet sein. Den Standort des Rades verarbeiten wir zum Schutz vor Diebstahl, zur Wiederbeschaffung und für Wartung/Reichweite (Art. 6 Abs. 1 lit. f DSGVO). Wir werten keine Bewegungsprofile zu Leistungs- oder Verhaltenskontrolle aus.</p>
    <p><b>Push-Mitteilungen:</b> In der Android-App senden wir Hinweise (z. B. Zahlungserinnerungen, Vertragsunterschrift). Sie können das in den Systemeinstellungen jederzeit abschalten.</p>
    <p><b>Elektronische Unterschrift:</b> Wenn Sie den Mietvertrag im Fahrerkonto unterschreiben, speichern wir das Unterschriftsbild, Name, Zeitpunkt, IP-Adresse, Gerätekennung (User-Agent) und einen Prüfwert (SHA-256) des Vertragsinhalts als Nachweis (Art. 6 Abs. 1 lit. b und lit. c DSGVO).</p>
    <p><b>SEPA-Lastschrift:</b> Erteilen Sie ein SEPA-Mandat, verarbeiten wir Kontoinhaber, IBAN, Mandatsreferenz und Datum zur Abbuchung der Miete über unsere Bank (Art. 6 Abs. 1 lit. b DSGVO). Sie können das Mandat jederzeit im Fahrerkonto widerrufen.</p>
    <p><b>Freunde werben:</b> Melden Sie sich mit einem Empfehlungscode an, speichern wir, wer Sie geworben hat, um beiden ein Guthaben gutzuschreiben (Art. 6 Abs. 1 lit. b DSGVO).</p>
    <p><b>Bewertungen:</b> Nach einiger Mietdauer oder bei Rückgabe bitten wir Sie ggf. um eine Google-Bewertung. Die Bewertung selbst geben Sie freiwillig direkt bei Google ab; dort gelten die Datenschutzbestimmungen der Google Ireland Ltd.</p>
    <p><b>Sicherungskopien:</b> Unsere Datenbank wird täglich verschlüsselt gesichert; Sicherungen werden nach spätestens 30 Tagen überschrieben.</p>
    <p><b>Auskunft und Löschung in der App:</b> Im Fahrerkonto unter „Profil → Datenschutz“ können Sie Ihre Daten als Datei herunterladen und die Löschung Ihres Kontos beantragen. Daten, die wir gesetzlich aufbewahren müssen (z. B. Rechnungen), werden bis Fristende gesperrt und Ihre übrigen Daten anonymisiert.</p>
    <h2>7. WhatsApp</h2><p>Wenn Sie uns über einen WhatsApp-Link kontaktieren, gelten zusätzlich die Datenschutzbestimmungen von WhatsApp Ireland Ltd.</p>
    <h2>8. Speicherdauer</h2><p>Wir löschen Ihre Daten, sobald sie für den Zweck nicht mehr erforderlich sind, spätestens nach Ablauf der gesetzlichen Aufbewahrungsfristen (z. B. 10 Jahre für Rechnungen nach § 147 AO).</p>
    <h2>9. Ihre Rechte</h2><p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde, z. B. dem Hamburgischen Beauftragten für Datenschutz und Informationsfreiheit.</p>`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name === 'impressum' ? 'Impressum' : 'Datenschutz'} – Pedalla</title><meta name="robots" content="noindex"><link rel="icon" href="img/favicon.png">
<link rel="stylesheet" href="site.css?v=${V}"></head><body class="legal">
<header class="top"><div class="wrap top-in"><a class="logo" href="./${process.env.PREVIEW ? 'index.html' : ''}"><img src="img/logo.png" alt="pedalla.bike" width="194" height="24"></a><div class="top-r"><a class="btn sm ghost" href="./${process.env.PREVIEW ? 'index.html' : ''}">← pedalla.bike</a></div></div></header>
<main class="wrap legal-body">${body}</main>
<footer class="foot"><div class="wrap foot-b">© ${new Date().getFullYear()} Pedalla · <a href="impressum${process.env.PREVIEW ? '.html' : ''}">Impressum</a> · <a href="datenschutz${process.env.PREVIEW ? '.html' : ''}">Datenschutz</a></div></footer>
</body></html>`;
}
