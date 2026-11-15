# onboarding-app

Ausgeliefert über GitHub Pages unter https://app.tanjawissel.ch (DNS bei cyon: CNAME `app` → `tanjawissel.github.io.`).

- `index.html` – die App (Login per E-Mail-Link oder 6-stelligem Code, Einladung annehmen, Heute, Kontakte, Kompass, Team, Profil, Erinnerungen).
  Nach Änderungen an `app/*` die Versionsnummer `?v=…` in `index.html` hochzählen (GitHub Pages hält Dateien 10 Minuten im Cache).
- `app/app.js` – Kern: Login, Router, Profil, Team mit Sponsor-Ansicht; `app/config.js` – öffentliche Supabase-Adresse und anon-Schlüssel
- `app/crm.js` – CRM und Tagesdashboard (Tabellen kontakte, notizen, verlauf, entwuerfe, prioritaeten); Entwürfe über die Server-Funktion `wortstil`
- `app/kompass.js` – Freiheits-Kompass und Wortstil-Probe. Gespeichert werden nur Ergebnis, Rahmen, Ziele, Freigaben und Steckbrief, nie Einzelantworten
- `app/erinnerungen.js` – Erinnerungen (Bereich 5): Home-Bildschirm-Anleitung, Push einschalten (Einwilligung), Profil › Erinnerungen, Kalender-Abo, Karte „Deine ersten Schritte“, Einladung per Mail
- `sw.js`, `manifest.webmanifest`, `icons/` – installierbare App (PWA): Push empfangen, offline starten, App-Symbol
- `app/crm-data.js` – Stammdaten des CRM (hier ändern; der alte Klick-Prototyp liegt seit 15.11.2026 in `../_archiv/`)
- `app/kompass-data.js` – Kopie der Stammdaten aus `../Prototyp Freiheits-Kompass/data.js`
- `app/vendor/supabase-2.117.2.js` – supabase-js (MIT), lokal eingebunden statt aus einem CDN
- `datenschutz.html` – vorläufige Datenschutzhinweise für die Testphase (endgültige Fassung kommt aus Bereich 4)
- `fonts/` – Schriften lokal (keine Google-Fonts-Anfragen)
- `CNAME` – eigene Domain für GitHub Pages

Hier liegt nur Programmcode und der öffentliche anon-Schlüssel: keine Daten, keine geheimen Schlüssel.
Daten liegen in Supabase Frankfurt (`gyybtsuirbnidazusenv`), geschützt durch Row Level Security (`../supabase/migrations/`).
Lokal ansehen: Vorschau „onboarding-app“ (Port 8772). Lokal schreibt die gespielte KI „wortstil-dev“ (Port 8770) die Entwürfe, weil die echte Server-Funktion nur Anfragen von app.tanjawissel.ch annimmt. Anleitung Hosting: `../Hosting app.tanjawissel.ch - Anleitung.md`.
