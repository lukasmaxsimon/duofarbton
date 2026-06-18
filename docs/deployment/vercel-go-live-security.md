# Go-Live mit Vercel — Sicherheits- & Produktions-Checkliste

**Stand: 17. Juni 2026.** Alles, was vor dem Live-Gang auf Vercel zu beachten ist — mit Fokus
auf sicherheitskritische Punkte und den Umgang mit API-Keys. Reihenfolge nach Schweregrad.

Legende: 🔴 kritisch (sonst kaputt/unsicher) · 🟠 wichtig · 🟢 empfohlen · ✅ schon erledigt

> **Fortschritt 2026-06-18:** Supabase-DB-**Verbindung steht**; **initiale Migration erzeugt + angewendet
> (16 Tabellen)** (§2) · Storage auf **Supabase S3** umgestellt (env-gated, `forcePathStyle`) + `images.remotePatterns` (§3)
> · `PAYLOAD_SECRET` bricht in Prod bei fehlendem Wert ab, `serverURL`/`cors`/`csrf` env-gated (§4)
> · **Node auf 22 gepinnt** (`.nvmrc`, `engines`) — Node 24 **und** 25 brechen das Payload-CLI (siehe `docs/learnings.md` §8)
> · `vercel.json` mit Region `fra1` (§7) · **Access Control geprüft** (Users privat, Events/Media public-read
> gewollt, Stiftungen/Testimonials ungenutzt → vorerst behalten, §5) · **Security-Header ergänzt** (§8).
> · **Supabase Data-API deaktiviert** (§2) · **Bucket `singahoi` angelegt + S3-Keys live verifiziert** (§3) · Legal teilbefüllt (§9).
> **Offen:** `S3_*` + restliche Secrets in Vercel setzen + Build-Command, Domain-DNS (§10); Datenschutz/Impressum
> Hausnummer+PLZ + juristische Prüfung (§9); starke Admin-Passwörter (§5).

---

## 0. Das absolute Minimum (sonst geht der Live-Gang schief)

- 🔴 **Datenbank umstellen** von SQLite auf **PostgreSQL** (Supabase/Neon) — SQLite funktioniert
  auf Vercel (serverless) nicht. Siehe §2.
- 🔴 **Datei-Uploads** auf **Cloud-Storage** umstellen — die lokale Festplatte ist auf Vercel
  flüchtig/nicht vorhanden. Siehe §3.
- 🔴 **`PAYLOAD_SECRET`** als starkes, einmaliges Geheimnis in Vercel setzen. Siehe §4.
- 🔴 **`PAYLOAD_DB_PUSH` NICHT auf `true`** in Produktion — stattdessen Migrationen. Siehe §2.
- 🔴 Alle **Secrets nur als Vercel-Environment-Variablen** setzen, **nie** committen, **nie**
  `NEXT_PUBLIC_*`. Siehe §1.

---

## 1. Secrets & API-Keys

### Aktueller Stand (geprüft) ✅
- ✅ Keine `NEXT_PUBLIC_*`-Variablen → kein Secret landet im Browser-Bundle.
- ✅ Keine hardcodierten Keys im Code (`src/` ist sauber).
- ✅ `.env` und `.env*.local` sind in `.gitignore` → werden nicht committet.
- ✅ Der Brevo-API-Key war **nie** in der Git-Historie (0 Treffer). Die kurze Episode in
  `.env.example` war nur Arbeitskopie und wurde bereinigt.

### Regeln für Vercel
- 🔴 Secrets ausschließlich unter **Vercel → Project → Settings → Environment Variables**
  hinterlegen (verschlüsselt). Pro Umgebung sauber trennen: **Production / Preview / Development**.
- 🔴 **Niemals** ein Secret mit `NEXT_PUBLIC_`-Präfix anlegen — das macht es im Client sichtbar.
- 🔴 `.env` niemals committen (ist gesichert). `.env.example` enthält **nur leere Platzhalter**.
- 🟢 **Key-Rotation:** Der Brevo-Key wurde nie gepusht → Rotation nicht zwingend. Bei jedem
  Zweifel (Key geteilt/auf anderem Rechner) trotzdem in Brevo neu erzeugen.
- 🟢 Falls das Repo auf GitHub liegt: **Secret Scanning** + **Dependabot** aktivieren.

### Environment-Variablen-Übersicht

