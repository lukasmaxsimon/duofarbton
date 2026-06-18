# ADR 0001 — PostgreSQL (Supabase) statt SQLite

**Status:** Akzeptiert · **Datum:** 2026-06-18

## Kontext

Lokal lief die App auf **SQLite** (`@payloadcms/db-sqlite`, Datei `singahoi.db`). Das Ziel ist
Hosting auf **Vercel** (serverless). Dort gibt es **kein persistentes, beschreibbares
Dateisystem** und keine dauerhaften Prozesse → eine SQLite-Datei kann nicht als
Produktions-DB dienen. Es braucht eine verwaltete Datenbank, die über das Netz erreichbar ist.

## Entscheidung

- DB-Adapter **`@payloadcms/db-postgres`** (gepinnt auf 3.85.1) statt `@payloadcms/db-sqlite`.
- Datenbank: **Supabase** (gehostetes Postgres), **EU-Region** wegen DSGVO.
- **Verbindung lokal + für Migrationen** über den **Supabase „Session pooler"** (Port 5432,
  IPv4). Der „Direct connection"-String ist seit 2024 IPv6-only und scheitert in vielen lokalen
  Netzen; für die serverless Runtime auf Vercel kommt ggf. der Transaction-Pooler (6543) infrage.
- **Schema-Verwaltung über Migrationen** (`pnpm migrate:create` / `pnpm migrate`), nicht über
  `push`. `push` bleibt nur als lokaler Notnagel via `PAYLOAD_DB_PUSH=true` erhalten.

## Konsequenzen

- Migrations-Verzeichnis `src/migrations/` ist ab jetzt Teil des Repos und die Quelle der
  Wahrheit fürs Schema; im Vercel-Deploy muss `pnpm migrate` laufen.
- **Schema-Migration migriert KEINE Daten** — Supabase startet leer. Die Inhalte (11 Media + 2
  Events) wurden nachträglich per einmaligem Local-API-Skript aus `singahoi.db` übertragen
  (`scripts/migrate-sqlite-data.mts`); die Startseite blieb bewusst außen vor (Wegwerf-Content).
- `@payloadcms/db-sqlite` wurde **entfernt** (war ungenutzt, sorgte für Verwirrung).

## Alternativen

### Neon statt Supabase

Als Postgres gleichwertig; gewählt wurde **Supabase**. Abwägung (auch rückblickend nach dem Umzug):

- **Storage (ausschlaggebend):** Neon ist **reines Postgres, ohne Objekt-Storage**. Für Medien
  (Logo, Fotos, Video) bräuchte man einen **zweiten** Anbieter (Vercel Blob / R2 / S3). Supabase
  liefert **DB + S3-Storage im selben EU-Projekt** → ein Provider, eine DSGVO-Region, ein
  Credential-Satz (siehe ADR 0002).
- **Verbindung — hier hätte Neon Vorteile gehabt:** Neons TLS-Zertifikate sind öffentlich
  vertrauenswürdig (vermutlich **kein** `rejectUnauthorized:false` nötig), und Passwort-Resets
  propagieren i. d. R. sofort. Bei Supabase kostete uns das Pooler-Cert (`SELF_SIGNED_CERT_IN_CHAIN`)
  und die **Supavisor-Propagation** (~15–30 s → falsch-negatives `28P01`) Zeit (siehe learnings §8).
- **Node/tsx-Problem — irrelevant für die Wahl:** Der CLI-Bruch auf Node 24/25 ist DB-unabhängig und
  wäre mit Neon **identisch** aufgetreten (Node 22 ist so oder so Pflicht).

Fazit: Für ein DSGVO-sensibles Projekt **mit Medien** überwiegt „alles in einem EU-Projekt" die
etwas glattere Verbindung bei Neon.

### SQLite behalten

Auf Vercel nicht möglich (siehe Kontext).
