# fun-apps

Sammlung kleiner nützlicher Web-Apps unter **fun.sponholz.org** – digitale
Spielblöcke, die mitrechnen. React-PWA mit schlankem Express-Backend, ausgeliefert
aus einem einzigen Node-Container, TLS/Routing über Caddy.

Offline nutzbar, ohne Anmeldung, ohne Konto. Der Spielstand bleibt auf dem Gerät.

## Aufbau

```
fun-apps/
├── package.json           # npm-Workspaces: client, server
├── Dockerfile             # Multi-Stage: Build → Laufzeit-Deps → schlankes Image
├── docker-compose.yml     # ein Container, Netz proxy-tier
├── vitest.config.ts       # Tests laufen nur gegen reine Logik (environment: node)
├── client/                # React + TypeScript + Vite + Tailwind/daisyUI
│   ├── public/icons/      # PWA-Icons (fest eingecheckt, nicht im Build erzeugt)
│   └── src/
│       ├── apps/          # eine Unter-App je Ordner
│       │   ├── manifests.ts   # Steckbriefe (ohne React – liest auch vite.config.ts)
│       │   ├── registry.ts    # + die Ansichten; DIE Stelle zum Registrieren
│       │   └── <app>/         # manifest, rules(+test), state, strings, views, components
│       ├── game/          # der gemeinsame Rahmen: Store, Host, Rangliste, Spieler
│       ├── ui/            # app-unabhängige Bausteine (Sheet, Stepper, Ranking …)
│       ├── hooks/         # useWakeLock, usePersistentState
│       ├── theme/         # Akzent je App + globale Hell/Dunkel-Einstellung
│       ├── storage/       # localStorage-Zugriffe, Namensraum `fa2:`
│       ├── pwa/           # Update-Hinweis
│       └── pages/         # Landing-Page, 404
└── server/                # Express: liefert den Client-Build aus + /api
    └── src/               # index, app, static (Cache-Header + SPA-Fallback), health
```

## Entwickeln

```bash
npm install
npm run dev
```

Startet Vite auf **5173** und den Server auf **3000**. Vite reicht `/api` an den
Server durch (inkl. WebSocket-Upgrade), damit Client-Code immer relative
`/api`-Pfade benutzen kann und Entwicklung wie Produktion gleich aussehen.

```bash
npm test         # Vitest über die reinen Regel-Module
npm run typecheck
npm run lint
npm run build    # client/dist (Vite) + server/dist (tsup)
```

**Auf dem Handy testen:** Wake Lock und Service Worker setzen HTTPS voraus – über
`http://` verhält sich die App anders als im Betrieb. Für einen ehrlichen Test
`vite --host` mit einem lokalen Zertifikat verwenden oder gleich deployen.

## Neue App hinzufügen

1. `client/src/apps/<app>/` anlegen: `manifest.ts` (Titel, Emoji, Akzent,
   Spielerzahl), `rules.ts` (rein, mit Tests), `state.ts` (Reducer),
   `strings.ts`, dazu `views/` und ggf. `components/`.
2. Eintrag in `client/src/apps/manifests.ts` **und** `client/src/apps/registry.ts`,
   dazu zwei Akzent-Zeilen am Ende von `client/src/themes.css`.
3. Icon `client/public/icons/<app>-192.png` für den Manifest-Shortcut.

Route, Kachel auf der Landing-Page und PWA-Shortcut entstehen daraus von selbst.

## Deployment

```bash
docker compose -f /opt/docker/fun-apps/docker-compose.yml up -d --build
```

Das `--build` ist neu und nötig: anders als beim früheren statischen Stand gibt es
jetzt einen Build-Step, ein blosser Container-Neustart ändert nichts.

Caddy-Block (in `/opt/docker/caddy/Caddyfile`):

```
fun.sponholz.org {
	reverse_proxy fun-apps-web:3000
}
```