| Variable | Typ | In Vercel setzen? | Hinweis |
| --- | --- | --- | --- |
| `DATABASE_URL` | 🔴 Secret | Production **und** Preview | Postgres-Connection-String (siehe §2). Muss auch **beim Build** erreichbar sein. |
| `PAYLOAD_SECRET` | 🔴 Secret | alle | Stark & einmalig; **nicht** der Dev-Wert. Siehe §4. |
| `PAYLOAD_DB_PUSH` | 🔴 Config | **nicht setzen** / `false` | In Prod niemals `true`. Siehe §2. |
| `BREVO_API_KEY` | 🔴 Secret | Production (Preview optional) | Nur server-seitig (ist es). |
| `BREVO_LIST_ID` | 🟠 Config | Production | `3` = Liste „Newsletter". |
| `BREVO_DOI_TEMPLATE_ID` | 🟠 Config | Production | `1` = DOI-Vorlage. |
| `BREVO_REDIRECT_URL` | 🔴 Config | Production | Auf die **Produktiv-Domain** setzen: `https://DEINE-DOMAIN/newsletter/bestaetigt` (nicht localhost!). |
| `INSTAGRAM_HANDLE` | 🟢 Config | Production | Für den „Folgen"-Button. |
| `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_USER_ID` | — | entfällt | Da Instagram über Payload kuratiert wird (Entscheidung), nicht nötig. |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | 🟠 Config | Production/Preview | Supabase Storage (S3). Aus Supabase → Storage → Settings. Siehe §3. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | 🔴 Secret | Production/Preview | Supabase S3-Access-Key. Aktiviert den Storage-Adapter. Siehe §3. |
| `PAYLOAD_PUBLIC_SERVER_URL` | 🔴 Config | Production | = `https://DEINE-DOMAIN`; aktiviert serverURL/cors/csrf (§4). Lokal leer. |

---

## 2. Datenbank: PostgreSQL (Supabase) — ✅ umgezogen

- ✅ Adapter `@payloadcms/db-postgres`, `DATABASE_URL` = Supabase **Session-Pooler** (Port 5432, EU,
  ADR 0001). SSL im Pool gesetzt (`rejectUnauthorized:false` — Pooler-Cert ist nicht gegen System-CAs
  prüfbar). `@payloadcms/db-sqlite` entfernt.
- ✅ **Initiale Migration** erstellt (`src/migrations/20260618_103400_initial.ts`) und auf Supabase
  **angewendet** → 16 Tabellen live. Migration **committen**.
- 🔴 **`PAYLOAD_DB_PUSH=false`** in Prod. Schema-Änderungen laufen über **Migrationen**:
  `pnpm migrate:create` lokal, im Deploy `pnpm migrate` (Build-Command `pnpm migrate && pnpm build`).
- 🔴 **Migrationen brauchen Node 22** (CLI bricht auf 24/25, siehe learnings §8) → Vercel-Node-Version
  = 22 (über `engines.node`/`.nvmrc` gepinnt).
- 🔴 **Supabase „UNRESTRICTED"-Tabellen schließen:** Im Table-Editor tragen alle Tabellen das Badge
  **UNRESTRICTED** (keine RLS) → über Supabases **Data-API (PostgREST, anon-Key)** wären sie an
  Payload vorbei erreichbar (z. B. `users`). Payload selbst nutzt die direkte Postgres-Verbindung und
  ist davon unabhängig. **Fix:** in Supabase → **Project Settings → Data API** die API **deaktivieren**
  bzw. `public` aus „Exposed schemas" nehmen. (Alternativ RLS auf allen Tabellen aktivieren — ohne
  Policies blockt PostgREST dann per Default, Payloads privilegierte Verbindung umgeht RLS ohnehin.)
- 🟠 **Build-Zeit:** Die Startseite wird beim Build vorgerendert (ISR, `revalidate = 300`) und ruft
  dabei `getPayload()` auf → die DB muss **schon beim Build** erreichbar sein. `DATABASE_URL`
  deshalb auch für die Build-/Preview-Umgebung setzen.
- 🟢 Connection-Pooling: serverlose Runtime öffnet viele kurzlebige Verbindungen → für die Runtime
  später ggf. den **Transaction-Pooler (Port 6543)** prüfen; Migrationen bleiben am Session-Pooler.

---

## 3. Datei-Uploads / Medien — ✅ auf Supabase Storage (S3) umgestellt

- ✅ Adapter `@payloadcms/storage-s3` mit Supabase Storage (ADR 0002, EU-Projekt = beste DSGVO-Story),
  **env-gated** (`enabled: S3_BUCKET && S3_ACCESS_KEY_ID`), **`forcePathStyle: true`** (Pflicht bei
  Supabase). Ohne Keys (lokal) bleiben Uploads auf der Festplatte.
- ✅ `next.config.ts` → `images.remotePatterns` für `*.supabase.co/storage/v1/object/public/**`
  (öffentlicher Bucket); privater Bucket läuft über Payload (`/api/media/file/**` → `localPatterns`).
- 🔴 **Vor Go-Live in Supabase anlegen + in Vercel setzen:** Bucket erstellen, S3-Access-Key erzeugen,
  die fünf **`S3_*`-Env-Vars** (Endpoint/Region/Bucket/Key/Secret) als **Secrets** hinterlegen (§1).
