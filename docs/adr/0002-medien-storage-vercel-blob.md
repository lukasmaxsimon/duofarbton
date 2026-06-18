# ADR 0002 — Medien-Storage: Supabase Storage (S3)

**Status:** Akzeptiert · **Datum:** 2026-06-18 (ersetzt die vorläufige Wahl „Vercel Blob")

## Kontext

Die `Media`-Collection speichert Uploads aktuell auf der **lokalen Festplatte** (`/media`).
Auf Vercel ist das Dateisystem flüchtig → hochgeladene Bilder wären nach jedem Deploy/Neustart
weg. Es braucht einen **Cloud-Storage-Adapter**.

Die Postgres-DB liegt bereits in einem **EU-Supabase-Projekt** (ADR 0001). Für ein gemeinnütziges,
DSGVO-sensibles Projekt ist **Datenresidenz in der EU** ein echtes Argument.

## Entscheidung

Medien gehen in **Supabase Storage** (S3-kompatibel), angebunden über **`@payloadcms/storage-s3`**
(gepinnt 3.85.1), **env-gated**:

- Aktiv nur, wenn `S3_BUCKET` **und** `S3_ACCESS_KEY_ID` gesetzt sind (Prod via Vercel-Env-Var).
  Ohne diese (lokal) bleiben Uploads auf der Festplatte → kein Bucket/Keys nötig.
- **`forcePathStyle: true`** ist bei Supabase **Pflicht** (sonst Endpoint-Fehler).
- Endpoint/Region/Bucket/Keys aus Supabase → Storage → Settings (S3 Connection + S3 Access Keys).
- `prefix: 'media'` ordnet die Dateien im Bucket in einen Unterordner.
- `next.config.ts`: `images.remotePatterns` erlaubt `*.supabase.co` unter
  `/storage/v1/object/public/**` (für einen öffentlichen Bucket); ein privater Bucket läuft über
  Payload (`/api/media/file/**` → `localPatterns`).

Begründung: **alles in einem EU-Projekt** wie die DB → saubere DSGVO-Datenresidenz, ein Provider
und ein Satz Credentials weniger. Free-Tier deckt den Bedarf (1 GB) locker.

## Alternativen

- **Vercel Blob** (`@payloadcms/storage-vercel-blob`) — geringste Reibung, native Vercel-Integration
  (Token per Klick). Verworfen, weil die **EU-Datenresidenz** nicht ohne Weiteres garantiert war —
  genau der offene Punkt, den Supabase Storage löst. (War der vorherige, vorläufige Stand dieses ADRs.)
- **S3 / Cloudflare R2** — flexibel, aber zusätzliche Accounts/Credentials, kein Synergieeffekt mit
  dem bestehenden Supabase-Projekt.

## Konsequenzen

- Der Storage-Adapter ist mit ~15 Zeilen austauschbar (env-gated, isoliert in `payload.config.ts`),
  falls sich die Wahl später ändert.
- **Bucket-Sichtbarkeit:** Für ausschließlich öffentliche Website-Bilder kann ein **öffentlicher**
  Bucket gewählt werden (schnellere Auslieferung direkt von Supabase, ohne Umweg über den
  Payload-Server). Sensiblere Medien gehören in einen privaten Bucket. Vor Go-Live festlegen.
- **Setup-Schritte** (Prod): Bucket anlegen, S3-Access-Key erzeugen, die fünf `S3_*`-Env-Vars in
  Vercel setzen (siehe `.env.example`).
