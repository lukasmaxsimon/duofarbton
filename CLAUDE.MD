# CLAUDE.md — Duo Farbton

## Projekt

**Duo Farbton** ist ein **Musikduo aus dem klassischen Bereich** — **Lisa** und **Sönke**
_(Nachnamen folgen)_. Die Website präsentiert das Duo, seine **verschiedenen Programme**,
kündigt **Konzerte/Termine** an, führt einen **eigenen Blog** und zeigt **wechselnde
Inhalte**. Geplant: **Instagram-Einbindung**, **Live-Elemente** _(genaue Bedeutung noch zu
klären)_. Alle Inhalte werden über das CMS gepflegt.

Im Gegensatz zum Vorgänger-Vorbild ist dies ein **professionelles, künstlerisches**
Projekt — Ton & Gestaltung: klassisch, hochwertig, elegant. **Sprache: Deutsch.**

> ⚠️ Teile von `docs/` und Skills wurden aus dem Schwesterprojekt **Sing Ahoi** übernommen
> und sind **noch nicht** auf Duo Farbton angepasst (anderer Stack: dort Supabase + Brevo).
> **Maßgeblich ist dieses CLAUDE.md.** Bei Widerspruch zu `docs/adr/*`, `docs/deployment/*`,
> `docs/playbooks/*`, `docs/learnings.md` § Supabase → diese gelten als veraltet, bis angepasst.

## Status (Stand 18.06.2026)

**Frische Basis aufgesetzt und verifiziert.** Payload 3.85.1 + Next.js 16 (Blank-Template),
läuft lokal gegen **Neon**. Belegt: initiale **Migration** erzeugt + auf Neon angewendet,
**Integrationstest grün**, **Lint** sauber (0 Fehler), **`pnpm build`** erfolgreich.
Repo: **github.com/lukasmaxsimon/duofarbton**.

**Offen:** Vercel-Projekt + Deploy, Vercel-Blob-Token, Inhaltsmodell (Collections), UI/Design,
echte Inhalte (Fotos/Schriften liefert Lukas). Material liegt unter
`../Material/`, `../Export_Webseite/`, `../Random Export/`.

## Tech-Stack

- **Next.js 16** (App Router) — Framework.
- **Payload 3** als CMS, läuft **innerhalb** der Next.js-App (ein Repo, ein Server);
  Admin unter `/admin`, Konfiguration in `src/payload.config.ts`.
- **Datenbank: PostgreSQL via Neon** (EU, `eu-central-1`/Frankfurt) über
  `@payloadcms/db-postgres`. Schema über **Migrationen** (`pnpm migrate:create`/`migrate`),
  `push` nur lokaler Notnagel (`PAYLOAD_DB_PUSH`). Neon-Connection-String (Pooled,
  `sslmode=require`) für **lokal _und_ Vercel** — kein Port-Wechsel nötig.
- **Medien: Vercel Blob** via `@payloadcms/storage-vercel-blob`, **env-gated**
  (`BLOB_READ_WRITE_TOKEN`): mit Token → Blob, ohne (lokal) → Festplatte (`./media`).
- **Hosting: Vercel** (Region `fra1`). Build-Command `pnpm migrate && pnpm build`.
- **TypeScript**, **pnpm**.
- ⚠️ **Node 22 LTS für das Payload-CLI** (`migrate*`, `generate:*`) — Node 24/25 brechen es
  (tsx-Bug). `pnpm dev` läuft auf jeder Node-Version. Gepinnt via `.nvmrc` + `engines.node`.
- **UI/Design: noch offen** — HeroUI v3 ist als Kandidat aus dem Schwesterprojekt vermerkt,
  aber **nicht installiert** und nicht entschieden.

## Architektur & Inhaltsmodell

Payload + Frontend in **einer** Next.js-App. **Routen:** Frontend in `src/app/(frontend)/`,
Payload-Admin + API in `src/app/(payload)/`.

