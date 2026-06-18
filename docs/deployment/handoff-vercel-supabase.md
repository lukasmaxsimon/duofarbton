# Handoff — Vercel/Supabase-Umzug (Sing Ahoi)

**Für eine neue Chat-Session.** Stand: 2026-06-18. Dieses Dokument fasst alles zusammen, was man
braucht, um den Umzug von lokal (SQLite) auf **Vercel + Supabase (Postgres)** fortzusetzen.

> Tiefere Docs: `docs/deployment/vercel-go-live-security.md` (vollständige Go-Live-Checkliste),
> `docs/learnings.md` §8 (Stolperfallen), `docs/adr/0001` + `0002` (Entscheidungen).

---

## Projekt in einem Satz

Sing Ahoi — gemeinnütziger Pop-up-Mitsing-Chor für Familien (Kinder 2–10). Next.js (App Router) +
**Payload 3** als CMS in **einer** App. Sprache: Deutsch. Werte: warm, familienfreundlich, barrierearm,
**nicht** kommerziell. Versionen aller `@payloadcms/*` + `payload` exakt **3.85.1** (nur gemeinsam anheben).

## Ziel des aktuellen Arbeitsstrangs

Die App produktionsreif auf **Vercel** bringen, mit **PostgreSQL auf Supabase** (EU) und
**Supabase Storage (S3)** für Medien. Domain bleibt bei ALL-INKL (nur DNS auf Vercel zeigen, E-Mail bleibt ALL-INKL).

---

## ✅ Schon erledigt

1. **DB-Adapter** `@payloadcms/db-postgres` in `src/payload.config.ts` (`migrationDir: src/migrations`,
   `push` env-gated über `PAYLOAD_DB_PUSH`, **SSL** `rejectUnauthorized:false` für Supabase-Pooler).
   SQLite-Adapter **entfernt**.
2. **DB-Verbindung steht** (Session-Pooler, alphanum. Passwort). **Initiale Migration erzeugt _und_
   angewendet** → `src/migrations/20260618_103400_initial.ts`, 16 Tabellen live in Supabase.
   Migrations-Scripts in `package.json`: `migrate`, `migrate:create`, `migrate:status`.
3. **Medien-Storage** `@payloadcms/storage-s3` auf **Supabase Storage**, **env-gated**: aktiv nur mit
   `S3_BUCKET` + `S3_ACCESS_KEY_ID` (Prod) → sonst lokal Festplatte. `forcePathStyle: true` (Supabase-Pflicht).
   `next.config.ts` hat `remotePatterns` für `*.supabase.co/storage/v1/object/public/**`.
4. **Config-Härtung**: `PAYLOAD_SECRET` bricht in Prod bei leerem Wert ab; `serverURL`/`cors`/`csrf`
   env-gated über `PAYLOAD_PUBLIC_SERVER_URL` (lokal unberührt).
5. **Node gepinnt auf 22**: `.nvmrc=22`, `engines.node` = `>=22.12.0 <23`. `vercel.json` Region `fra1`.
6. **Doku**: ADR 0001 (Postgres), ADR 0002 (**Supabase S3, Status Akzeptiert**),
   `learnings.md` §8, Go-Live-Checkliste aktualisiert.

## ⛔ Wichtigste Stolperfalle: Node-Version

Das Payload-CLI (`migrate:create`/`migrate`/`generate:types`) bricht auf **Node 24 _und_ 25** mit
`ENOENT … node:crypto?tsx-namespace…` (tsx@4.22.4-Bug, **kein** DB-Problem, kein Upgrade-Fix).
→ **Node 22 LTS verwenden.** Lokal installiert via `brew install node@22`
(Pfad `/opt/homebrew/opt/node@22/bin`). `pnpm dev` läuft auf jeder Node-Version; nur das Standalone-CLI
braucht Node 22. Vercel zieht die Node-Version aus `engines.node` → ebenfalls 22.

## ▶️ Nächste Schritte

