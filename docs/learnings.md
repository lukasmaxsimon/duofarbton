# Learnings — Sing Ahoi (Payload 3 + Next.js)

**Lebendes Dokument.** Hier sammeln wir hart erarbeitete Erkenntnisse, Stolperfallen und
wiederverwendbare Muster für dieses und zukünftige **Payload-3-/Next.js-Projekte**. Bei jeder
Session, in der etwas „klick" gemacht hat oder uns etwas Zeit gekostet hat, kurz ergänzen.
Format: **was war das Problem → was ist die Lösung/Regel**. Datum in die Änderungshistorie unten.

---

## 1. Instagram-Feed anbinden (verifizierte Schritte)

> Vollständiger Setup-Guide inkl. DSGVO & API-loser Alternative: [setup/instagram-feed.md](setup/instagram-feed.md).
> Hier nur die Essenz + die Fallen, die uns Zeit gekostet haben.

**Grundlage:** Instagrams alte *Basic Display API* ist **seit Dez. 2024 tot**. Beiträge automatisch
anzeigen geht nur noch über ein **Access-Token** (Business-/Creator-Konto). Der funktionierende Weg
in diesem Projekt war **„Instagram API with Instagram Login"** — das Token beginnt mit **`IGAA…`**.

**Aufruf im Code** (`src/lib/instagram.ts`):
`GET https://graph.instagram.com/{user_id|me}/media?fields=…&access_token=…`

### Stolperfallen (genau hier haben wir Zeit verloren)

1. **`appid|appsecret` ist KEIN User-Token.** In `.env` stand anfangs ein Wert der Form
   `1716190639535839|rWUi…` (App-ID + App-Secret). Damit antwortet die API mit **HTTP 500 /
   „Unsupported get request"**. Ein gültiges User-Token sieht aus wie `IGAA…` (lang).
2. **`INSTAGRAM_USER_ID` muss die echte Instagram-`user_id` sein**, nicht irgendeine numerische ID.
   Eine falsche ID (uns lag `949568448117835` vor) liefert **Fehler 100 — „Object … does not exist
   … missing permissions"**. Die korrekte ID holt man so:
   `GET https://graph.instagram.com/me?fields=user_id,username&access_token=…`
   → liefert `user_id` (Format `17841…`). Diese eintragen — **oder das Feld leer lassen**, dann nutzt
   der Code automatisch `me` (funktioniert ebenfalls).
3. **Tokens laufen ab.** Short-lived ≈ 1 h, long-lived ≈ 60 Tage (per
   `GET /access_token?grant_type=ig_exchange_token`), danach Refresh nötig. Zeigt die Sektion plötzlich
   wieder Platzhalter → meist abgelaufenes Token.

### Token in 30 Sekunden per curl prüfen (bevor man lange im Code sucht)

```bash
set -a && . ./.env && set +a
# 1) Token gültig? Liefert die echte user_id:
curl -s "https://graph.instagram.com/me?fields=user_id,username&access_token=${INSTAGRAM_ACCESS_TOKEN}"
# 2) Beiträge da?
curl -s "https://graph.instagram.com/me/media?fields=id,media_type,permalink&limit=5&access_token=${INSTAGRAM_ACCESS_TOKEN}"
```

`{"error":{"code":100,…}}` = ID/Permission-Problem · HTTP 500 = vermutlich falsches Token-Format.

---

## 2. Secrets & ENV (allgemeingültig)

- **`.env`** (in `.gitignore`) ist die Laufzeit-Datei — **hier** gehören echte Secrets rein.
  **`.env.example`** ist **eingecheckt** (Vorlage) → dort **nur leere Platzhalter**, niemals echte
  Tokens/Keys. Uns ist passiert: Insta-Daten landeten in `.env.example` (greifen nicht zur Laufzeit
  **und** Leak-Risiko). Merksatz: *App liest `.env`, Git trackt `.env.example`.*
- Secrets bleiben **server-seitig** — **nie** mit `NEXT_PUBLIC_` prefixen (das landet im Client-Bundle).
- **Leak-Check vor Commit:** `git grep -l "<token-fragment>"` → muss leer sein. Zusätzlich
  `git ls-files | grep -E '^\.env'` zeigt, welche env-Dateien überhaupt getrackt sind.

---

