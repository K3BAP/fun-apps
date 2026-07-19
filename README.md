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
    └── drinks/            # App 1: Kellner-Bestellsystem (Bitburger Wirtshaus Trier)
        ├── index.html
        ├── styles.css
        ├── data.js        # kompletter Getränkekatalog (aus offizieller Speisekarte)
        └── app.js         # Such-/Filter-/Warenkorb-/Tisch-Logik
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