Caddy reicht WebSocket-Upgrades von sich aus durch – für `/api` ist dort nichts
weiter einzustellen. Nach Caddyfile-Änderung: `docker restart caddy`.

## Caching

Mit Build-Step tragen die Assets einen Hash im Namen (`index-a1b2c3.js`) und
können ewig gecacht werden. Die Hülle darf das nicht: ohne `Cache-Control` raten
Browser die Haltbarkeit heuristisch aus `Last-Modified` (Faustregel ~10 % des
Dateialters) und zeigen stunden- bis tagelang alte Stände. Genau daran krankte die
Vorgängerversion. `server/src/static.ts` setzt deshalb:

| Pfad                                          | Cache-Control                         |
| --------------------------------------------- | ------------------------------------- |
| `/assets/*` (gehashte Namen)                  | `public, max-age=31536000, immutable` |
| `index.html`, `sw.js`, `manifest.webmanifest` | `no-cache`                            |
| alles Übrige (Icons …)                        | `public, max-age=3600`                |

`no-cache` heisst **nicht** „nicht cachen", sondern „vor jeder Nutzung
revalidieren": Der Browser schickt `If-None-Match` mit und bekommt in der Regel
`304` (0 Byte Body). Updates sind sofort da, der Reload bleibt günstig.

Prüfen:

```bash
curl -sI https://fun.sponholz.org/sw.js | grep -i cache-control   # -> no-cache
```

## PWA: Installation, Offline, Updates