## 3. Payload 3 — Globals (Singletons) für Seiteninhalte

Für eine **feste, bespoke Seite** (z. B. die Startseite mit fixem Layout + Scroll-Animationen) ist ein
typsicheres **Global** das richtige Mittel — **kein** generischer Block-Builder. Eine Feld-Gruppe pro
Sektion. Umgesetzt in `src/globals/Startseite.ts`.

- **`defaultValue` auf JEDEM Feld** (inkl. `array`-Feldern!) hinterlegen = der bisherige Copy.
  → `payload.findGlobal({ slug })` liefert die Defaults **auch für ein nie gespeichertes Global**.
  Ergebnis: die Seite sieht ohne jede Dateneingabe exakt wie vorher aus = **kostenloses Seeding**,
  kein Seed-Skript nötig.
- **`access: { read: () => true }`**, damit das Frontend (ohne Login) lesen darf.
- **Sofort sichtbar machen:** `hooks.afterChange` mit `revalidatePath('/')` (aus `next/cache`).
  Sonst greift erst das ISR-Fenster (`export const revalidate`).
- **Upload-Felder** sind typisiert als `(number | null) | Media`. Beim Lesen `depth: 2` setzen
  (`findGlobal({ slug, depth: 2 })`), damit das volle `Media`-Objekt kommt statt nur der ID. Auflösen
  über den Helper **`resolveUpload()`** in `src/lib/payload-media.ts` (+ `mediaUrl()`), mit Fallback
  auf `/public`-Assets, solange kein Bild gepflegt ist.
- **Muster:** Medien **server-seitig** in `page.tsx` auflösen und den Sektionen **reine,
  serialisierbare Props** (URL-Strings, keine Media-Objekte/IDs) übergeben → Sektionen werden
  präsentational und sind auch als Client-Components unproblematisch.

---

## 4. Payload 3 — Schema-Push & Codegen-Workflow

- **Neues Global/Collection/Feld → DB-Schema pushen:** einmalig `PAYLOAD_DB_PUSH=true pnpm dev`
  starten, Payload initialisieren lassen (eine Route/Admin aufrufen), dann Server stoppen und wieder
  mit `push=false` fahren. So steht es auch in `payload.config.ts`.
- **Bekannter Push-Quirk (harmlos):** beim Push erscheint
  `Failed query: CREATE INDEX events_meta_meta_image_idx already exists` (kommt vom SEO-Plugin-Index).
  Das ist **nur bei `push=true`** und stoppt den Push **nicht** — die neuen Tabellen werden trotzdem
  angelegt (verifiziert via `sqlite3 singahoi.db ".tables"`). Im Normalbetrieb (`push=false`) taucht
  der Fehler nicht auf.
- **Nach Config-/Collection-Änderungen IMMER:** `pnpm generate:types` **und**
  `pnpm generate:importmap`.
- **Versions-Pinning:** alle `@payloadcms/*` + `payload` exakt auf **3.85.1** — nur gemeinsam anheben.

---

## 5. Next.js — wiederverwendbare Muster

- **ISR:** `export const revalidate = <sek>` in der Page für regelmäßiges Neu-Rendern; für „sofort"
  zusätzlich On-Demand-Revalidation (`revalidatePath`) aus einem CMS-Hook (siehe §3).
- **Client-Components brauchen serialisierbare Props** — Media/Relationen server-seitig zu URLs/Plain
  Objects auflösen, bevor sie an `'use client'`-Komponenten gehen.
- **Build verifizieren OHNE Server zu starten:** nach `pnpm build` das vorgerenderte HTML prüfen, z. B.
  `grep -F "Erwarteter Text" .next/server/app/index.html`. Schneller als Dev-Server + Browser, gut für
  „kommt der CMS-Inhalt wirklich an?".

---

## 6. Dateien, die wir NICHT brauchen (Template-Leftover / outdated)

- **`src/app/my-route/route.ts`** — reine Demo aus dem Payload-Blank-Template
  („This is an example of a custom route."), holt sinnlos `getPayload` (ungenutzt, erzeugt Lint-
  Warnings). **Kann gelöscht werden.**
- **`src/app/(frontend)/components/sections/callouts-data.ts`** — bereits entfernt; die „So macht ihr
  mit"-Schritte kommen jetzt aus dem Startseite-Global. (Merke: hartcodierte `*-data.ts`-Konstanten
  sind Kandidaten fürs CMS.)
