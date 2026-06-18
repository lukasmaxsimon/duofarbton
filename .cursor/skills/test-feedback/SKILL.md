---
name: feedback-collector
description: Sammelt fortlaufend Feedback beim Testen einer App oder Webseite und pflegt es in ein strukturiertes, wachsendes Markdown-Dokument ein, das als saubere Übergabe für eine nachgelagerte Linear-Ticket-Erstellung dient. Jeder Eintrag ist eine atomare Einheit (= ein Linear-Issue) mit stabiler ID, Linear-nativen Feldern und Sync-Marker. Use this skill whenever the user wants to collect, log, or capture feedback during app/website testing, dictate observations one at a time, or maintain a running feedback document. Trigger on phrases like "Feedback sammeln", "ich teste gerade", "neuer Bug", "mir ist aufgefallen", "notier mal", "Testing-Session", or any single observation about a website/app that should be added to an ongoing list.
---

# Feedback Collector

## Zweck

Der Nutzer testet eine App oder Webseite und gibt Feedback **stückweise** – einzelne Beobachtungen nacheinander, per Sprache oder Text. Jede Beobachtung wird in ein **fortlaufendes Markdown-Dokument** eingepflegt, das über die gesamte Session wächst und strukturiert bleibt.

Dieses Dokument ist außerdem die **Eingabe für einen nachgelagerten Skill**, der aus den Einträgen einzelne **Linear-Issues** erstellt. Deshalb ist jeder Eintrag so aufgebaut, dass er 1:1 auf genau ein Linear-Issue abgebildet werden kann. Das Format ist die Schnittstelle – Konsistenz hat Vorrang vor Kreativität.

## Kernverhalten

1. **Erste Nachricht der Session:** Lege dann das Dokument an: `feedback-[YYYY-MM-DD].md` mit dem Kopf aus dem Abschnitt „Dokumentstruktur". Die Datei soll in `docs/feedback` gelagert werden
2. **Jede weitere Nachricht = ein oder mehrere Feedback-Einträge.** Nicht als Blog/Fließtext behandeln, sondern als einzelne strukturierte Einträge erfassen.
3. **Pro Eintrag erfassen** (so weit aus der Nachricht ableitbar):
   - **ID:** fortlaufend, global eindeutig im Dokument (`FB-001`, `FB-002`, …). Niemals neu vergeben oder umnummerieren – auch nicht beim Zusammenführen.
   - **Typ:** Bug / Verbesserung / Idee / Frage / Lob
   - **Bereich/Screen:** wo es auftrat (z. B. Checkout, Login, Startseite)
   - **Titel:** kurzer, eigenständiger Issue-Titel (wird der Linear-Titel)
   - **Beschreibung:** was der Nutzer beschreibt (in seinen Worten, aufgeräumt)
   - **Priorität:** Linear-Stufe – `Dringend` / `Hoch` / `Mittel` / `Niedrig` / `Keine`
   - **Schweregrad** (nur Bugs): kritisch / mittel / niedrig
   - **Erwartet / Tatsächlich** (nur Bugs, wenn ableitbar): erwartetes vs. tatsächliches Verhalten
   - **Reproduktion** (optional): Schritte zum Nachstellen, NUR wenn der Nutzer sie mitangibt. Niemals erfinden oder erfragen – einfach weglassen, wenn nicht genannt. Als nummerierte Schritte formatieren.
   - **Linear:** Sync-Marker, anfangs immer `—`. Siehe „Übergabe an Linear".
4. **Niemals nachbohren bei jedem Eintrag.** Nur nachfragen, wenn etwas wirklich unklar ist. Der Nutzer ist im Flow – Reibung minimieren. Fehlende Felder einfach weglassen (außer ID, Typ, Titel, Beschreibung, Linear – die sind Pflicht, damit der Folge-Skill funktioniert).
5. **Nach jedem Eintrag:** Kurze Bestätigung (1 Zeile) inkl. ID, z. B. „✓ FB-003 · Bugs / Checkout". KEINE Wiederholung des ganzen Dokuments.
6. **Auf Abruf:** Wenn der Nutzer „zeig mir alles", „Stand", „Export" o. ä. sagt → das vollständige aktualisierte Dokument als Datei bereitstellen.
7. Füge keine eigenen Gedanken hinzu.

## Übergabe an Linear (Schnittstellen-Vertrag)

Der nachfolgende Skill liest dieses Dokument und erstellt Issues. Damit das verlässlich und ohne Duplikate funktioniert, gelten diese Regeln:

- **Ein Eintrag = ein Issue.** Jeder `###`-Eintrag in einer ticketbaren Sektion ist genau ein potenzielles Linear-Issue.
- **Der Titel steht in der Überschrift.** Format der Überschrift: `### FB-001 · <Titel>`. Alles nach `· ` ist der Linear-Issue-Titel. Die ID ist der stabile Anker.
- **Sync-Marker `Linear:`** ist der Idempotenz-Mechanismus:
  - `—` → noch nicht angelegt. Der Folge-Skill erstellt ein Issue und trägt anschließend das Kürzel ein (z. B. `LEM-123`).
  - Ein vorhandenes Kürzel → bereits angelegt. **Dieser Eintrag wird übersprungen.**
  - Dieser Skill setzt beim Erfassen immer `—` und **überschreibt niemals** ein bereits vorhandenes Kürzel.
- **Ticketbare Sektionen:** 🐛 Bugs, 💡 Verbesserungen, ✨ Ideen. Nur Einträge hier bekommen ID + `Linear`-Feld und werden zu Issues.
- **Nicht-ticketbar:** 👍 Positiv (nie ein Issue) und ❓ Offene Fragen (standardmäßig kein Issue – der Nutzer kann eine Frage manuell in eine ticketbare Sektion verschieben, wenn daraus ein Issue werden soll).
- **Linear-Feldzuordnung**, die der Folge-Skill nutzt:
  - `Titel` → Issue-Titel
  - `Beschreibung` + (bei Bugs) `Erwartet`/`Tatsächlich`/`Reproduktion` → Issue-Description
  - `Priorität` → Linear-Priorität
  - `Typ` und `Bereich` → Labels (z. B. `bug`, `improvement`, `idea` und ein Bereichs-Label)
- **Optionale Session-Defaults** im Dokumentkopf (`Linear-Team`, `Linear-Projekt`) kann der Folge-Skill als Voreinstellung übernehmen. Leer lassen, wenn unbekannt.

### Priorität ableiten

`Priorität` ist eine **Voreinstellung zur Triage**, kein endgültiges Urteil – im Zweifel niedriger ansetzen, der Nutzer re-priorisiert in Linear. Default-Mapping, sofern der Nutzer nichts anderes signalisiert:

- Bug, Schweregrad kritisch → `Hoch` (bei klarem Blocker/Datenverlust: `Dringend`)
- Bug, Schweregrad mittel → `Mittel`
- Bug, Schweregrad niedrig → `Niedrig`
- Verbesserung / Idee → `Keine` (oder `Niedrig`, wenn der Nutzer Wichtigkeit andeutet)

## Dokumentstruktur

 Verwende exakt diese Struktur. Sektionsreihenfolge und Überschriften nicht verändern – der Folge-Skill verlässt sich darauf.

```
# Feedback: [Projektname]
**Getestet am:** [YYYY-MM-DD] · **Version/URL:** [...]
**Linear-Team:** [optional] · **Linear-Projekt:** [optional] · **ID-Präfix:** FB

## 🐛 Bugs   _(ticketbar)_

### FB-001 · [Issue-Titel]
- **Typ:** Bug
- **Bereich:** Checkout
- **Priorität:** Hoch
- **Schweregrad:** kritisch
- **Beschreibung:** ...
- **Erwartet:** ...
- **Tatsächlich:** ...
- **Reproduktion:**
  1. ...
  2. ...
- **Linear:** —

## 💡 Verbesserungen   _(ticketbar)_

### FB-002 · [Issue-Titel]
- **Typ:** Verbesserung
- **Bereich:** ...
- **Priorität:** Keine
- **Beschreibung:** ...
- **Linear:** —

## ✨ Ideen   _(ticketbar)_

### FB-003 · [Issue-Titel]
- **Typ:** Idee
- **Bereich:** ...
- **Priorität:** Keine
- **Beschreibung:** ...
- **Linear:** —

## 👍 Positiv   _(nicht ticketbar)_

- [Bereich] – kurze Notiz

## ❓ Offene Fragen   _(nicht ticketbar)_

- [Bereich] – offene Frage
```

## Wichtig

- Einträge in die **passende Sektion** einsortieren, nicht chronologisch dumpen.
- **IDs sind dauerhaft.** Beim Zusammenführen ähnlicher/doppelter Beobachtungen die bestehende ID behalten und die neue Info in den vorhandenen Eintrag einarbeiten – nicht duplizieren, nicht umnummerieren.
- Den `Linear:`-Marker nur auf `—` setzen, wenn neu. Vorhandene Kürzel niemals überschreiben.
- Pflichtfelder pro ticketbarem Eintrag: ID, Typ, Titel, Beschreibung, Priorität, Linear. Alles andere ist optional und wird bei Fehlen weggelassen.
- Das Feld **Reproduktion** nur bei Einträgen anzeigen, für die der Nutzer tatsächlich Schritte genannt hat – nicht als leeres Pflichtfeld führen.
- Sprache des Nutzers übernehmen (Deutsch).
- Bei Sprachbefehl: Transkriptionsfehler stillschweigend korrigieren (Fachbegriffe, Eigennamen).