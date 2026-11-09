// Kopie aus „Prototyp CRM/data.js“ (Stammdaten, Statuswerte, Beispielentwürfe ohne KI). Dort ändern und neu kopieren.
/* Stammdaten des CRM-Prototyps. Quelle: „CRM - Datenmodell und Skizzen“ (freigegeben 20.10.2026)
   und „Persoenlichkeitsprofil/01 Wortstil-Probe“ (freigegeben 19.10.2026). */
window.CRM_DATA = (function () {
  // Statuswerte in der Reihenfolge aus Video 3. fu = Follow-up-Vorschlag in Tagen, art = Entwurfsart dafür.
  const STATUS = [
    { key: 'neu',             icon: '🌱', name: 'Neu',                 text: 'eingetragen, noch nicht angesprochen', fu: null, art: 'erstkontakt' },
    { key: 'angesprochen',    icon: '💬', name: 'Angesprochen',        text: 'Erstkontakt verschickt',                fu: 3,    art: 'nachfassen' },
    { key: 'test_eingeladen', icon: '🔗', name: 'Zum Test eingeladen', text: 'Link zum Test geschickt',               fu: 3,    art: 'nachfassen' },
    { key: 'test_gemacht',    icon: '📋', name: 'Test gemacht',        text: 'Mail von Superpatch: Test gemacht',     fu: 1,    art: 'gespraech_auswertung' },
    { key: 'probiert',        icon: '🧪', name: 'Probiert',            text: 'hat einen Testpatch',                   fu: 7,    art: 'nachfassen' },
    { key: 'kunde',           icon: '🛒', name: 'Kunde',               text: 'hat bestellt',                          fu: 14,   art: 'danke_pflege' },
    { key: 'partner',         icon: '🤝', name: 'Partner',             text: 'ist selbst als Kundenpromoter dabei',   fu: null, art: 'nachfassen' },
    { key: 'gerade_nicht',    icon: '⏸', name: 'Gerade nicht',        text: 'im Moment kein Interesse, ohne Wertung', fu: 90,  art: 'nachfassen' },
  ];

  // Entwurfsarten. next = Status, den die App nach dem Kopieren vorschlägt (null = Status bleibt).
  const ARTS = [
    { key: 'erstkontakt',            name: 'Erstkontakt',               short: 'Erstkontakt',   next: 'angesprochen' },
    { key: 'einladung_test',         name: 'Einladung zum Test',        short: 'Einladung Test', next: 'test_eingeladen' },
    { key: 'gespraech_auswertung',   name: 'Gespräch zur Auswertung',   short: 'Auswertung',    next: null },
    { key: 'einladung_ausprobieren', name: 'Zum Ausprobieren einladen', short: 'Ausprobieren',  next: null },
    { key: 'nachfassen',             name: 'Nachfassen',                short: 'Nachfassen',    next: null },
    { key: 'danke_pflege',           name: 'Danke & Kundenpflege',      short: 'Danke & Pflege', next: null },
    // Nur sichtbar, wenn beim Kontakt „Offen für das Business-Thema“ an ist (Tanja 09.11.2026)
    { key: 'business_einladung',     name: 'Business-Einladung',        short: 'Business-Einladung', next: null, business: true },
  ];

  // Videos zum Weiterleiten (Tanja 09.11.2026: mehrere zur Auswahl, nicht jedes passt für jeden).
  // Neues Video: eine Zeile ergänzen. url leer = noch nicht online, wird in der Liste als „kommt bald“ gezeigt.
  // Stand 09.11.2026 (Tanja): neues Visions-Video in Arbeit, Erklärvideo als nächster Schritt; noch nichts hochgeladen.
  // Fassung 1–3 bewusst nicht in der Liste. Zeile + titel/worum/fuer ergänzen, sobald Tanja sie freigibt.
  const VIDEOS = [
    // Fassung 4 „Der Zug ins nächste Kapitel“, abgenommen 09.11.2026. Datei: Videos/Tanja-Wissel_Visions-Video_Fassung-4_9x16_klein.mp4
    { key: 'vision4',     titel: 'Visions-Video „Nächstes Kapitel“', dauer: '2 Min.',
      url: 'https://app.tanjawissel.ch/videos/visions-video-naechstes-kapitel_fuer-menschen-mit-lebenserfahrung.mp4',
      worum: 'Die Geschäftsidee und die Vision: etwas Eigenes aufbauen, rund ums eigene Leben',
      fuer: 'für Menschen mit Lebenserfahrung, die etwas Eigenes aufbauen und selbstbestimmt für sich sorgen wollen' },
    // Fassung 5 „Etwas Besseres aufbauen“, abgenommen 09.11.2026. Datei: Videos/Tanja-Wissel_Visions-Video_Fassung-5_9x16_klein.mp4
    { key: 'vision5',     titel: 'Visions-Video „Etwas Besseres aufbauen“', dauer: '1,5 Min.',
      url: 'https://app.tanjawissel.ch/videos/visions-video-etwas-besseres-aufbauen_fuer-juengere.mp4',
      worum: 'Neben Job, Studium oder Familie etwas Eigenes starten und dabei wachsen',
      fuer: 'für Jüngere, die neben Job, Studium oder Familie etwas Eigenes starten wollen' },
    // Fassung 3 „Ein guter Moment zum Einsteigen“, abgenommen 07.11.2026. Gesprächsbaustein V1 (Tanja 09.11.2026): Fassung 3 für den Kundenweg.
    // Datei: Videos/Tanja-Wissel_Visions-Video_Fassung-3_9x16_klein.mp4
    { key: 'vision3',     titel: 'Visions-Video „Guter Moment“', dauer: '1,5 Min.', url: '',
      worum: 'Selbst ausprobieren und entdecken, wo du gerade stehst, mit Ausblick auf etwas Eigenes',
      fuer: 'für alle, bei denen erst das Ausprobieren zählt (Kundenweg)' },
    { key: 'technologie', titel: 'Erklärvideo Technologie',  dauer: '3 Min.',  url: '',
      worum: 'Die Technologie hinter Superpatch, ruhig erklärt',
      fuer: 'als nächster Schritt nach dem Visions-Video, oder für Sachliche, die Hintergründe wollen' },
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
  // Stand 09.11.2026: Gesprächsbausteine mit rotem Faden aus den Visions-Videos (E2–E4, E6, N1, K3, N5, N7, V3, B1–B6, R1–R10).
  const DRAFTS = {
    erstkontakt: {
      pfeil:     'Hey {name} 😊 ich beschäftige mich gerade mit etwas Neuem und bin selbst gespannt. Hast du Lust, in ein paar Minuten zu entdecken, wo du gerade stehst?',
      funke:     'Hey {name}! 😄 Lange nichts gehört. Ich bin gerade bei etwas Neuem dabei und finde es richtig spannend. Ich schätze an dir, dass du offen für Neues bist: Magst du mal einen kurzen Test dazu machen?',
      anker:     'Hey {name} 😊 wie geht’s dir? Ist schon eine Weile her. Ich beschäftige mich gerade mit etwas Neuem. Ganz in Ruhe, nur falls es dich interessiert: Magst du dir mal anschauen, wo du gerade stehst?',
      kristall:  'Hallo {name} 😊 ich beschäftige mich gerade mit etwas Neuem. Du musst mir nichts glauben: Es gibt einen kurzen, anonymen Test, dann kannst du dir selbst ein Bild machen. Hättest du Lust?',
      neutral:   'Hey {name} 😊 ich beschäftige mich gerade mit etwas Neuem. Hättest du Lust, in Ruhe zu entdecken, wo du gerade stehst? Dazu gibt es einen kurzen, anonymen Test.',
    },
    einladung_test: {
      pfeil:    'Hey {name}, hier der Link zum Test, dauert ca. 5 Minuten und ist anonym: {link}\nTrag am Ende deine E-Mail ein, dann bekommst du dein Ergebnis zugeschickt und ich sehe, dass du fertig bist 😊',
      funke:    'Hey {name} 😄 wie versprochen der Test! Ich hab ihn auch gemacht, echt spannend: {link}\nTrag am Ende unbedingt deine E-Mail ein, dann kommt dein Ergebnis per Mail und ich bekomme Bescheid. Ich bin neugierig!',
      anker:    'Hey {name} 😊 danke, dass du offen dafür bist. Hier sind ein paar kurze Fragen, ganz in Ruhe, wann es dir passt (ca. 5 Minuten, anonym). Danach siehst du, welche Signale dir dein Körper gibt: {link}\nWenn du magst, trag am Ende deine E-Mail ein. Dann bekommst du dein Ergebnis zugeschickt, ich sehe, dass du ihn gemacht hast, und wir können zusammen draufschauen.',
      kristall: 'Hallo {name}, hier der Link zum Test (ca. 5 Minuten, anonym): {link}\nAm Ende siehst du deinen Signalscore und welche Art von Patches Superpatch dir empfiehlt. Wenn du deine E-Mail einträgst, bekommst du die Auswertung zugeschickt und ich eine kurze Info. Dann erkläre ich dir gern die Hintergründe. LG',
      neutral:  'Hey {name} 😊 hier ist der Link zum Test, dauert ca. 5 Minuten und ist anonym. So siehst du, wo du gerade stehst: {link}\nTrag am Ende gern deine E-Mail ein, dann bekommst du dein Ergebnis zugeschickt und ich weiß Bescheid. LG',
    },
    gespraech_auswertung: {
      pfeil:    'Hey {name}, danke fürs Mitmachen! Hast du Lust, kurz über dein Ergebnis zu sprechen? Passt es dir eher unter der Woche oder am Wochenende?',
      funke:    'Hey {name}, du hast den Test gemacht, wie cool! Was hat dich an deinem Ergebnis am meisten überrascht? Lass uns kurz drüber quatschen, eher abends oder tagsüber?',
      anker:    'Hey {name}, danke dir, dass du den Test gemacht hast. Wie ist das Ergebnis bei dir angekommen? Wenn du magst, schauen wir es uns in Ruhe zusammen an. Passt dir eher ein Abend unter der Woche oder das Wochenende?',
      kristall: 'Hallo {name}, danke, dass du den Test gemacht hast. Wenn du magst, gehen wir dein Ergebnis zusammen durch und ich erkläre dir gern die Hintergründe. Passt es dir eher unter der Woche oder am Wochenende?',
      neutral:  'Hey {name}, danke, dass du den Test gemacht hast! Was hat dich an deinem Ergebnis am meisten überrascht? Magst du kurz mit mir drüber sprechen, eher unter der Woche oder am Wochenende?',
    },
    einladung_ausprobieren: {
      pfeil:    'Hey {name}, ich hab gesehen, dass du den Test gemacht hast 😊 Wollen wir kurz über dein Ergebnis sprechen? Du musst mir nichts glauben, probier es einfach selbst aus. Ich kann dir einen Testpatch geben.',
      funke:    'Hey {name} 😄 du hast den Test gemacht, wie cool! Was sagst du zu deinem Ergebnis? Lass uns kurz drüber quatschen, und wenn du Lust hast, bring ich dir einen Testpatch mit. Probier es selbst aus und sag mir, wie du es findest!',
      anker:    'Hey {name} 😊 danke dir, dass du den Test gemacht hast. Wenn du magst, schauen wir uns dein Ergebnis in Ruhe zusammen an. Und falls es sich für dich gut anfühlt, kannst du es ganz unverbindlich selbst ausprobieren, in deinem Tempo. Ich geb dir gern einen Testpatch.',
      kristall: 'Hallo {name}, danke, dass du den Test gemacht hast. Wenn du magst, gehen wir dein Ergebnis und die Empfehlung zusammen durch, ich erkläre dir gern die Hintergründe. Wenn du es danach selbst prüfen möchtest: Ich geb dir gern einen Testpatch, oder du schaust in meinem Shop: {link}\nLass dir Zeit. LG',
      neutral:  'Hey {name} 😊 ich hab gesehen, dass du den Test gemacht hast, danke dir! Magst du kurz über dein Ergebnis sprechen? Du musst mir nichts glauben, probier es einfach selbst aus: Ich geb dir gern einen Testpatch, oder du schaust dich in meinem Shop um: {link}',
    },
    nachfassen: {
      pfeil:    'Hey {name}, kurze Frage: Bist du schon dazu gekommen, reinzuschauen? Welche Frage ist bei dir noch offen? 😊',
      funke:    'Heyy {name} 😄 wie geht’s dir? Bist du schon dazu gekommen, reinzuschauen? Mich würde interessieren, was dir hängen geblieben ist!',
      anker:    'Hey {name} 😊 wie geht’s dir? Ich wollte mich einfach mal melden, ganz ohne Eile. Sag einfach, wenn du Fragen hast. Drück dich',
      kristall: 'Hallo {name}, konntest du dir schon ein Bild machen? Wenn Fragen offen sind, beantworte ich sie gern. Und falls du den kurzen Test noch machen magst, schick ich dir gern den Link. LG',
      neutral:  'Hey {name} 😊 wie geht’s dir? Bist du schon dazu gekommen, reinzuschauen? Welche Frage ist bei dir noch offen? LG',
    },
    danke_pflege: {
      pfeil:    'Danke für deine Bestellung, {name}! Sag mir einfach Bescheid, wie es dir damit geht 😊',
      funke:    'Du bist dabei 😄 danke dir, {name}! Ich bin so gespannt, was du erzählst. Meld dich, sobald du’s ausprobiert hast!',
      anker:    'Danke dir von Herzen für dein Vertrauen, {name} 😊 Wenn du Fragen hast oder einfach erzählen magst, wie es dir damit geht: Ich bin da. LG',
      kristall: 'Danke für deine Bestellung, {name}. Wenn du Fragen zur Anwendung hast, melde dich jederzeit. Ich melde mich in ein paar Wochen und frag nach deiner Erfahrung. LG',
      neutral:  'Danke dir für deine Bestellung, {name} 😊 Ich bin gespannt auf deine Erfahrung. Meld dich gern jederzeit. LG',
    },
    // Kompliment → Grund → worum es geht → Entscheidung beim Kontakt, am Ende ein Video ohne Druck (Bausteine B1–B6, Visions-Video Fassung 4)
    business_einladung: {
      pfeil:    'Hey {name} 😊 du packst Dinge an, statt lange zu reden. Ich denk an dich, weil [Grund]. Ich bau mir gerade nebenbei etwas Eigenes auf, rund um mein Leben und ohne bei null anzufangen. Hier ein kurzes Video dazu, knapp zwei Minuten: [Video-Link] Ob es was für dich ist, entscheidest nur du.',
      funke:    'Hey {name} 😄 du bringst Menschen zusammen wie kaum jemand, und ich hab an dich gedacht, weil [Grund]. Ich bau mir gerade mit tollen Menschen etwas Eigenes auf, rund um mein Leben. Ich teile das gern mit dir: Magst du dir ein kurzes Video dazu anschauen? [Video-Link] Ich bin gespannt, was du sagst, und ein Nein ist auch völlig okay!',
      anker:    'Hey {name} 😊 ich schätze sehr, wie viel Erfahrung du mitbringst und wie gut du mit Menschen kannst. Ich denk an dich, weil [Grund]. Ich hab für mich etwas Eigenes angefangen, das ich mir so einteilen kann, wie es zu meinem Leben passt. Wenn du magst, schau dir in Ruhe dieses kurze Video an: [Video-Link] Ganz ohne Eile, du entscheidest.',
      kristall: 'Hallo {name}, du schaust dir Dinge genau an, das schätze ich an dir. Ich denk an dich, weil [Grund]. Ich bau mir gerade nebenberuflich etwas Eigenes auf, auf einem Fundament, das schon steht, und erklär dir gern in Ruhe, wie das funktioniert. Als Einstieg ein kurzes Video: [Video-Link] Lass dir Zeit und sag mir einfach, ob du mehr wissen möchtest. LG',
      neutral:  'Hey {name} 😊 als ich überlegt hab, mit wem ich das teilen möchte, hab ich an dich gedacht, weil [Grund]. Ich bau mir gerade nebenbei etwas Eigenes auf, rund um mein Leben und nicht umgekehrt. Magst du dir ein kurzes Video dazu anschauen? [Video-Link] Ganz unverbindlich, du entscheidest. LG',
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

  return { STECKBRIEF_FIELDS, STATUS, ARTS, VIDEOS, TYPES, TYPE_ORDER, HERKUNFT, KANAL, DRAFTS, BUSINESS_LINE,
    HANDBUCH: 'https://heyzine.com/flip-book/e2bfcd5caf.html' };
})();
