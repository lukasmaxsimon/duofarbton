# Setup: Newsletter-Anmeldung über Brevo

Die Anmeldung ist vollständig implementiert (siehe PRD `docs/prd/newsletter-anmeldung-brevo.md`)
und wird **erst aktiv, wenn die vier ENV-Werte gesetzt sind**. Ohne Konfiguration zeigt das
Formular eine freundliche Fehlermeldung und protokolliert server-seitig den fehlenden Wert.

## 1. Im Brevo-Account vorbereiten

1. **Kontaktliste** „Newsletter" anlegen → die **List-ID** notieren (Zahl).
2. **Double-Opt-In-Vorlage** erstellen (Transactional → Templates, Typ „Double opt-in")
   → die **Template-ID** notieren (Zahl). Die Vorlage enthält den Bestätigungs-Button.
3. **API-Key** erzeugen (SMTP & API → API Keys, Rechte zum Anlegen von Kontakten).
4. Sicherstellen, dass die Datenschutzerklärung Brevo als Auftragsverarbeiter benennt (AV-Vertrag).

> **Attribut-Mapping (wichtig):** Dieses Brevo-Konto ist deutsch aufgesetzt und nutzt das
> Standard-Attribut **`VORNAME`** (nicht `FIRSTNAME`). Die Server-Action schreibt den Vornamen
> daher nach `VORNAME` (siehe `actions.ts`). Bei einem englischen Konto wäre es `FIRSTNAME`.
> Die definierten Attribute lassen sich per `GET /v3/contacts/attributes` prüfen.

## 2. ENV-Werte setzen

In `.env` (lokal) bzw. in den Projekt-Variablen beim Hosting (z. B. Vercel) eintragen —
Vorlage steht in `.env.example`:

| Variable                | Bedeutung                                              |
| ----------------------- | ------------------------------------------------------ |
| `BREVO_API_KEY`         | API-Key aus Brevo (geheim, nur server-seitig)          |
| `BREVO_LIST_ID`         | ID der Liste „Newsletter"                               |
| `BREVO_DOI_TEMPLATE_ID` | ID der Double-Opt-In-Vorlage                            |
| `BREVO_REDIRECT_URL`    | Ziel nach Bestätigungsklick → `…/newsletter/bestaetigt` |

> Lokal zeigt `BREVO_REDIRECT_URL` auf `http://localhost:3000/newsletter/bestaetigt`,
> in Produktion auf die deployte Domain. Nach dem Setzen den Dev-Server neu starten.

## 3. Testen

- Integrationstest (Netzwerk gemockt, ruft Brevo nie echt auf):
  `pnpm test:int` → `tests/int/newsletter.int.spec.ts`
- Manuell: Formular im Abschnitt **Kontakt** (`/#contact`) ausfüllen → Bestätigungshinweis
  erscheint → Bestätigungs-Mail von Brevo → Klick landet auf `/newsletter/bestaetigt`.

## Beteiligte Dateien

- Formular (HeroUI v3): `src/app/(frontend)/components/sections/newsletter/NewsletterForm.tsx`
- Server-Action (Brevo-Call): `src/app/(frontend)/components/sections/newsletter/actions.ts`
- Geteilte Texte/Typen: `src/lib/newsletter/constants.ts`
- Sektion im Kontakt-Container: `src/app/(frontend)/components/sections/Newsletter.tsx`
- Dankesseite: `src/app/(frontend)/newsletter/bestaetigt/page.tsx`
- Marken-Tokens für HeroUI: `src/app/(frontend)/styles.css`

## Offen / noch zu erledigen

- **`/datenschutz`-Seite** existiert noch nicht — das Formular verlinkt bereits darauf.
  Die Seite muss vor dem Live-Gang angelegt werden (mit Brevo als Auftragsverarbeiter).