- **Blank-Template-Altlasten:** das degit-Template nutzte unveröffentlichte 3.85.1-inkompatible Features
  (`folders:true`/`tags:true`, `createFolderField`/`createTagField`) — schon entfernt (siehe
  `CLAUDE.md`). Bei neuem Aufsetzen direkt weglassen.
- **Alter Insta-Token-Wert** (`appid|secret`) in `.env` war **kein** gültiges Token (siehe §1) — solche
  „funktioniert nie"-Platzhalter nicht stehen lassen.

---

## 7. Projekt-Workflow-Konventionen (Erinnerungen)

- **Dev-Server nach Prüfung beenden** (Port 3000 freigeben) — vor `pnpm dev` checken, ob schon einer
  läuft (`lsof -nP -iTCP:3000 -sTCP:LISTEN`).
- **Bild-/Visual-Feedback:** Betreiberinnen schauen oft mobil/remote → kleine JPEGs + Text statt großer
  Screenshots.
- **Skills nutzen** vor CMS-Änderungen: Skill `payload` (Collections/Globals/Hooks/Access).

---

## 8. Postgres/Supabase-Umzug — Stolperfallen (Vercel-Vorbereitung)

> Vollständige Go-Live-Liste: [deployment/vercel-go-live-security.md](deployment/vercel-go-live-security.md).
> Hier die Fallen, die beim Umstellen von SQLite → Supabase Zeit gekostet haben.

1. **Node 22 LTS verwenden — NICHT 24 oder 25.** Das `payload`-CLI (`migrate:create`, `migrate`,
   `generate:types`) bricht auf **Node 24 _und_ 25** mit
   `ENOENT … open 'node:crypto?tsx-namespace=…'`. Ursache: **`tsx`@4.22.4** (= aktuell neueste,
   kein Upgrade-Fix) kommt mit der Modulauflösung neuerer Node-Linien nicht klar — NICHT die DB,
   und auch nicht durch `--no-experimental-strip-types` behebbar. **Node 22 (`v22.x`) läuft sauber.**
   Deshalb `.nvmrc=22` und `engines.node` = `>=22.12.0 <23` (obere Schranke wichtig!). Vercel zieht
   das automatisch — `pnpm migrate` im Build-Command nutzt dasselbe CLI, also **muss Vercel ebenfalls
   auf Node 22 laufen.** Wichtig: `pnpm dev` (Next-Bundler statt tsx-CLI) läuft auf jeder Node-Version
   — der Bug betrifft nur das Standalone-CLI.
   ⚠️ **Nebenwirkung von `brew install node@24/@22`:** kann das global verlinkte `node` (25) über eine
   gebumpte Shared-Lib (`simdjson`) lahmlegen (`Library not loaded: …libsimdjson.30.dylib`). Egal,
   solange man node@22 explizit über `/opt/homebrew/opt/node@22/bin` aufruft.
2. **Supabase-Connection-String: „Session pooler" nehmen, nicht „Direct connection".** Im Connect-
   Dialog ist der Tab **„Direct" (Connection string)** richtig, NICHT „Framework" (Supabase-JS-Client,
   brauchen wir bei Payload nicht). „Direct connection" ist **IPv6-only** → von hier `EHOSTUNREACH`;
   **„Session pooler" (Port 5432, IPv4)** funktioniert für lokal + Migrationen.
   User/Host: `postgres.<projectref>@aws-0-<region>.pooler.supabase.com`.
   ⚠️ **Aber auf Vercel den Transaction-Pooler (Port 6543) nehmen — siehe §8.8.** Session-Pooler (5432)
   ist dort zu klein (15 Clients) und bricht im Build/Runtime mit `EMAXCONNSESSION`.
3. **`password authentication failed` (28P01) — zuerst an Propagation denken, nicht nur ans Passwort.**
   Nach einem **DB-Passwort-Reset** braucht Supabases Pooler (Supavisor) **~15–30 s**, bis das neue
   Passwort greift — ein Test direkt danach gibt fälschlich 28P01. → Kurz pollen (alle ~15 s), nicht
   sofort am Passwort zweifeln. Wenn 28P01 dauerhaft bleibt: Passwort falsch ODER Reset in Supabase
   nicht final bestätigt (Generate-Button füllt nur das Feld!) ODER **Sonderzeichen** (URL-Kodierung)
   — Fix: Passwort **rein alphanumerisch** zurücksetzen.
