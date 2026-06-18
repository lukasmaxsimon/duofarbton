---
title: Cookie- & Consent-Management (DSGVO/TDDDG)
date: 2026-06-17
status: ready-for-agent
---

## Problem Statement

Sing Ahoi ist eine deutsche Website und unterliegt **§25 TDDDG** (ehem. TTDSG) und der
**DSGVO**. Sobald die Seite **Dritt-Dienste** einbindet (geplant: evtl. Tracking, evtl.
Instagram-Einbettungen, evtl. Video-Einbettungen), werden Cookies gesetzt bzw. Daten auf
dem Gerät der Besucher:innen gespeichert/ausgelesen. Das ist nur mit **vorheriger
Einwilligung** zulässig — Dritt-Dienste dürfen erst **nach** der Zustimmung laden. Ohne
einen Mechanismus dafür wäre das Einbetten dieser Inhalte rechtswidrig, und die
Besucher:innen hätten keine Möglichkeit, ihre Wahl zu treffen oder zu **widerrufen**.

Aktuell ist die Seite überwiegend first-party/server-seitig (Payload-Admin-Login,
server-seitige Maps-Auflösung, Brevo-Newsletter über Server Action, selbst gehostete
Schriften) — heute ist streng genommen **kein Banner** nötig. Das Feature ist
**vorausschauend**: Es schafft die Grundlage, damit die geplanten Einbettungen
rechtskonform genutzt werden können, ohne den warmen, niedrigschwelligen und barrierefreien
Charakter der Seite zu beschädigen.

## Solution

Ein **schlankes, selbstgebautes Consent-Management** ohne kommerzielles CMP/Plugin, das
einen klassischen Cookie-Banner möglichst vermeidet:

- **Klick-zum-Laden (Zwei-Klick-Lösung)** für alle Dritt-Einbettungen (Instagram, Video):
  zuerst nur ein Platzhalter; der **Klick darauf ist die Einwilligung** für genau diese
  Einbettung. Vorher wird kein Dritt-Request abgesetzt.
- **Cookieloses Analytics** (z. B. Plausible/Umami) statt Google Analytics → keine
  einwilligungspflichtigen Cookies, keine Statistik-Kategorie nötig.
- Eine zentrale **Consent-Verwaltung** speichert granulare Kategorie-Entscheidungen
  (Version + Zeitstempel) first-party; ein gut auffindbarer Footer-Link
  **„Privatsphäre-Einstellungen"** erlaubt jederzeit Einsicht, Änderung und Widerruf.
- Ein **kategorienbasierter Opt-in-Banner** ist als dokumentierter Fallback vorgesehen,
  falls doch cookie-basiertes Tracking eingeführt wird.

So bleiben die Besucher:innen in Kontrolle, die Betreiberinnen rechtssicher, und die Seite
schlank und schnell.

## User Stories