- 🟠 **Bucket-Sichtbarkeit festlegen:** öffentlicher Bucket = schnellere Auslieferung direkt von
  Supabase; privat = über Payload. Für reine Website-Bilder ist öffentlich ok.

---

## 4. Payload-Konfiguration härten

- 🔴 **`PAYLOAD_SECRET`** muss gesetzt sein. Achtung: aktuell `secret: process.env.PAYLOAD_SECRET || ''`
  — fehlt der Wert, läuft die App mit **leerem** Secret (unsicher: signiert Login-JWTs/Cookies).
  In Vercel zwingend setzen; empfohlen, die Config so zu ändern, dass sie bei fehlendem Secret in
  Produktion **abbricht** statt still auf `''` zu fallen.
- 🟠 **`serverURL`, `cors`, `csrf`** in `buildConfig` für Produktion explizit setzen
  (aktuell nicht gesetzt → Defaults). Empfehlung:
  ```ts
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL, // = https://DEINE-DOMAIN
  cors: [process.env.PAYLOAD_PUBLIC_SERVER_URL!],
  csrf: [process.env.PAYLOAD_PUBLIC_SERVER_URL!],
  ```
  Das verhindert fremde Origins beim Admin-Login und korrigiert absolute URLs (Medien, E-Mails).
- 🟢 Sharp (Bildverarbeitung) ist eingebunden — auf Vercel ok.

---

## 5. Admin-Panel-Sicherheit (`/admin`)

- 🔴 `/admin` ist öffentlich erreichbar. **Starke, einmalige Passwörter** für alle Admin-User
  (Linda & Magdalena). Den ersten User direkt nach Deploy anlegen.
- ✅ **Access Control geprüft** (2026-06-18): REST-/GraphQL-API gibt keine sensiblen Daten
  öffentlich aus.
  - `Users` ist **nicht** öffentlich lesbar — kein `access`-Block → Payload-Default für
    Auth-Collections = nur eingeloggt (read/create/update/delete). Bewusst **nicht** auf
    `read: () => true` geöffnet. ✓
  - `Events` ist bewusst öffentlich (`read: () => true`), Schreiben nur eingeloggt ✓.
  - `Media` ist fürs Frontend lesbar (`read: () => true`), Schreiben nur eingeloggt ✓.
  - `Stiftungen` / `Testimonials` sind im **gesamten Frontend nicht referenziert** (verifiziert:
    Startseite zieht alles aus dem Global `startseite` + Events; `LogoMarquee` nutzt
    `startseite.standorte`, nicht die Collection). → nur leere, aber öffentliche Endpunkte.
    **Entscheidung 2026-06-18: vorerst unverändert behalten** (inhaltlich harmlos, da öffentliche
    Inhaltstypen). Bei Bedarf später entfernen (Drop-Migration, Node 22) oder per `admin.hidden`
    + Default-`read` ausblenden.
- 🟠 Payloads Login-Schutz (Versuchslimit/Sperrzeit) greift per Default; ggf. verschärfen.
- 🟢 Kein eingebautes 2FA — Admin-URL nicht breit streuen; optional Zugriff auf `/admin` über
  Vercel-Firewall/Middleware zusätzlich einschränken.

---

## 6. Brevo (Newsletter) — Produktion

- 🔴 **`BREVO_REDIRECT_URL`** auf die Live-Domain umstellen (`https://…/newsletter/bestaetigt`).
- 🔴 **IP-Beschränkung im Brevo-Account deaktiviert lassen** — Vercel-Function-IPs wechseln; mit
  Whitelist schlägt jeder Aufruf fehl (genau das hatten wir beim Testen). Sicherheit liegt im
  geheimen Key.
- ✅ Key bleibt server-seitig (Server Action), gelangt nicht in den Client.
- 🟢 Optional: Rate-Limit/Abuse-Schutz für das Formular (siehe §8).

---

## 7. Next.js / Vercel-spezifisch

- ✅ **Build-Command** ist korrigiert auf `next build` (war fälschlich `payload build`).
  Vercel erkennt Next automatisch; Build-Command i. d. R. `pnpm build`.
- ✅ **Function-Region auf EU (Frankfurt `fra1`)** gesetzt via `vercel.json` (`"regions": ["fra1"]`).
- ✅ Node-Version fixiert: `.nvmrc=22` + `engines.node` `>=22.12.0 <23`. **Wichtig: Node 24 _und_ 25
  NICHT verwenden** — beide brechen das Payload-CLI (`migrate:create`/`migrate`/`generate:types`),
  siehe `docs/learnings.md` §8. Vercel zieht `engines.node` → läuft damit auf Node 22.
