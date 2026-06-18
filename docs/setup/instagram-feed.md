# Setup: Instagram-Feed

Die Sektion **„Aus unserem Alltag"** (auf der Startseite, `#instagram`) zeigt die letzten
fünf Instagram-Beiträge. Sie wird **server-seitig** abgerufen (Token bleibt geheim) und zeigt
ohne Konfiguration freundliche Platzhalter-Kacheln mit „Folgen"-Button.

## Wichtig: Wie es technisch geht

Instagrams alte **Basic Display API ist seit Dezember 2024 abgeschaltet**. Beiträge automatisch
anzuzeigen funktioniert offiziell nur noch über die **Instagram Graph API** mit einem
**Access-Token** – und das setzt voraus:

1. Ein **Instagram-Business- oder -Creator-Konto** (kein privates Konto).
2. Eine damit verknüpfte **Facebook-Seite**.
3. Eine **Meta-App** (developers.facebook.com) mit Produkt „Instagram Graph API".
4. Ein **langlebiges Access-Token** (gültig ~60 Tage, muss danach erneuert werden).

> Ein bloßer Accountname genügt technisch **nicht**. Wer den Token-Aufwand nicht möchte:
> siehe „Alternative" unten.

## ENV-Werte setzen

Vorlage steht in `.env.example`:

| Variable                  | Bedeutung                                                       |
| ------------------------- | --------------------------------------------------------------- |
| `INSTAGRAM_ACCESS_TOKEN`  | Langlebiges Access-Token (geheim, nur server-seitig)            |
| `INSTAGRAM_HANDLE`        | Profilname ohne @, z. B. `singahoi` – für den „Folgen"-Button   |
| `INSTAGRAM_USER_ID`       | Optional: numerische User-ID; ohne Angabe wird `me` verwendet   |

Nach dem Setzen den Dev-Server neu starten. Der Feed wird **1 Stunde gecacht**
(`revalidate: 3600`).

## Token erzeugen (Kurzfassung)

1. In der Meta-App unter „Instagram Graph API" das Instagram-Konto verbinden.
2. Über den Graph-API-Explorer bzw. den OAuth-Flow ein User-Token mit den Berechtigungen
   `instagram_basic` (+ ggf. `pages_show_list`) holen.
3. Das kurzlebige Token in ein **langlebiges** umwandeln (Endpoint
   `GET /access_token?grant_type=ig_exchange_token`).
4. Token in `INSTAGRAM_ACCESS_TOKEN` eintragen.
5. Erneuerung: Langlebige Tokens laufen nach ~60 Tagen ab und können vor Ablauf verlängert
   werden (`GET /refresh_access_token`). Für den Dauerbetrieb sollte das automatisiert werden
   (z. B. monatlicher Cron) – kann nachgerüstet werden.

## Stolperfallen & schnelle Diagnose (aus der Praxis)

Diese drei Dinge haben beim ersten Anbinden Zeit gekostet:

1. **`appid|appsecret` ist KEIN User-Token.** Ein Wert wie `1716190639535839|rWUi…` (App-ID +
   App-Secret) führt zu **HTTP 500 / „Unsupported get request"**. Ein gültiges User-Token beginnt
   mit **`IGAA…`** und ist deutlich länger.
2. **`INSTAGRAM_USER_ID` muss die echte Instagram-`user_id` sein** (Format `17841…`), nicht
   irgendeine numerische ID. Eine falsche ID liefert **Fehler 100 — „Object … does not exist …
   missing permissions"**. Korrekte ID holen mit:
   `GET https://graph.instagram.com/me?fields=user_id,username&access_token=…`
   → oder das Feld **leer lassen**, dann nutzt der Code automatisch `me`.
3. **Werte in `.env`, nicht in `.env.example`.** Die App liest zur Laufzeit `.env` (gitignored);
   `.env.example` ist eine eingecheckte Vorlage und darf **kein** echtes Token enthalten.

**Token in 30 Sekunden prüfen** (bevor man im Code sucht):

```bash
set -a && . ./.env && set +a
curl -s "https://graph.instagram.com/me?fields=user_id,username&access_token=${INSTAGRAM_ACCESS_TOKEN}"
curl -s "https://graph.instagram.com/me/media?fields=id,media_type,permalink&limit=5&access_token=${INSTAGRAM_ACCESS_TOKEN}"
```

## Datenschutz (DSGVO)

Die Beitragsbilder werden beim Seitenaufruf von den Servern von Meta geladen; dabei wird die
IP-Adresse der Besucher:innen an Meta übertragen. Dafür wurde der Datenschutzerklärung ein
Abschnitt **„Instagram-Inhalte"** hinzugefügt. Solange kein Token gesetzt ist, werden **keine**
Daten an Meta übertragen (es erscheinen nur lokale Platzhalter-Kacheln).

> Datensparsamere Variante als spätere Option: die Bilder server-seitig zwischenspeichern und
> über einen eigenen Proxy/`next/image` ausliefern, sodass kein direkter Abruf von Meta-Servern
> durch den Browser nötig ist.

## Alternative ohne API (falls gewünscht)

Statt der Graph API kann ein **gepflegter Feed über Payload** gebaut werden: eine Collection
„Instagram-Beiträge" mit Bild-Upload, Beitrags-Link und Bildunterschrift. Vorteile: kein Token,
keine 60-Tage-Erneuerung, DSGVO-sauber (Bilder selbst gehostet). Nachteil: Beiträge müssen
manuell eingepflegt werden. Bei Bedarf kurz Bescheid geben – die Sektion konsumiert bereits ein
generisches `InstagramPost[]` und ließe sich leicht umstellen.

## Beteiligte Dateien

- Datenabruf: `src/lib/instagram.ts`
- Sektion: `src/app/(frontend)/components/sections/InstagramFeed.tsx`
- Einbindung: `src/app/(frontend)/page.tsx`
- Datenschutz-Abschnitt: `src/app/(frontend)/datenschutz/page.tsx`