4. **SSL ist bei Supabase Pflicht, aber das Pooler-Zertifikat ist nicht gegen System-CAs prüfbar**
   (`SELF_SIGNED_CERT_IN_CHAIN`). Im `postgresAdapter`-Pool daher `ssl: { rejectUnauthorized: false }`
   (Verbindung bleibt TLS-verschlüsselt; nur die Chain-Prüfung ist aus). Bei lokalem Postgres
   (`localhost`) SSL aus — in `payload.config.ts` per Regex auf die `DATABASE_URL` gated.
   Verbindung schnell ohne CLI testbar: `pg`-Client aus `node_modules/.pnpm/pg@8.x/node_modules`
   mit ebendiesem `ssl`-Setting.
5. **Storage env-gaten statt hart umstellen:** Wir nutzen **Supabase Storage (S3)** via
   `s3Storage({ enabled: Boolean(S3_BUCKET && S3_ACCESS_KEY_ID), … config: { forcePathStyle: true, … }})`
   — `forcePathStyle: true` ist bei Supabase **Pflicht**. Mit Keys (Prod) Bucket, ohne (lokal)
   automatisch Festplatte. Gleiche Idee bei `serverURL`/`cors`/`csrf`: nur setzen, wenn
   `PAYLOAD_PUBLIC_SERVER_URL` da ist — sonst greifen die Dev-Defaults.
6. **„UNRESTRICTED"-Badge in Supabase = keine RLS.** Tabellen im `public`-Schema ohne Row Level
   Security sind über Supabases **Data-API (PostgREST, anon-Key)** erreichbar — an Payload vorbei.
   Payload selbst nutzt die direkte Postgres-Verbindung, ist also unabhängig. Vor Go-Live die
   **Data-API deaktivieren / `public` nicht exponieren** (Details: Go-Live-Security-Checkliste).
7. **Migrationen mit derselben ENV/Config erzeugen wie Production — sonst fehlen Spalten.** Der
   S3-Adapter ist env-gated (`enabled: S3_BUCKET && S3_ACCESS_KEY_ID`) und fügt der `media`-Collection
   eine **`prefix`-Spalte** hinzu — aber **nur wenn aktiv**. Die initiale Migration wurde **ohne**
   gesetzte `S3_*` erzeugt → `prefix` fehlte im Schema. Auf Vercel (S3 aktiv) brach das **Prerendering**
   mit `column "prefix" does not exist` (PG-Code `42703`), obwohl `pnpm migrate` selbst sauber durchlief.
   **Regel:** vor `migrate:create` immer `set -a; . ./.env; set +a` (mit Node 22), damit das erzeugte
   Schema dem von Production entspricht — sonst driften env-gated Felder/Adapter auseinander. Fix war
   eine Nachzügler-Migration `…_add_media_prefix` (`ALTER TABLE "media" ADD COLUMN "prefix" …`).
8. **Connection-Pooler: lokal 5432, auf Vercel 6543 (Transaction).** Der Live-Deploy brach beim Build-
   `migrate` mit `(EMAXCONNSESSION) max clients reached in session mode - pool_size: 15`. Der **Session-
   Pooler (5432)** erlaubt nur **15 Clients** — auf Vercel halten die Serverless-Funktionen der laufenden
   Seite Verbindungen, also war beim Build kein Slot frei. **Fix:** `DATABASE_URL` auf Vercel auf den
   **Transaction-Pooler (Port 6543)** stellen (multiplext viele kurze Verbindungen, für Serverless gemacht);
   lokal bleibt 5432. **Fehler-Decoder:** `ENOTFOUND`=Host-Tippfehler (Host ist `aws-0-eu-west-1`, Bindestrich
   vor der `1`!) · `28P01`=Passwort · `EMAXCONNSESSION`=falscher Pooler-Port.