Die Seite ist installierbar („Zum Startbildschirm hinzufügen"). Ein Service Worker
lädt die App vollständig vor – **alle vier Spiele laufen ohne Netz**, auch
Deeplinks wie `/qwixx` direkt nach dem Start. `/api` ist bewusst vom Caching
ausgenommen; dort darf nie eine alte Antwort kommen.

Updates laden **nie von selbst** neu. Der neue Service Worker installiert sich im
Hintergrund und wartet; ein Hinweis „Neue Version verfügbar" bietet _Neu laden_
an. Ein Spielblock, der sich mitten in der Partie neu lädt, wäre schlimmer als
eine Version Rückstand.

Auf Android landen die vier Apps zusätzlich als **Shortcuts** im Icon-Menü. iOS
wertet die nicht aus – dort führt das Icon auf die Übersicht.

## Auf mehreren Geräten (Räume)

Optional kann jeder auf seinem eigenen Gerät spielen. Der Weg dorthin steht auf
der Startseite: jede Kachel hat neben dem Spiel einen zweiten Knopf
**Online-Multiplayer**. Dort sagt man seinen Namen und eröffnet einen **Raum**
oder tritt einem bei – mit dem vierstelligen Code oder über den QR-Code
(`/beitreten/<Code>`).

Danach steht die **Lobby**: der Code, der QR-Code und die Liste derer, die schon
da sind. Sie füllt sich von selbst, denn **wer beitritt, bringt seinen Platz
mit** – Plätze werden nicht vorher angelegt und dann verteilt. Der Host startet,
wenn alle drin sind; sobald gespielt wird, kommt niemand Neues mehr hinein, weil
das die Reihenfolge verschöbe, an der alle Blöcke hängen. Ein bekanntes Gerät
darf jederzeit zurück – nach Reload oder Funkloch bekommt es seinen Platz
wieder, ohne dass jemand etwas „übernehmen“ müsste.

Das Modell in einem Satz: **ein Gerät, ein Platz.** Nur dieses Gerät schreibt
seine Spalte bzw. seinen Block; alle anderen sehen sie live, aber nur lesend –
fremde Felder sind gar nicht erst antippbar. Konflikte sind damit nicht gelöst,
sondern ausgeschlossen. Deshalb wird der Inhalt eines Platzes immer
**vollständig** übertragen statt als Diff: ein Qwixx-Block sind rund 700 Byte,
eine Kniffel-Spalte 13 Zahlen.

Der Server kennt **keine Spielregeln**. Werte, die sich aus allen Plätzen
zusammen ergeben, rechnet jedes Gerät selbst aus – das sind reine Funktionen,
die überall dasselbe Ergebnis liefern.

**Alles daran ist freiwillig.** Ohne Raum spielt jedes Spiel exakt wie vorher.
Und mit Raum gilt: die Verbindung ist eine Annehmlichkeit, keine Voraussetzung.

- Bricht die Verbindung ab, wird **lokal ohne Unterbrechung weitergespielt**.
  Ausgehende Änderungen sammeln sich (je Platz nur der letzte Stand – richtig,
  weil vollständig übertragen wird) und gehen bei der nächsten Verbindung raus.
- Beim Wiederverbinden gleicht jedes Gerät ab: was lokal neuer ist, geht noch
  einmal raus, alles andere wird übernommen. Ein veralteter Stand wird am
  Zählerstand erkannt und still verworfen – das Nachspielen ist dadurch von
  selbst unschädlich.
- Räume leben **nur im Arbeitsspeicher** und verfallen, wenn niemand mehr da ist
  (`ROOM_TTL_MIN`, Standard 120). Ein Server-Neustart beendet laufende Räume;
  jedes Gerät behält seinen vollständigen Spielstand und spielt weiter. Das ist
  eine bewusste Eigenschaft, keine Lücke.

Die Berechtigung ist bewusst schlicht: wer den Code kennt, ist im Raum; einen
Platz beschreibt nur sein Eigentümer; Phase, Einstellungen und der Startzeitpunkt
gehören dem Host. Für eine Partie am Küchentisch ist das angemessen – es ist keine
Zugriffskontrolle und gibt auch nicht vor, eine zu sein.

### Was ein Raum je Spiel bedeutet

- **Kniffel** – ein Platz ist eine Spalte. Der einfachste Fall: kein Wert hängt
  von den anderen ab.
- **Qwixx** – ein Platz ist ein Block. Schließt jemand eine Reihe, ist sie bei
  allen gesperrt. Das brauchte **keine Zeile Protokoll**: `closedRows` ist eine
  reine Funktion aller Blöcke, und ob die auf einem Gerät liegen oder von
  mehreren kommen, ist ihr egal. Das Schloss-Feld von Hand bleibt trotzdem – für
  Mitspieler mit Papierblock.
- **Ab ins Beet** – ein Platz ist ein Gärtner, und hier zeigt sich die
  **Bereit-Schranke**: alle tragen ihre Beete gleichzeitig ein und tippen auf
  _Fertig_. Erst wenn jeder fertig ist, geht der Tisch gemeinsam weiter – der
  Bonus hängt schließlich von allen ab. Statt des Blätterns durch alle Gärtner
  sieht jeder nur seinen eigenen.
- **Wizard** – kein Raum. Ansagen und Stiche werden ohnehin reihum an einem
  Block eingetragen; ein zweites Gerät brächte dort nichts.

Zwei Dinge gehören dabei dem Tisch und nicht einem Platz und liegen deshalb beim
Host: die Phase und die Einstellungen (bei Ab ins Beet auch der Durchgang und die
bereits gewerteten Durchgänge). Ein Anführer ist hier einfacher zu verstehen als
drei Geräte, die gleichzeitig weiterschalten. Spieler-Kennungen entstehen pro
Gerät und taugen nicht für den Austausch – wo sie in geteilten Daten vorkämen,
wird an der Grenze auf **Platznummern** übersetzt.

Das Übertragungsverfahren steckt hinter `client/src/sync/transport.ts`. Heute ein
WebSocket zum eigenen Server; ein späterer QR-/WebRTC-Transport (echtes
Peer-to-Peer im lokalen Netz, ganz ohne Server) müsste nur dieselben fünf
Mitglieder erfüllen. Web Bluetooth kommt dafür übrigens **nicht** in Frage: die
API kennt nur die Central-Rolle, ein Browser kann sich nicht als Peripheriegerät
melden – zwei Handys finden sich darüber nie.

### Lokal testen

Zwei Tabs im selben Browserprofil teilen sich Speicher und Gerätekennung. Dafür
gibt es `?device=b`: der Parameter hängt ein Suffix an die Kennung **und**
trennt den localStorage-Namensraum. Ohne ihn ändert sich nichts.

```
Tab 1: http://localhost:5173/kniffel?online=1&device=a   # Raum eröffnen
Tab 2: http://localhost:5173/beitreten/<Code>?device=b   # Namen sagen, beitreten
```

Der Parameter wird beim Weiterleiten mitgenommen, aber nur beim **Laden** der
Seite ausgewertet – ein Tab, der sich seine Kennung merken soll, muss ihn also in
der Adresse haben, mit der er geöffnet wurde.

## Themes und Hell/Dunkel

Es gibt **zwei** Themes – `fa-light` (Papier) und `fa-dark` (Tinte) –, definiert in
[client/src/themes.css](client/src/themes.css). Sie legen Flächen, Radien und
Signalfarben fest; die Formtoken sind in beiden Zeichen für Zeichen gleich, damit
beim Umschalten nur die Farbe wechselt und nie die Form der Bedienelemente.

Was die Apps unterscheidet, ist **eine** Farbe: ihr Akzent. Eine neue App braucht
dafür zwei Zeilen CSS.

| App         | Akzent    | Herkunft                                     |
| ----------- | --------- | -------------------------------------------- |
| Übersicht   | Gold      | `--gold: #c9a15a` des alten Designs          |
| Kniffel     | Gold      | dieselbe Hausfarbe                           |
| Wizard      | Pflaume   | neu, gedeckt                                 |
| Ab ins Beet | Blattgrün | `--leaf: #3f8f3a` des alten Garten-CSS       |
| Qwixx       | Schiefer  | leise, damit die Reihenfarben lauter bleiben |

Alle Werte stehen in oklch – dort ist die erste Zahl die _wahrgenommene_ Helligkeit,
Akzente lassen sich also austauschen, ohne dass der Kontrast kippt. Das Chroma ist
auf 0.13 gedeckelt; die zuvor benutzten eingebauten daisyUI-Themes lagen bis 0.278
(`garden` färbte „Ab ins Beet" neonpink).

Welche Hälfte gilt, entscheidet eine **globale** Einstellung _Auto / Hell / Dunkel_ –
im ⋯-Menü jeder App und auf der Landing-Page. Standard ist die Systemeinstellung.

`data-theme` und `data-accent` sitzen zusammen auf einem Wrapper je Route – so blutet
nichts zwischen den Apps aus – und zusätzlich auf `<html>`, damit Hintergrund,
Scrollbalken und native Bedienelemente stimmen. `<meta name="theme-color">` wird aus dem aktiven Theme
gelesen (und nach Hex normalisiert, weil nicht jeder Browser `oklch()` dort
versteht). Die vier Qwixx-Reihenfarben und die Spielerfarben sind bewusst
theme-unabhängig: das ist Spielmaterial, kein Design.

## Bildschirm wachhalten

Alle vier Spiele halten über die **Screen Wake Lock API** das Display wach,
solange die **Spiel-Ansicht** offen ist; Setup und Ergebnis geben den Lock wieder
frei. Umschaltbar im ⋯-Menü jeder App.

Die Einstellung gilt seit dem Umbau **geräteweit** statt pro Spiel – wer sie
abschaltet, meint sein Gerät, nicht Kniffel. Zu beachten:

- Das System entzieht den Lock, sobald der Tab in den Hintergrund geht – deshalb
  wird er bei `visibilitychange` neu angefordert.
- Voraussetzung ist HTTPS (über Caddy gegeben). Browser ohne `navigator.wakeLock`
  zeigen den Menüpunkt ausgegraut.
- Ein abgelehnter Request (z. B. Energiesparmodus) bleibt still – dann sperrt das
  Display trotzdem, das lässt sich per Web-API nicht umgehen.

## Kleinigkeiten, die überall gelten

- **Zuletzt benutzte Namen** – wer einmal angelegt wurde, lässt sich in jeder App
  mit einem Tipp wieder hinzufügen. Bewusst nur eine Vorschlagsliste und keine
  verwaltete Personenliste: Namen werden beim Anlegen in den Spielstand kopiert,
  eine spätere Änderung schreibt also keine fertigen Spiele um.
- **Verlauf** – beendete Spiele wandern nach IndexedDB (`fa2-history`), nur
  angehängt, nie geändert. Eine Ansicht dafür gibt es absichtlich noch nicht:
  erst sammeln, dann gegen echte Daten bauen.
- **Ergebnis teilen** – als Text, nicht als Bild: `navigator.share` mit Dateien
  kennt Firefox nicht und ist anderswo wacklig, und ein sauber gesetzter Endstand
  liest sich in einer Gruppe ohnehin gut. Ohne Teilen-Dialog landet der Text in
  der Zwischenablage.
- **Würfel** – in Kniffel und Qwixx im ⋯-Menü, falls gerade keine auf dem Tisch
  liegen. Antippen hält einen Würfel fest; ohne das wäre es für Kniffel nutzlos,
  wo genau das Liegenlassen den Zug ausmacht.
- **Vibrieren beim Tippen** – kurzes Rückmelden beim Ankreuzen, abschaltbar.
  `navigator.vibrate` gibt es nur auf Android; iOS ignoriert es stillschweigend.

## Der gemeinsame Rahmen

In den Vorgänger-Apps war rund die Hälfte jeder Datei Kopie: der Wake-Lock-Block,
die Sheet-Mechanik, das Drag & Drop, die Phasenumschaltung, die Rangliste. Das
steht jetzt einmal in `client/src/game/` und `client/src/ui/`; ein Spiel besteht
aus Regeln, einem Reducer und drei Ansichten.

- **`useGameStore`** – ein Reducer (mit immer), Persistenz und optional
  Undo/Redo. Alle Änderungen laufen durch `dispatch`; es gibt keinen zweiten Weg,
  den Spielstand anzufassen. Die früheren ~40 handgeschriebenen
  `save(); render();`-Paare entfallen dadurch ersatzlos – ein vergessenes davon
  war stiller Datenverlust.
- **`GameHost`** – Theme, Wachhalten, ⋯-Menü und Store an einer Stelle.
- **`Sheet`** – Bottom-Sheet auf `<dialog>`; Scrim, Escape und Fokusfalle kommen
  vom Browser.
- **`Container`** – die eine Stelle, an der Inhaltsbreiten stehen. `GameLayout`
  legt sie als `--fa-w` fest, Kopf, Inhalt und Fuß lesen denselben Wert; die
  Kopfzeile _kann_ dadurch nicht breiter sein als ihr Inhalt.
- **`PlayerRow` / `PlayerTable` / `SetupCard` / `StepTabs` / `SegmentedControl`** –
  Muster, die vorher fünf- bis achtmal einzeln im Code standen.
- **`SortablePlayerList`** – dnd-kit statt handgeschriebenem Pointer-Drag, damit
  auch per Tastatur bedienbar.

**Undo** gibt es nur in Wizard und Ab ins Beet und es meint dort genau eine Sache:
die letzte gewertete Runde bzw. den letzten Durchgang wieder aufmachen. Kniffel
(„Feld leeren") und Qwixx (letztes Kreuz lösen) haben präzisere Mittel.

Gespielt wird aus `localStorage` im Namensraum `fa2:`. Stände einer anderen
Version werden verworfen statt migriert – ein halb verstandener alter Stand ist
schlimmer als ein frischer Block. Die Stände der Vorgänger-Apps (`kniffel_v1`,
`qwixx_v1` …) werden **nicht** übernommen.

## Tests

Getestet wird, wo die Regeln stehen: `client/src/apps/*/rules.ts`. Keine
Komponententests, kein jsdom. Festgenagelt ist vor allem, was ein Umschreiben
still ändern würde:

- **Kniffel** – `0` heisst gestrichen, ein fehlender Eintrag heisst leer; beides
  überlebt den Weg durch JSON. Bonus ab genau 63.
- **Wizard** – Wertung in allen vier Fällen, Rundenzahl 30/20/15/12/10, und dass
  ein später dazugekommener Spieler als 0/0 zählt statt als NaN.
- **Ab ins Beet** – haben alle gleich viele Beetpunkte, bekommt **jeder** 10
  (`max` wird vor `min` geprüft); Tierkarten-Obergrenze je Durchgang.
- **Qwixx** – dasselbe Kreuzmuster wertet in allen drei Blöcken gleich; jedes
  Layout ist 11 Felder breit; das Lösen des letzten Kreuzes hebt das Schloss auf.

---

## App 1: Kniffel – Spielblock

Digitaler Kniffel-/Yahtzee-Punkteblock. **2–8 Spieler**, drei Phasen:

1. **Setup:** Spieler anlegen, Reihenfolge per Drag & Drop (Griff ≡).
2. **Spiel:** Score-Tabelle mit klebender Kategorie-Spalte und einer Spalte je
   Spieler. Leere Zelle antippen → Eingabe-Sheet mit den gültigen Werten (bzw.
   Streichen). Oberer Block, **35er-Bonus ab 63**, unterer Block und Gesamtsumme
   werden live berechnet; wer die wenigsten Einträge hat, ist als „am Zug" markiert.
3. **Ergebnis:** Rangliste mit Medaillen und Aufschlüsselung.

## App 2: Wizard – Spielblock

Punkteblock zum Stich-Vorhersage-Kartenspiel _Wizard_. **2–6 Spieler**,
Rundenzahl automatisch = ⌊60 ÷ Spieler⌋.

1. **Setup:** Spieler anlegen und sortieren; Umschalter für das **Ansage-Verbot**.
2. **Spiel (rundenweise, geführt):** Schritt **Ansagen** (Stepper 0…r je Spieler;
   der Geber sagt zuletzt an) und Schritt **Stiche** (Summe muss genau r ergeben).
   Wertung: **Ansage getroffen → 20 + 10·Stiche**, sonst **−10 je Stich
   Abweichung**. „Block ansehen" zeigt die komplette Tabelle.
3. **Ergebnis:** Endrangliste, getroffene Ansagen je Spieler.

Das Ansage-Verbot sperrt bewusst nur den **Weiter**-Schritt, nicht die Stepper:
beim Eintragen darf man durch eine verbotene Summe hindurchlaufen.

## App 3: Ab ins Beet – Zähler

Punktezähler zum Brettspiel _Ab ins Beet_ (Game Factory). **2–4 Gärtner**,
**3 Durchgänge** mit je drei Wertungsphasen:

1. **① Beete** (geführter Rechner, ein Gärtner nach dem anderen): je Beet
   Farbigkeit (einfarbig 3 / zweifarbig 1 / dreifarbig 0) + ganze Salate (+1 je) +
   „keine halben Salate" (+1) + Tomate-Paprika-Paare (+1 je).
2. **② Bonus** (automatisch): meiste Beetpunkte → 10, wenigste → 0, dazwischen → 5.
   Haben alle gleich viele, bekommt jeder 10.
3. **③ Tierkarten:** 5 Punkte je erfülltem Beet, höchstens so viele wie die
   Durchgangsnummer.

Endstand über drei Durchgänge inkl. **Gleichstand-Tie-Break** (letzter Durchgang).

## App 4: Qwixx – Spielblock

Digitaler Spielblock zum Würfelspiel _Qwixx_. **2–5 Spieler**, zwei Betriebsarten:
**Gemeinsam** (alle Blöcke auf einem Gerät, Umschalten über die Spieler-Chips)
oder **Einzeln** (jeder auf seinem Gerät, persönliche Ergebnis-Karte).

1. **Setup:** Modus, **Spielblock** (siehe unten) und Spieler wählen; dazu zwei
   Optionen, die – wie die Blockwahl – „Spiel zurücksetzen" überleben:
   - **Punkte live anzeigen** (Standard: **aus**) – aus bleibt der Punktestand bis
     zur Auswertung verdeckt: Kopfzeile, Spieler-Chips inkl. Krone und Übersicht
     zeigen `·`, je Reihe steht die Zahl der Kreuze (`3×`) statt der Wertung. In
     der Auswertung sind die Punkte immer sichtbar.
   - **Ende nur nach Regel** (Standard: **an**) – „Auswerten" bleibt gesperrt, bis
     eine echte Endbedingung erfüllt ist.
2. **Spiel:** vier Farbreihen à 11 Zahlen. Regelkonform geführt: links liegende
   Zahlen sind nach einem Kreuz gesperrt, die **letzte Zahl** lässt sich erst ab
   **5 Kreuzen** ankreuzen und schliesst die Reihe (das Schloss zählt als
   zusätzliches Kreuz). Das rechteste Kreuz lässt sich zum Korrigieren wieder
   lösen. Schliesst ein Mitspieler eine Reihe, wird sie gesperrt – im
   Gemeinsam-Modus automatisch, sonst per Schloss-Feld von Hand. Vier
   **Fehlwurf**-Kästchen à −5. Wertung je Reihe über die **Dreieckszahlen**.
3. **Spielende:** zwei Reihen geschlossen oder vier Fehlwürfe.
4. **Ergebnis:** Rangliste bzw. persönliche Karte, Übersicht aller Reihen und
   **„↩︎ Weiterspielen"** (zurück in den Block, falls versehentlich ausgewertet –
   nichts wird zurückgesetzt).

### Spielblöcke: Original und „Qwixx gemixxt"

Neben dem Originalblock stehen die beiden Blöcke der offiziellen Erweiterung
**„Qwixx gemixxt"** (NSV) zur Auswahl. Laut deren Anleitung bleiben _„alle Regeln
des Qwixx-Würfelspieles exakt erhalten"_ – es ändert sich **nur der Aufdruck**.
Entsprechend fasst die Umsetzung keine Logik an: Kreuze, Sperren, Wertung und
Endbedingung hängen ausschliesslich an der **Feldposition** (Index 0…10 je Reihe),
Zahlen und Farben sind reine Beschriftung. Ein Test hält fest, dass dasselbe
Kreuzmuster in allen drei Blöcken gleich wertet.

- **gemixxt A** – Zahlenfolge wie im Original, aber jede Reihe ist in vier
  **Farbsegmente** geteilt. Das letzte Segment trägt immer die Reihenfarbe, das
  Schloss bleibt also rot/gelb/grün/blau.
- **gemixxt B** – Reihen bleiben einfarbig, die **Zahlen sind gemischt**.
  Geschlossen wird darum mit **Rot 11, Gelb 10, Grün 3, Blau 4**. Statt ▲/▼ steht
  am Reihenkopf ein →, weil die Reihe weder auf- noch absteigend läuft.

Die Layouts sind **fest eingebaut** und entsprechen dem gedruckten Block – bewusst
nicht zufällig gemischt: im Einzeln-Modus muss auf allen Geräten derselbe Block
stehen, und Mitspieler mit Papierblock sollen mitspielen können. Umgestellt wird
nur im Setup: ein Wechsel mitten im Spiel würde die vorhandenen Kreuze
stillschweigend umbeschriften.
