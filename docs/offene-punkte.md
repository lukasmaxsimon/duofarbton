# Offene Punkte & nächste Schritte

**Stand: 17. Juni 2026** · Zentrale Sammelstelle für alles, was noch offen ist – und was wir
von Linda & Magdalena dafür brauchen. Gedacht zum gemeinsamen Abarbeiten.

Legende: ☐ offen · ✅ erledigt · 🔑 von euch gebraucht

---

## 1. Newsletter (Brevo)

**Status:** ✅ implementiert und getestet (7 Integrationstests grün), wartet nur auf Konfiguration.

- 🔑 ☐ Vier ENV-Werte setzen: `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_DOI_TEMPLATE_ID`,
  `BREVO_REDIRECT_URL`
- 🔑 ☐ In Brevo anlegen: Liste „Newsletter" + Double-Opt-In-Vorlage
- ☐ Live-Test mit echten Keys (machen wir, sobald die Werte da sind)

Doku: `docs/setup/brevo-newsletter.md` · PRD: `docs/prd/newsletter-anmeldung-brevo.md`

---

## 2. Rechtstexte (Datenschutz & Impressum)

**Status:** ✅ Seiten gebaut (`/datenschutz`, `/impressum`), im Footer verlinkt – aber mit
gelb markierten Platzhaltern.

- 🔑 ☐ Anschrift (Straße, PLZ) in Hamburg
- 🔑 ☐ Kontakt-E-Mail (für Impressum **und** Datenschutz)
- 🔑 ☐ Telefon (optional, Impressum)
- 🔑 ☐ Hosting-Anbieter (Datenschutz/Server-Logfiles) – sobald das Hosting steht (siehe 6)
- ☐ Juristische Prüfung vor dem Live-Gang
- ☐ Aufsichtsbehörde Hamburg (HmbBfDI) bestätigen
- ☐ Datenschutz-Abschnitt „Instagram" an die gewählte Instagram-Lösung anpassen (siehe 3)

---

## 3. Instagram-Feed — Entscheidung: **kuratiert über Payload** (statt API)

**Status:** Sektion „Aus unserem Alltag" ist gebaut und zeigt aktuell Platzhalter-Kacheln.
Der Code ist noch auf die Graph-API ausgelegt und wird auf **Payload-kuratiert umgestellt**
(token-frei, DSGVO-sauber, weil Bilder selbst gehostet werden).

Noch zu tun (wir):
- ☐ Payload-Collection „Instagram-Beiträge" anlegen: Bild-Upload, Beitrags-Link,
  Bildunterschrift, Sortierung/Datum (Muster: `src/collections/Events.ts`)
- ☐ `pnpm generate:types` + `pnpm generate:importmap`, einmalig `PAYLOAD_DB_PUSH=true`
  (Schema-Migration), dann Dev-Server neu starten
- ☐ `src/lib/instagram.ts` + `InstagramFeed.tsx` auf die Payload-Quelle umstellen,
  API-Code entfernen
- ☐ ENV aufräumen: `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_USER_ID` entfernen;
  `INSTAGRAM_HANDLE` für den „Folgen"-Button behalten
- ☐ Datenschutz-Abschnitt „Instagram" **entschärfen**: bei selbst gehosteten Bildern fließen
  **keine** Daten mehr an Meta – dann führt nur noch der „Folgen"-Link zu Instagram

🔑 von euch gebraucht:
- ☐ Instagram-Handle (z. B. `singahoi`) für den „Folgen"-Button
- ☐ Die Beiträge selbst (Bild + Link + kurzer Text) – die pflegt ihr danach bequem im
  Admin unter `/admin` ein

Doku: `docs/setup/instagram-feed.md` (Abschnitt „Alternative ohne API")

---

## 4. Cookie-/Consent-Management

**Status:** PRD vorhanden, **noch nicht umgesetzt**. Heute technisch noch nicht nötig, weil die
Seite first-party/server-seitig ist (Payload-Login, server-seitige Maps-Auflösung, Brevo über
Server Action, selbst gehostete Schriften).

- ☐ Umsetzen, **sobald** Dritt-Dienste/Tracking dazukommen (z. B. eingebettete Videos,
  echtes Analytics). Mit der Payload-Instagram-Lösung bleibt die Seite first-party → weiterhin
  kein Banner nötig.

PRD: `docs/prd/cookie-consent-management.md`

---

## 5. Inhalte & Bilder

- 🔑 ☐ Echte Fotos von Linda & Magdalena – ersetzen die Platzhalter-Porträts im „Über uns"
  (`public/portrait-placeholder.svg`)
- ☐ Restliche Startseiten-Abschnitte auf echten Inhalt prüfen (das Layout ist ein bewusster
  MindMarket-Klon): Hero-Texte, der „Standorte"-Abschnitt (`#network`, aktuell Logo-Marquee)
- 🔑 ☐ Klären, was in den „Standorte"-Abschnitt soll
- ☐ Ungenutzte Payload-Collections klären: „Testimonials" und „Stiftungen" werden im Frontend
  nicht verwendet → nutzen oder entfernen?

---

## 6. Deployment & Datenbank (größeres Thema, später)

**Status:** DB auf **Supabase Postgres** (EU) umgezogen, initiale Migration angewendet (16 Tabellen).
Medien-Storage auf **Supabase S3** umgestellt (env-gated). Offen: Vercel-Projekt + Domain.
Details: `docs/deployment/handoff-vercel-supabase.md`.

- ☑ Postgres (Supabase, EU) statt SQLite → ADR 0001. Hosting Vercel (Projekt noch anzulegen).
- ☑ Medien-Speicher cloud-fähig: **Supabase Storage (S3)**, `forcePathStyle` → ADR 0002.
  Vor Go-Live: Bucket + S3-Key anlegen, `S3_*` in Vercel.
- 🔑 ☐ ALL-INKL-Domain auf das neue Hosting zeigen lassen (Zugänge nötig)

---

## Vorhandene Dokumentation

**PRDs (`docs/prd/`):**
- `newsletter-anmeldung-brevo.md` — ✅ umgesetzt
- `cookie-consent-management.md` — ☐ noch offen

**Setup / Handover (`docs/setup/` & dieses Verzeichnis):**
- `setup/brevo-newsletter.md` — Brevo einrichten
- `setup/instagram-feed.md` — Instagram-Feed (inkl. Payload-Alternative)
- `offene-punkte.md` — diese Datei

**ADRs (`docs/adr/`):** noch keine. Erste ADR wird fällig bei der Hosting-/Postgres-Entscheidung.

---

## Entscheidungen (Log)

- **17.06.2026** — Instagram-Feed: kuratiert über **Payload** statt Graph-API
- Newsletter: Vorname **optional**; Platzierung im **Kontakt**-Container
- Typografie: **Fraunces** (Serif) für Headlines ergänzt
- Startseite ist bewusst ein **Layout-Klon** von mindmarket.com (Struktur), Inhalte werden
  Schritt für Schritt durch echte Sing-Ahoi-Inhalte ersetzt