9. **Vercel-Env-Secrets per CLI setzen — NICHT im Dashboard tippen (kostete ~1 h).** `DATABASE_URL` ist im
   Dashboard maskiert → man sieht den Ist-Wert nicht → jeder manuelle Edit baute einen neuen Fehler ein
   (falsches PW → Host-Tippfehler → wieder PW; der Fehler *wanderte*, was beweist: Credentials gültig, nur
   Wert falsch). **Erst als ich per `vercel env`-CLI den Wert programmatisch aus der geprüften `.env` setzte,
   war es in Minuten gelöst.** Muster: `vercel link` → `vercel env rm <VAR> production --yes` →
   `printf '%s' "$VAL" | vercel env add <VAR> production` (+ preview) → `vercel redeploy`. `vercel env pull`
   gibt Secrets als `""` zurück (nicht auslesbar). Regel: nach ≤2 Blind-Versuchen auf CLI wechseln. (Playbook §8.)
   ⚠️ `PAYLOAD_PUBLIC_SERVER_URL` **nur für Production** setzen — für Preview bricht sonst CSRF (eigene `*.vercel.app`-URL).
10. **Bucket startet leer + DNS-Cache täuscht.** (a) Nach S3-Setup ist der Bucket **leer** — bestehende
   `./media/`-Dateien aus der Disk-Phase werden NICHT auto-synct → Bild-`404` (`/api/media/file/<name>?prefix=media`).
   Fix: alle `./media/*` per `curl --aws-sigv4 -T` unter prefix `media/` hochladen (Playbook §5). (b) Nach
   DNS-Umzug zeigt der eigene Browser oft noch den **Alt-Hoster** (macOS `mDNSResponder`-Cache; `dig` ist frisch,
   `curl`/Browser nicht). „Alte Seite/Bilder fehlen" ist dann **kein** Deploy-Problem — von außen mit
   `curl --resolve <domain>:443:<vercel-ip>` verifizieren, lokal `dscacheutil -flushcache` + Mobilfunk-Test (Playbook §9).

---

## 9. Payload 3 — Rollen / Access Control (RBAC)

Payload bringt **kein** Rollensystem mit. Wir hängen ein `role`-Select (`admin` | `editor`,
`saveToJWT: true`) an die `users`-Collection und prüfen es zentral in `src/access/index.ts`
(`isAdmin`, `isAdminOrEditor`, `adminsOrSelf`, `isAdminFieldLevel`). Editor darf nur Inhalte:
Events, Testimonials, Stiftungen, Startseite (create/update/delete); alles andere nur Admin.

Drei nicht offensichtliche Fallen:

1. **`access.admin` auf der `admin.user`-Collection sperrt den ganzen Panel-Zugang.** Bei
   *anderen* Collections steuert `access.admin` nur die Nav-Sichtbarkeit — bei der als
   `admin.user` konfigurierten `users`-Collection entscheidet es, ob jemand das Admin-Panel
   **überhaupt** betreten darf. Setzt man es dort auf „nur Admin", können Editor:innen sich
   nicht mehr einloggen. → `users` **nicht** über `access.admin` einschränken; stattdessen die
   Nav per `admin.hidden: ({ user }) => user.role !== 'admin'` ausblenden. Account-Menü
   (Passwort) bleibt erreichbar; `read`/`update` über `adminsOrSelf`.

2. **Neue Pflicht-Spalte sperrt bestehende Nutzer aus.** Ein `role`-Feld mit
   `defaultValue: 'editor'` erzeugt `ADD COLUMN … DEFAULT 'editor' NOT NULL` → **alle
   bestehenden** Nutzer (inkl. dir) werden Editor und verlieren Admin-Rechte. Migration daher
   um `UPDATE "users" SET "role" = 'admin';` ergänzen (bestehende → Admin), neuen Editor-Account
   danach im UI auf „Redakteur:in" stellen.

3. **Mediathek aus der Editor-Nav nehmen, aber Uploads erhalten.** `Media` per `admin.hidden`
   aus der Nav nehmen, aber `read: anyone` + `create/update: isAdminOrEditor` lassen — die
   Upload-/Relationship-Drawer in Events/Testimonials/Stiftungen/Startseite nutzen read/create,
   **nicht** die Nav. `delete` nur Admin.