1. **Migration committen** (`src/migrations/`), damit Vercel sie beim Build fährt.
2. **Supabase Data-API zumachen** (Security): alle Tabellen sind „UNRESTRICTED" (keine RLS) → über die
   Data-API/anon-Key an Payload vorbei erreichbar. Fix: Supabase → Project Settings → **Data API
   deaktivieren** bzw. `public` aus „Exposed schemas". Payload (direkte DB-Verbindung) bleibt unberührt.
3. **Supabase Storage**: Bucket anlegen + S3-Access-Key erzeugen; die fünf `S3_*`-Vars bereitlegen.
4. **Vercel-Projekt** mit Repo verbinden, ENV-Variablen setzen (s. u.), Build-Command
   `pnpm migrate && pnpm build`.
5. **Domain**: in Vercel als Custom Domain hinterlegen; bei ALL-INKL DNS setzen (A `singahoi.de` →
   Vercel-IP, CNAME `www` → `cname.vercel-dns.com`). **MX-Records bei ALL-INKL unangetastet lassen**
   (E-Mail). Danach `PAYLOAD_PUBLIC_SERVER_URL` + `BREVO_REDIRECT_URL` auf die Live-Domain.
6. Vor Go-Live: Datenschutz/Impressum füllen, Admin-Passwörter, Access Control je Collection prüfen
   (vollständig in `docs/deployment/vercel-go-live-security.md`).

## Environment-Variablen (Überblick)

| Variable | Lokal (`.env`) | Vercel | Zweck |
| --- | --- | --- | --- |
| `DATABASE_URL` | Session-pooler-String | Prod **+** Preview (auch Build!) | Postgres-Verbindung |
| `PAYLOAD_SECRET` | beliebig (Dev) | alle, **stark & einmalig** | signiert Login/Cookies |
| `PAYLOAD_DB_PUSH` | `false` | nicht setzen / `false` | nur lokaler Schema-Notnagel |
| `PAYLOAD_PUBLIC_SERVER_URL` | leer | Prod = `https://<domain>` | serverURL/cors/csrf |
| `S3_ENDPOINT`/`S3_REGION`/`S3_BUCKET` | leer | Prod/Preview | Supabase Storage (S3) |
| `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` | leer | Prod/Preview | Supabase S3-Access-Key (aktiviert Storage) |
| `BREVO_*` | s. `.env.example` | Prod | Newsletter (Brevo) |
| `INSTAGRAM_*` | optional | optional | Insta-Feed (kuratiert über Payload) |

## Wichtige Dateien

- `src/payload.config.ts` — Adapter, Storage-Plugin, Secret/serverURL-Härtung
- `next.config.ts` — `images.remotePatterns`
- `.env.example` — alle Variablen mit Erklärung · `.nvmrc`, `vercel.json`, `package.json` (scripts/engines)
- `src/migrations/` — initiale Migration `20260618_103400_initial.ts` (erzeugt + angewendet)

## Gotchas (kurz)

- **Node 22, nicht 24/25** (beide brechen das Payload-CLI; `brew install node@22`).
- Supabase **Session pooler (5432)**, Passwort **alphanumerisch**; nach Reset **~15–30 s Propagation**
  abwarten (sonst falsch-negativer 28P01).
- SSL im Adapter-Pool nötig (`rejectUnauthorized:false`) — Pooler-Cert nicht gegen System-CAs prüfbar.
- Payload-CLI auf Node 22 mit geladener `.env` aufrufen: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; set -a; . ./.env; set +a`.
- URLs in der Shell (zsh) **quoten** (`?` ist sonst ein Glob).
- HeroUI **v3** (CSS-basiert, kein Provider/framer-motion); `onPress` statt `onClick`.
- Nach Config-/Collection-Änderungen: `pnpm generate:types` + `pnpm generate:importmap` (auf Node 22).
- Bestehende lokale SQLite-Daten wandern **nicht** automatisch mit (Supabase startet leer).
