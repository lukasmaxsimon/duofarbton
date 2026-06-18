---
title: Newsletter-Anmeldung über Brevo (Double-Opt-In)
date: 2026-06-17
status: ready-for-agent
---

## Problem Statement

Sing Ahoi findet an **wechselnden Orten** statt — der Hauptzweck der Website ist es,
kommende Termine anzukündigen. Interessierte Familien haben aktuell keine Möglichkeit,
sich aktiv informieren zu lassen; sie müssten die Seite immer wieder selbst aufrufen.
Es fehlt ein niedrigschwelliger Weg, per E-Mail über neue Termine auf dem Laufenden zu
bleiben. Gleichzeitig müssen die Betreiberinnen (Linda Smailus, Magdalena Huhn) den
Newsletter **rechtssicher (DSGVO)** und ohne manuelle Pflege von Adresslisten versenden
können.

## Solution

Ein **Newsletter-Anmeldeformular** auf der Website, das Interessierte mit E-Mail und
optionalem Vornamen eintragen. Die Anmeldung läuft über ein **Double-Opt-In**: Nach dem
Absenden erhält die Person eine Bestätigungs-E-Mail und ist erst nach Klick darauf in der
Verteilerliste. Die Verwaltung der Kontakte und der Versand der Newsletter passieren in
**Brevo** (EU-basierter E-Mail-Dienst); die Website spricht nur die Brevo-API an, um neue
Double-Opt-In-Kontakte anzulegen. Für die Betreiberinnen entsteht so automatisch eine
saubere, bestätigte Verteilerliste, ohne dass sie Adressen von Hand pflegen.

## User Stories

1. Als Besucher:in möchte ich meine E-Mail-Adresse in ein Formular eintragen, damit ich über kommende Sing-Ahoi-Termine informiert werde.
2. Als Besucher:in möchte ich optional meinen Vornamen angeben, damit der Newsletter mich persönlich anspricht.
3. Als Besucher:in möchte ich der Datenverarbeitung über eine Checkbox aktiv zustimmen und die Datenschutzerklärung verlinkt sehen, damit ich weiß, was mit meinen Daten geschieht.
4. Als Besucher:in möchte ich das Formular nicht absenden können, ohne der Datenverarbeitung zugestimmt zu haben.
5. Als Besucher:in möchte ich nach dem Absenden eine klare Rückmeldung erhalten, dass ich meine Anmeldung noch per E-Mail bestätigen muss.
6. Als Besucher:in möchte ich eine Bestätigungs-E-Mail bekommen und meine Anmeldung per Klick abschließen.
7. Als Besucher:in möchte ich nach dem Bestätigungsklick auf einer freundlichen Dankesseite landen.
8. Als Besucher:in mit Screenreader oder Tastatur möchte ich das Formular vollständig barrierefrei bedienen können (verknüpfte Labels, fokussierbare Felder, vorgelesene Status- und Fehlermeldungen).
9. Als Besucher:in möchte ich bei einer ungültigen E-Mail-Adresse eine verständliche Fehlermeldung direkt am Feld sehen.
10. Als Besucher:in, die bereits angemeldet ist, möchte ich eine freundliche Meldung statt eines technischen Fehlers erhalten, wenn ich mich erneut eintrage.
11. Als Besucher:in mit langsamer Verbindung möchte ich einen Ladezustand am Absenden-Button sehen, damit ich nicht doppelt abschicke.
12. Als Besucher:in möchte ich das Anmeldeformular zuverlässig im Footer (und ggf. als Sektion auf der Startseite) finden.
13. Als Betreiberin möchte ich, dass bestätigte Abonnent:innen automatisch in der Brevo-Liste „Newsletter" landen, ohne dass ich manuell Adressen eintrage.
14. Als Betreiberin möchte ich, dass ausschließlich per Double-Opt-In bestätigte Kontakte in der Liste sind, damit der Versand rechtssicher ist.
15. Als Betreiberin möchte ich den erfassten Vornamen für die persönliche Anrede in den Newslettern nutzen können.
16. Als Betreiberin möchte ich, dass der Brevo-API-Key niemals im Browser/Client sichtbar ist.
17. Als Betreiberin möchte ich Schutz vor automatisierten Spam-/Bot-Anmeldungen.
18. Als Betreiberin möchte ich, dass eine fehlgeschlagene Brevo-Anbindung (z. B. Netzwerk- oder Konfigurationsfehler) den Nutzer:innen nicht als kryptischer technischer Fehler angezeigt wird, sondern als freundliche Meldung — und für mich nachvollziehbar protokolliert wird.
19. Als Besucher:in möchte ich die Anmeldung in deutscher Sprache und im warmen, familienfreundlichen Ton von Sing Ahoi erleben.

