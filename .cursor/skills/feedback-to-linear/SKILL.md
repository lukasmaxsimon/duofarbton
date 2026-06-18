---
name: feedback-to-linear
description: Liest ein vom test-feedback-Skill erzeugtes Feedback-Dokument und erstellt daraus einzelne Linear-Issues – ein Eintrag pro Issue – und schreibt das Issue-Kürzel zur Idempotenz zurück ins Dokument. Use this skill whenever the user wants to turn collected feedback into Linear tickets, push a feedback document to Linear, or create issues from a testing session. Trigger on phrases like "Linear-Tickets erstellen", "Issues aus dem Feedback", "ins Linear übertragen", "Feedback nach Linear", "erstell die Tickets", "feedback to issues", oder wenn der Nutzer auf ein feedback-*.md verweist und daraus Issues will.
---

# Feedback → Linear

## Zweck

Dieser Skill ist der zweite Schritt nach dem `test-feedback`-Skill. Er nimmt das fortlaufende Feedback-Dokument (`docs/feedback/feedback-[YYYY-MM-DD].md`) und erstellt aus jedem ticketbaren Eintrag genau **ein Linear-Issue**. Anschließend trägt er das erzeugte Issue-Kürzel in das `Linear:`-Feld des jeweiligen Eintrags zurück, damit ein erneuter Lauf **keine Duplikate** anlegt.

Der Skill erfindet keine Inhalte. Er überträgt nur, was im Dokument steht.

## Voraussetzungen

