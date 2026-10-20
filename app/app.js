// Kern der App: Login per E-Mail (Link oder 6-stelliger Code), Einladung annehmen,
// Profil und Team (Partner einladen, Sponsor-Ansicht). CRM (crm.js) und Kompass (kompass.js)
// hängen sich über window.TW ein. Daten liegen in Supabase (Frankfurt), geschützt durch
// Row Level Security: Jede Abfrage sieht nur die eigenen Zeilen.
(() => {
  'use strict';

  const C = window.APP_CONFIG;
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'tw-app-auth' },
  });

  const app = document.getElementById('app');
  const tabbar = document.getElementById('tabbar');
  const modalRoot = document.getElementById('modal-root');

  const state = {
    session: null,
    profil: null,
    ready: false,         // Daten nach dem Login geladen
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
  // #/name/id/sub?param=…
  function parseRoute() {
    const h = location.hash.replace(/^#\/?/, '') || 'heute';
    const [path, query] = h.split('?');
    const parts = path.split('/');
    return { name: parts[0], id: parts[1], sub: parts[2], params: Object.fromEntries(new URLSearchParams(query || '')) };
  }
  const route = () => parseRoute().name;
  const go = (r) => { const hash = r.startsWith('#') ? r : '#/' + r; if (location.hash === hash) render(); else location.hash = hash; };
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

  // Hinweis unten
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // Kopieren: Clipboard-API, sonst der alte Weg über ein unsichtbares Textfeld.
  function copyText(text, msg) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { /* nichts */ }
      ta.remove(); toast(ok ? msg : 'Kopieren hat nicht geklappt. Markier den Text und kopier ihn selbst.');
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => toast(msg), fallback);
    else fallback();
  }

  // Dialoge
  function openModal(html, after) {
    modalRoot.innerHTML = `<div class="backdrop" data-act="modal-bg"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
    const first = modalRoot.querySelector('input, select, textarea, button');
    if (first) first.focus();
    if (after) after(modalRoot);
  }
  function closeModal() { modalRoot.innerHTML = ''; TW.onModalClose.forEach((f) => f()); }

  // Anfrage an die Server-Funktion „wortstil“ mit dem Login-Token. Fehler kommen als { code } zurück.
  async function callWortstil(payload) {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw { code: 'not_signed_in' };
    let res;
    try {
      res = await fetch(C.wortstilUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token, apikey: C.supabaseAnonKey },
        body: JSON.stringify(payload),
      });
    } catch (_) { throw { code: 'network' }; }
    let out = {};
    try { out = await res.json(); } catch (_) { /* leer */ }
    if (!res.ok || out.error) throw { code: out.error || 'upstream_error' };
    return out;
  }

  // Schnittstelle für crm.js und kompass.js
  const TW = window.TW = {
    sb, C, state, esc, say, notice, toast, copyText, openModal, closeModal, greeting, fmtDate,
    route: parseRoute, go, render: () => render(), callWortstil,
    views: {},         // name → { html(r) → string|Promise, after?(r), tab? }
    onLogin: [],       // async () → Daten laden
    onLogout: [],      // () → Zwischenstände im Speicher verwerfen
    onRoute: [],       // (r) → bei jedem Seitenwechsel
    onModalClose: [],
    sponsorAnsichtHtml: null, // kommt aus kompass.js
  };

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
        <label class="field" for="woche">Wochenziel: neue Kontakte ansprechen</label>
        <input type="number" id="woche" name="kontakte_pro_woche" min="1" max="30" value="${esc(p.kontakte_pro_woche ?? 5)}">
        <p class="small muted">Vorschlag aus deinem Freiheits-Kompass (Ziel D3): unter 3 Std. = 3 · 3–5 Std. = 5 · 5–10 Std. = 8 · mehr als 10 Std. = 14.</p>
        <h3>Begrüßung</h3>
        <div class="row2">
          <div><label class="field" for="morgen">„Guten Morgen“ bis</label>
            <input type="time" id="morgen" name="begruessung_morgen_bis" value="${esc(String(p.begruessung_morgen_bis || '11:00').slice(0, 5))}"></div>
          <div><label class="field" for="abend">„Guten Abend“ ab</label>
            <input type="time" id="abend" name="begruessung_abend_ab" value="${esc(String(p.begruessung_abend_ab || '18:00').slice(0, 5))}"></div>
        </div>
        <p class="small muted">Dazwischen steht „Hallo“.</p>
        <h3>KI für Entwürfe</h3>
        <label class="check"><input type="checkbox" id="ki" name="ki" ${p.einwilligung_ki_am ? 'checked' : ''}>
          <span>KI-Entwürfe einschalten<br><span class="muted small">Dann schreibt die KI deine Nachrichtenentwürfe und wertet deine Wortstil-Probe aus. Dafür gehen dein Steckbrief, die Art der Nachricht, der geschätzte Typ und deine letzten 3 Notizen zum Kontakt an Claude (Anthropic, USA). Den Vornamen des Kontakts ersetzt die App vorher durch „[Name]“; schreib in Notizen möglichst keine weiteren Namen oder heiklen Angaben. Anthropic nutzt die Daten nicht zum Training und löscht sie nach spätestens 30 Tagen. Ausschalten jederzeit hier.</span></span></label>
        <div class="actions"><button class="btn" ${state.busy ? 'disabled' : ''}>Speichern</button></div>
      </form>
      <a class="tile" href="#/erinnerungen" style="margin-bottom:16px">
        <div class="t-label">🔔 Erinnerungen</div>
        <div class="t-sub">Push, E-Mail, Uhrzeit, Ruhetage und Kalender</div>
      </a>
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
    const myId = state.session.user.id;
    const [partner, codes, ansicht] = await Promise.all([
      sb.rpc('meine_partner'),
      sb.from('einladungscodes').select('id, notiz, max_nutzungen, genutzt, gueltig_bis, widerrufen_am, erstellt_am').order('erstellt_am', { ascending: false }).limit(20),
      // RLS: eigene Zeile (Vorschau) und die der DIREKTEN Partner
      sb.from('sponsor_ansicht').select('owner_id, ziele, fuehrung, rahmen, aktualisiert_am').neq('owner_id', myId),
    ]);
    const list = partner.data || [];
    const byOwner = Object.fromEntries((ansicht.data || []).map((a) => [a.owner_id, a]));
    const now = Date.now();
    const status = (c) => c.widerrufen_am ? 'widerrufen' : c.genutzt >= c.max_nutzungen ? 'eingelöst' : new Date(c.gueltig_bis) < now ? 'abgelaufen' : `gültig bis ${fmtDate(c.gueltig_bis)}`;
    const aktiv = (c) => !c.widerrufen_am && c.genutzt < c.max_nutzungen && new Date(c.gueltig_bis) >= now;
    const nc = state.neuerCode;
    const link = nc ? `${C.appUrl}?einladung=${encodeURIComponent(nc)}` : '';
    const text = nc ? `Hallo! Hier ist deine Einladung für unsere Team-App: ${link} (Code ${nc}, 14 Tage gültig).` : '';
    const partnerItem = (p) => {
      const a = byOwner[p.id];
      return `<li><div class="c-item"><div class="c-top"><span class="c-name">${esc(p.vorname || 'ohne Namen')}</span>
        <span class="due">${p.eingeladen_am ? 'seit ' + fmtDate(p.eingeladen_am) : ''}</span></div>
        ${a && TW.sponsorAnsichtHtml ? `<details class="partner-ansicht"><summary class="small">Freigegebenes Profil ansehen</summary>
          <div class="sponsor-view">${TW.sponsorAnsichtHtml(a, p.vorname)}
          <p class="muted small" style="margin-top:12px">Stand ${fmtDate(a.aktualisiert_am)}</p></div></details>`
        : '<div class="c-sub">Noch nichts freigegeben.</div>'}</div></li>`;
    };
    return `
      <h1>Team</h1>
      ${notice()}
      <div class="card">
        <h2>Partner einladen</h2>
        ${nc ? `<p>Dein neuer Einladungscode (nur jetzt sichtbar):</p>
          <p style="font-size:1.6rem;font-weight:700;letter-spacing:.12em;margin:.2em 0 .4em">${esc(nc)}</p>
          <p class="muted small" style="word-break:break-all">${esc(link)}</p>
          <div class="actions">
            <button class="btn small" data-act="copy-invite" data-text="${esc(text)}">Einladung kopieren</button>
            <a class="btn secondary small" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">In WhatsApp öffnen</a>
            <button class="btn secondary small" data-act="er-einladung-mail" data-code="${esc(nc)}">Per Mail schicken</button>
          </div>
          <p class="muted small">Du verschickst die Einladung selbst oder lässt sie per Mail schicken. Der Code gilt 14 Tage für eine Person.</p>`
        : `<p class="muted">Erzeuge einen Code für eine Person, die du ins Team holst. Sie wird damit dein direkter Partner.</p>
          <form data-form="einladen" novalidate>
            <label class="field" for="notiz">Für wen? <span class="opt">(nur für dich, z. B. „Maria“)</span></label>
            <input type="text" id="notiz" name="notiz" maxlength="80">
            <div class="actions"><button class="btn" ${state.busy ? 'disabled' : ''}>Einladungscode erzeugen</button></div>
          </form>`}
      </div>
      <div class="card">
        <h2>Meine Partner</h2>
        ${partner.error || ansicht.error ? '<p class="notice warm">Die Partnerliste konnte nicht geladen werden. Bitte lade die Seite neu.</p>' : ''}
        ${list.length ? `<ul class="clist">${list.map(partnerItem).join('')}</ul>`
        : '<p class="empty">Noch keine Partner. Sobald jemand deinen Code einlöst, steht die Person hier.</p>'}
        <p class="muted small">Du siehst hier nur Vornamen und das, was deine Partner selbst freigeben: Ziele, Führungshinweise und Rahmen. Kontakte und Typ deiner Partner siehst du nie.</p>
      </div>
      ${(codes.data || []).length ? `<div class="card">
        <h2>Meine Einladungscodes</h2>
        <ul class="clist">${codes.data.map((c) => `<li><a><div class="c-top"><span class="c-name">${esc(c.notiz || 'ohne Notiz')}</span>
          <span class="due">${esc(status(c))}</span></div>
          ${aktiv(c) ? `<div class="c-sub"><button class="linklike" data-act="widerrufen" data-id="${esc(c.id)}">widerrufen</button></div>` : ''}</a></li>`).join('')}</ul>
      </div>` : ''}`;
  }

  TW.views.profil = { html: viewProfil };
  TW.views.team = { html: viewTeam };

  // ---------- Darstellen ----------
  let lastHash = null;
  let renderToken = 0;
  async function render() {
    const token = ++renderToken;
    const r = parseRoute();
    const loggedIn = !!state.session;
    tabbar.hidden = !loggedIn;

    let html, view = null;
    if (!loggedIn) {
      html = r.name === 'code' ? viewCode() : r.name === 'einladung' ? viewEinladung() : viewLogin();
    } else if (!state.ready) {
      html = '<p class="muted">Einen Moment …</p>';
    } else {
      view = TW.views[r.name] || TW.views.heute;
      html = await view.html(r);
    }
    if (token !== renderToken) return; // inzwischen neu gezeichnet
    const tab = view ? (view.tab || r.name) : '';
    tabbar.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));

    // Eingaben bleiben beim Neuzeichnen auf derselben Seite erhalten (z. B. nach einer Fehlermeldung)
    const keep = {};
    if (lastHash === location.hash && !(view && view.noKeep)) app.querySelectorAll('input[id]').forEach((i) => { keep[i.id] = i.type === 'checkbox' ? i.checked : i.value; });
    lastHash = location.hash;
    app.innerHTML = html;
    app.querySelectorAll('input[id]').forEach((i) => {
      if (!(i.id in keep)) return;
      if (i.type === 'checkbox') i.checked = keep[i.id]; else i.value = keep[i.id];
    });
    const first = app.querySelector('input:not([type=checkbox])');
    if (!loggedIn && first && !first.value) first.focus({ preventScroll: true });
    if (view && view.after) view.after(r);
  }

  async function loadProfil() {
    const { data, error } = await sb.from('profil').select('*').eq('id', state.session.user.id).maybeSingle();
    if (error) say('Dein Profil konnte nicht geladen werden. Bitte lade die Seite neu.', true);
    state.profil = data;
  }

  // Nach dem Login: Profil und die Daten der Module laden
  async function afterLogin() {
    state.ready = false;
    await loadProfil();
    await Promise.all(TW.onLogin.map((f) => f().catch((e) => { console.error(e); say('Ein Teil deiner Daten konnte nicht geladen werden. Bitte lade die Seite neu.', true); })));
    state.ready = true;
  }

  function afterLogout() {
    state.profil = null; state.neuerCode = null; state.ready = false;
    TW.onLogout.forEach((f) => f());
  }

  async function busy(fn) {
    state.busy = true; await render();
    try { await fn(); } finally { state.busy = false; await render(); }
  }

  // ---------- Formulare ----------
  app.addEventListener('submit', async (ev) => {
    const f = ev.target;
    const kind = f.dataset.form;
    if (!kind) return; // Formulare der Module
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(f));

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
      const ki = d.ki === 'on';
      return busy(async () => {
        const { data, error } = await sb.from('profil').update({
          vorname: String(d.vorname || '').trim() || null,
          superpatch_link: link || null,
          kontakte_pro_woche: woche,
          begruessung_morgen_bis: d.begruessung_morgen_bis || '11:00',
          begruessung_abend_ab: d.begruessung_abend_ab || '18:00',
          einwilligung_ki_am: ki ? (state.profil?.einwilligung_ki_am || new Date().toISOString()) : null,
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
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'modal-bg') { if (ev.target === b) closeModal(); return; }
    if (act === 'modal-close') { closeModal(); return; }
    if (act === 'anderemail') { state.loginEmail = ''; return go('login'); }
    if (act === 'logout') { await sb.auth.signOut(); afterLogout(); return go('login'); }
    if (act === 'copy-invite') { copyText(b.dataset.text, 'Einladung kopiert'); b.textContent = 'Kopiert ✓'; return; }
    if (act === 'widerrufen') {
      if (!window.confirm('Diesen Einladungscode wirklich widerrufen?')) return;
      const { error } = await sb.rpc('einladungscode_widerrufen', { p_id: b.dataset.id });
      say(error ? 'Widerrufen hat nicht geklappt.' : 'Code widerrufen.', !!error);
      return render();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalRoot.innerHTML) closeModal(); });

  window.addEventListener('hashchange', () => {
    const r = parseRoute();
    if (r.name !== 'team') state.neuerCode = null;
    if (modalRoot.innerHTML) closeModal();
    window.scrollTo(0, 0);
    TW.onRoute.forEach((f) => f(r));
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
    if (state.session) { await render(); await afterLogin(); }
    else if (!['code', 'einladung'].includes(route())) history.replaceState(null, '', location.pathname + location.search + '#/login');
    await render();

    sb.auth.onAuthStateChange((event, session) => {
      const was = !!state.session;
      state.session = session;
      // Nicht direkt im Callback auf Supabase warten (sonst blockiert supabase-js), darum setTimeout
      if (session && !was) setTimeout(async () => {
        if (['login', 'code', 'einladung'].includes(route())) history.replaceState(null, '', location.pathname + '#/heute');
        await render(); await afterLogin(); render();
      }, 0);
      if (!session && was) { afterLogout(); go('login'); }
    });
  }

  // Erst starten, wenn crm.js und kompass.js sich eingehängt haben
  document.addEventListener('DOMContentLoaded', start);
})();
