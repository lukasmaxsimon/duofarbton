# Playbook: Staging-Umgebung (Vercel Preview + zweites Supabase-Projekt)

Ziel: Jeder Git-Branch landet automatisch unter einer **Test-URL** mit eigener
**Staging-Datenbank** — getrennt von der Produktion. `main` → Produktion, jeder andere
Branch → Preview/Staging. Ergänzt das Basis-Playbook
[`setup-local-zu-supabase-vercel.md`](./setup-local-zu-supabase-vercel.md).

> Entscheidungen (2026-06-18): **feste, geteilte Staging-DB** (kein Supabase-Pro/Branching
> nötig); **Newsletter auf Staging aus** (Brevo-Vars im Preview leer); **Prod-Daten einmalig
> nach Staging klonen**.
>
> **Free-Tier-Hinweis:** Die Staging-DB muss **nicht** bei Supabase liegen — Payload nutzt einen
> Standard-Postgres-Adapter. Ist Supabase' 2-Free-Projekte-Limit erreicht, ist **Neon** der
> empfohlene Weg (free, sogar mit DB-Branching). Prod bleibt Supabase, nur `DATABASE_URL` im
> Preview-Scope zeigt auf Neon; SSL ist in der Config bereits passend (`rejectUnauthorized:false`
> für alles außer localhost). Storage: Staging kann den Prod-Bucket lesen (S3-Vars = Prod-Werte)
> oder leer lassen (keine Uploads auf Staging).

## Architektur in einem Bild

```
Git-Branch          Vercel-Environment     Env-Scope        Datenbank / Storage
───────────────────────────────────────────────────────────────────────────────
main          →     Production         →   "Production"  →  Supabase PROD
feature/*  ┐                                                 (+ Prod-Bucket)
staging    ┘  →     Preview            →   "Preview"     →  Supabase STAGING
                                                              (+ Staging-Bucket)
```

Der Build-Command in `vercel.json` ist **`pnpm migrate && pnpm build`** und läuft in
*jedem* Environment. Da `DATABASE_URL` pro Scope unterschiedlich gesetzt ist, wandern die
Migrationen automatisch erst in die Staging-DB (Preview) und beim Merge nach `main` in die
Prod-DB. Jede DB hat ihr eigenes `payload_migrations`-Ledger → kein Konflikt.

**Schlüssel-Prinzip:** Die Migrations-Dateien im Git sind die Quelle der Wahrheit, nicht die
DB. Code + Migration gehören immer in denselben Commit.

---

## 1. Staging-Datenbank anlegen — *deine Aufgabe*

**Variante A — zweites Supabase-Projekt** (wenn ein Free-Slot frei ist): wie Projekt 1, gleiche
Region (EU, z. B. `eu-west-1`), siehe Basis-Playbook §1/§2/§5.
**Variante B — Neon (empfohlen bei aufgebrauchten Supabase-Free-Projekten):** Account/DB bei
Neon anlegen, „Pooled connection"-String kopieren (enthält `sslmode=require`). Storage bleibt der
Supabase-Prod-Bucket (S3-Vars = Prod-Werte) oder leer. Schritte 2–6 sind für beide Varianten gleich.

Du brauchst aus dem Staging-Projekt:

- **Connection-Strings** (Project Settings → Database → Connection string):
  - **Transaction pooler, Port 6543** → für die App auf Vercel (Runtime/serverless).
  - **Session pooler, Port 5432** → für Migrationen, `pg_dump`/`psql` (Schritt 4).
- **Storage-Bucket** anlegen + **S3 Access Keys** (Storage → Settings → S3 Connection / S3 Access Keys):
  `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- Data-API zumachen (Basis-Playbook §6).

> ⚠️ Pooler-Ports nicht verwechseln: **App = 6543**, **Dump/Migrate = 5432** (Basis-Playbook §2).

---

## 2. Vercel: Preview-Scope-Env-Vars setzen

Die Production-Vars stehen schon. Jetzt dieselben Namen für **Preview** mit den
**Staging**-Werten belegen. Pro Variable:

```bash
# fragt interaktiv nach dem Wert; Scope "preview" wählen (alle Preview-Branches)
vercel env add DATABASE_URL preview          # ← Staging-Transaction-Pooler (Port 6543!)
vercel env add PAYLOAD_SECRET preview         # ← NEU generieren: openssl rand -base64 32
vercel env add PAYLOAD_DB_PUSH preview        # ← false
vercel env add S3_ENDPOINT preview            # ← Staging-Bucket
vercel env add S3_REGION preview
vercel env add S3_BUCKET preview
vercel env add S3_ACCESS_KEY_ID preview
vercel env add S3_SECRET_ACCESS_KEY preview
vercel env add INSTAGRAM_ACCESS_TOKEN preview # ← Prod-Werte wiederverwenden (read-only Feed)
vercel env add INSTAGRAM_HANDLE preview
vercel env add INSTAGRAM_USER_ID preview
```

Secrets **nie blind ins Dashboard tippen** (wird maskiert dargestellt → Tippfehler unbemerkt).
Per Pipe gegen Tippfehler:

```bash
printf '%s' 'WERT' | vercel env add DATABASE_URL preview
```

**Bewusst NICHT im Preview-Scope:**

| Variable | Warum nicht |
| --- | --- |
| `PAYLOAD_PUBLIC_SERVER_URL` | Nur Prod. Im Preview gesetzt → **CSRF bricht** (eigene `*.vercel.app`-URL je Deploy). Ohne sie nutzt Payload die Request-URL → Preview funktioniert. (learnings §8.9) |
| `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_DOI_TEMPLATE_ID`, `BREVO_REDIRECT_URL` | Newsletter auf Staging **aus** → keine echten Anmeldungen/Mails beim Testen. (Das Formular ist auf Staging dann ohne Funktion — bewusst.) |

Prüfen: `vercel env ls` zeigt pro Variable die Scopes (Production / Preview / Development).

---

## 3. Prod-Daten nach Staging klonen (einmalig) — *deine Aufgabe (oder mit mir)*

Nur das `public`-Schema klonen (Schema + Daten + Migrations-Ledger) — Supabase-interne
Schemata (`auth`, `storage`, …) auslassen, sonst Konflikte. Über den **Session-Pooler (5432)**:

```bash
# 1) Prod dumpen (nur public, ohne Owner/Rechte)
pg_dump "postgresql://postgres.PROD_REF:PW@aws-0-REGION.pooler.supabase.com:5432/postgres" \
  --schema=public --no-owner --no-privileges --clean --if-exists -f prod_public.sql