1. Als Besucher:in möchte ich, dass keine Dritt-Dienste (Instagram, Video, Tracking) Daten laden, bevor ich zugestimmt habe.
2. Als Besucher:in möchte ich bei eingebetteten Instagram-/Video-Inhalten zuerst einen Platzhalter sehen und selbst entscheiden, ob ich ihn lade.
3. Als Besucher:in möchte ich den Inhalt mit einem Klick auf den Platzhalter laden (Einwilligung = Klick), ohne einen ganzen Banner durchklicken zu müssen.
4. Als Besucher:in möchte ich optional festlegen, dass externe Medien künftig automatisch geladen werden, damit ich nicht jedes Mal klicken muss.
5. Als datenschutzbewusste:r Besucher:in möchte ich Dritt-Inhalte ablehnen und die Seite trotzdem vollständig nutzen können.
6. Als Besucher:in möchte ich meine Entscheidung jederzeit über einen gut auffindbaren Footer-Link „Privatsphäre-Einstellungen" ändern.
7. Als Besucher:in möchte ich meine Einwilligung genauso einfach widerrufen, wie ich sie erteilt habe.
8. Als Besucher:in möchte ich, dass nach einem Widerruf die zugehörigen Dritt-Cookies entfernt werden und die Dienste nicht mehr laden.
9. Als Besucher:in mit Screenreader oder Tastatur möchte ich Platzhalter, Dialog und Buttons vollständig barrierefrei bedienen können.
10. Als Besucher:in möchte ich verständlich erklärt bekommen, welcher Anbieter beim Laden eingebunden wird und wohin Daten fließen (Link zur Datenschutzerklärung).
11. Als Besucher:in möchte ich — falls ein Banner erscheint — „Alle ablehnen" genauso einfach (gleiche Ebene, gleiche Optik) wählen können wie „Alle akzeptieren".
12. Als Besucher:in möchte ich — falls ein Banner erscheint — keine vorausgewählten Häkchen für nicht-notwendige Kategorien vorfinden.
13. Als Besucher:in möchte ich — falls ein Banner erscheint — pro Kategorie (Notwendig / Statistik / Externe Medien) einzeln entscheiden.
14. Als Besucher:in möchte ich, dass meine getroffene Wahl gespeichert und beim nächsten Besuch respektiert wird.
15. Als Besucher:in möchte ich nach längerer Zeit oder wenn neue Dienste dazukommen erneut gefragt werden.
16. Als Betreiberin möchte ich Reichweitenmessung möglichst ohne Einwilligungspflicht (cookielos), damit die Seite einfach bleibt.
17. Als Betreiberin möchte ich Instagram- und Video-Inhalte einbinden können, ohne gegen §25 TDDDG zu verstoßen.
18. Als Betreiberin möchte ich nachweisen können, was wann in welcher Version eingewilligt wurde (Accountability).
19. Als Betreiberin möchte ich, dass das Consent-System zum warmen, familienfreundlichen Design passt und nicht abschreckt.
20. Als Betreiberin möchte ich neue Dritt-Dienste später leicht „einhängen" können (eine Kategorie / ein Gate ergänzen), ohne alles neu zu bauen.
21. Als Besucher:in möchte ich, dass die Seite schnell lädt — schwere Embeds erst auf Wunsch (Performance-Nebeneffekt der Klick-zum-Laden-Lösung).

## Implementation Decisions

- **Primärstrategie „schlank":** Klick-zum-Laden-Platzhalter (Zwei-Klick) für **alle**
  Dritt-Einbettungen (Instagram, YouTube/Vimeo). Der Klick auf den Platzhalter ist die
  Einwilligung für genau diese Einbettung; **vor** dem Klick wird kein Dritt-Request
  abgesetzt. Dadurch ist für diese Embeds kein globaler Banner nötig.
- **Analytics cookielos:** Empfehlung Plausible oder self-hosted Umami → keine
  personenbezogenen Cookies → keine Einwilligungspflicht, keine Statistik-Kategorie nötig.
  Entscheidung: **kein Google Analytics**, solange es vermeidbar ist.
- **Zentrale Consent-Verwaltung:** Ein `ConsentProvider` (React-Context, Client) hält den
  Zustand und stellt ihn Komponenten bereit. Persistenz in einem **first-party**-Speicher
  (Cookie/localStorage) als versioniertes Objekt:
  ```
  { version, timestamp, kategorien: { notwendig: true, statistik: boolean, externeMedien: boolean } }
  ```
  Default für nicht-notwendige Kategorien: **abgelehnt**, bis aktiv gesetzt.
- **Consent-Gate:** Eine `ConsentGate`/`EmbedPlaceholder`-Komponente kapselt Dritt-Inhalte
  und rendert den echten Inhalt nur, wenn (a) die zugehörige Kategorie zugestimmt ist oder
  (b) der Nutzer den Platzhalter aktiv anklickt. Optional „künftig immer laden" setzt die
  Kategorie dauerhaft.
- **Widerruf:** Footer-Link „Privatsphäre-Einstellungen" öffnet einen Dialog mit dem
  aktuellen Zustand; Kategorien können abgewählt werden → der Datensatz wird aktualisiert
  (neuer Zeitstempel), zugehörige Dritt-Cookies werden clientseitig entfernt, Dienste laden
  nicht mehr. Widerruf ist so einfach wie die Einwilligung (Art. 7 Abs. 3 DSGVO).
- **Versionierung/Erneuerung:** Eine `version` im Datensatz; ändert sich die Diensteliste
  oder läuft eine Frist (~6–12 Monate) ab, gilt der Zustand als „erneut zu erfragen".
- **Fallback-Banner (nur falls cookie-basiertes Tracking eingeführt wird):**
  kategorienbasierter Opt-in-Dialog mit „Alle akzeptieren"/„Alle ablehnen" **gleichwertig**
  (gleiche Ebene/Optik), **keine** Vorauswahl, Kategorien Notwendig/Statistik/Externe
  Medien, Links zu Datenschutz & Impressum.
