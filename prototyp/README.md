# Prototyp: CRM + Tagesdashboard

Klickbarer Prototyp für Bereich 1 der Onboarding-App (Stand 20.10.2026).
Grundlage: `../CRM - Datenmodell und Skizzen - Entwurf zur Freigabe.md` (freigegeben 20.10.2026).

## Öffnen
- **Einfach:** `index.html` doppelklicken. Läuft im Browser, auch ohne Internet.
- **In Claude Code:** Vorschau „crm-prototyp“ (Port 8771).
- **Mit KI-Entwürfen:** Testcode im Profil eintragen oder per Link mitgeben: `index.html?code=DEIN-CODE`. Die KI läuft über die Server-Funktion `wortstil` (Adresse in `config.js`).
- **KI lokal ohne Kosten testen:** Vorschau „wortstil-dev“ starten (gespielte KI auf Port 8770), dann `http://localhost:8771/?ai=http://localhost:8770&code=probe`.
- Am besten in Handygröße ansehen (die App ist fürs Handy gebaut).

## Was er kann
- **Heute (Dashboard):** Begrüßung je nach Uhrzeit (Grenzen im Profil einstellbar), Kacheln *Kontakte* und *Follow-ups*, 3 Prioritäten zum Abhaken mit Zähler „x von 3 erledigt“, Wochenziel „neue Kontakte angesprochen“ (Mo–So), Block „Gespräch dokumentieren“.
  - Die Prioritäten schlägt die App jeden Morgen vor: fällige Follow-ups → neue Kontakte → neue Kunden ohne Danke. „✎ anpassen“ ändert sie.
  - Wer eine Priorität zu einem *neuen* Kontakt abhakt, wird gefragt, ob der Status auf *Angesprochen* soll (zählt fürs Wochenziel). Bei einem fälligen Follow-up fragt die App nach dem nächsten.
- **Kontakte:** Suche, Filter nach „Fällig“ und Status, fällige Kontakte zuerst.
- **Kontakt anlegen/bearbeiten:** Name (Pflicht), Herkunft, Kanal, Telefon (optional), Typ (geschätzt) mit Schätzhilfe aus zwei Fragen, „Offen für das Business-Thema“, Einverständnis-Haken, SmartShip-Häkchen bei Kunden.
- **Kontaktdetail:** Status ändern mit Follow-up-Vorschlag (7/7/3/7/14 Tage, 3 Monate), Follow-up erledigen oder verschieben, Notiz, Sprachnotiz, Typ mit Datenschutz-Hinweis, gemerkte Entwürfe, Verlauf, Löschen.
- **Gespräch dokumentieren:** Textfeld mit Hinweis aufs Mikrofon der Handy-Tastatur (Diktieren statt Aufnahme, entschieden 20.10.2026), Kontakt wählen oder neu anlegen, Status und Follow-up gleich mit setzen.
- **Nachrichtenentwurf (mit KI, Etappe 3):** 5 Arten (Erstkontakt, Einladung zum Test, Zum Ausprobieren einladen, Nachfassen, Danke & Kundenpflege), passend zum Status vorausgewählt. Der Aufbau richtet sich nach dem Typ des Kontakts. Business-Zeile nur bei Freischaltung am Kontakt *und* Auswahl im Entwurf. Mit Testcode schreibt die KI den Entwurf aus Steckbrief (Stimme), Typ (Aufbau), Art (Situation) und den letzten 3 Notizen; „Neuer Versuch“ und „Was soll anders sein?“ fragen die KI erneut. Ohne Testcode oder bei einem Fehler gibt es den festen Beispielentwurf. Kopieren, „In WhatsApp öffnen“ (mit Telefonnummer direkt im Chat, sonst Chat wählen), Merken. Danach fragt die App nach Status und Follow-up.
- **Profil:** Vorname, Wochenziel, Mein Superpatch-Link, Begrüßungszeiten, Wortstil-Steckbrief (Beispiel, anpassbar; in der App aus der Wortstil-Probe), Testcode für die KI, Beispieldaten zurücksetzen.

## Was er (noch) nicht kann
- **KI nur mit Testcode:** Ohne Code bleiben es feste Beispieltexte (`data.js` → `DRAFTS`).
- **Keine Aufnahme in der App:** Gesprochen wird über die Diktierfunktion der Tastatur. Die App selbst verarbeitet keine Audiodaten.
- **Kein Login, kein Server:** Daten liegen nur im Speicher dieses Browsers (localStorage). Die Beispielkontakte sind erfunden. „Beispieldaten zurücksetzen“ im Profil stellt den Anfang wieder her.
- Die App versendet nie selbst, auch später nicht.

## Was an die KI geht
Pro Entwurf: Wortstil-Steckbrief, Entwurfsart, geschätzter Typ, die letzten 3 Notizen zum Kontakt (Vorname ersetzt durch [Name]), Business ja/nein. **Nicht:** Name, Telefonnummer, Superpatch-Link. Die KI schreibt [Name] und [Link], die App setzt beides selbst ein. Der Prompt steht in `../supabase/functions/_shared/wortstil-prompts.js` → `crmDraftPrompt`.

## Dateien
- `index.html`, `styles.css`: Gerüst und Stil (gleiche Farben und Schriften wie der Freiheits-Kompass, Schriften in `fonts/`)
- `config.js`: Adresse der Server-Funktion (lokal per `?ai=http://localhost:…` überschreibbar)
- `data.js`: Statuswerte, Entwurfsarten, Typen, Beispielentwürfe, Beispiel-Steckbrief
- `app.js`: Bildschirme und Logik. Die Daten im Speicher folgen dem Datenmodell (kontakte, notizen, verlauf, entwuerfe, prioritaeten, profil).
