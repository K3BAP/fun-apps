# fun-apps

Sammelprojekt für kleine Spaß- und Prototyp-Webapps unter **fun.sponholz.org**.
Ausgeliefert statisch von einem einzigen `nginx:alpine`-Container, TLS/Routing über Caddy.

## Aufbau

```
fun-apps/
├── docker-compose.yml     # nginx:alpine, container fun-apps-web, ./site:ro, Netz proxy-tier
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
    └── wizard/            # App 3: Wizard-Spielblock (Ansage/Stiche, kumulativ)
        ├── index.html
        ├── styles.css
        └── app.js         # Setup/Drag&Drop-, Runden- und Ergebnis-Logik
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