- Zugriff auf Linear. Bevorzugt über die **Linear-Tools (MCP)** (z. B. `create_issue`, `list_teams`, `list_projects`, `list_issue_labels`, `update_issue`). **Inspiziere zuerst die tatsächlich verfügbaren Tools** und verlasse dich nicht auf exakte Namen – die Schemata variieren je nach Connector.
- Falls keine Linear-Tools verfügbar sind: Fallback über die GraphQL-API (siehe „Fallback: GraphQL"). Dafür wird ein `LINEAR_API_KEY` benötigt. Den API-Key **niemals** selbst eingeben oder im Klartext ablegen – den Nutzer bitten, ihn als Umgebungsvariable bereitzustellen.
- Das Feedback-Dokument muss dem Format des `test-feedback`-Skills entsprechen (Sektionen, `### FB-xxx · Titel`, `**Linear:**`-Marker).

## Workflow

### 1. Feedback-Dokument finden & einlesen

- Wenn der Nutzer eine Datei nennt/anhängt, diese verwenden. Sonst die jüngste `feedback-*.md` im Ordner `docs/feedback/` verwenden (bei mehreren nachfragen, falls unklar welche gemeint ist).
- Dokument vollständig einlesen. Den Kopf auswerten: `Projektname`, `Linear-Team`, `Linear-Projekt`, `ID-Präfix`.

### 2. Linear-Kontext klären

- **Team:** immer `BEA`. Den Teamnamen einmalig zu `teamId` auflösen (über die verfügbaren Linear-Tools). Header-Feld `Linear-Team` ignorieren – `BEA` hat Vorrang.
- **Projekt:** immer `MVP`. Den Projektnamen zu `projectId` auflösen. Header-Feld `Linear-Projekt` ignorieren.
- Sollte `BEA` oder `MVP` in Linear nicht auffindbar sein, das benennen und nachfragen statt zu raten.
- **Labels**: die im Dokument vorkommenden `Typ`- und `Bereich`-Werte auf existierende Linear-Labels des Teams `BEA` abbilden (case-insensitive). **Standardmäßig keine neuen Labels anlegen** – fehlende Labels weglassen und im Bericht vermerken. Nur neue Labels erstellen, wenn der Nutzer es ausdrücklich erlaubt. Zusätzlich zu den `Typ`- und `Bereich`-Werte soll immer das Label `Feedback`mit angegeben

### 3. Kandidaten auswählen

Wähle Einträge, die **beide** Bedingungen erfüllen:

- Sie stehen in einer **ticketbaren Sektion**: `🐛 Bugs`, `💡 Verbesserungen`, `✨ Ideen`.
- Ihr `**Linear:**`-Feld ist `—` (noch nicht angelegt).

**Überspringe** Einträge, deren `Linear:`-Feld bereits ein Kürzel/Link enthält (schon angelegt), sowie alles aus `👍 Positiv` und `❓ Offene Fragen`.

### 4. Vorschau & Bestätigung (Pflicht)

Issues anzulegen ist eine seiteneffektbehaftete Aktion. **Vor dem Erstellen** eine kompakte Vorschau zeigen und Bestätigung einholen:

```
Erstelle 4 Issues in Team "BEA" / Projekt "MVP":
- FB-001  [Bug · Hoch]      Checkout-Button bei langer Adresse nicht klickbar
- FB-002  [Verbesserung]    Suchfeld soll Enter akzeptieren
- FB-004  [Idee]            Dark-Mode-Toggle
- FB-005  [Bug · Mittel]    Cover-Bild lädt verzögert
Übersprungen: FB-003 (bereits LEM-118), Positiv & Offene Fragen.
Anlegen? (alle / Auswahl / abbrechen)
```

Erst nach einem klaren „Ja" / einer Auswahl fortfahren. Den Nutzer einzelne Einträge ab- oder auswählen lassen.

### 5. Issues erstellen

Für jeden bestätigten Eintrag ein Issue anlegen. Feld-Mapping siehe unten. Issues **sequenziell** anlegen, damit jedes Kürzel sauber zurückgeschrieben werden kann.

### 6. Rückschreiben (Idempotenz) & Speichern

- Direkt nach erfolgreicher Erstellung das `**Linear:** —` des Eintrags ersetzen durch:
  `**Linear:** [LEM-123](https://linear.app/<workspace>/issue/LEM-123)`
- Vorhandene Kürzel **niemals** überschreiben.
- Das Dokument **in place** speichern (gleicher Pfad). Das ist der Zustand, auf den der nächste Lauf aufsetzt.
- Schlägt eine Erstellung fehl, den Eintrag auf `—` belassen und im Bericht als Fehler führen – nicht abbrechen, mit den übrigen weitermachen.

### 7. Bericht

Kurze Zusammenfassung: angelegte Issues (ID → Kürzel + Link), übersprungene Einträge, nicht gefundene Labels, Fehler. Keine Wiederholung des ganzen Dokuments.

## Feld-Mapping (Feedback → Linear)

| Feedback-Feld | Linear-Feld |
|---|---|
| Titel (nach `· ` in der Überschrift) | `title` |
| Beschreibung (+ Erwartet/Tatsächlich/Reproduktion) | `description` (Markdown) |
| Priorität | `priority` (Integer, siehe unten) |
| Typ | Label (`bug` / `improvement` / `idea`) |
| Bereich | Bereichs-Label (optional, wenn vorhanden) |
| — | `teamId` (immer `BEA`, Pflicht) |
| — | `projectId` (immer `MVP`) |

### Description zusammensetzen

Reihenfolge im Issue-Body (nur vorhandene Felder ausgeben):

```
<Beschreibung>

**Erwartet:** <…>
**Tatsächlich:** <…>

**Reproduktion:**
1. …
2. …

---
Quelle: <Dateiname> · <FB-ID> · Schweregrad: <…>
```

Die Quellzeile am Ende macht die Herkunft nachvollziehbar und erleichtert spätere Abgleiche.

### Prioritäts-Mapping

Linear nutzt Integer-Prioritäten. Die deutschen Stufen aus dem Feedback-Dokument so abbilden:

| Feedback | Linear `priority` |
|---|---|
| Dringend | 1 (Urgent) |
| Hoch | 2 (High) |
| Mittel | 3 (Medium) |
| Niedrig | 4 (Low) |
| Keine / leer | 0 (No priority) |

## Idempotenz-Regeln (wichtig)

- Der `**Linear:**`-Marker ist die einzige Quelle der Wahrheit dafür, ob ein Eintrag schon angelegt wurde. `—` = offen, alles andere = erledigt.
- Niemals einen Eintrag mit vorhandenem Kürzel erneut anlegen.
- Niemals IDs umnummerieren oder Einträge zusammenführen – das ist Aufgabe des `test-feedback`-Skills, nicht dieses Skills.
- Bei Unsicherheit, ob ein Issue bereits existiert (z. B. Tool-Timeout nach dem Anlegen, aber vor dem Rückschreiben): erst per Suche/`list_issues` prüfen, bevor ein neues angelegt wird.

## Fehlerbehandlung

- Kein Linear-Zugang → erklären, dass der Linear-Connector (MCP) aktiviert oder ein API-Key bereitgestellt werden muss; nicht raten.
- Team nicht auflösbar → Teams auflisten und nachfragen, nicht abbrechen.
- Einzelnes Issue scheitert → Eintrag auf `—` lassen, Fehler sammeln, Rest fortsetzen.
- Dokument entspricht nicht dem erwarteten Format → das benennen und anbieten, es zuerst über den `test-feedback`-Skill zu normalisieren.

## Fallback: GraphQL-API

Wenn keine Linear-Tools verfügbar sind, gegen `https://api.linear.app/graphql` arbeiten. Header: `Authorization: <LINEAR_API_KEY>` (aus der Umgebung, nie hartkodieren). Relevante Mutation:

```graphql
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue { identifier url }
  }
}
```

`input` enthält u. a. `title`, `description`, `teamId`, `priority`, `projectId`, `labelIds`. Teams/Labels/Projekte vorab über die passenden Queries (`teams`, `team.labels`, `projects`) zu IDs auflösen. `identifier` und `url` aus der Antwort zum Rückschreiben verwenden.

## Wichtig

- **Immer** vor dem Anlegen eine Vorschau zeigen und bestätigen lassen.
- Sprache des Nutzers übernehmen (Deutsch).
- Nur übertragen, was im Dokument steht – keine Inhalte, Prioritäten oder Reproduktionsschritte erfinden.
- Nach dem Lauf ist das Feedback-Dokument der aktuelle Stand: angelegte Einträge tragen ihr Kürzel, offene bleiben `—`.