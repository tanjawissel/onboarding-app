/* Stammdaten des CRM-Prototyps. Quelle: „CRM - Datenmodell und Skizzen“ (freigegeben 20.10.2026)
   und „Persoenlichkeitsprofil/01 Wortstil-Probe“ (freigegeben 19.10.2026). */
window.CRM_DATA = (function () {
  // Statuswerte in der Reihenfolge aus Video 3. fu = Follow-up-Vorschlag in Tagen, art = Entwurfsart dafür.
  const STATUS = [
    { key: 'neu',             icon: '🌱', name: 'Neu',                 text: 'eingetragen, noch nicht angesprochen', fu: null, art: 'erstkontakt' },
    { key: 'angesprochen',    icon: '💬', name: 'Angesprochen',        text: 'Erstkontakt verschickt',                fu: 7,    art: 'nachfassen' },
    { key: 'test_eingeladen', icon: '🔗', name: 'Zum Test eingeladen', text: 'Link zum Test geschickt',               fu: 7,    art: 'nachfassen' },
    { key: 'test_gemacht',    icon: '📋', name: 'Test gemacht',        text: 'Scoreboard-Screenshot erhalten',        fu: 3,    art: 'einladung_ausprobieren' },
    { key: 'probiert',        icon: '🧪', name: 'Probiert',            text: 'hat einen Testpatch',                   fu: 7,    art: 'nachfassen' },
    { key: 'kunde',           icon: '🛒', name: 'Kunde',               text: 'hat bestellt',                          fu: 14,   art: 'danke_pflege' },
    { key: 'partner',         icon: '🤝', name: 'Partner',             text: 'ist selbst als Kundenpromoter dabei',   fu: null, art: 'nachfassen' },
    { key: 'gerade_nicht',    icon: '⏸', name: 'Gerade nicht',        text: 'im Moment kein Interesse, ohne Wertung', fu: 90,  art: 'nachfassen' },
  ];

  // Entwurfsarten. next = Status, den die App nach dem Kopieren vorschlägt (null = Status bleibt).
  const ARTS = [
    { key: 'erstkontakt',            name: 'Erstkontakt',               short: 'Erstkontakt',   next: 'angesprochen' },
    { key: 'einladung_test',         name: 'Einladung zum Test',        short: 'Einladung Test', next: 'test_eingeladen' },
    { key: 'einladung_ausprobieren', name: 'Zum Ausprobieren einladen', short: 'Ausprobieren',  next: null },
    { key: 'nachfassen',             name: 'Nachfassen',                short: 'Nachfassen',    next: null },
    { key: 'danke_pflege',           name: 'Danke & Kundenpflege',      short: 'Danke & Pflege', next: null },
  ];

  const TYPES = {
    pfeil:    { icon: '🏹', name: 'Pfeil',    tempo: 'schnell', fokus: 'sache',    merkmal: 'Kommt schnell zum Punkt, fragt: „Was bringt mir das?“', weg: 'Fass dich kurz, nenn den Nutzen und lass entscheiden.' },
    funke:    { icon: '✨', name: 'Funke',    tempo: 'schnell', fokus: 'menschen', merkmal: 'Erzählt viel, lacht, springt von Thema zu Thema', weg: 'Erzähl ein Erlebnis und lade ein, es selbst auszuprobieren.' },
    anker:    { icon: '⚓', name: 'Anker',    tempo: 'bedacht', fokus: 'menschen', merkmal: 'Fragt, wie es dir geht, entscheidet nicht sofort', weg: 'Nimm dir Zeit, erzähl ehrlich, bleib in Kontakt.' },
    kristall: { icon: '💎', name: 'Kristall', tempo: 'bedacht', fokus: 'sache',    merkmal: 'Stellt genaue Fragen, will Hintergründe', weg: 'Schick das Handbuch, gib Zeit und dräng nicht.' },
  };
  const TYPE_ORDER = ['pfeil', 'funke', 'anker', 'kristall'];

  const HERKUNFT = [['freundeskreis', 'Freundeskreis'], ['familie', 'Familie'], ['arbeit', 'Arbeit'], ['hobby', 'Hobby'], ['empfehlung', 'Empfehlung'], ['sonstiges', 'Sonstiges']];
  const KANAL = [['whatsapp', 'WhatsApp'], ['telegram', 'Telegram'], ['sms', 'SMS'], ['email', 'E-Mail'], ['telefon', 'Telefon'], ['persoenlich', 'persönlich']];

  // Beispielentwürfe für den Prototyp (ohne KI), in einem Beispiel-Wortstil „herzlich-direkt, Hey + Emoji, LG“.
  // In der App schreibt die KI sie aus Wortstil-Steckbrief + Typ + Notizen. {name} und {link} werden ersetzt.
  // Feste Regeln: keine Krankheiten/Beschwerden, keine Preise, keine Patch-Anzahl, keine 7er-Probierpakete, kein Druck.
  const DRAFTS = {
    erstkontakt: {
      pfeil:    'Hey {name} 😊 ich teste gerade etwas Neues und bin selbst gespannt. Willst du’s dir kurz ansehen?',
      funke:    'Hey {name}! Du glaubst nicht, was ich am Wochenende ausprobiert habe 😄 Das musst du auch mal testen! Hast du diese Woche kurz Zeit zum Quatschen?',
      anker:    'Hey {name} 😊 wie geht’s dir? Ist schon eine Weile her. Ich habe etwas für mich entdeckt und musste an dich denken. Ganz in Ruhe, nur falls es dich interessiert. LG',
      kristall: 'Hallo {name} 😊 ich beschäftige mich gerade mit einer neuen Technologie. Ich schick dir gern das Handbuch, dann kannst du dir selbst ein Bild machen. Magst du?',
      neutral:  'Hey {name} 😊 ich habe vor Kurzem etwas Neues ausprobiert, das mir echt gefällt, und musste an dich denken. Magst du hören, was es ist?',
    },
    einladung_test: {
      pfeil:    'Hey {name}, hier der Link zum Test, dauert ca. 5 Minuten: {link}\nSchick mir danach einfach einen Screenshot vom Ergebnis 😊',
      funke:    'Hey {name} 😄 wie versprochen der Test! Ich hab ihn auch gemacht, echt spannend: {link}\nSchick mir danach unbedingt deinen Screenshot, ich bin neugierig!',
      anker:    'Hey {name} 😊 danke, dass du offen dafür bist. Hier ist der kleine Test, ganz in Ruhe, wann es dir passt: {link}\nWenn du magst, schick mir danach den Screenshot, dann schauen wir zusammen drauf.',
      kristall: 'Hallo {name}, hier der Link zum Test (ca. 5 Minuten): {link}\nAm Ende siehst du eine Auswertung mit Empfehlung. Wenn du magst, schick mir einen Screenshot, dann erkläre ich dir die Hintergründe. LG',
      neutral:  'Hey {name} 😊 hier ist der Link zum Test, dauert ca. 5 Minuten: {link}\nWenn du magst, schick mir danach einen Screenshot vom Ergebnis. LG',
    },
    einladung_ausprobieren: {
      pfeil:    'Danke für den Screenshot, {name}! Willst du es einfach mal selbst ausprobieren? Ich kann dir einen Testpatch geben.',
      funke:    'Danke für deinen Screenshot 😄 spannend, was da rausgekommen ist! Hast du Lust, es selbst mal auszuprobieren? Ich bring dir gern einen Testpatch mit!',
      anker:    'Danke dir fürs Mitmachen und den Screenshot, {name} 😊 Wenn du magst, kannst du es ganz unverbindlich selbst ausprobieren. Ich geb dir gern einen Testpatch, nur wenn es sich für dich gut anfühlt.',
      kristall: 'Danke für den Screenshot, {name}. Die Empfehlung aus dem Ergebnis kannst du im Handbuch nachlesen. Wenn du es selbst prüfen möchtest: Ich geb dir gern einen Testpatch, oder du schaust in meinem Shop: {link}\nLass dir Zeit. LG',
      neutral:  'Danke für deinen Screenshot, {name} 😊 Magst du es mal selbst ausprobieren? Ich geb dir gern einen Testpatch, oder du schaust dich in meinem Shop um: {link}',
    },
    nachfassen: {
      pfeil:    'Hey {name}, kurze Frage: Bist du schon dazu gekommen, reinzuschauen? 😊',
      funke:    'Heyy {name} 😄 ich hab grad an dich gedacht! Wie war deine Woche? Bist du schon dazu gekommen, reinzuschauen?',
      anker:    'Hey {name} 😊 wie geht’s dir? Ich wollte mich einfach mal melden, ganz ohne Eile. Sag einfach, wenn du Fragen hast. Drück dich',
      kristall: 'Hallo {name}, konntest du dir schon ein Bild machen? Wenn Fragen offen sind, beantworte ich sie gern, oder ich schick dir das Handbuch. LG',
      neutral:  'Hey {name} 😊 ich wollte mich kurz melden. Bist du schon dazu gekommen, reinzuschauen? Sag einfach, wenn du Fragen hast. LG',
    },
    danke_pflege: {
      pfeil:    'Danke für deine Bestellung, {name}! Sag mir einfach Bescheid, wie es dir damit geht 😊',
      funke:    'Du bist dabei 😄 danke dir, {name}! Ich bin so gespannt, was du erzählst. Meld dich, sobald du’s ausprobiert hast!',
      anker:    'Danke dir von Herzen für dein Vertrauen, {name} 😊 Wenn du Fragen hast oder einfach erzählen magst, wie es dir damit geht: Ich bin da. LG',
      kristall: 'Danke für deine Bestellung, {name}. Im Handbuch findest du alles zur Anwendung. Ich melde mich in ein paar Wochen und frag nach deiner Erfahrung. LG',
      neutral:  'Danke dir für deine Bestellung, {name} 😊 Ich bin gespannt auf deine Erfahrung. Meld dich gern jederzeit. LG',
    },
  };
  // Nur wenn beim Kontakt „Offen für das Business-Thema“ an ist UND im Entwurf ausdrücklich gewählt.
  const BUSINESS_LINE = 'Übrigens: Falls du Lust hast, das selbst weiterzuempfehlen, erzähl ich dir gern, wie ich das mache. Ganz unverbindlich.';

  // Wortstil-Steckbrief: gleiche Felder wie in supabase/functions/_shared/wortstil-prompts.js
  const STECKBRIEF_FIELDS = [
    ['satzlaenge', 'Satzlänge'], ['anrede', 'Anrede / Begrüßung'], ['verabschiedung', 'Verabschiedung'],
    ['emojis', 'Emojis'], ['ton', 'Ton'], ['schreibweise', 'Schreibweise'],
    ['lieblingswoerter', 'Lieblingswörter'], ['nie', 'Würde nie sagen'], ['sprache', 'Sprachnachricht vs. Text'],
  ];
  // Beispiel-Steckbrief für den Prototyp (passt zum Ton der Beispielentwürfe)
  const DEMO_STECKBRIEF = {
    satzlaenge: 'eher kurz, 2–4 Sätze', anrede: '„Hey“ und der Name', verabschiedung: '„LG“ oder „Drück dich“',
    emojis: '1 pro Nachricht, am liebsten 😊', ton: 'herzlich-direkt', schreibweise: 'normale Groß- und Kleinschreibung, Du-Form',
    lieblingswoerter: '„mega“, „ehrlich gesagt“', nie: 'Vermutlich: „Hammer-Angebot“, Sie-Form', sprache: '',
  };

  return { STECKBRIEF_FIELDS, DEMO_STECKBRIEF, STATUS, ARTS, TYPES, TYPE_ORDER, HERKUNFT, KANAL, DRAFTS, BUSINESS_LINE,
    HANDBUCH: 'https://heyzine.com/flip-book/e2bfcd5caf.html' };
})();