## Implementation Decisions

- **UI:** Ein **HeroUI-v3-Client-Component** als Anmeldeformular: E-Mail-Feld (Pflicht),
  Vorname-Feld (optional), Einwilligungs-Checkbox mit Link zur Datenschutzerklärung,
  Absenden-Button mit Ladezustand. HeroUI-Konventionen einhalten (`onPress`,
  `isPending`, semantische Varianten, Status-/Fehlermeldungen in einer `aria-live`-Region).
- **Übermittlung:** Eine **Next.js Server Action** (`'use server'`) nimmt die
  Formulardaten entgegen und ruft Brevo server-seitig auf. Der **API-Key bleibt
  ausschließlich server-seitig** (ENV) und gelangt nie ins Client-Bundle. Form-State über
  `useActionState`; Rückgabe als diskriminiertes Ergebnis (`idle` | `success` | `error`
  mit Nachricht).
- **Brevo-Anbindung (Double-Opt-In):** Aufruf des DOI-Endpoints
  `POST https://api.brevo.com/v3/contacts/doubleOptinConfirmation` mit Header `api-key`.
  Payload-Form:
  ```
  {
    email,
    attributes: { FIRSTNAME: <vorname> },
    includeListIds: [<BREVO_LIST_ID>],
    templateId: <BREVO_DOI_TEMPLATE_ID>,
    redirectionUrl: <BREVO_REDIRECT_URL>
  }
  ```
  Der Vorname mappt auf das Brevo-Standardattribut **`FIRSTNAME`**. Brevo verschickt die
  Bestätigungs-Mail; der Kontakt landet erst nach Klick in der Liste.
