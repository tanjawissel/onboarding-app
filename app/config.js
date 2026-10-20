// Öffentliche Verbindungsdaten der App (Supabase Frankfurt).
// Der anon-Schlüssel ist bewusst öffentlich: Er erlaubt nur, was die Datenbank-Regeln (RLS) zulassen.
// Geheime Schlüssel (service_role, SMTP, Claude) gehören NIE in dieses Repository.
window.APP_CONFIG = {
  supabaseUrl: 'https://gyybtsuirbnidazusenv.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5eWJ0c3VpcmJuaWRhenVzZW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MzYwNjIsImV4cCI6MjEwODAxMjA2Mn0.IH1OFK6sGAjdo6Uxp8YBG_Ry5KwtyMNBuSq7siF3W6U',
  einladungUrl: 'https://gyybtsuirbnidazusenv.supabase.co/functions/v1/einladung',
  // KI-Entwürfe und Wortstil-Auswertung. Lokal (Vorschau) läuft die gespielte Server-Funktion
  // „wortstil-dev“ auf Port 8770, weil die echte nur Anfragen von app.tanjawissel.ch annimmt.
  wortstilUrl: location.hostname === 'localhost' ? 'http://localhost:8770/'
    : 'https://gyybtsuirbnidazusenv.supabase.co/functions/v1/wortstil',
  // Erinnerungen (Bereich 5): Probe-Nachricht, Kalender-Abo, Einladung per Mail
  erinnerungUrl: 'https://gyybtsuirbnidazusenv.supabase.co/functions/v1/erinnerung',
  kalenderUrl: 'https://gyybtsuirbnidazusenv.supabase.co/functions/v1/kalender',
  einladungMailUrl: 'https://gyybtsuirbnidazusenv.supabase.co/functions/v1/einladung_mail',
  // Öffentlicher Web-Push-Schlüssel (VAPID). Der private Schlüssel liegt nur als Supabase-Secret vor.
  vapidPublicKey: '',
  appUrl: 'https://app.tanjawissel.ch/',
  academyUrl: 'https://academy.tanjawissel.ch',
};
