// App-Gerüst: Login per E-Mail (Link oder 6-stelliger Code), Einladung annehmen,
// Start, Profil und Team (Partner einladen). Daten liegen in Supabase (Frankfurt),
// geschützt durch Row Level Security: Jede Abfrage sieht nur die eigenen Zeilen.
(() => {
  'use strict';

  const C = window.APP_CONFIG;
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'tw-app-auth' },
  });

  const app = document.getElementById('app');
  const tabbar = document.getElementById('tabbar');

  const state = {
    session: null,
    profil: null,
    loginEmail: '',
    einladung: '',        // Code aus ?einladung=…
    neuerCode: null,      // gerade erzeugter Einladungscode (nur einmal sichtbar)
    msg: null,            // { text, warm }
    busy: false,
  };

  // ---------- Hilfen ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const LINK = /^https:\/\/[a-z0-9-]+\.superpatch\.com(\/.*)?$/i;
  const route = () => (location.hash.replace(/^#\/?/, '') || 'heute').split('?')[0];
  const go = (r) => { if (route() === r) render(); else location.hash = '#/' + r; };
  const say = (text, warm = false) => { state.msg = { text, warm }; };
  const notice = () => {
    if (!state.msg) return '';
    const m = state.msg; state.msg = null;
    return `<p class="notice${m.warm ? ' warm' : ''}" role="status">${esc(m.text)}</p>`;
  };
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });

  function greeting() {
    const p = state.profil || {};
    const hm = (t, d) => { const [h, m] = String(t || d).split(':').map(Number); return h * 60 + (m || 0); };
    const now = new Date(); const min = now.getHours() * 60 + now.getMinutes();
    if (min < hm(p.begruessung_morgen_bis, '11:00')) return 'Guten Morgen';
    if (min >= hm(p.begruessung_abend_ab, '18:00')) return 'Guten Abend';
    return 'Hallo';
  }

  function authError(e) {
    const m = String(e?.message || e || '');
    if (/rate limit|too many|security purposes/i.test(m)) return 'Bitte warte eine Minute und versuch es dann noch einmal.';
    if (/expired|invalid/i.test(m)) return 'Der Code stimmt nicht oder ist abgelaufen. Fordere einfach einen neuen an.';
    return 'Das hat leider nicht geklappt. Bitte versuch es gleich noch einmal.';
  }

  // ---------- Bildschirme ohne Login ----------
  function viewLogin() {
    return `
      <div class="eyebrow">Willkommen</div>
      <h1>Anmelden</h1>
      <p class="lead">Gib deine E-Mail-Adresse ein. Du bekommst einen Link und einen 6-stelligen Code.</p>
      ${notice()}
      <form class="card" data-form="login" novalidate>
        <label class="field" for="email">E-Mail-Adresse</label>
        <input type="email" id="email" name="email" autocomplete="email" inputmode="email" required value="${esc(state.loginEmail)}">
        <div class="actions"><button class="btn block" ${state.busy ? 'disabled' : ''}>Login-Mail schicken</button></div>
      </form>
      <p class="muted small">Noch kein Zugang? Die App ist nur mit persönlicher Einladung nutzbar. Frag die Person, die dich ins Team geholt hat.</p>
      <p class="muted small"><a href="#/code">Ich habe schon einen Code</a> · <a href="datenschutz.html">Datenschutz</a></p>`;
  }

  function viewCode() {
    return `
      <div class="eyebrow">Fast geschafft</div>
      <h1>Code eingeben</h1>
      <p class="lead">Wir haben dir eine Mail${state.loginEmail ? ` an <strong>${esc(state.loginEmail)}</strong>` : ''} geschickt. Tipp dort auf „Jetzt anmelden“ oder gib hier den Code ein.</p>
      ${notice()}
      <form class="card" data-form="code" novalidate>
        ${state.loginEmail ? '' : `<label class="field" for="email">E-Mail-Adresse</label>
        <input type="email" id="email" name="email" autocomplete="email" inputmode="email" required>`}
        <label class="field" for="token">6-stelliger Code</label>
        <input type="text" id="token" name="token" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required
               style="font-size:1.6rem;letter-spacing:.3em;text-align:center">
        <div class="actions"><button class="btn block" ${state.busy ? 'disabled' : ''}>Anmelden</button></div>
      </form>
      <p class="muted small">Die Mail kann ein paar Minuten brauchen. Schau auch im Spam-Ordner nach. Link und Code gelten eine Stunde.</p>
      <p class="muted small"><button class="linklike" data-act="anderemail">Andere E-Mail-Adresse</button></p>`;
  }

  function viewEinladung() {
    return `
      <div class="eyebrow">Einladung</div>
      <h1>Schön, dass du dabei bist</h1>
      <p class="lead">Mit deinem Einladungscode legst du deinen Zugang an. Danach bekommst du eine Mail zum Anmelden.</p>
      ${notice()}
      <form class="card" data-form="einladung" novalidate>
        <label class="field" for="code">Einladungscode</label>
        <input type="text" id="code" name="code" autocomplete="off" autocapitalize="characters" maxlength="12" required value="${esc(state.einladung)}"
               style="letter-spacing:.12em;text-transform:uppercase">
        <label class="field" for="vorname">Vorname</label>
        <input type="text" id="vorname" name="vorname" autocomplete="given-name" maxlength="40" required>
        <label class="field" for="email">E-Mail-Adresse</label>
        <input type="email" id="email" name="email" autocomplete="email" inputmode="email" required>
        <label class="check"><input type="checkbox" name="einwilligung" required>
          <span>Ich habe die <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutzhinweise</a> gelesen und bin einverstanden, dass meine Angaben für die App gespeichert werden.</span></label>
        <div class="actions"><button class="btn block" ${state.busy ? 'disabled' : ''}>Zugang anlegen</button></div>
      </form>
      <p class="muted small">Du hast schon einen Zugang? <a href="#/login">Hier anmelden</a></p>`;
  }

  // ---------- Bildschirme mit Login ----------
  function viewHeute() {
    const p = state.profil || {};
    const offen = [];
    if (!p.vorname) offen.push('Vorname');
    if (!p.superpatch_link) offen.push('Mein Superpatch-Link');
    return `
      <div class="greet">
        <h1>${greeting()}${p.vorname ? ', ' + esc(p.vorname) : ''}!</h1>
        <p class="lead">Dein Business-Fokus für heute</p>
      </div>
      ${notice()}
      ${offen.length ? `<div class="card fu-box">
        <h2>Dein Profil</h2>
        <p>Es fehlt noch: ${offen.map(esc).join(', ')}. Den Superpatch-Link setzt die App später in deine Nachrichten ein.</p>
        <div class="actions"><a class="btn small" href="#/profil">Profil ergänzen</a></div>
      </div>` : ''}
      <div class="card">
        <h2>Bald hier</h2>
        <p class="muted">Kontakte, Follow-ups, deine 3 Prioritäten und das Wochenziel kommen als Nächstes in die App. Bis dahin kannst du sie im <a href="prototyp/">Prototyp mit Beispieldaten</a> ansehen.</p>
        <p class="muted small">Wochenziel laut Profil: ${esc(p.kontakte_pro_woche ?? 5)} neue Kontakte pro Woche.</p>
      </div>
      <div class="card sand">
        <h2>Academy</h2>
        <p>Videos, Spickzettel und Startklar-Checkliste.</p>
        <div class="actions"><a class="btn secondary small" href="${esc(C.academyUrl)}" target="_blank" rel="noopener">Zur Academy</a></div>
      </div>`;
  }

  function viewProfil() {
    const p = state.profil || {};
    return `
      <h1>Profil</h1>
      ${notice()}
      <form class="card" data-form="profil" novalidate>
        <label class="field" for="vorname">Vorname</label>
        <input type="text" id="vorname" name="vorname" maxlength="40" value="${esc(p.vorname)}">
        <label class="field" for="link">Mein Superpatch-Link <span class="opt">(z. B. https://deinname.superpatch.com)</span></label>
        <input type="url" id="link" name="superpatch_link" maxlength="200" inputmode="url" placeholder="https://…superpatch.com" value="${esc(p.superpatch_link)}">
        <label class="field" for="woche">Wochenziel: neue Kontakte pro Woche</label>
        <input type="number" id="woche" name="kontakte_pro_woche" min="1" max="30" value="${esc(p.kontakte_pro_woche ?? 5)}">
        <div class="row2">
          <div><label class="field" for="morgen">„Guten Morgen“ bis</label>
            <input type="time" id="morgen" name="begruessung_morgen_bis" value="${esc(String(p.begruessung_morgen_bis || '11:00').slice(0, 5))}"></div>
          <div><label class="field" for="abend">„Guten Abend“ ab</label>
            <input type="time" id="abend" name="begruessung_abend_ab" value="${esc(String(p.begruessung_abend_ab || '18:00').slice(0, 5))}"></div>
        </div>
        <div class="actions"><button class="btn" ${state.busy ? 'disabled' : ''}>Speichern</button></div>
      </form>
      <div class="card">
        <p class="muted small">Angemeldet als <strong>${esc(state.session?.user?.email)}</strong></p>
        <div class="actions split">
          <a class="btn secondary small" href="${esc(C.academyUrl)}" target="_blank" rel="noopener">Academy</a>
          <button class="btn ghost small" data-act="logout">Abmelden</button>
        </div>
      </div>
      <p class="muted small"><a href="datenschutz.html">Datenschutz</a></p>`;
  }

  async function viewTeam() {
    const [partner, codes] = await Promise.all([
      sb.rpc('meine_partner'),
      sb.from('einladungscodes').select('id, notiz, max_nutzungen, genutzt, gueltig_bis, widerrufen_am, erstellt_am').order('erstellt_am', { ascending: false }).limit(20),
    ]);
    const list = partner.data || [];
    const now = Date.now();
    const status = (c) => c.widerrufen_am ? 'widerrufen' : c.genutzt >= c.max_nutzungen ? 'eingelöst' : new Date(c.gueltig_bis) < now ? 'abgelaufen' : `gültig bis ${fmtDate(c.gueltig_bis)}`;
    const aktiv = (c) => !c.widerrufen_am && c.genutzt < c.max_nutzungen && new Date(c.gueltig_bis) >= now;
    const nc = state.neuerCode;
    const link = nc ? `${C.appUrl}?einladung=${encodeURIComponent(nc)}` : '';
    const text = nc ? `Hallo! Hier ist deine Einladung für unsere Team-App: ${link} (Code ${nc}, 14 Tage gültig).` : '';
    return `
      <h1>Team</h1>
      ${notice()}
      <div class="card">
        <h2>Partner einladen</h2>
        ${nc ? `<p>Dein neuer Einladungscode (nur jetzt sichtbar):</p>
          <p style="font-size:1.6rem;font-weight:700;letter-spacing:.12em;margin:.2em 0 .4em">${esc(nc)}</p>
          <p class="muted small" style="word-break:break-all">${esc(link)}</p>
          <div class="actions">
            <button class="btn small" data-act="copy" data-text="${esc(text)}">Einladung kopieren</button>
            <a class="btn secondary small" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">In WhatsApp öffnen</a>
          </div>
          <p class="muted small">Du verschickst die Einladung selbst. Der Code gilt 14 Tage für eine Person.</p>`
        : `<p class="muted">Erzeuge einen Code für eine Person, die du ins Team holst. Sie wird damit dein direkter Partner.</p>
          <form data-form="einladen" novalidate>
            <label class="field" for="notiz">Für wen? <span class="opt">(nur für dich, z. B. „Maria“)</span></label>
            <input type="text" id="notiz" name="notiz" maxlength="80">
            <div class="actions"><button class="btn" ${state.busy ? 'disabled' : ''}>Einladungscode erzeugen</button></div>
          </form>`}
      </div>
      <div class="card">
        <h2>Meine Partner</h2>
        ${list.length ? `<ul class="clist">${list.map((p) => `<li><a><div class="c-top"><span class="c-name">${esc(p.vorname || 'ohne Namen')}</span>
          <span class="due">${p.eingeladen_am ? 'seit ' + fmtDate(p.eingeladen_am) : ''}</span></div></a></li>`).join('')}</ul>`
        : '<p class="empty">Noch keine Partner. Sobald jemand deinen Code einlöst, steht die Person hier.</p>'}
        <p class="muted small">Du siehst hier nur Vornamen. Ziele und Hinweise siehst du, wenn deine Partner sie freigeben. Kontakte und Typ deiner Partner siehst du nie.</p>
      </div>
      ${(codes.data || []).length ? `<div class="card">
        <h2>Meine Einladungscodes</h2>
        <ul class="clist">${codes.data.map((c) => `<li><a><div class="c-top"><span class="c-name">${esc(c.notiz || 'ohne Notiz')}</span>
          <span class="due">${esc(status(c))}</span></div>
          ${aktiv(c) ? `<div class="c-sub"><button class="linklike" data-act="widerrufen" data-id="${esc(c.id)}">widerrufen</button></div>` : ''}</a></li>`).join('')}</ul>
      </div>` : ''}`;
  }

  // ---------- Darstellen ----------
  let lastRoute = null;
  async function render() {
    const r = route();
    const loggedIn = !!state.session;
    tabbar.hidden = !loggedIn;
    tabbar.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.tab === r));

    let html;
    if (!loggedIn) {
      html = r === 'code' ? viewCode() : r === 'einladung' ? viewEinladung() : viewLogin();
    } else if (r === 'profil') html = viewProfil();
    else if (r === 'team') html = await viewTeam();
    else html = viewHeute();

    // Eingaben bleiben beim Neuzeichnen auf derselben Seite erhalten (z. B. nach einer Fehlermeldung)
    const keep = {};
    if (lastRoute === r) app.querySelectorAll('input[id]').forEach((i) => { keep[i.id] = i.type === 'checkbox' ? i.checked : i.value; });
    lastRoute = r;
    app.innerHTML = html;
    app.querySelectorAll('input[id]').forEach((i) => {
      if (!(i.id in keep)) return;
      if (i.type === 'checkbox') i.checked = keep[i.id]; else i.value = keep[i.id];
    });
    const first = app.querySelector('input:not([type=checkbox])');
    if (!loggedIn && first && !first.value) first.focus({ preventScroll: true });
  }

  async function loadProfil() {
    const { data, error } = await sb.from('profil').select('*').eq('id', state.session.user.id).maybeSingle();
    if (error) say('Dein Profil konnte nicht geladen werden. Bitte lade die Seite neu.', true);
    state.profil = data;
  }

  async function busy(fn) {
    state.busy = true; await render();
    try { await fn(); } finally { state.busy = false; await render(); }
  }

  // ---------- Formulare ----------
  app.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target; const d = Object.fromEntries(new FormData(f));
    const kind = f.dataset.form;

    if (kind === 'login') {
      const email = String(d.email || '').trim().toLowerCase();
      if (!EMAIL.test(email)) { say('Bitte gib eine gültige E-Mail-Adresse ein.', true); return render(); }
      state.loginEmail = email;
      return busy(async () => {
        const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: C.appUrl } });
        // Gleiche Antwort für unbekannte Adressen: niemand soll prüfen können, wer dabei ist.
        if (error && /rate limit|too many|security purposes/i.test(error.message)) { say(authError(error), true); return; }
        location.hash = '#/code';
      });
    }

    if (kind === 'code') {
      const email = state.loginEmail || String(d.email || '').trim().toLowerCase();
      const token = String(d.token || '').replace(/\D/g, '');
      if (!EMAIL.test(email)) { say('Bitte gib deine E-Mail-Adresse ein.', true); return render(); }
      if (token.length !== 6) { say('Der Code hat 6 Ziffern.', true); return render(); }
      return busy(async () => {
        const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
        if (error) say(authError(error), true);
        else { state.loginEmail = ''; location.hash = '#/heute'; }
      });
    }

    if (kind === 'einladung') {
      const body = {
        code: String(d.code || '').trim(),
        vorname: String(d.vorname || '').trim(),
        email: String(d.email || '').trim().toLowerCase(),
        einwilligung: d.einwilligung === 'on',
      };
      if (!body.code || !body.vorname || !EMAIL.test(body.email)) { say('Bitte füll Code, Vorname und E-Mail-Adresse aus.', true); return render(); }
      if (!body.einwilligung) { say('Bitte bestätige die Datenschutzhinweise.', true); return render(); }
      return busy(async () => {
        let res, out = {};
        try {
          res = await fetch(C.einladungUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
          out = await res.json().catch(() => ({}));
        } catch { say('Keine Verbindung. Bitte prüf dein Internet und versuch es noch einmal.', true); return; }
        if (res.ok) {
          state.loginEmail = body.email; state.einladung = '';
          history.replaceState(null, '', location.pathname + '#/code');
          say(out.mail === false ? 'Dein Zugang ist angelegt. Die Login-Mail konnte gerade nicht verschickt werden: Melde dich gleich unter „Anmelden“ mit deiner Adresse an.' : 'Dein Zugang ist angelegt.');
          return;
        }
        const msgs = {
          code_ungueltig: 'Der Einladungscode ist ungültig, schon benutzt oder abgelaufen. Frag nach einem neuen Code.',
          zu_viele_versuche: 'Zu viele Versuche. Bitte warte eine Stunde und versuch es dann noch einmal.',
          einwilligung_fehlt: 'Bitte bestätige die Datenschutzhinweise.',
          invalid_request: 'Bitte prüf deine Angaben (Code, Vorname, E-Mail-Adresse).',
        };
        say(msgs[out.error] || 'Das hat leider nicht geklappt. Bitte versuch es gleich noch einmal.', true);
      });
    }

    if (kind === 'profil') {
      const link = String(d.superpatch_link || '').trim();
      if (link && !LINK.test(link)) { say('Der Superpatch-Link muss so aussehen: https://deinname.superpatch.com', true); return render(); }
      const woche = Number(d.kontakte_pro_woche);
      if (!(woche >= 1 && woche <= 30)) { say('Wochenziel: bitte eine Zahl von 1 bis 30.', true); return render(); }
      return busy(async () => {
        const { data, error } = await sb.from('profil').update({
          vorname: String(d.vorname || '').trim() || null,
          superpatch_link: link || null,
          kontakte_pro_woche: woche,
          begruessung_morgen_bis: d.begruessung_morgen_bis || '11:00',
          begruessung_abend_ab: d.begruessung_abend_ab || '18:00',
        }).eq('id', state.session.user.id).select().maybeSingle();
        if (error || !data) say('Speichern hat nicht geklappt. Bitte prüf deine Angaben.', true);
        else { state.profil = data; say('Gespeichert.'); }
      });
    }

    if (kind === 'einladen') {
      return busy(async () => {
        const { data, error } = await sb.rpc('einladungscode_erstellen', { p_notiz: String(d.notiz || '').trim() || null });
        if (error) say('Der Code konnte nicht erzeugt werden. Bitte versuch es noch einmal.', true);
        else state.neuerCode = data;
      });
    }
  });

  // ---------- Knöpfe ----------
  app.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'anderemail') { state.loginEmail = ''; return go('login'); }
    if (act === 'logout') { await sb.auth.signOut(); state.profil = null; state.neuerCode = null; return go('login'); }
    if (act === 'copy') {
      try { await navigator.clipboard.writeText(b.dataset.text); b.textContent = 'Kopiert ✓'; }
      catch { window.prompt('Zum Kopieren markieren:', b.dataset.text); }
      return;
    }
    if (act === 'widerrufen') {
      if (!window.confirm('Diesen Einladungscode wirklich widerrufen?')) return;
      const { error } = await sb.rpc('einladungscode_widerrufen', { p_id: b.dataset.id });
      say(error ? 'Widerrufen hat nicht geklappt.' : 'Code widerrufen.', !!error);
      return render();
    }
  });

  window.addEventListener('hashchange', () => {
    if (route() !== 'team') state.neuerCode = null;
    render();
  });

  // ---------- Start ----------
  async function start() {
    const params = new URLSearchParams(location.search);
    const code = params.get('einladung');
    if (code) {
      state.einladung = code;
      history.replaceState(null, '', location.pathname + '#/einladung');
    }
    if (params.get('error_description')) say('Der Login-Link ist abgelaufen oder wurde schon benutzt. Fordere einfach einen neuen an oder gib den Code ein.', true);

    // Mit dem Login-Link kommt ?code=… zurück; supabase-js tauscht ihn beim Start ein.
    const { data } = await sb.auth.getSession();
    state.session = data.session;
    if (params.has('code')) {
      history.replaceState(null, '', location.pathname + '#/heute');
      if (!state.session) say('Der Link hat in diesem Browser nicht geklappt. Gib einfach den 6-stelligen Code aus der Mail ein.', true);
    }
    if (state.session) await loadProfil();
    else if (!['code', 'einladung'].includes(route())) history.replaceState(null, '', location.pathname + location.search + '#/login');
    await render();

    sb.auth.onAuthStateChange(async (event, session) => {
      const was = !!state.session;
      state.session = session;
      if (session && !was) { await loadProfil(); if (['login', 'code', 'einladung'].includes(route())) location.hash = '#/heute'; else render(); }
      if (!session && was) { state.profil = null; go('login'); }
    });
  }

  start();
})();
