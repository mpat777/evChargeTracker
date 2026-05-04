# ⚡ Lade-Tracker

E-Auto Lade-Tracker für zwei Personen. Gemeinsame Daten auf iPhone & Android — gesichert mit PIN, gespeichert als JSON im eigenen GitHub-Repo.

## Features

- 🔐 PIN-Schutz (4-6 Stellen)
- 📊 Kilometerstand, kWh & Kosten eintragen
- 📍 Ladestationen-Dropdown mit Gedächtnis
- 👥 Zwei Nutzer (Ich / Partnerin)
- 🔄 Gemeinsame Daten — beide Handys sehen dasselbe
- 📈 Statistiken: Verbrauch, Kosten, Monatsübersicht
- 📥 CSV-Export für Excel
- 📱 Mobile-optimiert

## Einrichtung (einmalig, 5 Minuten)

### 1. GitHub Repo erstellen

Erstelle ein **privates** Repository auf github.com (z.B. `lade-tracker`).

### 2. Personal Access Token erstellen

1. GitHub → **Settings** → **Developer Settings** → **Personal access tokens** → **Fine-grained tokens**
2. **Generate new token**
3. Name: `Lade-Tracker`
4. Expiration: Kein Ablauf (oder 1 Jahr)
5. **Repository access**: Nur dein lade-tracker Repo auswählen
6. **Permissions**: Contents → **Read and Write**
7. Token kopieren und sicher aufbewahren!

### 3. Code deployen

```bash
git clone https://github.com/DEIN-USERNAME/lade-tracker.git
cd lade-tracker
# Alle Dateien aus dem ZIP hier reinkopieren
git add .
git commit -m "Initial commit"
git push
```

### 4. GitHub Pages aktivieren

1. Repo → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Warten bis der erste Build durch ist (~2 Min)

### 5. Auf dem Handy öffnen

1. `https://DEIN-USERNAME.github.io/lade-tracker/` aufrufen
2. Repo-Name und Token eingeben (wird lokal im Browser gespeichert)
3. PIN festlegen (wird im Repo als JSON gespeichert)
4. Fertig! Den Link an deine Partnerin schicken

> **Tipp**: Seite zum Homescreen hinzufügen für App-Feeling!

## So funktioniert die Datenbank

Alle Daten (PIN, Einträge, Ladestationen) werden als eine JSON-Datei (`data/tracker.json`) in eurem GitHub-Repo gespeichert. Vorteile:

- **Kostenlos** — kein Backend-Server nötig
- **Privat** — privates Repo = nur ihr habt Zugriff
- **Versioniert** — jede Änderung wird als Git-Commit gespeichert
- **Sync** — mit dem 🔄 Button holt ihr den neuesten Stand

## Lokal entwickeln

```bash
npm install
npm run dev
```

## Anpassen

- **Repo-Name**: In `vite.config.js` → `base: '/DEIN-REPO-NAME/'`
- **Nutzernamen**: In `LadeTracker.jsx` → `["Ich","Partnerin"]` ändern
- **Farben**: In `LadeTracker.jsx` → `const C = { ... }`
