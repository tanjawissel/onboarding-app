// Adresse der Server-Funktion „wortstil“ (Supabase). Leer = keine KI, dann gibt es Beispielentwürfe.
// Den Testcode trägt jede Testperson im Profil ein oder bekommt ihn per Link (?code=…).
window.CRM_AI_URL = 'https://gyybtsuirbnidazusenv.supabase.co/functions/v1/wortstil';

// Nur zum lokalen Testen: ?ai=http://localhost:8770 nutzt die gespielte Funktion aus supabase/tests/dev-server.mjs.
(function () {
  const ai = new URLSearchParams(location.search).get('ai');
  if (ai && /^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/.test(ai)) window.CRM_AI_URL = ai;
})();
