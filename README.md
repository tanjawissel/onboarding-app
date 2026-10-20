# onboarding-app

Ausgeliefert über GitHub Pages unter https://app.tanjawissel.ch (DNS bei cyon: CNAME `app` → `tanjawissel.github.io.`).

- `index.html` – die App (Login per E-Mail-Link oder 6-stelligem Code, Einladung annehmen, Heute, Kontakte, Kompass, Team, Profil).
  Nach Änderungen an `app/*` die Versionsnummer `?v=…` in `index.html` hochzählen (GitHub Pages hält Dateien 10 Minuten im Cache).
- `app/app.js` – Kern: Login, Router, Profil, Team mit Sponsor-Ansicht; `app/config.js` – öffentliche Supabase-Adresse und anon-Schlüssel
- `app/crm.js` – CRM und Tagesdashboard (Tabellen kontakte, notizen, verlauf, entwuerfe, prioritaeten); Entwürfe über die Server-Funktion `wortstil`
- `app/kompass.js` – Freiheits-Kompass und Wortstil-Probe. Gespeichert werden nur Ergebnis, Rahmen, Ziele, Freigaben und Steckbrief, nie Einzelantworten
- `app/crm-data.js`, `app/kompass-data.js` – Kopien der Stammdaten aus `../Prototyp CRM/data.js` und `../Prototyp Freiheits-Kompass/data.js`
- `app/vendor/supabase-2.117.2.js` – supabase-js (MIT), lokal eingebunden statt aus einem CDN
- `datenschutz.html` – vorläufige Datenschutzhinweise für die Testphase (endgültige Fassung kommt aus Bereich 4)
- `prototyp/` – Kopie von `Prototyp CRM/` (klickbar, Daten nur im Browser)
- `fonts/` – Schriften lokal (keine Google-Fonts-Anfragen)
- `CNAME` – eigene Domain für GitHub Pages

Hier liegt nur Programmcode und der öffentliche anon-Schlüssel: keine Daten, keine geheimen Schlüssel.
Daten liegen in Supabase Frankfurt (`gyybtsuirbnidazusenv`), geschützt durch Row Level Security (`../supabase/migrations/`).
Lokal ansehen: Vorschau „onboarding-app“ (Port 8772). Lokal schreibt die gespielte KI „wortstil-dev“ (Port 8770) die Entwürfe, weil die echte Server-Funktion nur Anfragen von app.tanjawissel.ch annimmt. Anleitung Hosting: `../Hosting app.tanjawissel.ch - Anleitung.md`.
