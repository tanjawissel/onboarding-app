/* Der Freiheits-Kompass und die Wortstil-Probe. Übernommen aus „Prototyp Freiheits-Kompass“.
   Datenschutz: Die einzelnen Antworten aus Teil A und B bleiben nur im Arbeitsspeicher dieses
   Browsers und werden NIE gespeichert oder verschickt. Gespeichert wird nur das Ergebnis
   (kompass_auswertung: Typ, Zweittyp, Antriebe, Punkte je Typ), Rahmen (Teil C), Ziele (D1–D4),
   Freigaben und der Wortstil-Steckbrief. Schreibproben gehen nur zur Auswertung an die KI. */
(function () {
  'use strict';
  const T = window.TW;
  const D = window.KOMPASS_DATA;
  const sb = T.sb;
  const esc = T.esc;
  const app = document.getElementById('app');

  // ---------- Stammdaten, die nicht in den Ergebnistexten stehen (aus dem Fragenkatalog) ----------
  const TYPES = {
    pfeil:    { icon: '🏹', name: 'Pfeil',    tempo: 'schnell', fokus: 'Sache' },
    funke:    { icon: '✨', name: 'Funke',    tempo: 'schnell', fokus: 'Menschen' },
    anker:    { icon: '⚓', name: 'Anker',    tempo: 'bedacht', fokus: 'Menschen' },
    kristall: { icon: '💎', name: 'Kristall', tempo: 'bedacht', fokus: 'Sache' },
  };
  const TYPE_ORDER = ['pfeil', 'funke', 'anker', 'kristall'];

  const DRIVERS = {
    freiheit:    { name: 'Freiheit',    text: 'Du willst selbst bestimmen, wie, wann und wo du arbeitest.' },
    sicherheit:  { name: 'Sicherheit',  text: 'Dir gibt es Kraft, abgesichert zu sein und nicht von einer einzigen Quelle abzuhängen.' },
    anerkennung: { name: 'Anerkennung', text: 'Dich treibt an, wenn gesehen wird, was du leistest.' },
    beitrag:     { name: 'Beitrag',     text: 'Dich treibt an, wenn es anderen Menschen durch dich besser geht.' },
    wachstum:    { name: 'Wachstum',    text: 'Dich treibt an, über dich hinauszuwachsen und Neues zu lernen.' },
  };
  const DRIVER_ORDER = ['freiheit', 'sicherheit', 'anerkennung', 'beitrag', 'wachstum'];

  const PART_C = [
    { id: 'C1', key: 'hours', text: 'Wie viele Stunden pro Woche hast du realistisch – nicht im Idealfall?',
      hint: 'Das kannst du jederzeit ändern.',
      options: [['h0', 'unter 3'], ['h1', '3–5'], ['h2', '5–10'], ['h3', 'mehr als 10']] },
    { id: 'C2', key: 'energy', text: 'Wann hast du die meiste Energie?',
      options: [['frueh', 'früh morgens'], ['vormittag', 'vormittags'], ['nachmittag', 'nachmittags'], ['abend', 'abends']] },
    { id: 'C3', key: 'channels', multi: true, text: 'Wie gehst du am liebsten auf Menschen zu?', hint: 'Mehrere Antworten möglich.',
      options: [['persoenlich', 'persönlich treffen'], ['telefon', 'Telefon'], ['sprach', 'Sprachnachricht'], ['chat', 'Schreiben / Chat'], ['social', 'Posts & Stories'], ['events', 'Veranstaltungen']] },
    { id: 'C4', key: 'learn', text: 'Wie lernst du am besten?',
      options: [['video', 'Zuschauen (Video)'], ['lesen', 'Lesen'], ['probieren', 'Einfach ausprobieren'], ['gemeinsam', 'Gemeinsam mit jemandem']] },
    { id: 'C5', key: 'note', free: true, text: 'Was sollte dein Sponsor über dich wissen, damit die Zusammenarbeit gut läuft?',
      hint: 'Freiwillig. Das sieht dein Sponsor nur, wenn du den Bereich „Rahmen“ freigibst.' },
  ];

  const D1_PREFIX = {
    freiheit: 'Ich will selbst bestimmen, wann und wo ich arbeite, weil ',
    sicherheit: 'Ich will ein zweites Standbein, damit ',
    anerkennung: 'Ich will mir und anderen zeigen, dass ',
    beitrag: 'Ich will, dass es Menschen in meinem Umfeld besser geht, weil ',
    wachstum: 'Ich will über mich hinauswachsen, weil ',
  };
  const D2_SUGGEST = {
    freiheit: 'Ein Tag pro Woche gehört nur mir.',
    sicherheit: 'Ich lege jeden Monat einen festen Betrag zurück: ___ € / CHF.',
    anerkennung: 'Ich begleite ein eigenes kleines Team.',
    beitrag: 'Eine feste Gruppe von Kunden, denen es durch mich besser geht.',
    wachstum: 'Ich führe Gespräche, vor denen ich heute noch Respekt habe.',
  };
  // D3: Vorschlag pro Monat nach Stunden (Fragenkatalog), Kontakte pro Woche von Tanja bestätigt 19.10.2026
  const D3_BY_HOURS = {
    h0: { kunden: 2, partner: 0, kontakte: 3, text: '2 neue Kunden pro Monat' },
    h1: { kunden: 3, partner: 0, kontakte: 5, text: '3 neue Kunden pro Monat' },
    h2: { kunden: 3, partner: 1, kontakte: 8, text: '3 neue Kunden + 1 Partner pro Monat' },
    h3: { kunden: 3, partner: 3, kontakte: 14, text: 'Monat 1: 3 Kunden + 3 Partner, danach 2 Kunden + 1 Partner pro Monat' },
  };
  const D4_SUGGEST = {
    pfeil: 'Erst fragen, dann erzählen.',
    funke: 'Jeden Kontakt innerhalb von 7 Tagen nachfassen.',
    anker: 'Ich lade ein, ohne mich dafür zu entschuldigen.',
    kristall: 'Ich führe Gespräche, bevor ich alles weiß.',
  };

  // ---------- Wortstil-Probe (aus 01 Wortstil-Probe, freigegeben 19.10.2026) ----------
  const WS_SAMPLES = [
    { key: 's1', text: 'Erzähl jemandem aus deinem Freundeskreis per WhatsApp, was du am Wochenende gemacht hast.' },
    { key: 's2', text: 'Du hast etwas Neues ausprobiert, das dir gefällt. Schreib es so, wie du es jemandem aus deinem Freundeskreis schicken würdest.' },
    { key: 's3', text: 'Jemand hat sich zwei Wochen nicht gemeldet. Wie fragst du nach?' },
  ];
  // Gleiche Felder wie in supabase/functions/_shared/wortstil-prompts.js
  const WS_FIELDS = window.CRM_DATA.STECKBRIEF_FIELDS;
  const MAX_SAMPLE = 2000, MAX_VOICE = 3000;
  const newWs = () => ({
    consent: false, s1: '', s2: '', s3: '', voice: '',
    profile: null, status: 'idle', error: '',
    draft: '', draftStatus: 'idle', draftError: '', verdict: null, feedback: '',
  });

  // ---------- Zustand (nur im Arbeitsspeicher) ----------
  const fresh = () => ({
    flow: null, // null = Übersicht · 'kompass' · 'wortstil'
    consent: false,
    a: {}, b: {}, c: { channels: [] },   // Einzelantworten: werden NIE gespeichert
    d: null, share: { ziele: false, fuehrung: false, rahmen: false },
    order: {}, step: 0,
    result: null,     // gespeichertes oder gerade berechnetes Ergebnis
    savedAt: null,    // ausgewertet_am des gespeicherten Ergebnisses
    ws: newWs(),
    saving: false, saveError: '',
  });
  let state = fresh();

  const WORTSTIL_SCREENS = [
    { kind: 'ws-start' },
    ...WS_SAMPLES.map((q, i) => ({ kind: 'ws-sample', q, n: i + 1, of: WS_SAMPLES.length })),
    { kind: 'ws-voice' },
    { kind: 'ws-profile' },
    { kind: 'ws-draft' },
    { kind: 'ws-done' },
  ];
  const KOMPASS_SCREENS = [
    { kind: 'start' },
    { kind: 'intro', part: 'A', title: 'Teil A · Dein Grundtyp', text: '12 kurze Fragen. Denk nicht lange nach. Nimm die Antwort, die dir als Erstes einfällt, so wie es wirklich war.' },
    ...D.partA.map((q, i) => ({ kind: 'choice', part: 'a', q, n: i + 1, of: D.partA.length })),
    { kind: 'intro', part: 'B', title: 'Teil B · Dein Antrieb', text: '6 Fragen dazu, was dich wirklich bewegt. Auch hier gibt es kein Richtig oder Falsch.' },
    ...D.partB.map((q, i) => ({ kind: 'choice', part: 'b', q, n: i + 1, of: D.partB.length })),
    { kind: 'intro', part: 'C', title: 'Teil C · Dein Rahmen', text: 'Zum Schluss ein paar praktische Fragen zu deiner Zeit und deiner Art zu arbeiten.' },
    ...PART_C.map((q, i) => ({ kind: 'rahmen', q, n: i + 1, of: PART_C.length })),
    { kind: 'result' },
    { kind: 'goal', id: 'D1' }, { kind: 'goal', id: 'D2' }, { kind: 'goal', id: 'D3' }, { kind: 'goal', id: 'D4' },
    { kind: 'profile' },
  ];
  const screens = () => (state.flow === 'wortstil' ? WORTSTIL_SCREENS : KOMPASS_SCREENS);
  const stepOf = (kind) => screens().findIndex((s) => s.kind === kind);

  // ---------- Hilfen ----------
  const vorname = () => (T.state.profil && T.state.profil.vorname) || '';
  const firstName = () => esc(vorname().trim()) || '[Vorname]';
  const sponsorText = (html) => html.replace(/\[Vorname\]/g, firstName());
  const clip = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
  const uid = () => T.state.session.user.id;

  function shuffled(id, options) {
    if (!state.order[id]) {
      const idx = options.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      state.order[id] = idx;
    }
    return state.order[id].map((i) => options[i]);
  }

  // ---------- Laden ----------
  async function load() {
    const res = await Promise.all([
      sb.from('kompass_auswertung').select('*').maybeSingle(),
      sb.from('rahmen').select('*').maybeSingle(),
      sb.from('ziele').select('*').maybeSingle(),
      sb.from('freigaben').select('*').maybeSingle(),
    ]);
    const bad = res.find((r) => r.error);
    if (bad) throw bad.error;
    const [k, r, z, f] = res.map((x) => x.data);
    state = fresh();
    if (k) {
      const counts = Object.fromEntries(TYPE_ORDER.map((t) => [t, Number((k.typ_punkte || {})[t]) || 0]));
      state.result = { counts, main: k.typ, second: k.zweittyp, bridge: k.brueckentyp, drivers: k.antriebe };
      state.savedAt = k.ausgewertet_am;
    }
    if (r) state.c = { hours: r.stunden || undefined, energy: r.energie || undefined, channels: r.kanaele || [], learn: r.lernstil || undefined, note: r.notiz_sponsor || '' };
    if (z && state.result) {
      state.d = {
        memory: z.moment || '', warum: z.warum || '', ziel12: z.ziel_12_monate || '',
        kunden: z.kunden_pro_monat ?? 0, partner: z.partner_pro_monat ?? 0,
        kontakte: (T.state.profil || {}).kontakte_pro_woche ?? 5,
        wachstum: z.wachstum || '', wachstumOwn: !!z.wachstum && z.wachstum !== D4_SUGGEST[state.result.main],
      };
    }
    if (f) state.share = { ziele: f.ziele, fuehrung: f.fuehrung, rahmen: f.rahmen };
  }
  T.onLogin.push(load);
  T.onLogout.push(() => { state = fresh(); });

  // ---------- Auswertung (läuft nur hier im Browser) ----------
  const answersComplete = () => Object.keys(state.a).length === D.partA.length && Object.keys(state.b).length === D.partB.length;
  function compute() {
    const counts = Object.fromEntries(TYPE_ORDER.map((t) => [t, 0]));
    Object.values(state.a).forEach((t) => counts[t]++);
    const a12 = state.a.A12; // Gleichstand: Antwort auf A12 entscheidet die Reihenfolge
    const ranked = [...TYPE_ORDER].sort((x, y) => counts[y] - counts[x] || (y === a12) - (x === a12) || TYPE_ORDER.indexOf(x) - TYPE_ORDER.indexOf(y));
    const main = ranked[0], second = ranked[1];
    const bridge = counts[main] === counts[second];

    const dcounts = Object.fromEntries(DRIVER_ORDER.map((d) => [d, 0]));
    Object.values(state.b).forEach((d) => dcounts[d]++);
    const b6 = state.b.B6; // Gleichstand: Antwort auf B6 entscheidet
    const drivers = [...DRIVER_ORDER].sort((x, y) => dcounts[y] - dcounts[x] || (y === b6) - (x === b6) || DRIVER_ORDER.indexOf(x) - DRIVER_ORDER.indexOf(y)).slice(0, 2);

    return { counts, main, second, bridge, drivers };
  }
  // Frisch beantwortet → neu berechnen, sonst das gespeicherte Ergebnis
  const evaluate = () => (answersComplete() ? compute() : state.result);

  function initGoals(r) {
    if (state.d) return;
    const base = D3_BY_HOURS[state.c.hours || 'h1'];
    const slow = r.main === 'anker' || r.main === 'kristall';
    state.d = {
      memory: '',
      warum: D1_PREFIX[r.drivers[0]],
      ziel12: D2_SUGGEST[r.drivers[0]],
      kunden: base.kunden,
      partner: slow ? (state.c.hours === 'h3' ? 1 : base.partner) : base.partner,
      kontakte: base.kontakte,
      wachstum: D4_SUGGEST[r.main],
      wachstumOwn: false,
    };
  }

  // ---------- Speichern ----------
  async function run(fn) {
    state.saving = true; state.saveError = '';
    try { await fn(); } catch (e) { console.error(e); state.saveError = 'Speichern hat nicht geklappt. Prüf deine Verbindung und versuch es nochmal.'; T.toast('Speichern hat nicht geklappt.'); }
    state.saving = false;
  }
  const must = ({ error, data }) => { if (error) throw error; return data; };
  const meilenstein = (art) => sb.from('meilensteine').insert({ art }).then(({ error }) => { if (error) console.error(error); });

  // Nach Teil C: Ergebnis und Rahmen speichern (die Einzelantworten bleiben hier)
  async function saveResult() {
    const r = evaluate();
    if (!r) return;
    const first = !state.savedAt;
    await run(async () => {
      if (answersComplete()) {
        const row = must(await sb.from('kompass_auswertung').upsert({
          owner_id: uid(), typ: r.main, zweittyp: r.second, brueckentyp: r.bridge, antriebe: r.drivers,
          typ_punkte: r.counts, ausgewertet_am: new Date().toISOString(),
        }).select().single());
        const prev = state.result;
        // Anderer Typ oder Antrieb → neue Zielvorschläge (gespeicherte Ziele bleiben, bis D1–D4 neu bestätigt sind)
        if (!prev || prev.main !== r.main || prev.drivers[0] !== r.drivers[0]) state.d = null;
        state.result = r; state.savedAt = row.ausgewertet_am;
        if (first) meilenstein('kompass_fertig');
      }
      must(await sb.from('rahmen').upsert({
        owner_id: uid(), stunden: state.c.hours || null, energie: state.c.energy || null, kanaele: state.c.channels,
        lernstil: state.c.learn || null, notiz_sponsor: clip(state.c.note, 500) || null,
      }));
    });
  }
  // Ziele (D1–D4) speichern; das Wochenziel D3 geht ins Profil
  async function saveGoals() {
    const g = state.d;
    if (!g || !state.result) return;
    const slow = state.result.main === 'anker' || state.result.main === 'kristall';
    await run(async () => {
      must(await sb.from('ziele').upsert({
        owner_id: uid(), moment: clip(g.memory, 1000) || null, warum: clip(g.warum, 500) || null,
        ziel_12_monate: clip(g.ziel12, 300) || null, kunden_pro_monat: clamp(g.kunden, 0, 50),
        partner_pro_monat: clamp(g.partner, 0, 20), partner_ab_monat_2: slow && g.partner > 0, wachstum: clip(g.wachstum, 300) || null,
      }));
      const woche = clamp(g.kontakte, 1, 30);
      if ((T.state.profil || {}).kontakte_pro_woche !== woche) {
        T.state.profil = must(await sb.from('profil').update({ kontakte_pro_woche: woche }).eq('id', uid()).select().single());
      }
    });
  }
  async function saveShare(key, on) {
    const before = state.share[key];
    state.share[key] = on;
    await run(async () => {
      must(await sb.from('freigaben').update({ [key]: on }).eq('owner_id', uid()).select().single());
      if (key === 'ziele' && on) meilenstein('ziele_freigegeben');
    });
    if (state.saveError) state.share[key] = before;
  }
  async function saveSteckbrief() {
    const p = state.ws.profile;
    if (!p) return;
    const steckbrief = Object.fromEntries(WS_FIELDS.map(([k]) => [k, clip(p[k], 300)]));
    const first = !T.state.steckbrief;
    await run(async () => {
      must(await sb.from('wortstil_steckbrief').upsert({ owner_id: uid(), steckbrief }));
      T.state.steckbrief = steckbrief;
      if (first) meilenstein('wortstil_fertig');
    });
  }
  async function setKiConsent() {
    if ((T.state.profil || {}).einwilligung_ki_am) return true;
    await run(async () => {
      T.state.profil = must(await sb.from('profil').update({ einwilligung_ki_am: new Date().toISOString() }).eq('id', uid()).select().single());
    });
    return !state.saveError;
  }

  // ---------- Navigation ----------
  const render = () => T.render();
  function go(step) {
    state.step = Math.max(0, Math.min(screens().length - 1, step));
    render().then(() => {
      window.scrollTo(0, 0);
      const h = app.querySelector('h1, h2, .question');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    });
  }
  async function next() {
    const from = screens()[state.step];
    const to = screens()[state.step + 1];
    if (state.flow === 'kompass' && from.kind === 'goal') await saveGoals();
    if (state.flow === 'kompass' && to && to.kind === 'result') await saveResult();
    if (state.flow === 'wortstil' && to && to.kind === 'ws-done') await saveSteckbrief();
    go(state.step + 1);
  }
  const back = () => go(state.step - 1);
  const openFlow = (flow, kind) => { state.flow = flow; state.saveError = ''; go(kind ? stepOf(kind) : 0); };

  function backBtn(label = 'Zurück') { return `<button class="btn ghost" data-act="back">← ${label}</button>`; }
  const saveNote = () => state.saveError ? `<p class="notice warm" role="alert">${esc(state.saveError)}</p>` : '';

  // ---------- Bildschirme ----------
  function viewStart() {
    return `
      <div class="eyebrow">Dein Profil in der App</div>
      <h1>Der Freiheits-Kompass</h1>
      <p class="lead">In etwa 10–15 Minuten erfährst du, wie du tickst, was dich antreibt und wie du dein Business so aufbaust, dass es zu dir passt.</p>

      <div class="card">
        <h3 style="margin-top:0">So bleiben deine Antworten bei dir</h3>
        <ul class="steps">
          <li><span class="num">1</span><div><strong>Deine einzelnen Antworten</strong> werden nur hier auf deinem Gerät ausgewertet und <strong>nie gespeichert</strong>.</div></li>
          <li><span class="num">2</span><div><strong>Deine Auswertung</strong> liegt in deinem Profil. Nur du kannst sie lesen.</div></li>
          <li><span class="num">3</span><div><strong>Dein Sponsor</strong> sieht nur, was du am Ende selbst freigibst: Ziele, Führungshinweise, Rahmen. Deinen Typ und deine Antriebe sieht er nicht. Du kannst die Freigabe jederzeit zurücknehmen.</div></li>
        </ul>
        <p class="muted small" style="margin-top:10px">Hinweis: Wer das Modell kennt, kann aus den Führungshinweisen deinen Typ ungefähr ableiten.</p>
      </div>

      ${state.result ? '<div class="notice">Du hast den Kompass schon gemacht. Wenn du ihn neu machst, ersetzt das neue Ergebnis das alte.</div>' : ''}

      <label class="check"><input type="checkbox" id="consent" ${state.consent ? 'checked' : ''}>
        <span>Ich habe verstanden, was gespeichert wird, was nie gespeichert wird und was ich teilen kann.</span></label>

      <div class="actions split"><button class="btn ghost" data-act="home">← Übersicht</button><button class="btn" data-act="next" id="startBtn" ${state.consent ? '' : 'disabled'}>Los geht's</button></div>`;
  }

  // ---------- Übersicht: Freiheits-Kompass oder direkt die Wortstil-Probe ----------
  function viewHome() {
    const sbf = T.state.steckbrief;
    return `
      <div class="eyebrow">Freiheits-Kompass &amp; Wortstil</div>
      <h1>${state.result || sbf ? 'Dein Profil' : 'Womit möchtest du starten?'}</h1>
      ${T.notice()}
      ${state.result ? `<div class="card">
        <h3 style="margin-top:0">${TYPES[state.result.main].icon} Mein Freiheits-Kompass</h3>
        <p class="muted small">Ausgewertet am ${esc(T.fmtDate(state.savedAt))}. Nur du kannst ihn lesen.</p>
        <div class="actions"><button class="btn small" data-act="open-profile">Mein Profil, Ziele &amp; Freigaben</button></div>
      </div>` : ''}
      ${sbf ? `<div class="card">
        <h3 style="margin-top:0">✍️ Mein Wortstil-Steckbrief</h3>
        <p class="muted small">Nur für dich sichtbar. Damit klingen deine Nachrichtenentwürfe nach dir.</p>
        <div class="actions"><button class="btn secondary small" data-act="ws-edit">Ansehen und ändern</button><button class="btn ghost small" data-act="ws-delete">Löschen</button></div>
      </div>` : ''}
      <p class="lead">${state.result || sbf ? 'Neu machen oder nachholen:' : 'Du entscheidest selbst. Beides ist freiwillig, und das andere kannst du später jederzeit nachholen.'}</p>
      <div class="paths">
        <button class="path" data-act="open-kompass">
          <span class="path-icon" aria-hidden="true">🧭</span>
          <span><strong>Der Freiheits-Kompass</strong><span class="path-time">10–15 Minuten${state.result ? ' · schon gemacht' : ''}</span>
          <span class="path-text">Fragen dazu, wie du tickst und was dich antreibt. Am Ende stehen dein Profil und vier Ziele, die zu dir passen.</span></span>
        </button>
        <button class="path" data-act="open-wortstil">
          <span class="path-icon" aria-hidden="true">✍️</span>
          <span><strong>Meine Wortstil-Probe</strong><span class="path-time">ca. 10 Minuten · kein Test${sbf ? ' · schon gemacht' : ''}</span>
          <span class="path-text">Du schreibst drei kurze Nachrichten, so wie du sie jemandem aus deinem Freundeskreis schicken würdest. Daraus lernt die App deinen Ton, damit Nachrichtenentwürfe später klingen wie du.</span></span>
        </button>
      </div>`;
  }

  // ---------- Wortstil-Probe ----------
  function viewWsStart() {
    const ws = state.ws;
    return `
      <div class="eyebrow">Deine Wortstil-Probe</div>
      <h1>So klingt deine Stimme</h1>
      <p class="lead">Die App schreibt dir Entwürfe für deine Nachrichten. Sie sollen klingen wie du und nicht wie ein Werbetext. Dafür braucht sie drei kurze Schreibproben von dir.</p>

      <div class="card">
        <h3 style="margin-top:0">So gehen wir mit deinen Proben um</h3>
        <ul class="steps">
          <li><span class="num">1</span><div><strong>Deine Schreibproben</strong> gehen nur zur Auswertung an eine KI und werden danach <strong>verworfen, nicht gespeichert</strong>.</div></li>
          <li><span class="num">2</span><div><strong>Dein Wortstil-Steckbrief</strong> entsteht daraus und liegt in deinem Profil. Nur du kannst ihn lesen und jederzeit ändern.</div></li>
          <li><span class="num">3</span><div><strong>Dein Sponsor</strong> sieht deinen Steckbrief nie. Er lässt sich auch nicht freigeben.</div></li>
        </ul>
      </div>

      <label class="check"><input type="checkbox" id="wsConsent" ${ws.consent ? 'checked' : ''}>
        <span>Ich bin einverstanden, dass meine Schreibproben zur Auswertung an die KI gehen.</span></label>
      <div class="notice">Die Auswertung macht Claude als KI, über einen Server der App. Du brauchst dafür <strong>kein eigenes Claude-Konto</strong>. Deine Proben gehen nur für die Auswertung an Anthropic (den Anbieter von Claude) und werden nicht gespeichert, auch nicht in der App.</div>
      ${saveNote()}
      <div class="actions split"><button class="btn ghost" data-act="home">← Übersicht</button><button class="btn" data-act="ws-begin" id="wsStartBtn" ${ws.consent && !state.saving ? '' : 'disabled'}>Los geht's</button></div>`;
  }

  function viewWsSample(s) {
    const val = state.ws[s.q.key];
    return `
      <div class="qnum">Schreibprobe ${s.n} von ${s.of}</div>
      <p class="question">${esc(s.q.text)}</p>
      <div class="suggest">Schreib so, wie du wirklich schreibst. Tippfehler, Emojis und Dialekt sind ausdrücklich erwünscht. Bitte keine echten Namen.</div>
      <textarea id="${s.q.key}" data-ws="${s.q.key}" maxlength="${MAX_SAMPLE}" style="min-height:130px" placeholder="Deine Nachricht …">${esc(val)}</textarea>
      <p class="muted small" style="margin-top:6px">Lieber sprechen? Tipp auf das Mikrofon deiner Handy-Tastatur und diktiere.</p>
      <div class="actions split">${backBtn()}<button class="btn" data-act="next" id="wsNext" ${val.trim() ? '' : 'disabled'}>Weiter</button></div>`;
  }

  function viewWsVoice() {
    return `
      <div class="qnum">Freiwillig · 30 Sekunden</div>
      <p class="question">Erzähl in einer halben Minute, warum du dabei bist.</p>
      <p class="qhint">Tipp ins Feld, dann auf das Mikrofon deiner Tastatur, und sprich einfach drauflos. Die App nimmt selbst nichts auf.</p>
      <textarea id="voice" data-ws="voice" maxlength="${MAX_VOICE}" style="min-height:130px" placeholder="Freiwillig. Du kannst das Feld auch leer lassen.">${esc(state.ws.voice)}</textarea>
      <div class="actions split">${backBtn()}<button class="btn" data-act="ws-analyse">Steckbrief erstellen</button></div>`;
  }

  function wsProfileList(p) {
    p = p || {};
    return `<dl class="kv">${WS_FIELDS.filter(([k]) => p[k]).map(([k, label]) => `<dt>${label}</dt><dd>${esc(p[k])}</dd>`).join('')}</dl>`;
  }

  function viewWsProfile() {
    const ws = state.ws;
    let body;
    if (ws.status === 'loading') {
      body = `<div class="card thinking" role="status"><span class="dot"></span> Claude liest deine Schreibproben und erstellt deinen Steckbrief. Das dauert meist unter einer Minute …</div>`;
    } else if (ws.status === 'error') {
      body = `<div class="card sand" role="alert"><p>${esc(ws.error)}${ws.attempts > 1 ? ` <span class="muted">(Versuch ${ws.attempts})</span>` : ''}</p><button class="btn secondary" data-act="ws-analyse-again">Nochmal versuchen</button></div>`;
    } else {
      const p = ws.profile || {};
      body = `<p class="lead">Prüf jeden Punkt. Wenn etwas nicht passt, korrigier es direkt im Feld.</p>
        <div class="card">${WS_FIELDS.filter(([k]) => k !== 'sprache' || p.sprache).map(([k, label]) => `
          <label class="field" for="wsf-${k}" style="margin-top:12px">${label}</label>
          <textarea id="wsf-${k}" data-wsfield="${k}" class="short" maxlength="300">${esc(p[k] || '')}</textarea>`).join('')}
        </div>
        ${ws.s1 ? '<button class="btn ghost" data-act="ws-analyse-again">↻ Neu auswerten</button>' : ''}`;
    }
    const ready = ws.profile && ws.status !== 'loading';
    return `
      <div class="eyebrow">Dein Wortstil-Steckbrief</div>
      <h2>So schreibst du</h2>
      ${body}
      ${saveNote()}
      <div class="actions split">${ws.s1 ? backBtn() : '<button class="btn ghost" data-act="home">← Übersicht</button>'}${ready ? `<span style="display:flex;gap:10px;flex-wrap:wrap">${ws.s1 ? '' : '<button class="btn secondary" data-act="ws-save-only">Speichern</button>'}<button class="btn" data-act="ws-draft">Beispielnachricht schreiben</button></span>` : '<span></span>'}</div>`;
  }

  function viewWsDraft() {
    const ws = state.ws;
    const busy = ws.draftStatus === 'loading';
    const bubble = ws.draft
      ? `<div class="bubble">${esc(ws.draft)}</div>`
      : busy ? `<div class="card thinking" role="status"><span class="dot"></span> Claude schreibt in deinem Ton …</div>` : '';
    const verdict = (v, label) => `<button class="option ${ws.verdict === v ? 'selected' : ''}" data-verdict="${v}" ${busy ? 'disabled' : ''}>${label}</button>`;
    return `
      <div class="eyebrow">Deine Wortstil-Probe · Beispiel</div>
      <h2>Klingt das nach dir?</h2>
      <p class="lead">Ein Entwurf für einen Erstkontakt: Du hast etwas Neues ausprobiert und schreibst jemandem aus deinem Bekanntenkreis davon.</p>
      ${bubble}
      ${ws.draftStatus === 'error' ? `<div class="card sand" role="alert"><p>${esc(ws.draftError)}${ws.attempts > 1 ? ` <span class="muted">(Versuch ${ws.attempts})</span>` : ''}</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn secondary" data-act="ws-draft-again">Nochmal versuchen</button><button class="btn ghost" data-act="ws-skip-draft">Ohne Beispiel weiter</button></div></div>` : ''}
      ${ws.draft && !busy ? `
        <div class="kchips three" role="radiogroup" aria-label="Klingt das nach dir?">
          ${verdict('passt', 'Passt')}${verdict('fast', 'Fast')}${verdict('nein', 'Gar nicht')}
        </div>
        ${ws.verdict === 'fast' || ws.verdict === 'nein' ? `
          <label class="field" for="wsFeedback" style="margin-top:16px">Was soll anders sein?</label>
          <textarea id="wsFeedback" data-wsfeedback maxlength="600" placeholder="Zum Beispiel: Ich würde nie „Hey du“ schreiben, eher „Hallo …“">${esc(ws.feedback)}</textarea>
          <button class="btn secondary" style="margin-top:10px" data-act="ws-draft-again">Neuer Versuch</button>` : ''}` : ''}
      <div class="notice" style="margin-top:16px">Die App verschickt nie selbst. Du kopierst den Entwurf, änderst ihn, wenn du magst, und schickst ihn selbst.</div>
      ${saveNote()}
      <div class="actions split">${backBtn('Steckbrief ändern')}${ws.verdict === 'passt' ? `<button class="btn" data-act="next" ${state.saving ? 'disabled' : ''}>Fertig</button>` : '<span></span>'}</div>`;
  }

  function viewWsDone() {
    return `
      <div class="eyebrow">Mein Wortstil-Steckbrief · nur für dich sichtbar</div>
      <h2>Dein Steckbrief steht</h2>
      <p class="lead">Ab jetzt schreibt die App Nachrichtenentwürfe in deinem Ton: für den Erstkontakt, die Einladung zum Test, das Nachfassen und für Danke &amp; Kundenpflege.</p>
      ${saveNote() || '<div class="notice">Gespeichert. Deine Schreibproben sind verworfen.</div>'}
      <div class="card">${wsProfileList(state.ws.profile)}</div>
      ${state.ws.draft ? `<div class="card"><h3 style="margin-top:0">Deine Beispielnachricht</h3><div class="bubble">${esc(state.ws.draft)}</div></div>` : ''}

      <div class="card no-print">
        <h3 style="margin-top:0">Danke fürs Testen!</h3>
        <p>Schick Tanja kurz deine Rückmeldung, gern als Sprachnachricht:</p>
        <ul>
          <li>Waren die drei Aufgaben klar? Bei welcher hast du gezögert?</li>
          <li>Erkennst du dich in deinem Steckbrief wieder?</li>
          <li>Klingt die Beispielnachricht nach dir?</li>
        </ul>
      </div>

      ${state.result ? '' : `<div class="card sand no-print">
        <h3 style="margin-top:0">Wenn du magst: der Freiheits-Kompass</h3>
        <p>Er ist freiwillig. Er zeigt dir, wie du tickst und was dich antreibt, und schlägt dir passende Ziele vor.</p>
        <button class="btn secondary" data-act="open-kompass">Zum Freiheits-Kompass</button>
      </div>`}
      <div class="actions split"><a class="btn secondary" href="#/kontakte">Zu den Kontakten</a><button class="btn ghost" data-act="home">Zur Übersicht</button></div>`;
  }

  // ---------- KI-Aufrufe (Server-Funktion „wortstil“ mit Login-Token) ----------
  const wsErrorText = (e) => ({
    not_signed_in: 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.',
    rate_limited: 'Gerade sind es zu viele Anfragen. Versuch es in ein paar Minuten nochmal.',
    refused: 'Claude konnte damit nichts anfangen. Ändere eine Probe ein wenig und versuch es nochmal.',
    invalid_json: 'Die Antwort kam unvollständig an. Versuch es bitte nochmal.',
    too_long: 'Eine Probe ist zu lang. Kürz sie bitte ein wenig.',
    network: 'Keine Verbindung zum Server. Prüf deine Internetverbindung und versuch es nochmal.',
    server_config: 'Die KI ist gerade nicht richtig eingerichtet. Gib Tanja bitte kurz Bescheid.',
  }[e && e.code] || 'Das hat leider nicht geklappt. Versuch es bitte nochmal.')
    + (e && e.code ? ` (Fehlercode: ${e.code})` : '');

  const onWsScreen = (kind) => T.route().name === 'kompass' && state.flow === 'wortstil' && screens()[state.step].kind === kind;

  async function runAnalysis() {
    const ws = state.ws;
    ws.status = 'loading'; ws.attempts = (ws.attempts || 0) + 1;
    render();
    try {
      const { profile } = await T.callWortstil({ action: 'steckbrief', samples: { s1: ws.s1, s2: ws.s2, s3: ws.s3, voice: ws.voice } });
      ws.profile = Object.fromEntries(WS_FIELDS.map(([k]) => [k, profile && typeof profile[k] === 'string' ? profile[k] : '']));
      ws.status = 'done'; ws.attempts = 0;
      ws.draft = ''; ws.verdict = null; ws.feedback = '';
    } catch (e) {
      console.error('Steckbrief:', e);
      ws.status = 'error';
      ws.error = wsErrorText(e);
    }
    if (onWsScreen('ws-profile')) render();
  }

  async function runDraft() {
    const ws = state.ws;
    ws.draftStatus = 'loading'; ws.draftError = ''; ws.attempts = (ws.attempts || 0) + 1;
    // Bei „Fast“/„Gar nicht“ gehen der vorige Entwurf und die Rückmeldung mit.
    const previous = ws.feedback.trim() ? ws.draft : '';
    const feedback = previous ? ws.feedback : '';
    ws.draft = ''; ws.verdict = null;
    render();
    try {
      const { text } = await T.callWortstil({ action: 'entwurf', profile: ws.profile, previous, feedback });
      ws.draft = String(text || '').trim();
      ws.draftStatus = 'done'; ws.attempts = 0;
      ws.feedback = '';
    } catch (e) {
      console.error('Beispielnachricht:', e);
      ws.draft = '';
      ws.draftStatus = 'error';
      ws.draftError = wsErrorText(e);
    }
    if (onWsScreen('ws-draft')) render();
  }

  function viewIntro(s) {
    return `
      <div class="eyebrow">Der Freiheits-Kompass</div>
      <h2>${s.title}</h2>
      <p class="lead">${s.text}</p>
      <div class="actions split">${backBtn()}<button class="btn" data-act="next">Weiter</button></div>`;
  }

  function viewChoice(s) {
    const store = state[s.part];
    const chosen = store[s.q.id];
    const opts = shuffled(s.q.id, s.q.options);
    return `
      <div class="qnum">Frage ${s.n} von ${s.of}</div>
      <p class="question">${esc(s.q.text)}</p>
      ${s.q.hint ? `<p class="qhint">(${esc(s.q.hint)})</p>` : ''}
      <div class="options" role="radiogroup" aria-label="${esc(s.q.text)}">
        ${opts.map((o) => `<button class="option ${chosen === o.value ? 'selected' : ''}" role="radio" aria-checked="${chosen === o.value}" data-pick="${o.value}">${esc(o.text)}</button>`).join('')}
      </div>
      <div class="actions split">${backBtn()}${chosen ? '<button class="btn secondary" data-act="next">Weiter</button>' : '<span></span>'}</div>`;
  }

  function viewRahmen(s) {
    const q = s.q;
    let body;
    if (q.free) {
      body = `<textarea id="free" maxlength="500" placeholder="Zum Beispiel: Ich brauche Zeit, bevor ich mich entscheide …">${esc(state.c.note || '')}</textarea>`;
    } else {
      const val = state.c[q.key];
      body = `<div class="options" role="${q.multi ? 'group' : 'radiogroup'}" aria-label="${esc(q.text)}">
        ${q.options.map(([v, label]) => {
          const on = q.multi ? val.includes(v) : val === v;
          return `<button class="option ${on ? 'selected' : ''}" role="${q.multi ? 'checkbox' : 'radio'}" aria-checked="${on}" data-rahmen="${v}">${esc(label)}</button>`;
        }).join('')}</div>`;
    }
    const ready = q.free || (q.multi ? state.c[q.key].length > 0 : !!state.c[q.key]);
    const canEvaluate = answersComplete() || state.result;
    return `
      <div class="qnum">Frage ${s.n} von ${s.of}</div>
      <p class="question">${esc(q.text)}</p>
      ${q.hint ? `<p class="qhint">${esc(q.hint)}</p>` : ''}
      ${body}
      ${q.free && !canEvaluate ? '<p class="notice warm">Es fehlen noch Antworten aus Teil A oder B. Geh bitte zurück und beantworte alle Fragen.</p>' : ''}
      ${saveNote()}
      <div class="actions split">${backBtn()}${ready && (!q.free || canEvaluate) ? `<button class="btn ${q.free || q.multi ? '' : 'secondary'}" data-act="next" ${state.saving ? 'disabled' : ''}>${q.free ? 'Zur Auswertung' : 'Weiter'}</button>` : '<span></span>'}</div>`;
  }

  function compassHtml(r) {
    const cell = (t) => `<div class="cell ${t === r.main ? 'main' : ''} ${t === r.second ? 'second' : ''}">${TYPES[t].icon}<b>${TYPES[t].name}</b></div>`;
    return `<div class="compass" aria-label="Dein Platz im Kompass">
      <div></div><div class="axis">Sache im Fokus</div><div class="axis">Menschen im Fokus</div>
      <div class="axis v">schnell</div>${cell('pfeil')}${cell('funke')}
      <div class="axis v">bedacht</div>${cell('kristall')}${cell('anker')}
    </div>
    <p class="muted small">Ausgefüllt = dein Haupttyp, gestrichelt = dein Zweittyp.</p>`;
  }

  function resultBlocks(r) {
    const R = D.results[r.main];
    const max = Math.max(...Object.values(r.counts), 1);
    const title = r.bridge ? 'Du bist ein Brückentyp' : `Du bist ein ${TYPES[r.main].name}`;
    const sub = r.bridge ? `${TYPES[r.main].name} und ${TYPES[r.second].name} zu gleichen Teilen` : `mit ${TYPES[r.second].name}-Anteil`;
    return `
      <div class="hero-type">
        <div class="icon">${TYPES[r.main].icon}</div>
        <h1>${title}</h1>
        <div class="sub">${sub}</div>
      </div>

      <div class="card">
        <h3 style="margin-top:0">Dein Platz im Kompass</h3>
        ${compassHtml(r)}
        <div class="bars">${TYPE_ORDER.map((t) => `
          <div class="bar ${t === r.main ? 'main' : ''}"><span>${TYPES[t].icon} ${TYPES[t].name}</span>
            <div class="track"><div class="fill" style="width:${(r.counts[t] / max) * 100}%"></div></div><span>${r.counts[t]}</span></div>`).join('')}
        </div>
      </div>

      <div class="card"><h3 style="margin-top:0">So tickst du</h3>${R.tickst}</div>
      <div class="card"><h3 style="margin-top:0">Was dich antreibt</h3>
        <div class="drivers">${r.drivers.map((d, i) => `
          <div class="driver"><span class="rank">${i + 1}</span><div><strong>${DRIVERS[d].name}</strong><br>${DRIVERS[d].text}</div></div>`).join('')}
        </div></div>
      <div class="card"><h3 style="margin-top:0">Deine Stärke in diesem Business</h3>${R.staerke}</div>
      <div class="card"><h3 style="margin-top:0">Dein Stolperstein</h3>${R.stolperstein}</div>
      <div class="card"><h3 style="margin-top:0">Dein Start in den ersten 30 Tagen</h3>${R.start}
        <div class="satz">„${esc(R.satz)}“</div><p class="muted small" style="text-align:center">Dein Satz für diesen Monat</p></div>
      <div class="card"><h3 style="margin-top:0">Was dir Energie gibt und was sie dir nimmt</h3>${R.energie}</div>
      <div class="card"><h3 style="margin-top:0">${r.bridge ? 'Deine zweite Seite' : 'Dein Zweittyp'}: ${TYPES[r.second].name}</h3><p>${R.zweittyp[r.second]}</p></div>
      <div class="card"><h3 style="margin-top:0">So erkennst du die anderen Typen bei deinen Kontakten</h3><div class="table-scroll">${R.erkennen}</div></div>`;
  }

  function viewResult() {
    const r = evaluate();
    if (!r) return viewHome();
    return `
      <div class="eyebrow">Deine Auswertung</div>
      ${saveNote() || (answersComplete() ? '<div class="notice">Deine Auswertung ist in deinem Profil gespeichert. Deine einzelnen Antworten nicht.</div>' : '')}
      ${resultBlocks(r)}
      <div class="card sand">
        <h3 style="margin-top:0">Und jetzt: deine Ziele</h3>
        <p>Im nächsten Schritt machst du aus deinem Profil vier Ziele. Zu jedem bekommst du einen Vorschlag, der zu dir passt, und du entscheidest, was du daraus machst.</p>
      </div>
      <div class="actions split">${backBtn()}<button class="btn" data-act="next">Zu deinen Zielen</button></div>`;
  }

  function viewGoal(s) {
    const r = evaluate();
    if (!r) return viewHome();
    initGoals(r);
    const g = state.d;
    const head = (n, t) => `<div class="eyebrow">Teil D · Deine Ziele · ${n} von 4</div><h2>${t}</h2>`;
    let body = '';
    if (s.id === 'D1') {
      body = `${head(1, 'Dein WARUM')}
        <label class="field" for="memory">Denk an den Moment, in dem du gedacht hast: So will ich nicht weitermachen. Oder: Das will ich auch. Was war da los?</label>
        <textarea id="memory" data-goal="memory" maxlength="1000">${esc(g.memory)}</textarea>
        <p class="muted small" style="margin-top:6px">Nur für dich. Dein Sponsor sieht diese Erinnerung nie, auch nicht mit Freigabe.</p>
        <label class="field" for="warum" style="margin-top:16px">Dein WARUM in einem Satz</label>
        <div class="suggest"><b>Vorschlag zu deinem Antrieb ${DRIVERS[r.drivers[0]].name}:</b> Vervollständige den Satz in deinen eigenen Worten.</div>
        <textarea id="warum" data-goal="warum" maxlength="500">${esc(g.warum)}</textarea>`;
    } else if (s.id === 'D2') {
      body = `${head(2, 'Dein 12-Monats-Ziel')}
        <label class="field" for="ziel12">Stell dir einen ganz normalen Dienstag in einem Jahr vor. Was ist anders als heute?</label>
        <div class="suggest"><b>Vorschlag:</b> „${esc(D2_SUGGEST[r.drivers[0]])}“ Übernimm ihn, schreib ihn um oder ersetze ihn.</div>
        <textarea id="ziel12" data-goal="ziel12" maxlength="300">${esc(g.ziel12)}</textarea>`;
    } else if (s.id === 'D3') {
      const base = D3_BY_HOURS[state.c.hours || 'h1'];
      const slow = r.main === 'anker' || r.main === 'kristall';
      body = `${head(3, 'Dein Kunden- und Partnerziel')}
        <div class="suggest"><b>Vorschlag für deine Zeit (${esc(PART_C[0].options.find(([v]) => v === state.c.hours)?.[1] || '3–5')} Std./Woche):</b> ${esc(base.text)}.
          ${slow ? '<br>Du startest mit dem Kundenziel. Das Partnerziel nimmst du ab Monat 2 dazu.' : ''}</div>
        <div class="num-row"><label for="kunden">Neue Kunden pro Monat</label><input type="number" min="0" max="50" id="kunden" data-goal="kunden" value="${esc(g.kunden)}"></div>
        <div class="num-row"><label for="partner">Neue Partner pro Monat${slow ? ' (ab Monat 2)' : ''}</label><input type="number" min="0" max="20" id="partner" data-goal="partner" value="${esc(g.partner)}"></div>
        <div class="num-row"><label for="kontakte">Neue Kontakte pro Woche <span class="muted small">(erscheint auf deinem Tagesdashboard)</span></label><input type="number" min="1" max="30" id="kontakte" data-goal="kontakte" value="${esc(g.kontakte)}"></div>
        <div class="notice">Das ist dein Ziel, keine Zusage. Niemand verspricht dir ein Einkommen.</div>`;
    } else if (s.id === 'D4') {
      body = `${head(4, 'Dein Wachstumsziel')}
        <p class="field">Was willst du in diesem Jahr an dir selbst entwickeln?</p>
        <div class="kchips">
          <button class="option ${!g.wachstumOwn ? 'selected' : ''}" data-wachstum="suggest">Vorschlag: „${esc(D4_SUGGEST[r.main])}“</button>
          <button class="option ${g.wachstumOwn ? 'selected' : ''}" data-wachstum="own">Ich formuliere mein eigenes Ziel</button>
        </div>
        ${g.wachstumOwn ? `<textarea id="wachstum" data-goal="wachstum" maxlength="300" style="margin-top:12px" placeholder="Mein Wachstumsziel …">${esc(g.wachstum === D4_SUGGEST[r.main] ? '' : g.wachstum)}</textarea>` : ''}`;
    }
    return `${body}
      ${saveNote()}
      <div class="actions split">${backBtn()}<button class="btn" data-act="next" ${state.saving ? 'disabled' : ''}>${s.id === 'D4' ? 'Mein Profil ansehen' : 'Weiter'}</button></div>`;
  }

  const cLabel = (key, v) => (PART_C.find((q) => q.key === key).options.find(([k]) => k === v) || [])[1] || '–';
  function rahmenList(c) {
    c = c || state.c;
    return `<dl class="kv">
      <dt>Zeit pro Woche</dt><dd>${esc(cLabel('hours', c.hours))} Std.</dd>
      <dt>Meiste Energie</dt><dd>${esc(cLabel('energy', c.energy))}</dd>
      <dt>Lieblingskanäle</dt><dd>${esc((c.channels || []).map((v) => cLabel('channels', v)).join(', ') || '–')}</dd>
      <dt>Lernt am besten</dt><dd>${esc(cLabel('learn', c.learn))}</dd>
      ${c.note ? `<dt>Was du über mich wissen solltest</dt><dd>${esc(c.note)}</dd>` : ''}
    </dl>`;
  }

  // g = { warum, ziel12, kunden, partner, kontakte, wachstum }, slow = Partnerziel ab Monat 2
  function goalsList(g, slow) {
    const partner = g.partner > 0 ? `${esc(g.partner)} Partner pro Monat${slow ? ' (ab Monat 2)' : ''}` : 'noch kein Partnerziel';
    return `<dl class="kv">
      <dt>WARUM</dt><dd>${esc(g.warum) || '–'}</dd>
      <dt>In 12 Monaten</dt><dd>${esc(g.ziel12) || '–'}</dd>
      <dt>Kunden / Partner</dt><dd>${esc(g.kunden ?? 0)} neue Kunden pro Monat · ${partner} · ${esc(g.kontakte)} neue Kontakte pro Woche</dd>
      <dt>Wachstumsziel</dt><dd>${esc(g.wachstum) || '–'}</dd>
    </dl>`;
  }
  const isSlow = (r) => r.main === 'anker' || r.main === 'kristall';

  function sponsorPreview(r) {
    const S = D.results[r.main].sponsor;
    const parts = [];
    if (state.share.ziele) parts.push(`<h3>Ziele von ${firstName()}</h3>${goalsList(state.d, isSlow(r))}`);
    if (state.share.fuehrung) parts.push(`<h3>So begleitest du ${firstName()}</h3>${sponsorText(S.begleiten)}<h3>Frühwarnzeichen</h3>${sponsorText(S.warnung)}<h3>Passendes Onboarding-Tempo</h3>${sponsorText(S.tempo)}`);
    if (state.share.rahmen) parts.push(`<h3>Rahmen</h3>${rahmenList()}`);
    return `<div class="sponsor-view">
      <div class="eyebrow">Vorschau · Das sieht dein Sponsor</div>
      ${parts.length ? parts.join('') : '<p class="empty">Noch nichts freigegeben. Dein Sponsor sieht im Moment nichts aus deinem Profil.</p>'}
      <p class="muted small" style="margin-top:12px">Typ und Antriebe sind nie Teil der Freigabe.</p>
    </div>`;
  }

  // Sponsor-Ansicht eines direkten Partners (Team): Zeile aus sponsor_ansicht.
  // Ziele und Rahmen sind Eingaben des Partners → immer escapen. Die Führungshinweise kommen
  // aus der festen Tabelle fuehrungshinweise (nur der Server schreibt dort); [Vorname] setzt
  // die App hier selbst ein, escaped.
  T.sponsorAnsichtHtml = (row, name) => {
    const vn = esc(String(name || '').trim()) || 'deinem Partner';
    const fill = (html) => String(html || '').replace(/\[Vorname\]/g, vn);
    const parts = [];
    const z = row.ziele;
    if (z) parts.push(`<h3>Ziele von ${vn}</h3>${goalsList({ warum: z.warum, ziel12: z.ziel_12_monate, kunden: z.kunden_pro_monat, partner: z.partner_pro_monat, kontakte: z.kontakte_pro_woche, wachstum: z.wachstum }, z.partner_ab_monat_2)}`);
    const f = row.fuehrung;
    if (f) parts.push(`<h3>So begleitest du ${vn}</h3>${fill(f.begleiten)}<h3>Frühwarnzeichen</h3>${fill(f.warnung)}<h3>Passendes Onboarding-Tempo</h3>${fill(f.tempo)}`);
    const r = row.rahmen;
    if (r) parts.push(`<h3>Rahmen</h3>${rahmenList({ hours: r.stunden, energy: r.energie, channels: r.kanaele || [], learn: r.lernstil, note: r.notiz_sponsor })}`);
    return parts.join('') || '<p class="empty">Noch nichts freigegeben.</p>';
  };

  function viewProfile() {
    const r = evaluate();
    if (!r) return viewHome();
    initGoals(r);
    const sw = (key, title, desc) => `
      <div class="toggle"><div><strong>${title}</strong><br><span class="muted small">${desc}</span></div>
        <label class="switch"><input type="checkbox" data-share="${key}" ${state.share[key] ? 'checked' : ''} aria-label="${title} freigeben"><span class="slider"></span></label></div>`;
    return `
      <div class="eyebrow">Mein Profil · nur für dich sichtbar</div>
      ${resultBlocks(r)}
      <div class="card"><h3 style="margin-top:0">Meine Ziele</h3>${goalsList(state.d, isSlow(r))}
        <p class="muted small">Alle 3 Monate erinnert dich die App an deinen Ziel-Check: behalten, anpassen oder neu setzen.</p></div>
      <div class="card"><h3 style="margin-top:0">Mein Rahmen</h3>${rahmenList()}</div>

      <div class="card no-print">
        <h3 style="margin-top:0">Mit meinem Sponsor teilen</h3>
        <p class="muted">Du entscheidest, was dein Sponsor sehen darf. Du kannst es jederzeit wieder ausschalten.</p>
        ${sw('ziele', 'Ziele', 'WARUM, 12-Monats-Ziel, Kunden- und Partnerziel, Wachstumsziel')}
        ${sw('fuehrung', 'Führungshinweise', 'So begleitet dein Sponsor dich, Frühwarnzeichen, passendes Tempo (ohne Typnamen)')}
        ${sw('rahmen', 'Rahmen', 'Zeit, Energie, Kanäle, Lernstil und deine Notiz an den Sponsor')}
        ${saveNote()}
      </div>
      <div class="no-print" id="sponsorPreview">${sponsorPreview(r)}</div>

      <div class="card no-print" style="margin-top:18px">
        <h3 style="margin-top:0">Danke fürs Testen!</h3>
        <p>Schick Tanja kurz deine Rückmeldung, gern als Sprachnachricht:</p>
        <ul>
          <li>Waren alle Fragen klar? Bei welcher hast du gezögert?</li>
          <li>Erkennst du dich in deinem Ergebnis wieder?</li>
          <li>Passen die Vorschläge für deine Ziele zu dir?</li>
        </ul>
      </div>

      ${T.state.steckbrief ? '' : `<div class="card sand no-print">
        <h3 style="margin-top:0">Nächster Schritt: deine Wortstil-Probe</h3>
        <p>Drei kurze Schreibproben, damit die App Nachrichtenentwürfe schreibt, die klingen wie du.</p>
        <button class="btn secondary" data-act="open-wortstil">Wortstil-Probe starten</button>
      </div>`}

      ${state.confirmRestart ? `
      <div class="card sand no-print" role="alert">
        <strong>Test wirklich neu starten?</strong> Du beantwortest alle Fragen neu. Dein neues Ergebnis ersetzt das alte, sobald du Teil C abschließt.
        <div class="actions" style="margin-top:12px"><button class="btn ghost" data-act="restart-cancel">Abbrechen</button><button class="btn" data-act="restart-yes">Ja, neu starten</button></div>
      </div>` : ''}
      <div class="actions split">
        ${backBtn('Ziele ändern')}
        <span style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn secondary" data-act="print">Als PDF speichern</button>
          <button class="btn ghost" data-act="restart">Test neu starten</button>
        </span>
      </div>
      <p class="no-print" style="margin-top:12px"><button class="linklike small" data-act="home">← Zur Übersicht</button></p>`;
  }

  // ---------- Rendern ----------
  function viewKompass() {
    const list = screens();
    const s = list[state.step];
    const html =
      !state.flow ? viewHome() :
      s.kind === 'ws-start' ? viewWsStart() :
      s.kind === 'ws-sample' ? viewWsSample(s) :
      s.kind === 'ws-voice' ? viewWsVoice() :
      s.kind === 'ws-profile' ? viewWsProfile() :
      s.kind === 'ws-draft' ? viewWsDraft() :
      s.kind === 'ws-done' ? viewWsDone() :
      s.kind === 'start' ? viewStart() :
      s.kind === 'intro' ? viewIntro(s) :
      s.kind === 'choice' ? viewChoice(s) :
      s.kind === 'rahmen' ? viewRahmen(s) :
      s.kind === 'result' ? viewResult() :
      s.kind === 'goal' ? viewGoal(s) :
      viewProfile();
    const pct = state.flow ? (state.step / (list.length - 1)) * 100 : 0;
    return `${state.flow ? `<div class="progress" aria-hidden="true"><div class="progress-bar" style="width:${pct}%"></div></div>` : ''}<div class="kompass">${html}</div>`;
  }
  T.views.kompass = { html: viewKompass, noKeep: true };

  // ---------- Ereignisse ----------
  const here = () => T.state.session && T.route().name === 'kompass';
  app.addEventListener('click', async (e) => {
    if (!here()) return;
    const t = e.target.closest('button');
    if (!t) return;
    const s = screens()[state.step];
    const act = t.dataset.act;

    if (act === 'home') { state.flow = null; state.confirmRestart = false; return go(0); }
    if (act === 'open-kompass') { state.consent = false; return openFlow('kompass'); }
    if (act === 'open-profile') return openFlow('kompass', 'profile');
    if (act === 'open-wortstil') { state.ws = newWs(); state.ws.consent = !!(T.state.profil || {}).einwilligung_ki_am; return openFlow('wortstil'); }
    if (act === 'ws-edit') {
      state.ws = newWs();
      state.ws.profile = Object.assign({}, T.state.steckbrief); state.ws.status = 'done';
      return openFlow('wortstil', 'ws-profile');
    }
    if (act === 'ws-delete') {
      if (!window.confirm('Deinen Wortstil-Steckbrief wirklich löschen? Die Entwürfe klingen dann wieder neutral.')) return;
      const { error } = await sb.from('wortstil_steckbrief').delete().eq('owner_id', uid());
      if (error) { T.toast('Löschen hat nicht geklappt.'); return; }
      T.state.steckbrief = null; T.toast('Steckbrief gelöscht'); return render();
    }
    if (act === 'ws-begin') {
      t.disabled = true;
      if (!await setKiConsent()) return render();
      return next();
    }
    if (act === 'ws-analyse') {
      // Proben unverändert und Steckbrief schon da? Dann nicht neu auswerten.
      const key = [state.ws.s1, state.ws.s2, state.ws.s3, state.ws.voice].join('|');
      go(state.step + 1);
      if (state.ws.profile && state.ws.status === 'done' && state.ws.key === key) return;
      state.ws.key = key;
      return runAnalysis();
    }
    if (act === 'ws-analyse-again') return runAnalysis();
    if (act === 'ws-save-only') { await saveSteckbrief(); if (!state.saveError) { T.toast('Steckbrief gespeichert'); state.flow = null; return go(0); } return render(); }
    if (act === 'ws-draft') { go(state.step + 1); if (!state.ws.draft) runDraft(); return; }
    if (act === 'ws-draft-again') return runDraft();
    if (act === 'ws-skip-draft') return next();
    if (t.dataset.verdict) { state.ws.verdict = t.dataset.verdict; await render(); app.querySelector('#wsFeedback')?.focus(); return; }
    if (act === 'next') { t.disabled = true; return next(); }
    if (act === 'back') return back();
    if (act === 'print') return window.print();
    if (act === 'restart') { state.confirmRestart = true; return render(); }
    if (act === 'restart-cancel') { state.confirmRestart = false; return render(); }
    if (act === 'restart-yes') {
      Object.assign(state, { a: {}, b: {}, order: {}, confirmRestart: false, consent: true });
      return go(1);
    }
    if (t.dataset.pick) {
      state[s.part][s.q.id] = t.dataset.pick;
      await render();
      setTimeout(() => { if (screens()[state.step] === s && here()) next(); }, 280);
      return;
    }
    if (t.dataset.rahmen) {
      const q = s.q;
      if (q.multi) {
        const list = state.c[q.key];
        const i = list.indexOf(t.dataset.rahmen);
        i >= 0 ? list.splice(i, 1) : list.push(t.dataset.rahmen);
        render();
      } else {
        const changed = state.c[q.key] !== t.dataset.rahmen;
        state.c[q.key] = t.dataset.rahmen;
        if (q.key === 'hours' && changed && answersComplete()) state.d = null; // Stunden geändert → Zielvorschlag neu berechnen
        await render();
        setTimeout(() => { if (screens()[state.step] === s && here()) next(); }, 280);
      }
      return;
    }
    if (t.dataset.wachstum) {
      const r = evaluate();
      const own = t.dataset.wachstum === 'own';
      state.d.wachstumOwn = own;
      if (!own) state.d.wachstum = D4_SUGGEST[r.main];
      else if (state.d.wachstum === D4_SUGGEST[r.main]) state.d.wachstum = '';
      await render();
      if (own) app.querySelector('#wachstum')?.focus();
    }
  });

  app.addEventListener('input', (e) => {
    if (!here()) return;
    const t = e.target;
    if (t.id === 'free') state.c.note = t.value;
    if (t.dataset.ws) {
      state.ws[t.dataset.ws] = t.value;
      const btn = document.getElementById('wsNext');
      if (btn) btn.disabled = !t.value.trim();
    }
    if (t.dataset.wsfield) {
      state.ws.profile[t.dataset.wsfield] = t.value;
      state.ws.draft = ''; state.ws.verdict = null; // geänderter Steckbrief → neue Beispielnachricht
    }
    if (t.hasAttribute('data-wsfeedback')) state.ws.feedback = t.value;
    if (t.dataset.goal) {
      state.d[t.dataset.goal] = t.type === 'number' ? Math.max(0, parseInt(t.value || '0', 10)) : t.value;
    }
  });

  app.addEventListener('change', async (e) => {
    if (!here()) return;
    const t = e.target;
    if (t.id === 'wsConsent') {
      state.ws.consent = t.checked;
      document.getElementById('wsStartBtn').disabled = !t.checked;
    }
    if (t.id === 'consent') {
      state.consent = t.checked;
      document.getElementById('startBtn').disabled = !t.checked;
    }
    if (t.dataset.share) {
      t.disabled = true;
      await saveShare(t.dataset.share, t.checked);
      await render();
    }
  });
})();
