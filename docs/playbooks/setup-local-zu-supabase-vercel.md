# Playbook: Payload 3 + Next.js — von lokal zu Supabase + Vercel

**Wiederverwendbare Schritt-für-Schritt-Anleitung**, um eine Payload-3-App (läuft *in* Next.js)
von lokaler Entwicklung (oft SQLite + Festplatten-Uploads) produktionsreif auf **Vercel** mit
**Supabase** (Postgres **und** S3-Storage, EU) zu bringen. Destilliert aus dem Sing-Ahoi-Umzug
(2026-06-18) — die hart erarbeiteten Stolperfallen stehen jeweils direkt dabei.

> Annahmen: Payload 3.x (alle `@payloadcms/*` + `payload` exakt **dieselbe** Version, nur gemeinsam
> anheben), Next.js App Router, pnpm. Domain bleibt beim Alt-Hoster, nur DNS zeigt auf Vercel.

---

## 0. Node-Version: **22 LTS** — nicht 24/25 ⚠️

Das Payload-**CLI** (`migrate`, `migrate:create`, `generate:types`) bricht auf **Node 24 _und_ 25**
mit `ENOENT … open 'node:crypto?tsx-namespace=…'` (ein `tsx`-Bug, **kein** DB-Problem; betrifft auch
die neueste `tsx`-Version, also kein Upgrade-Fix). `pnpm dev` läuft auf jeder Node-Version — nur das
Standalone-CLI braucht 22.

```bash
brew install node@22
brew unlink node 2>/dev/null; brew link --overwrite --force node@22   # 22 zum Default machen
node --version   # v22.x
```
- `.nvmrc` → `22`
- `package.json` → `"engines": { "node": ">=22.12.0 <23" }` (obere Schranke wichtig — sonst zieht
  ein Versionsmanager wieder 24/25). Vercel liest `engines.node` → deployt auf Node 22.

> ⚠️ `brew install node@XX` kann eine global verlinkte andere Node-Version über eine gebumpte
> Shared-Lib (`simdjson`) lahmlegen (`Library not loaded: …libsimdjson.NN.dylib`). Kein Problem,
> solange man die gewünschte Version explizit linkt/aufruft.

---

## 1. Supabase-Projekt anlegen

> **Supabase vs. Neon?** Neon = reines Postgres (Verbindung oft glatter: gültiges TLS-Cert, sofortige
> Passwort-Propagation), **aber ohne Objekt-Storage** → Medien bräuchten einen zweiten Provider.
> Supabase liefert **DB + S3-Storage in einem EU-Projekt** → für Apps **mit Medien** die stimmigere
> Wahl. Das Node-22-Problem (Schritt 0) ist DB-unabhängig und tritt bei beiden auf.

1. Supabase → **New project**, **EU-Region** (z. B. `eu-west-1` / Frankfurt) wegen DSGVO.
2. **DB-Passwort rein alphanumerisch** wählen/zurücksetzen (A–Z a–z 0–9, keine Sonderzeichen) →
   umgeht jedes URL-Kodier-Problem in der Connection-URL. ⚠️ Browser-Autocomplete kann das
   Passwortfeld verfälschen — bewusst einfügen, **Reset bestätigen** (Generate-Button füllt nur das Feld).

---

## 2. `DATABASE_URL` — Pooler nehmen (⚠️ lokal 5432, Vercel 6543!)

Supabase → **Connect** → Tab **Direct**. Es gibt zwei Pooler-Ports am selben Host
`aws-0-<REGION>.pooler.supabase.com` — **die Wahl entscheidet später über Erfolg/Fehlschlag**:

| Wo | Port | Modus | Warum |
| --- | --- | --- | --- |
| **Lokal** (`.env`) | **5432** | Session-Pooler | Einzel-Client, IPv4. Reicht für Dev. |
| **Vercel** (Prod/Preview) | **6543** | Transaction-Pooler | Serverless öffnet viele Verbindungen → Session-Modus ist auf **15 Clients** gedeckelt → Build/Runtime bricht mit `(EMAXCONNSESSION) max clients reached in session mode`. Transaction-Pooler multiplext → kein Limit-Problem. |

