# fun-apps

Sammelprojekt für kleine Spaß- und Prototyp-Webapps unter **fun.sponholz.org**.
Ausgeliefert statisch von einem einzigen `nginx:alpine`-Container, TLS/Routing über Caddy.

## Aufbau

```
fun-apps/
├── docker-compose.yml     # nginx:alpine, container fun-apps-web, ./site:ro, Netz proxy-tier
├── nginx/
│   └── default.conf       # Auslieferung + Cache-Control: no-cache (siehe „Caching")
└── site/
    ├── index.html         # Landing-Page (Kachel-Liste aller Apps)
    ├── styles.css
    ├── drinks/            # App 1: Kellner-Bestellsystem (Bitburger Wirtshaus Trier)
    │   ├── index.html
    │   ├── styles.css
    │   ├── data.js        # kompletter Getränkekatalog (aus offizieller Speisekarte)
    │   └── app.js         # Such-/Filter-/Warenkorb-/Tisch-Logik
    ├── kniffel/           # App 2: Kniffel-Spielblock (digitaler Punkteblock)
    │   ├── index.html
    │   ├── styles.css
    │   └── app.js         # Setup/Drag&Drop-, Score-Block- und Ergebnis-Logik
    ├── wizard/            # App 3: Wizard-Spielblock (Ansage/Stiche, kumulativ)
    │   ├── index.html
    │   ├── styles.css
    │   └── app.js         # Setup/Drag&Drop-, Runden- und Ergebnis-Logik
    ├── beet/              # App 4: „Ab ins Beet"-Zähler (Beet/Bonus/Tier, 3 Durchgänge)
    │   ├── index.html
    │   ├── styles.css     # eigenes verspieltes Garten-Theme
    │   └── app.js         # Setup/Drag&Drop-, Phasen- und Ergebnis-Logik
    └── qwixx/             # App 5: Qwixx-Spielblock (4 Farbreihen, Schlösser, Fehlwürfe)
        ├── index.html
        ├── styles.css
        └── app.js         # Setup/Optionen-, Block- und Ergebnis-Logik
```

Kein Build-Step, keine externen CDN-Abhängigkeiten. Weil nginx echte Unterordner
ausliefert, funktioniert jeder Subpfad (`/drinks/`) ohne Base-Path-Konfiguration –
alle Asset-Pfade der Apps sind **relativ** (`./styles.css` usw.).

## Neue App hinzufügen

1. Neuen Ordner `site/<app>/` mit `index.html` (+ relativen Assets) anlegen.
2. Kachel in `site/index.html` ergänzen (Link `./<app>/`).
3. `docker restart fun-apps-web` (Bind-Mount, kein Rebuild nötig – Neustart genügt
   nur, wenn nginx den Ordner cachet; i. d. R. reicht Reload im Browser).

## Deployment

```bash
docker compose -f /opt/docker/fun-apps/docker-compose.yml up -d
```

Caddy-Block (in `/opt/docker/caddy/Caddyfile`):

```
fun.sponholz.org {
	reverse_proxy fun-apps-web:80
}
```

Nach Caddyfile-Änderung: `docker restart caddy` (Single-File-Bind-Mount, kein Reload-Watch).

## Caching

Ohne Build-Step gibt es keine gehashten Dateinamen – `app.js` heißt nach jedem Update
weiter `app.js`. Lieferte nginx (wie anfangs) **gar kein** `Cache-Control`, raten Browser
die Haltbarkeit heuristisch aus `Last-Modified` (Faustregel ~10 % des Dateialters) und
zeigen stunden- bis tagelang alte Stände; auf Android (Brave/Chrome) half nur „Cache
leeren" von Hand. `nginx/default.conf` setzt deshalb:

```
add_header Cache-Control "no-cache" always;
```