4. **Ein neues `required`-Feld kann den `next build`-Typecheck brechen — `lint`/`generate:types`
   fangen das NICHT.** `role` als `required: true` machte die Test-Fixture `tests/helpers/seedUser.ts`
   (legte User nur mit `email`+`password` an) typ-ungültig; da `tsconfig.include` per `**/*.ts` auch
   `tests/` abdeckt, brach der Vercel-Build (`next build` typcheckt mit). Folge: fehlgeschlagener
   **Production**-Deploy. **Regel:** vor dem Push auf `main` (Vercel auto-deployt) bei Feld-/Schema-
   Änderungen `npx tsc --noEmit` laufen lassen — `pnpm lint` + `pnpm generate:types` reichen nicht.

Schema-Änderung wie immer als Migration (`pnpm migrate:create`, Node 22). `migrate:create`
introspiziert nur die DB (read-only) und schreibt die Datei — angewendet wird erst per
`pnpm migrate` (bzw. automatisch im Vercel-Build).

---

## Änderungshistorie

- **2026-06-18 (RBAC)** — Rollensystem (`admin`/`editor`) für Payload eingeführt: `role`-Feld an
  `users`, zentrale Access-Helper in `src/access/`, Editor auf Events/Testimonials/Stiftungen/
  Startseite beschränkt, Media aus Editor-Nav genommen. Drei Fallen in §9 dokumentiert (Panel-Lockout
  via `access.admin` auf `admin.user`, Default-Spalte sperrt Bestands-Nutzer, Media-Uploads vs. Nav).
  Migration `…_add_user_role` (+ Backfill bestehender Nutzer → admin).
- **2026-06-18 (LIVE 🎉)** — Seite live auf **`www.singahoi.de`**. Vier Fallen gekostet (~1 h+), jetzt in
  §8.8–8.10 + Playbook §2/§5/§8/§9 dokumentiert: (1) `DATABASE_URL` als maskiertes Vercel-Secret blind getippt
  → erst per CLI programmatisch gesetzt gelöst; (2) Pooler-Port: Vercel braucht 6543 (Transaction), nicht 5432;
  (3) Bilder-404 weil Bucket leer → `./media/*` per S3-API hochgeladen; (4) „alte WordPress-Seite" = lokaler
  DNS-Cache, nicht der Deploy. Außerdem `BREVO_REDIRECT_URL` + `PAYLOAD_PUBLIC_SERVER_URL` (nur Prod) gesetzt.
- **2026-06-18 (Go-Live)** — Erster Vercel-Deploy: Build lief bis zum Prerendering, brach mit
  `column "prefix" does not exist`. Ursache: initiale Migration ohne aktiven S3-Adapter erzeugt →
  `media.prefix` fehlte (§8.7). Fix-Migration `…_add_media_prefix` (mit S3 an erzeugt). Außerdem
  Go-Live-Härtung: Security-Header (next.config.ts), Impressum/Datenschutz befüllt, Access Control
  geprüft, privates GitHub-Repo `lukasmaxsimon/singahoi` + Vercel-Projekt, buildCommand in vercel.json.
- **2026-06-18 (Fortsetzung)** — Supabase-Verbindung steht (Session-Pooler, alphanum. Passwort, SSL
  `rejectUnauthorized:false`). **Initiale Migration erzeugt + angewendet → 16 Tabellen live.** Storage
  von Vercel Blob auf **Supabase S3** umgestellt (ADR 0002 = Akzeptiert). **Node-Pin 24→22 korrigiert**
  (tsx-Bug bricht CLI auf 24 _und_ 25). Ungenutztes `@payloadcms/db-sqlite` entfernt. Siehe §8.
- **2026-06-18** — Postgres/Supabase-Vorbereitung für Vercel: Adapter SQLite→Postgres, Migrations-
  Scripts, Storage env-gated, Config-Härtung (PAYLOAD_SECRET fail-fast,
  serverURL/cors/csrf). Stolperfallen siehe §8; Entscheidungen als ADR 0001/0002.
- **2026-06-17** — Datei erstellt. Erkenntnisse aus: (a) Startseite über Payload-**Global**
  bearbeitbar gemacht (Globals, `defaultValue`-Seeding, Upload-Auflösung, Schema-Push-Quirk,
  Build-Verify per Prerender-HTML); (b) **Instagram-Feed** zum Laufen gebracht (Token-Format `IGAA…`
  vs. `appid|secret`, `user_id` via `/me?fields=user_id`, `.env` vs. `.env.example`, curl-Token-Check).