- **Konfiguration über ENV:** `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_DOI_TEMPLATE_ID`,
  `BREVO_REDIRECT_URL`. Diese Werte stammen aus dem Brevo-Account der Betreiberinnen
  (API-Key, Liste „Newsletter", DOI-Vorlage, Ziel-URL der Dankesseite).
- **Eingabevalidierung server-seitig:** E-Mail-Format prüfen; Einwilligung muss gesetzt
  sein; Vorname optional, getrimmt, Längenbegrenzung. Validierung passiert (auch) in der
  Server Action, nicht nur im Client.
- **Bot-Schutz:** verstecktes **Honeypot-Feld**. Ist es ausgefüllt, gibt die Action
  „Erfolg" zurück, **ohne** Brevo aufzurufen (Bots erhalten kein verwertbares Signal).
  Kein Captcha in v1.
- **Bestätigungs-/Dankesseite:** statische Route `/newsletter/bestaetigt` als Ziel des
  Brevo-DOI-Redirects.
- **Kein eigener Payload-Content-Typ:** Abonnent:innen werden **nicht** in Payload
  gespeichert — **Brevo ist die alleinige Quelle der Wahrheit** für die Verteilerliste.
- **Fehler-Mapping:** ungültige E-Mail → Feldfehler; bereits angemeldet (Brevo-Antwort)
  → freundliche „schon angemeldet / bitte E-Mail prüfen"-Meldung; Netzwerk-/Config-Fehler
  → generische freundliche Meldung + server-seitiges Logging.
- **Platzierung:** im `SiteFooter`; optional zusätzlich als eigene Sektion auf der
  Startseite (offene Entscheidung, siehe „Further Notes").
- **Sprache:** ausschließlich Deutsch, kein i18n.

## Testing Decisions

- **Höchste Naht (Seam): die Server Action `subscribeToNewsletter`.** Sie ist die
  natürliche Grenze zwischen Formular und Brevo und wird als Integrationstest geprüft.
  Getestet wird **beobachtbares Verhalten**, nicht die interne Umsetzung:
  - gültige Eingabe → es wird **ein** Request an den Brevo-DOI-Endpoint mit korrekter
    Payload-Form abgesetzt (gemockter `fetch`), Rückgabe = Erfolg;
  - ausgefülltes Honeypot-Feld → Rückgabe = Erfolg, **ohne** Brevo-Aufruf;
  - ungültige E-Mail → Validierungsfehler, **ohne** Brevo-Aufruf;
  - fehlende Einwilligung → Fehler, **ohne** Brevo-Aufruf;
  - Brevo antwortet mit Fehler → freundliches Fehlerergebnis.
- **Netzwerk wird gemockt** — die echte Brevo-API wird in Tests **nie** aufgerufen.
- **Prior Art:** das Template bringt eine **Vitest**-Integrationsumgebung (`tests/int`)
  und **Playwright**-E2E (`tests/e2e`) mit. Die Server Action wird mit Vitest getestet.
- **Optionaler E2E-Test (Playwright, niedrigere Priorität):** Happy-Path der
  Formular-Absendung mit gestubbtem Netzwerk (Formular ausfüllen → Bestätigungshinweis
  sichtbar).
- **Was einen guten Test ausmacht:** Er prüft das nach außen sichtbare Verhalten
  (zurückgegebener Status, Form des ausgehenden Requests), nicht interne Details der
  Implementierung.

## Out of Scope

- Erstellen und Versenden der eigentlichen Newsletter-Inhalte (passiert in Brevo durch das
  Team).
- Listen-Segmentierung oder mehrere Listen über die eine „Newsletter"-Liste hinaus.
- Speicherung der Abonnent:innen in Payload (eigener Subscribers-Content-Typ).
- Abmelde-/Unsubscribe-Handling (übernimmt Brevo über die Links in seinen E-Mails).
- Captcha (Cloudflare Turnstile / hCaptcha) — in v1 nur Honeypot.
- Rate-Limiting über den Honeypot hinaus.
- Mehrsprachigkeit.
- Analytics/Conversion-Tracking der Anmeldungen.

## Further Notes

- **DSGVO ist zentral:** Double-Opt-In ist die rechtliche Grundlage. Die Brevo-DOI-Vorlage
  und der Datenschutz-Link am Formular sind verpflichtend. Die Datenschutzerklärung muss
  Brevo als Auftragsverarbeiter benennen (AV-Vertrag) — inhaltliche Aufgabe des Teams,
  nicht Teil dieses Features.
- **Brevo** (ehemals Sendinblue) ist EU-basiert (Paris), was die DSGVO-Konformität
  erleichtert.
- **Voraussetzung vor dem Bau:** Die vier ENV-Werte müssen aus dem Brevo-Account
  bereitstehen; die DOI-Vorlage und die Liste „Newsletter" müssen in Brevo existieren. Die
  `redirectionUrl` zeigt auf die deployte Dankesseite (in der lokalen Entwicklung auf eine
  localhost-URL).
- **Offene Entscheidungen** (vor dem Bau zu klären):
  - Vorname **optional** (empfohlen, niedrigschwellig) oder Pflicht?
  - Platzierung: nur Footer oder zusätzlich eigene Sektion auf der Startseite?
- **Werte/Anspruch:** warmer, familienfreundlicher Ton; Barrierefreiheit ist Teil der
  Mission und kein Nice-to-have (React Aria über HeroUI hilft dabei).
- Abhängigkeit: Das Feature ist erst nutzbar, wenn der Brevo-Account vollständig
  eingerichtet ist.
