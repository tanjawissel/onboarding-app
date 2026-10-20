# onboarding-app

Ausgeliefert über GitHub Pages unter https://app.tanjawissel.ch (DNS bei cyon: CNAME `app` → `tanjawissel.github.io.`).

- `index.html` – die App (Login per E-Mail-Link oder 6-stelligem Code, Einladung annehmen, Heute, Team, Profil)
- `app/app.js` – Bildschirme und Logik; `app/config.js` – öffentliche Supabase-Adresse und anon-Schlüssel
- `app/vendor/supabase-2.117.2.js` – supabase-js (MIT), lokal eingebunden statt aus einem CDN
- `datenschutz.html` – vorläufige Datenschutzhinweise für die Testphase (endgültige Fassung kommt aus Bereich 4)
- `prototyp/` – Kopie von `Prototyp CRM/` (klickbar, Daten nur im Browser)
- `fonts/` – Schriften lokal (keine Google-Fonts-Anfragen)
- `CNAME` – eigene Domain für GitHub Pages

Hier liegt nur Programmcode und der öffentliche anon-Schlüssel: keine Daten, keine geheimen Schlüssel.
Daten liegen in Supabase Frankfurt (`gyybtsuirbnidazusenv`), geschützt durch Row Level Security (`../supabase/migrations/`).
Lokal ansehen: Vorschau „onboarding-app“ (Port 8772). Anleitung Hosting: `../Hosting app.tanjawissel.ch - Anleitung.md`.