# 2) in die (leere) Staging-DB einspielen
psql "postgresql://postgres.STAGING_REF:PW@aws-0-REGION.pooler.supabase.com:5432/postgres" \
  -f prod_public.sql
```

Damit ist Staging ein exakter Klon inkl. Migrations-Ledger; spätere `pnpm migrate`-Läufe
(im Preview-Build) wenden nur *neue* Migrationen an.

**Medien kopieren** (sonst zeigen die geklonten DB-Zeilen auf einen leeren Staging-Bucket → Bild-404):

```bash
# Prod-Bucket herunterladen …
AWS_ACCESS_KEY_ID=<prod> AWS_SECRET_ACCESS_KEY=<prod> \
  aws s3 sync s3://<prod-bucket> ./media-dump \
  --endpoint-url https://PROD_REF.supabase.co/storage/v1/s3 --region <region>
# … und in den Staging-Bucket hochladen
AWS_ACCESS_KEY_ID=<staging> AWS_SECRET_ACCESS_KEY=<staging> \
  aws s3 sync ./media-dump s3://<staging-bucket> \
  --endpoint-url https://STAGING_REF.supabase.co/storage/v1/s3 --region <region>
```

(Alternativ die lokale `./media/`-Phase direkt hochladen, wie in learnings §8.10 / Basis-Playbook §5.)

---

## 4. Branch-Strategie & Test-URL

Vercel erzeugt für **jeden gepushten Branch** automatisch ein Preview-Deploy mit stabiler URL
`singahoi-git-<branch>-<team>.vercel.app`. Konvention:

- `main` → Produktion (`www.singahoi.de`).
- `staging` (langlebiger Integrationsbranch) → stabile Test-URL `singahoi-git-staging-…vercel.app`.
- `feature/*` → eigene Preview-URL je Branch (für isolierte Reviews).

```bash
git checkout main && git pull
git checkout -b staging        # einmalig anlegen
git push -u origin staging     # → Vercel baut Preview gegen Staging-DB
```

---

## 5. Verifizieren

1. Preview-URL aus dem Vercel-Dashboard (oder `vercel ls`) öffnen.
2. Build-Log prüfen: `pnpm migrate` muss gegen die **Staging**-DB gelaufen sein.
3. `/admin` öffnen, mit einem **Staging**-User einloggen (aus dem Klon vorhanden, oder neu anlegen).
4. Inhalte/Rollen testen — Änderungen wirken nur auf Staging, Produktion bleibt unberührt.

---

## 6. Laufender Flow

```
git checkout -b feature/xyz      # von main
# … Code + ggf. Migration (pnpm migrate:create) im selben Commit …
git push                          # → Preview-Deploy (Staging-DB) → URL prüfen
# Pull Request → Review auf der Preview-URL
# Merge nach main                 # → Production-Deploy (Prod-DB) → live
```

---

## Gotchas-Kurzliste

- **`PAYLOAD_PUBLIC_SERVER_URL` nur Production** — im Preview gesetzt bricht CSRF.
- **Pooler-Ports:** App/Runtime = **6543** (Transaction), Migrate/Dump = **5432** (Session).
- **Secrets per CLI, nicht blind tippen** — `printf '%s' '…' | vercel env add … preview`.
- **Staging-Bucket startet leer** — Medien separat kopieren, sonst Bild-404.
- **Newsletter auf Staging aus** (Brevo-Vars leer) — Formular dort ohne Funktion.
- **Migrationen pro DB getrennt** — erst auf Staging testen, dann nach `main` mergen.
- **Klon nur `--schema=public`** — sonst Konflikte mit Supabase-internen Schemata.