`no-cache` heißt **nicht** „nicht cachen", sondern „vor jeder Nutzung revalidieren":
Der Browser schickt `If-None-Match` mit, nginx antwortet per ETag mit `304` (0 Byte
Body). Updates sind damit sofort da, der Reload bleibt trotzdem günstig.

Prüfen:

```bash
curl -sI https://fun.sponholz.org/qwixx/app.js | grep -i cache-control   # -> no-cache
```

Nach Änderung an `nginx/default.conf`: `docker restart fun-apps-web` (Ordner-Mount,
kein Container-Neubau nötig). Für Clients, die **vor** dieser Umstellung schon eine
Datei heuristisch gecacht haben, gilt der alte Cache-Eintrag noch bis zu seinem
geratenen Ablauf – dort einmalig hart neu laden, danach greift die Revalidierung.

## App 1: Drinks – Kellner-System

Mobile-first Prototyp eines Kellner-Bestellsystems. Suche + Kategorie-Filter über den
kompletten Getränkekatalog, Antippen legt Getränke (mit Größen-/Jumbo-Variante) in den
Warenkorb, mehrere Tische parallel (persistiert in `localStorage`), Happy-Hour-Umschalter
(Cocktails/Caipis halber Preis bis 22 Uhr), laufende Summe, "Bestellung absenden" (Mock).
Kein Backend. Datenquelle: offizielle Speisekarte BIWI-TR-Speisekarte-03-2024.

## App 2: Kniffel – Spielblock

Digitaler Kniffel-/Yahtzee-Punkteblock, mobile-first, kein Backend (Spielstand in
`localStorage`). Ablauf in drei Phasen:

1. **Setup:** 2–8 Spieler anlegen, Reihenfolge per **Drag & Drop** (Griff ≡) sortieren.
2. **Spiel:** Score-Tabelle mit sticky Kategorie-Spalte und einer Spalte je Spieler.
   Leere Zelle antippen → Eingabe-Sheet mit gültigen Werten (bzw. Streichen). Oberer
   Block, **35er-Bonus ab 63**, unterer Block und Gesamtsumme werden live berechnet;
   der Spieler mit den wenigsten Einträgen ist dezent als „am Zug" markiert.
3. **Ergebnis:** Rangliste mit Medaillen, Gewinner-Hervorhebung und Aufschlüsselung;
   „Nochmal (gleiche Spieler)" oder „Neues Spiel".

## App 3: Wizard – Spielblock

Digitaler Punkteblock zum Stich-Vorhersage-Kartenspiel *Wizard*, mobile-first, kein
Backend (Spielstand in `localStorage`). **2–6 Spieler**, Rundenzahl automatisch = ⌊60 ÷
Spieler⌋ (2→30, 3→20, 4→15, 5→12, 6→10). Ablauf:

1. **Setup:** Spieler anlegen, Reihenfolge per **Drag & Drop**; Umschalter für das
   **Ansage-Verbot** (Summe der Ansagen darf ≠ Stichzahl der Runde sein).
2. **Spiel (rundenweise, geführt):** Standings-Leiste mit laufendem Punktestand, dann
   Schritt **Ansagen** (Stepper 0…r je Spieler; Geber sagt zuletzt an, bei aktivem Verbot
   ist eine Summe = Stichzahl gesperrt) und Schritt **Stiche** (Stepper 0…r, Summe muss
   genau r ergeben). Wertung je Runde: **Ansage getroffen → 20 + 10·Stiche**, sonst **−10
   je Stich Abweichung**. „Block ansehen" zeigt die komplette Tabelle (Ansage·Stiche +
   Laufsumme je Runde).
3. **Ergebnis:** Endrangliste mit Medaillen; Gewinner = höchste Summe; getroffene Ansagen
   je Spieler; „Nochmal (gleiche Spieler)" oder „Neues Spiel".

## App 4: Ab ins Beet – Zähler

