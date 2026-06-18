---
name: retro
description: Retrospektive Analyse der Composer-Session-Logs dieses Projekts. Findet Fehler-Muster, Korrekturschleifen und Token-Verschwendung und leitet daraus Memory-Einträge und Skill-Vorschläge ab. Use when the user wants to review past sessions, asks "was lief schief", "log retro", "analysiere die logs", or after a milestone to capture lessons learned.
---

# Session-Log-Retro

Analysiere die Session-Logs unter `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` und destilliere daraus Lektionen, die künftige Sessions schneller und günstiger machen.

## Zeitfenster

Lies zuerst das Memory `retro-log-analysis-workflow.md` und finde das Datum der letzten Retro. Analysiere nur Logs, die danach geändert wurden (`find ... -newermt "<datum>"`). Ohne vorherige Retro: alle Logs.

## Datenquelle

Cursor speichert Composer-Conversations als JSON-BLOBs in SQLite, nicht als JSONL-Dateien.

- **Global (alle Messages):** `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`, Tabelle `cursorDiskKV`.
  - `composerData:<uuid>` → Session-Metadaten + Reihenfolge der Bubbles
  - `bubbleId:<composerId>:<bubbleId>` → die einzelne Message
- **Pro Workspace (welche Sessions zum Projekt gehören):** `~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/state.vscdb`, Tabelle `ItemTable`, Key `composer.composerData` → Liste der composerIds dieses Projekts.

Das Blob-Schema ist inoffiziell und ändert sich mit Cursor-Versionen. Feldnamen daher NIE annehmen, sondern in Schritt 0 verifizieren.

## Vorbereitung

DB ist im Betrieb gelockt — erst kopieren:

```bash
SRC="$HOME/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
DB="/tmp/cursor-retro.vscdb"
cp "$SRC" "$DB"   # alternativ: sqlite3 "file:$SRC?immutable=1" ...
```

Für einen projekt-gebundenen Retro: composerIds des Workspaces holen und später nach ihnen filtern (Workspace-`<hash>` über den Projektpfad identifizieren).

## Schritt 0 — Schema verifizieren (Pflicht, vor allem anderen)

Ein Beispiel-Bubble und eine Session dumpen und die tatsächlichen Felder ansehen:

```bash
sqlite3 "$DB" "SELECT value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%' LIMIT 1;" | jq 'keys'
sqlite3 "$DB" "SELECT value FROM cursorDiskKV WHERE key LIKE 'composerData:%' LIMIT 1;" | jq 'keys'
```

Notiere die echten Feldnamen für: Rolle/Sprecher (oft `type`, 1=User / 2=Assistant — verifizieren!), Nachrichtentext (oft `text` oder `richText`), Tool-Calls und deren Ergebnis/Fehler. Falls der Output **kein gültiges JSON** ist (komprimiert/encodiert), das zuerst klären — dann erst weiter.

## Schritt 1 — In JSONL umwandeln

Alle Bubbles als JSONL-Stream extrahieren, danach läuft die Analyse wie gewohnt per `jq`:

```bash
sqlite3 "$DB" "SELECT value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%';" > /tmp/bubbles.jsonl
```

(Optional auf Projekt-composerIds filtern.) Ab hier mit `jq`-Aggregationen über `/tmp/bubbles.jsonl` arbeiten, nicht durch Volltext-Lesen.

## Analyse-Schritte

Feldnamen aus Schritt 0 einsetzen (unten Platzhalter `.text`, `.type` etc.):

1. **Überblick:** Anzahl Sessions (`composerData:%`-Keys zählen), Zeitraum (`createdAt`/`lastUpdatedAt`), Anzahl Bubbles pro Session.
2. **Tool-Fehler:** Bubbles mit Tool-Ausführung herausfiltern und Fehlermarker auswerten (Cursor-Pendant zu `is_error` in Schritt 0 ermitteln). Gruppieren nach Fehlertext. Achte auf vermeidbare Fehler (Edit ohne vorheriges Lesen, "string not found", wiederholte fehlschlagende Kommandos).
3. **Korrektursignale des Users:** User-Bubbles (Rolle aus Schritt 0) nach Wörtern filtern: "nicht", "falsch", "immer noch", "nochmal", "warum", "doch", "kaputt". Cluster bilden: Welche Themen brauchten mehrere Runden?
4. **Wiederholungs-Loops:** Gleiche Kommandos/Fehler mehrfach hintereinander. Statt `[Request interrupted by user]` (Claude-Code-spezifisch, existiert in Cursor NICHT) den Cursor-Marker für abgebrochene/gestoppte Generierungen nutzen — in Schritt 0 identifizieren; falls keiner existiert, dieses Signal weglassen.
5. **Verworfene Arbeit:** User-Bubbles nach Lösch-/Revert-Aufträgen durchsuchen ("lösch alles", "revert", "das war nichts"). Zusätzlich `codeBlockDiff:%`- und `checkpointId:%`-Keys auswerten: viele Checkpoints/Reverts in kurzer Folge = Hinweis auf zu große Schritte ohne Zwischen-Feedback.

## Output

1. **Befund-Bericht** an den User: die 3–5 größten Reibungspunkte, je mit konkretem Beleg aus den Logs und einer Verhaltensänderung, die ihn künftig vermeidet.
2. **Memory-Einträge:** Jede sessionübergreifende Lektion als `feedback`-Memory speichern (bestehende aktualisieren statt duplizieren). Datum der Retro in `retro-log-analysis-workflow.md` aktualisieren.
3. **Skill-Vorschläge:** Wiederkehrender Workflow (≥3 Vorkommen) → Projekt-Skill vorschlagen, aber erst nach Rückfrage erstellen.

Sei dabei ehrlich: auch eigene Ineffizienzen (vermeidbare Tool-Fehler, unnötige Wiederholungen) klar benennen.