```
# lokal (.env):
postgresql://postgres.<PROJECTREF>:<PASSWORT>@aws-0-<REGION>.pooler.supabase.com:5432/postgres
# Vercel (nur Port tauschen):
postgresql://postgres.<PROJECTREF>:<PASSWORT>@aws-0-<REGION>.pooler.supabase.com:6543/postgres
```
- **Nicht** „Direct connection" (IPv6-only → von vielen Rechnern `EHOSTUNREACH`), **nicht** „Framework".
- Passwort 1:1 einsetzen (alphanumerisch → keine Kodierung nötig), in `.env` als `DATABASE_URL`.
- ⚠️ **Host-Tippfehler-Falle:** `aws-0-eu-west-1` (Bindestrich **vor** der `1`!). `eu-west1` → `ENOTFOUND`.
  Merke: **`ENOTFOUND` = Host falsch · `28P01` = Passwort falsch · `EMAXCONNSESSION` = falscher Pooler-Port.**

**Stolperfalle `28P01` (`password authentication failed`):** Nach einem Passwort-Reset braucht der
Pooler (Supavisor) **~15–30 s Propagation** — ein Test direkt danach ist falsch-negativ. Kurz pollen,
nicht am Passwort zweifeln. Schnelltest ohne CLI (pg liegt transitiv im pnpm-Store):
```bash
set -a; . ./.env; set +a
NODE_PATH="$(pwd)/node_modules/.pnpm/pg@*/node_modules" node -e '
const {Client}=require("pg");
new Client({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}})
  .connect().then(()=>console.log("OK")).catch(e=>console.log(e.code,e.message))'
```

---

## 3. Payload-Adapter auf Postgres

In `src/payload.config.ts`:
```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
// ...
db: postgresAdapter({
  pool: {
    connectionString: process.env.DATABASE_URL || '',
    // Supabase verlangt TLS, liefert aber ein Pooler-Cert, das nicht gegen System-CAs
    // prüfbar ist (SELF_SIGNED_CERT_IN_CHAIN). Verschlüsselt bleibt es; nur die Chain-Prüfung aus.
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')
      ? false
      : { rejectUnauthorized: false },
  },
  push: process.env.PAYLOAD_DB_PUSH === 'true', // Default false!
  migrationDir: path.resolve(dirname, 'migrations'),
}),
```
- `@payloadcms/db-sqlite` entfernen, wenn nicht mehr genutzt (sonst Verwirrung).
- **`PAYLOAD_DB_PUSH=false`** in `.env` und in Prod. `push:true` löscht bei Schema-Diff Tabellen
  (inkl. Daten!) — nur als lokaler Notnagel.

`package.json`-Scripts (falls nicht vorhanden):
```json
"migrate": "payload migrate",
"migrate:create": "payload migrate:create",
"migrate:status": "payload migrate:status"
```

---

