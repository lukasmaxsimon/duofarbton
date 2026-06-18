# Retro-Log-Analyse — Workflow & Lektionen

## Letzte Retro

**2026-06-17** (Cursor Composer-Logs, Projekt `singahoi_v2`)

## Datenquelle (Cursor)

- Global: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` → `cursorDiskKV`
- Projekt: `workspaceStorage/f452095104f976d4f02d3c2234b23bea/state.vscdb` → `composer.composerData`
- Schema (verifiziert): Bubble `type` 1=User / 2=Assistant; Text in `text`; Tools in `toolFormerData.name`

## Feedback-Memories (sessionübergreifend)

### GSAP ScrollTrigger — Header-Offset von Anfang an

Bei scrollgebundenen Hero-Animationen (Video, Sticky, Pin) **immer** `--spacing-header` / feste Header-Höhe in `start`/`end` einrechnen. ScrollTrigger-Marker im Dev kurz sichtbar machen, bevor der User testet. **Nur eine** Scroll-Instanz — alte CSS-/Rive-/IntersectionObserver-Artefakte vor dem Umbau entfernen, nicht parallel laufen lassen.

*Beleg 2026-06-17:* 6+ Korrekturrunden („Video spielt nicht“, Start/Ende „ganz oben“, Marker hinter Header, „nur GSAP“, zweite GSAP-Instanz entfernen).

### Größen-Feedback — CSS-Variable statt Rem-Raten

Visuelle Größen (Logo, SVG-Deko) nicht in mehreren Rem-Sprüngen raten. Stattdessen eine `--hero-logo-width` (o. ä.) setzen und beim ersten Feedback nur diese Variable anpassen — oder Referenz nennen lassen („so breit wie Header × 2“).

*Beleg 2026-06-17:* Hero-Logo 2× → revert → 1,25× → kleiner → 40rem → 34rem (5 Iterationen).

### CMS-SVGs — nach Style-Änderungen Bild-URL prüfen

Wenn SVG-Farben/Größen über CMS-Media kommen: nach CSS-/`object-fit`- oder Filter-Änderungen im Browser prüfen, ob die Datei noch als SVG rendert (nicht als Quadrat/Placeholder). Payload-URL und `width`/`height`-Attribute gemeinsam testen.

*Beleg 2026-06-17:* „ich sehe die neuen svg elemente nicht“; „bubble-green.svg und Luftschlange-green.svg quadrate“.

### Große UI-Ports — vertikal liefern

Beim Übernehmen fremder Seitenstrukturen (z. B. MindMarket) nicht alles in einem Plan-Sprint bauen. Pro Sektion: implementieren → kurz im Browser checken → nächste Sektion. Verhindert Totalausfälle wie „da funktioniert ja gar nichts“.

*Beleg 2026-06-17:* MindMarket-Port + sofortiger Gesamt-Feedback nach erstem Test.

### Edits — Datei lesen, keine Phantom-Zeilen

Vor `StrReplace`/`edit_file_v2` die Zieldatei lesen. Keine Kommentare oder Platzhaltertext in den Patch schreiben (z. B. verirrter Satz im JSX). Tippfehler in UI-Strings sofort linten.

*Beleg 2026-06-17:* Assistant-Erwähnung „Tippfehler“; Hero-Logo-Patch mit versehentlichem Fließtext.

## Nächste Retro

Logs mit `find … -newermt "2026-06-17"` filtern (nur Composer-Sessions nach diesem Datum).