**Aktuell** (Blank-Template): Collections `Users`, `Media`.

**Geplant** (im Detail noch zu spezifizieren):
- **Programme** — die verschiedenen Konzertprogramme (vgl. „Programmkarten" im Material).
- **Konzerte / Termine** — Datum/Uhrzeit, Ort, Programm-Bezug, ggf. Tickets.
- **Blog** — eigene Beiträge (mit Draft/Publish).
- **Pages** — Start, Das Duo, Programme, Konzerte, Blog, Kontakt, Impressum, Datenschutz.
- **Startseite** (Global) — für wechselnde Startseiten-Inhalte.
- _(später)_ **Instagram-Beiträge**, ggf. **Pressestimmen**.

**Versions-Pinning (wichtig):** Alle `@payloadcms/*` + `payload` exakt auf **3.85.1** —
bei Upgrades **gemeinsam** anheben. Nach Config-/Collection-Änderungen **immer**
`pnpm generate:types` **und** `pnpm generate:importmap` (auf Node 22).

## Commands

- `pnpm dev` — Dev-Server (Next.js + Payload, Port 3000) · `pnpm devsafe` — mit `.next`-Reset
- `pnpm build` / `pnpm start` — Production-Build / -Start
- `pnpm migrate:create <name>` / `pnpm migrate` / `pnpm migrate:status` — Schema-Migrationen
- `pnpm generate:types` / `pnpm generate:importmap` — nach Config-/Collection-Änderungen
- `pnpm lint` — ESLint · `pnpm test:int` — Vitest-Integration · `pnpm test:e2e` — Playwright

## Environment-Variablen

`.env` ist gitignored (lokale Werte); `.env.example` ist eingecheckt (nur Platzhalter).
Secrets **nie** committen, **nie** `NEXT_PUBLIC_*`.

| Variable | Zweck |
| --- | --- |
| `DATABASE_URL` | Neon-Pooled-Connection-String (lokal + Vercel, Prod **und** beim Build) |
| `PAYLOAD_SECRET` | signiert Login/Cookies; in Prod zwingend, stark & einmalig |
| `PAYLOAD_DB_PUSH` | `false`; `true` nur lokaler Schema-Notnagel |
| `PAYLOAD_PUBLIC_SERVER_URL` | **nur Production** = `https://<domain>` → serverURL/cors/csrf |
| `BLOB_READ_WRITE_TOKEN` | aktiviert Vercel-Blob-Storage (Prod/Preview); lokal leer = Festplatte |

## Konventionen

- TypeScript strict; sprechende, **deutsche** Domänenbegriffe.
- **Node 22** für alle Payload-CLI-Aufrufe (siehe Tech-Stack).
- Migrationen sind die **Quelle der Wahrheit** fürs Schema (committen!); kein `push` in Prod.
- Barrierefreiheit von Anfang an mitdenken.
- Keine ungefragte Extra-Infrastruktur einführen (Stack = **Neon + Vercel**, kein Docker/
  lokales Postgres).

## Skills & Doku

- **`payload`** (`.agents/skills/payload`) — Payload-3-Collections/Felder/Hooks/Access/Queries;
  vor CMS-Änderungen nutzen.
- **`cms-migration`** (`.agents/skills/cms-migration`) — bei Inhalts-Import aus anderem CMS.
- `docs/` — **größtenteils aus Sing Ahoi übernommen, in Anpassung.** Wiederverwendbar sind v. a.
  die Node-22-/Payload-/Codegen-Learnings; **Supabase-/Brevo-spezifische** Teile gelten nicht.

## Offene Entscheidungen (Detail-Durchgang)

- Nachnamen Lisa & Sönke · Bedeutung der **„Live-Elemente"**
- UI-Bibliothek/Design (HeroUI v3?) · **Mehrsprachigkeit** (DE/EN für internationale Konzerte?)
- Inhaltsmodell im Detail · Newsletter (Brevo?) · Instagram-Ansatz (API vs. kuratiert)