Punktezähler zum Brettspiel *Ab ins Beet* (Game Factory), mobile-first, kein Backend
(Spielstand in `localStorage`), **eigenes verspieltes Garten-Theme** (hell, Erd-Braun +
Grün + Gemüse-Farben). **2–4 Gärtner**, **3 Durchgänge** mit je 3 Wertungsphasen:

1. **① Beete (geführter Rechner, Pager pro Spieler):** je Beet Farbigkeit (einfarbig 3 /
   zweifarbig 1 / dreifarbig 0) + ganze Salate (+1 je) + „keine halben Salate" (+1) +
   Tomate-Paprika-Paare (+1 je) antippen → App rechnet die Beetpunkte.
2. **② Bonus (automatisch):** meiste Beetpunkte → 10, wenigste → 0, dazwischen → 5.
3. **③ Tierkarten:** 5 Punkte je Beet, das eine Tierkarte erfüllt (Anzahl selbst zählen,
   max = Durchgangsnummer).

Endstand über 3 Durchgänge inkl. **Gleichstand-Tie-Break** (letzter Durchgang), Rangliste
mit Medaillen und Block-Übersicht. Wertung 1:1 nach offizieller Anleitung.

## App 5: Qwixx – Spielblock

Digitaler Spielblock zum Würfelspiel *Qwixx*, mobile-first, kein Backend (Spielstand in
`localStorage`). **2–5 Spieler**, zwei Betriebsarten: **Gemeinsam** (alle Blöcke auf einem
Gerät, Umschalten über Spieler-Chips) oder **Einzeln** (jeder öffnet die Seite auf seinem
eigenen Gerät, persönliche Ergebnis-Karte statt Rangliste).

1. **Setup:** Modus wählen, Spieler anlegen, Reihenfolge per **Drag & Drop**; dazu zwei
   Optionen (gelten für beide Modi, überleben „Spiel zurücksetzen"):
   - **Punkte live anzeigen** (Standard: an) – aus bleibt der Punktestand während des
     Spiels verdeckt: Kopfzeile, Spieler-Chips inkl. Krone des Führenden und die
     Übersichts-Tabelle zeigen `·`, je Reihe steht die Zahl der Kreuze (`3×`) statt der
     Wertung. In der Auswertung sind die Punkte immer sichtbar.
   - **Ende nur nach Regel** (Standard: aus) – an ist „Auswerten" (Button **und**
     Menüpunkt) gesperrt, bis eine echte Endbedingung erfüllt ist.
2. **Spiel:** vier Farbreihen à 11 Zahlen – Rot/Gelb aufsteigend 2→12, Grün/Blau
   absteigend 12→2. Regelkonform geführt: links liegende Zahlen sind nach einem Kreuz
   gesperrt, die **letzte Zahl** lässt sich erst ab **5 Kreuzen** in der Reihe ankreuzen
   und schließt die Reihe (Schloss zählt als zusätzliches Kreuz). Das rechteste Kreuz
   lässt sich zum Korrigieren wieder lösen. Schließt ein **Mitspieler** eine Reihe, wird
   sie per Schloss-Feld gesperrt (im Gemeinsam-Modus automatisch aus den anderen
   Blöcken abgeleitet). Vier **Fehlwurf**-Kästchen à −5. Wertung je Reihe über die
   **Dreieckszahlen** (1, 3, 6, 10 … 78), Summe minus Fehlwürfe.
3. **Spielende:** erreicht, sobald **zwei Reihen geschlossen** sind oder ein Spieler
   **4 Fehlwürfe** hat – der Block zeigt dann ein Hinweis-Banner.
4. **Ergebnis:** Rangliste mit Medaillen (bzw. persönliche Karte im Einzelmodus),
   Aufschlüsselung je Reihe, „📋 Übersicht aller Reihen", **„↩︎ Weiterspielen"** (zurück
   in den Block, falls versehentlich ausgewertet – nichts wird zurückgesetzt) sowie
   „Nochmal (gleiche Spieler)" oder „Neues Spiel".