- **UI:** HeroUI-v3-Komponenten (Dialog/Modal, Button, Checkbox/Switch), `onPress`,
  barrierefrei über React Aria, warmer Ton; Status-/Hinweistexte barrierefrei ausgegeben.
- **Nachweis/Dokumentation:** der gespeicherte Datensatz (Version + Zeitstempel +
  Kategorien) dient als Nachweis; clientseitig in v1 (kein server-seitiges Log).
- **Kein Drittanbieter-CMP, kein Plugin** in v1 (selbstgebaut). Eine OSS-Bibliothek
  (z. B. Klaro!) ist als Option vermerkt, falls der Umfang stark wächst.
- **Datenschutzerklärung & Impressum:** inhaltliche Texte sind Teamaufgabe (kein Code);
  sie müssen die eingebundenen Dritt-Dienste/Verarbeiter benennen. Platzhalter und Dialog
  verlinken darauf.

## Testing Decisions

- **Höchste Naht: die Consent-Zustandslogik (`ConsentProvider` / Consent-Store).**
  Getestet wird beobachtbares Verhalten:
  - Default = nicht-notwendige Kategorien sind **abgelehnt**;
  - Setzen/Lesen einer Kategorie funktioniert;
  - Persistenz über Reload (gemockter Storage);
  - Versionswechsel → Zustand gilt als „erneut zu erfragen";
  - Widerruf setzt die Kategorie zurück.
- **`ConsentGate`/`EmbedPlaceholder`:** Vor Einwilligung wird **kein** Dritt-Inhalt
  gerendert und kein Dritt-Request ausgelöst (nur der Platzhalter ist sichtbar); nach
  Klick bzw. zugestimmter Kategorie wird der echte Inhalt gerendert. Geprüft über
  Render-Tests (Vitest + React Testing Library), optional ein E2E-Happy-Path (Playwright):
  „Platzhalter → Klick → Inhalt geladen".
- **Was einen guten Test ausmacht:** Er prüft externes Verhalten (was gerendert/geladen
  wird, welcher Zustand gespeichert ist), nicht interne Implementierungsdetails.
- **Prior Art:** Vitest-Integrationsumgebung (`tests/int`) mit React Testing Library und
  Playwright-E2E (`tests/e2e`) aus dem Template.

## Out of Scope

- Inhaltliche Texte der Datenschutzerklärung und des Impressums (Teamaufgabe, ggf.
  juristisch geprüft).
- Server-seitiges Consent-Logging / Audit-Trail (clientseitiger Datensatz genügt in v1).
- Ein vollständiges kommerzielles CMP oder Drittanbieter-Plugin.
- Auto-Scanning/Auto-Blocking unbekannter Skripte — es werden nur bewusst eingebundene
  Embeds gegated.
- Konkrete Auswahl und Einrichtung des Analytics-Tools (separat zu entscheiden); hier nur
  die Empfehlung „cookielos".
- Mehrsprachigkeit.
- Rechtsberatung.

## Further Notes

- **Heute (rein first-party) ist streng genommen kein Banner nötig** — das Feature ist
  vorausschauend für die geplanten Einbettungen (Instagram/Video) und optionales Tracking.
- Wird konsequent „Klick-zum-Laden + cookielos" umgesetzt, kann ein klassischer
  Accept/Reject-Banner **ganz entfallen**.
- **Verknüpfung zum Maps-/Events-Feature:** Wird ein Event-Ort als Karte gezeigt, gilt
  dasselbe Prinzip — eine selbst gehostete OSM/Leaflet-Karte vermeidet Dritt-Cookies,
  eine Google-Maps-Einbettung bräuchte wieder ein Consent-Gate.
- **Rechtliche Eckpunkte:** §25 TDDDG (vorherige Einwilligung für nicht-notwendige
  Speicherung/Zugriff), DSGVO Art. 6/7 (Rechtsgrundlage, Widerruf), „Reject" so einfach
  wie „Accept", keine Dark Patterns, Datensparsamkeit.
- **Kein Rechtsrat** — finale Texte und Konfiguration vor dem Launch prüfen lassen
  (z. B. über e-Recht24 oder eine Kanzlei).
