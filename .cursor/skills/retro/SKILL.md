---
name: retro
description: Retrospektive Analyse der Claude-Code-Session-Logs dieses Projekts. Findet Fehler-Muster, Korrekturschleifen und Token-Verschwendung und leitet daraus Memory-Einträge und Skill-Vorschläge ab. Use when the user wants to review past sessions, asks "was lief schief", "log retro", "analysiere die logs", or after a milestone to capture lessons learned.
---

# Session-Log-Retro

Analysiere die Session-Logs unter `~/.claude/projects/-Users-lukassimon-PARA-01-Projects-ARS-02-Code/*.jsonl` und destilliere daraus Lektionen, die künftige Sessions schneller und günstiger machen.

## Zeitfenster

Lies zuerst das Memory `retro-log-analysis-workflow.md` und finde das Datum der letzten Retro. Analysiere nur Logs, die danach geändert wurden (`find ... -newermt "<datum>"`). Ohne vorherige Retro: alle Logs.

## Analyse-Schritte

Arbeite mit `jq`-Aggregationen über die JSONL-Dateien, nicht durch Volltext-Lesen (Dateien sind mehrere MB groß):

1. **Überblick:** Anzahl Sessions, Zeitraum, Größen (`ls -lhS`).
2. **Tool-Fehler:** `tool_result`-Einträge mit `is_error==true`, gruppiert nach Fehlertext. Achte auf vermeidbare Fehler (Edit ohne Read, "String not found", wiederholte Exit-1-Kommandos).
3. **Korrektursignale des Users:** User-Textnachrichten filtern nach Wörtern wie "nicht", "falsch", "immer noch", "nochmal", "warum", "doch", "kaputt". Cluster bilden: Welche Themen brauchten mehrere Runden?
4. **Wiederholungs-Loops:** Gleiche Kommandos/Fehler mehrfach hintereinander (z.B. derselbe typecheck-Fehler, dasselbe Warning). `[Request interrupted by user]` zählen.
5. **Verworfene Arbeit:** Suche nach Lösch-/Revert-Aufträgen ("lösch alles", "revert", "das war nichts") — Hinweis auf zu große Schritte ohne Zwischen-Feedback.

## Output

1. **Befund-Bericht** an den User: die 3–5 größten Reibungspunkte, je mit konkretem Beleg aus den Logs und einer Verhaltensänderung, die ihn künftig vermeidet.
2. **Memory-Einträge:** Jede Lektion, die sessionübergreifend gilt, als `feedback`-Memory speichern (bestehende Einträge aktualisieren statt duplizieren). Datum der Retro in `retro-log-analysis-workflow.md` aktualisieren.
3. **Skill-Vorschläge:** Wenn ein Muster sich als wiederkehrender Workflow entpuppt (≥3 Vorkommen), schlage ein Projekt-Skill vor — aber erst nach Rückfrage erstellen.

Sei dabei ehrlich: auch eigene Ineffizienzen (vermeidbare Tool-Fehler, unnötige Wiederholungen) klar benennen.
