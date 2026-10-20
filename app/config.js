// Öffentliche Verbindungsdaten der App (Supabase Frankfurt).
// Der anon-Schlüssel ist bewusst öffentlich: Er erlaubt nur, was die Datenbank-Regeln (RLS) zulassen.
// Geheime Schlüssel (service_role, SMTP, Claude) gehören NIE in dieses Repository.
window.APP_CONFIG = {
  supabaseUrl: 'https://gyybtsuirbnidazusenv.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5eWJ0c3VpcmJuaWRhenVzZW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MzYwNjIsImV4cCI6MjEwODAxMjA2Mn0.IH1OFK6sGAjdo6Uxp8YBG_Ry5KwtyMNBuSq7siF3W6U',
  einladungUrl: 'https://gyybtsuirbnidazusenv.supabase.co/functions/v1/einladung',
  appUrl: 'https://app.tanjawissel.ch/',
  academyUrl: 'https://academy.tanjawissel.ch',
};
