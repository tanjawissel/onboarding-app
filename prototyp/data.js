/* Stammdaten des CRM-Prototyps. Quelle: „CRM - Datenmodell und Skizzen“ (freigegeben 20.10.2026)
   und „Persoenlichkeitsprofil/01 Wortstil-Probe“ (freigegeben 19.10.2026). */
window.CRM_DATA = (function () {
  // Statuswerte in der Reihenfolge aus Video 3. fu = Follow-up-Vorschlag in Tagen, art = Entwurfsart dafür.
  const STATUS = [
    { key: 'neu',             icon: '🌱', name: 'Neu',                 text: 'eingetragen, noch nicht angesprochen', fu: null, art: 'erstkontakt' },
    { key: 'angesprochen',    icon: '💬', name: 'Angesprochen',        text: 'Erstkontakt verschickt',                fu: 7,    art: 'nachfassen' },
    { key: 'test_eingeladen', icon: '🔗', name: 'Zum Test eingeladen', text: 'Link zum Test geschickt',               fu: 7,    art: 'nachfassen' },
    { key: 'test_gemacht',    icon: '📋', name: 'Test gemacht',        text: 'Mail von Superpatch: Test gemacht',     fu: 1,    art: 'einladung_ausprobieren' },
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
    kristall: { icon: '💎', name: 'Kristall', tempo: 'bedacht', fokus: 'sache',    merkmal: 'Stellt genaue Fragen, will Hintergründe', weg: 'Lad zum Test auf deiner Seite ein, erklär die Hintergründe, gib Zeit und dräng nicht.' },
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
      kristall: 'Hallo {name} 😊 ich beschäftige mich gerade mit einer neuen Technologie. Dazu gibt es einen kurzen Test, anonym und in etwa 5 Minuten, dann kannst du dir selbst ein Bild machen. Magst du?',
      neutral:  'Hey {name} 😊 ich habe vor Kurzem etwas Neues ausprobiert, das mir echt gefällt, und musste an dich denken. Magst du hören, was es ist?',
    },
    einladung_test: {
      pfeil:    'Hey {name}, hier der Link zum Test, dauert ca. 5 Minuten und ist anonym: {link}\nTrag am Ende deine E-Mail ein, dann bekommst du dein Ergebnis zugeschickt und ich sehe, dass du fertig bist 😊',
      funke:    'Hey {name} 😄 wie versprochen der Test! Ich hab ihn auch gemacht, echt spannend: {link}\nTrag am Ende unbedingt deine E-Mail ein, dann kommt dein Ergebnis per Mail und ich bekomme Bescheid. Ich bin neugierig!',
      anker:    'Hey {name} 😊 danke, dass du offen dafür bist. Hier ist der kleine Test, ganz in Ruhe, wann es dir passt (ca. 5 Minuten, anonym): {link}\nWenn du magst, trag am Ende deine E-Mail ein. Dann bekommst du dein Ergebnis zugeschickt, ich sehe, dass du ihn gemacht hast, und wir können zusammen draufschauen.',
      kristall: 'Hallo {name}, hier der Link zum Test (ca. 5 Minuten, anonym): {link}\nAm Ende siehst du deinen Signalscore und welche Art von Patches Superpatch dir empfiehlt. Wenn du deine E-Mail einträgst, bekommst du die Auswertung zugeschickt und ich eine kurze Info. Dann erkläre ich dir gern die Hintergründe. LG',
      neutral:  'Hey {name} 😊 hier ist der Link zum Test, dauert ca. 5 Minuten und ist anonym: {link}\nTrag am Ende gern deine E-Mail ein, dann bekommst du dein Ergebnis zugeschickt und ich weiß Bescheid. LG',
    },
    einladung_ausprobieren: {
      pfeil:    'Hey {name}, ich hab gesehen, dass du den Test gemacht hast 😊 Wollen wir kurz über dein Ergebnis sprechen? Und magst du es einfach mal selbst ausprobieren? Ich kann dir einen Testpatch geben.',
      funke:    'Hey {name} 😄 du hast den Test gemacht, wie cool! Was sagst du zu deinem Ergebnis? Lass uns kurz drüber quatschen, und wenn du Lust hast, bring ich dir einen Testpatch zum Ausprobieren mit!',
      anker:    'Hey {name} 😊 danke dir, dass du den Test gemacht hast. Wenn du magst, schauen wir uns dein Ergebnis in Ruhe zusammen an. Und falls es sich für dich gut anfühlt, kannst du es ganz unverbindlich selbst ausprobieren, ich geb dir gern einen Testpatch.',
      kristall: 'Hallo {name}, danke, dass du den Test gemacht hast. Wenn du magst, gehen wir dein Ergebnis und die Empfehlung zusammen durch, ich erkläre dir gern die Hintergründe. Wenn du es danach selbst prüfen möchtest: Ich geb dir gern einen Testpatch, oder du schaust in meinem Shop: {link}\nLass dir Zeit. LG',
      neutral:  'Hey {name} 😊 ich hab gesehen, dass du den Test gemacht hast, danke dir! Magst du kurz über dein Ergebnis sprechen? Und wenn du Lust hast, probier es einfach mal selbst aus: Ich geb dir gern einen Testpatch, oder du schaust dich in meinem Shop um: {link}',
    },
    nachfassen: {
      pfeil:    'Hey {name}, kurze Frage: Bist du schon dazu gekommen, reinzuschauen? 😊',
      funke:    'Heyy {name} 😄 ich hab grad an dich gedacht! Wie war deine Woche? Bist du schon dazu gekommen, reinzuschauen?',
      anker:    'Hey {name} 😊 wie geht’s dir? Ich wollte mich einfach mal melden, ganz ohne Eile. Sag einfach, wenn du Fragen hast. Drück dich',
      kristall: 'Hallo {name}, konntest du dir schon ein Bild machen? Wenn Fragen offen sind, beantworte ich sie gern. Und falls du den kurzen Test noch machen magst, schick ich dir gern den Link. LG',
      neutral:  'Hey {name} 😊 ich wollte mich kurz melden. Bist du schon dazu gekommen, reinzuschauen? Sag einfach, wenn du Fragen hast. LG',
    },
    danke_pflege: {
      pfeil:    'Danke für deine Bestellung, {name}! Sag mir einfach Bescheid, wie es dir damit geht 😊',
      funke:    'Du bist dabei 😄 danke dir, {name}! Ich bin so gespannt, was du erzählst. Meld dich, sobald du’s ausprobiert hast!',
      anker:    'Danke dir von Herzen für dein Vertrauen, {name} 😊 Wenn du Fragen hast oder einfach erzählen magst, wie es dir damit geht: Ich bin da. LG',
      kristall: 'Danke für deine Bestellung, {name}. Wenn du Fragen zur Anwendung hast, melde dich jederzeit. Ich melde mich in ein paar Wochen und frag nach deiner Erfahrung. LG',
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