## 4. Migrationen erzeugen + anwenden (auf Node 22, mit geladener `.env`)

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
set -a; . ./.env; set +a
./node_modules/.bin/payload migrate:create initial   # erzeugt src/migrations/*.ts + .json
./node_modules/.bin/payload migrate                  # wendet auf Supabase an
```
Migration **committen** — Vercel fährt sie im Build (`pnpm migrate && pnpm build`).

> Migrationen sind die Quelle der Wahrheit (Vercel = read-only FS, mehrere Instanzen). Nach
> Config-/Collection-Änderungen `pnpm generate:types` + `pnpm generate:importmap` (ebenfalls Node 22).

---

## 5. Medien-Storage: Supabase Storage (S3)

Supabase Storage ist S3-kompatibel → Medien liegen im **selben EU-Projekt** wie die DB (beste
DSGVO-Story, ein Provider). Adapter: `@payloadcms/storage-s3`.

```ts
import { s3Storage } from '@payloadcms/storage-s3'
// ...plugins:[
s3Storage({
  enabled: Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID), // lokal ohne Keys → Festplatte
  collections: { media: { prefix: 'media' } },
  bucket: process.env.S3_BUCKET || '',
  config: {
    forcePathStyle: true,            // PFLICHT bei Supabase
    region: process.env.S3_REGION || '',
    endpoint: process.env.S3_ENDPOINT || '',   // https://<PROJECTREF>.supabase.co/storage/v1/s3
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  },
}),
```
`next.config.ts` → `images.remotePatterns` für öffentlichen Bucket:
```ts
{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }
```
Supabase → **Storage**: Bucket anlegen (öffentlich = schnellere Auslieferung für reine Website-Bilder;
privat = läuft über Payload). Werte aus **Storage → Settings**: S3 Connection (Endpoint/Region) +
S3 Access Keys (Key/Secret).

> ⚠️ **Der Bucket startet LEER — bestehende Dev-Medien werden NICHT automatisch hochgeladen.** Wenn die
> Media-DB-Einträge schon existieren (aus lokaler Disk-Phase), zeigt das Frontend `/api/media/file/<name>?prefix=media`
> → **404**, weil die Dateien nur lokal in `./media/` liegen. Gegencheck: `…/<bucket>?list-type=2` → `KeyCount=0`.
> **Fix — alle lokalen Dateien per S3-API in den Bucket unter prefix `media/` laden:**
> ```bash
> set -a; . ./.env; set +a; HOST=${S3_ENDPOINT#https://}
> for f in ./media/*; do [ -f "$f" ] || continue; ct=$(file --mime-type -b "$f")
>   [ "${f##*.}" = "svg" ] && ct="image/svg+xml"   # file(1) rät SVG oft als text/plain
>   curl -s -o /dev/null -w "%{http_code} $(basename "$f")\n" -T "$f" \
>     --aws-sigv4 "aws:amz:$S3_REGION:s3" --user "$S3_ACCESS_KEY_ID:$S3_SECRET_ACCESS_KEY" \
>     -H "Content-Type: $ct" "https://$HOST/$S3_BUCKET/media/$(basename "$f")"; done
> ```
> Payload serviert privat über `/api/media/file/<name>?prefix=media` (Access-Control-Mode). Neue Uploads
> übers Live-`/admin` landen ab dann direkt im Bucket — das Sync-Problem betrifft nur die Altbestände.
> Sauberer für Inhalts-Umzüge: das Local-API-Skript aus §7 (lädt Dateien über Payload hoch → Bucket-Keys stimmen automatisch).

---

## 6. Sicherheit: Supabase Data-API zumachen

Frische Tabellen erscheinen im Table-Editor als **„UNRESTRICTED"** (keine RLS) → über Supabases
**Data-API (PostgREST, anon-Key)** an Payload vorbei les-/schreibbar. Payload selbst nutzt die direkte
Postgres-Verbindung und ist davon unabhängig.

→ **Fix:** Supabase → **Project Settings → Data API** deaktivieren bzw. `public` aus „Exposed schemas"
nehmen (wir nutzen die Data-API nicht). Alternativ RLS auf allen Tabellen aktivieren.

---

## 7. (Bei Umzug) Inhalte aus lokaler SQLite migrieren

Eine Schema-Migration kopiert **keine Daten** — Supabase startet leer. Die alte `*.db` und der
Upload-Ordner (`./media`, Payload-Default = Slug-Name) bleiben aber liegen → wiederherstellbar.

Bewährtes Muster: einmaliges Skript über die **Payload Local API** (`getPayload({ config })`).
SQLite-Rohdaten via `sqlite3 -json <db> "select …"` exportieren, dann:
- **Media** mit `payload.create({ collection:'media', data:{alt}, filePath })` neu hochladen (Dateien
  vorher in ein Temp-Verzeichnis kopieren, Upload-Ordner leeren → saubere Originalnamen). Dabei
  **alte→neue ID merken**.
- **Relationale Inhalte** (Events, Globals) anlegen und Media-Referenzen über die ID-Map remappen.

Mit `tsx` auf Node 22 ausführen. Beispiel: `scripts/migrate-sqlite-data.mts` (Sing-Ahoi-Repo).

---

## 8. Vercel

1. Projekt mit dem Repo verbinden (Next wird autoerkannt).
2. **Build-Command:** `pnpm migrate && pnpm build`.
3. **Environment-Variablen** (Production **+** Preview; `DATABASE_URL` muss auch **beim Build** da sein,
   weil vorgerenderte Seiten `getPayload()` aufrufen):

| Variable | Scope | Zweck |
| --- | --- | --- |
| `DATABASE_URL` | Prod **+** Preview | **Transaction-Pooler, Port 6543** (nicht 5432! siehe §2) |
| `PAYLOAD_SECRET` | Prod **+** Preview | stark & einmalig (signiert Login/Cookies) — **nicht** der Dev-Wert |
| `PAYLOAD_PUBLIC_SERVER_URL` | **nur Production** | `https://<domain>` → aktiviert `serverURL`/`cors`/`csrf`. ⚠️ **NICHT für Preview** — sonst schlägt CSRF auf den dynamischen `*.vercel.app`-Preview-URLs fehl. |
| `BREVO_REDIRECT_URL` u. Ä. | Prod (+ Preview) | Live-URL, **nicht** der lokale `http://localhost:3000/...`-Wert (siehe §9) |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | Prod **+** Preview | Supabase Storage |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Prod **+** Preview | Supabase S3-Key (aktiviert Storage) |
| (`PAYLOAD_DB_PUSH`) | — | nicht setzen / `false` |

> ### ⚠️⚠️ Env-Vars per CLI setzen — NICHT im Dashboard tippen (das hat 2026-06-18 ~1 h gekostet)
> Secrets wie `DATABASE_URL` sind im Vercel-Dashboard **maskiert** → man sieht den Ist-Wert nicht →
> jeder manuelle Edit baut einen neuen Tippfehler ein (erst falsches PW `28P01`, dann Host-Tippfehler
> `ENOTFOUND`, dann wieder PW). **Jeder Versuch = ein Redeploy ≈ teuer.** Stattdessen den **geprüften**
> Wert aus der lokalen `.env` **programmatisch** setzen:
> ```bash
> npx vercel link --project <projekt> --scope <team>           # einmalig
> VAL=$(grep '^DATABASE_URL=' .env | sed 's/^DATABASE_URL=//; s/:5432\//:6543\//')  # lokal→Vercel-Port
> for env in production preview; do
>   npx vercel env rm DATABASE_URL $env --yes --scope <team> 2>/dev/null
>   printf '%s' "$VAL" | npx vercel env add DATABASE_URL $env --scope <team>        # printf = kein \n!
> done
> npx vercel redeploy <letztes-deployment-url> --scope <team>  # Env greift erst bei NEUEM Build
> ```
> - `vercel env pull` gibt **alle Secrets als `""`** zurück (Werte nicht auslesbar) — der Wert ist *nicht* leer.
> - **Diagnose-Prinzip:** Wandert der Fehler (`28P01`→`ENOTFOUND`→`28P01`), sind die Credentials gültig →
>   es ist ein Wert-/Tippfehler. Lokal beide Pooler-Ports mit `pg` testen (Snippet §2) → beweist, dass es an Vercel liegt.
> - Nach **≤2** fehlgeschlagenen Blind-Versuchen sofort auf den CLI-Weg wechseln, nicht weiter raten.

4. **Function-Region EU**: `vercel.json` → `{ "regions": ["fra1"] }`.

**Config-Härtung** (in `payload.config.ts`): `PAYLOAD_SECRET` in Prod bei leerem Wert hart abbrechen;
`serverURL`/`cors`/`csrf` nur setzen, wenn `PAYLOAD_PUBLIC_SERVER_URL` da ist (Dev bleibt unberührt).

---

## 9. Domain

Beim Alt-Hoster bleibt **E-Mail** (MX **nicht** anfassen). Nur Web-DNS auf Vercel:
- A `<domain>` → Vercel-IP, CNAME `www` → `cname.vercel-dns.com` (Werte zeigt Vercel beim Hinzufügen).
- Vercel macht typischerweise **Apex → `www` per 308** (oder umgekehrt). Die **primäre** Domain bestimmen
  und ab da überall die kanonische verwenden (z. B. `https://www.<domain>`).
- Danach `PAYLOAD_PUBLIC_SERVER_URL` **und** `BREVO_REDIRECT_URL` (Bestätigungslink Newsletter-DOI; sonst
  zeigt die Mail auf `localhost`) auf die **kanonische** Live-Domain setzen — per CLI (§8) + Redeploy.

> ### ⚠️ „Die alte Seite / kaputte Bilder werden noch angezeigt" = lokaler DNS-Cache, NICHT der Deploy
> Nach der DNS-Umstellung zeigt der eigene Browser oft noch den **Alt-Hoster** (macOS `mDNSResponder`
> cacht die alte IP; `dig` fragt frisch und zeigt schon Vercel, aber `curl`/Browser nutzen den Cache).
> Symptom 2026-06-18: `singahoi.de` lieferte noch WordPress (`/wp-content/`), verbunden mit `85.13.168.24`
> = `*.kasserver.com` (ALL-INKL). **Verifizieren, ob der Deploy wirklich okay ist — Cache umgehen:**
> ```bash
> dig +short @8.8.8.8 <domain> A                                   # echter DNS-Stand
> VIP=$(dig +short @8.8.8.8 <domain> A | head -1)
> curl -s --resolve <domain>:443:$VIP -o /dev/null -w "%{http_code}\n" "https://<domain>/"   # erzwingt Vercel-IP
> curl -s -o /dev/null -w "%{remote_ip}\n" "https://<domain>/"      # zu welcher IP geht der OS-Cache wirklich?
> ```
> Fix beim User (Mac): `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` + Hard-Reload/
> Inkognito. **Schnellster cache-freier Test: Handy mit Mobilfunk** (WLAN aus).
> Hinweis: `*.vercel.app` wird nach Custom-Domain-Setup oft `401` (Deployment-Schutz) — normal.

---

## Gotchas-Kurzliste

- **Node 22**, nicht 24/25 (Payload-CLI).
- Pooler: **lokal 5432 (Session), Vercel 6543 (Transaction)** — sonst `EMAXCONNSESSION` (max 15 Clients).
- Host exakt `aws-0-eu-west-1` (Bindestrich vor der `1`). **Fehler-Decoder:** `ENOTFOUND`=Host · `28P01`=Passwort · `EMAXCONNSESSION`=Pooler-Port.
- Passwort **alphanumerisch**, nach Reset **~15–30 s** warten (Supavisor-Propagation).
- **Vercel-Env-Secrets per CLI setzen, nicht im Dashboard tippen** (maskiert → Tippfehler-Schleife). `vercel env pull` liefert Secrets als `""`. → §8.
- `PAYLOAD_PUBLIC_SERVER_URL` **nur Production** (Preview-CSRF bricht sonst).
- `BREVO_REDIRECT_URL` & andere URL-Vars auf **Live-Domain**, nicht `localhost`.
- **Bucket startet leer** → bestehende `./media/`-Dateien aktiv hochladen, sonst Bild-404. → §5.
- „Alte Seite/Bilder fehlen" nach DNS-Umzug = **lokaler DNS-Cache**, nicht der Deploy → `curl --resolve` gegen Vercel-IP prüfen, Cache flushen. → §9.
- Adapter-Pool **`ssl: { rejectUnauthorized: false }`** (Pooler-Cert).
- `PAYLOAD_DB_PUSH=false` — push löscht Tabellen.
- **Data-API** in Supabase deaktivieren (UNRESTRICTED/RLS).
- Schema-Migration migriert **keine Daten** — separat per Local-API-Skript.
- Storage **env-gated** lassen → lokal ohne Cloud-Credentials lauffähig (Festplatte).
- URLs in zsh **quoten** (`?` ist sonst ein Glob).