- 🔴 **Migrationen im Deploy ausführen.** Build-Command auf Vercel: `pnpm migrate && pnpm build`.
  Die initiale Migration ist erzeugt (`src/migrations/20260618_103400_initial.ts`) und lokal
  angewendet — **noch committen**, damit Vercel sie beim Build fährt.

---

## 8. Security-Header & Rate-Limiting (Härtung)

- ✅ **Security-Header ergänzt** (2026-06-18) in `next.config.ts` via `headers()` für alle Routen
  (live geprüft auf `/` **und** `/admin`): `Strict-Transport-Security: max-age=31536000`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  HTTPS/TLS stellt Vercel automatisch. **Bewusst weggelassen:** `includeSubDomains`/`preload` beim
  HSTS (Domain liegt bei ALL-INKL für E-Mail/Subdomains → würde diese schwer reversibel zu HTTPS
  zwingen) und eine strenge CSP (das Payload-Admin braucht Inline-Scripts/Styles + Same-Origin-Framing;
  Clickjacking-Schutz kommt über `X-Frame-Options: SAMEORIGIN`).
- 🟢 **Rate-Limiting** für die Newsletter-Server-Action (heute nur Honeypot). Gegen Missbrauch
  (massenhaftes Auslösen von Brevo-Mails) z. B. Vercel-Firewall oder Edge-Middleware mit
  Upstash-Ratelimit. Brevo hat zusätzlich eigene Limits.

---

## 9. DSGVO / Rechtliches (für diese Seite zentral)

- 🔴 **Platzhalter in Datenschutz & Impressum füllen** (Anschrift, E-Mail, Telefon, Hosting-Anbieter)
  und **juristisch prüfen** lassen — vor Go-Live. Siehe `docs/offene-punkte.md` §2.
- 🟠 **EU-Datenresidenz** durchziehen: Vercel-Region EU, Postgres-Region EU, Storage-Bucket EU.
  Brevo ist bereits EU ✅.
- ✅ Keine Dritt-Tracker: Schriften self-hosted, Google Maps nur als Link, Instagram (über Payload)
  self-hosted → derzeit **kein Cookie-Banner nötig**. Bei späterem Tracking: PRD
  `cookie-consent-management.md` umsetzen.

---

## 10. Domain

- 🟠 ALL-INKL-**Domain** in Vercel als Custom Domain hinterlegen und DNS (A/AAAA/CNAME) auf Vercel
  zeigen lassen. ALL-INKL bleibt für **E-Mail** nutzbar. `BREVO_REDIRECT_URL` und `serverURL` auf
  die finale Domain.

---

## Kurz-Checkliste vor dem ersten Live-Deploy

- [x] Supabase-Projekt (EU) angelegt; **DB-Verbindung steht** (Session-Pooler, alphanum. Passwort, SSL)
- [x] DB-Adapter auf `@payloadcms/db-postgres` · [x] **Initiale Migration erzeugt + angewendet (16 Tabellen)** · [x] committet
- [x] `PAYLOAD_DB_PUSH` Default `false` (push nur lokaler Notnagel)
- [x] **Supabase Data-API deaktiviert** (2026-06-18, durch Lukas) — UNRESTRICTED-Tabellen nicht mehr exponiert (§2)
- [x] Storage-Adapter Supabase S3 (env-gated, `forcePathStyle`) · [x] Bucket `singahoi` angelegt + S3-Keys **live verifiziert** (ListObjects 200) · [ ] `S3_*` in Vercel setzen
- [x] Config bricht bei fehlendem `PAYLOAD_SECRET` in Prod ab · [ ] starkes Secret in Vercel setzen
- [x] `serverURL`/`cors`/`csrf` env-gated im Code · [ ] `PAYLOAD_PUBLIC_SERVER_URL` = Live-Domain setzen
- [ ] `BREVO_*` gesetzt, `BREVO_REDIRECT_URL` = Live-Domain, IP-Beschränkung aus
- [x] Function-Region EU (fra1) via `vercel.json`
- [x] **Node auf 22 gepinnt** (`.nvmrc`/`engines`; Node 24 **und** 25 brechen das Payload-CLI)
- [x] **Access Control je Collection geprüft** (`Users` nicht öffentlich ✓; `Stiftungen`/`Testimonials` ungenutzt → bewusst vorerst behalten)
- [ ] Starke Admin-Passwörter
- [ ] Datenschutz/Impressum gefüllt + geprüft
- [x] **Security-Header ergänzt** (HSTS, nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy)
- [ ] Domain verbunden (DNS bei ALL-INKL → Vercel; MX/E-Mail bleibt ALL-INKL)

> Verwandte Doku: `docs/offene-punkte.md`, `docs/setup/brevo-newsletter.md`,
> `docs/setup/instagram-feed.md`.
