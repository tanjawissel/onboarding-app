/* Erinnerungen (Bereich 5): App auf den Home-Bildschirm, Push einschalten (mit Einwilligung),
   Einstellungen „Erinnerungen“, Kalender-Abo, Karte „Deine ersten Schritte“, Einladung per Mail.
   Texte wie freigegeben am 20.10.2026 (Entwurf „Erinnerungen - Entwurf zur Freigabe.md“, C1–C10).
   Daten: erinnerung_einstellungen, push_abos, kalender_abo (über RPC), meilensteine, freigaben
   (RLS: nur die eigenen Zeilen). Versand macht der Server (Funktion „erinnerung“). */
(function () {
  'use strict';
  const T = window.TW;
  const sb = T.sb;
  const C = T.C;
  const esc = T.esc;
  const toast = T.toast;

  // ---------- Gerät ----------
  const ua = navigator.userAgent;
  const istIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const istAndroid = /Android/.test(ua);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const pushMoeglich = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
  function geraetName() {
    const art = /iPad/.test(ua) || (istIOS && !/iPhone|iPod/.test(ua)) ? 'iPad' : /iPhone|iPod/.test(ua) ? 'iPhone'
      : istAndroid ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Computer';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
    return istIOS || istAndroid || !browser ? art : `${art} (${browser})`;
  }
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* privat: dann eben jedes Mal */ } },
  };

  // Service Worker: Push empfangen, App offline starten
  let installPrompt = null;
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.error('Service Worker', e));
    navigator.serviceWorker.addEventListener('message', (ev) => {
      if (ev.data && ev.data.typ === 'gehe' && /^#\/[\w/?=&-]*$/.test(ev.data.hash)) location.hash = ev.data.hash;
    });
  }
  window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); installPrompt = ev; if (T.route().name === 'heute') T.render(); });
  window.addEventListener('appinstalled', () => { installPrompt = null; melden(HOME); });

  // ---------- Speicher ----------
  const leer = () => ({ einst: null, abos: [], meil: [], kompass: false, kontakte: 0, partner: 0, kalSeit: null, kalToken: null, endpoint: null, sponsorFrei: false });
  let E = leer();
  let anlTab = istAndroid ? 'android' : 'iphone';
  const uid = () => T.state.session.user.id;

  async function eigenesAbo() {
    if (!pushMoeglich()) return null;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg && await reg.pushManager.getSubscription();
      return sub ? sub.endpoint : null;
    } catch (_) { return null; }
  }

  async function load() {
    const res = await Promise.all([
      sb.from('erinnerung_einstellungen').select('*').maybeSingle(),
      sb.from('push_abos').select('id, endpoint, geraet, erstellt_am').order('erstellt_am'),
      sb.from('meilensteine').select('art, titel').eq('owner_id', uid()),
      sb.from('kompass_auswertung').select('owner_id', { count: 'exact', head: true }),
      sb.from('kontakte').select('id', { count: 'exact', head: true }),
      sb.rpc('meine_partner'),
      sb.rpc('kalender_abo_status'),
      sb.from('freigaben').select('meilensteine').maybeSingle(),
    ]);
    const bad = res.find((r) => r.error);
    if (bad) throw bad.error;
    const [e, a, m, k, ko, p, kal, f] = res;
    E = Object.assign(leer(), {
      einst: e.data, abos: a.data || [], meil: m.data || [], kompass: (k.count || 0) > 0, kontakte: ko.count || 0,
      partner: (p.data || []).length, kalSeit: kal.data || null, sponsorFrei: !!(f.data && f.data.meilensteine),
    });
    E.endpoint = await eigenesAbo();
    automatisch();
  }
  T.onLogin.push(load);
  T.onLogout.push(() => { E = leer(); });

  // Auf „Heute“ frisch zählen (Kompass, Kontakte), damit die ersten Schritte stimmen
  T.onRoute.push(async (r) => {
    if (r.name !== 'heute' || !T.state.session || !T.state.ready) return;
    const [k, ko] = await Promise.all([
      sb.from('kompass_auswertung').select('owner_id', { count: 'exact', head: true }),
      sb.from('kontakte').select('id', { count: 'exact', head: true }),
    ]);
    const vorher = `${E.kompass}|${E.kontakte}`;
    if (!k.error) E.kompass = (k.count || 0) > 0;
    if (!ko.error) E.kontakte = ko.count || 0;
    automatisch();
    if (vorher !== `${E.kompass}|${E.kontakte}` && T.route().name === 'heute') T.render();
  });

  // ---------- Meilensteine „Onboarding-Schritt“ (C10) ----------
  const HOME = 'App auf dem Home-Bildschirm';
  const EINGESTELLT = 'Erinnerungen eingestellt';
  const ACADEMY = 'Academy: Lektionen 1 bis 4 angesehen';
  const KONTAKTE3 = 'Erste 3 Kontakte eingetragen';
  const hat = (art, titel) => E.meil.some((m) => m.art === art && (titel === undefined || m.titel === titel));
  const geschafft = (titel) => hat('onboarding_schritt', titel);
  const gemeldet = new Set();
  async function melden(titel) {
    if (!T.state.session || geschafft(titel) || gemeldet.has(titel)) return;
    gemeldet.add(titel);
    const { error } = await sb.from('meilensteine').insert({ art: 'onboarding_schritt', titel });
    if (error) { console.error(error); gemeldet.delete(titel); return; }
    E.meil.push({ art: 'onboarding_schritt', titel });
  }
  // Was die App selbst sieht, hakt sie selbst ab
  function automatisch() {
    if (standalone()) melden(HOME);
    if (E.kontakte >= 3) melden(KONTAKTE3);
  }

  const SCHRITTE = () => [
    { text: 'Freiheits-Kompass machen', href: '#/kompass', done: E.kompass || hat('kompass_fertig') },
    { text: 'Wortstil-Probe machen', href: '#/kompass', done: !!T.state.steckbrief || hat('wortstil_fertig') },
    { text: 'App auf den Home-Bildschirm holen', href: '#/erinnerungen', done: geschafft(HOME) || standalone() },
    { text: 'Erinnerungen einstellen', href: '#/erinnerungen', done: geschafft(EINGESTELLT) },
    { text: 'Academy: Lektionen 1 bis 4 ansehen', href: C.academyUrl, extern: true, selbst: true, done: geschafft(ACADEMY) },
    { text: 'Deine ersten 3 Kontakte eintragen', href: '#/neu', done: geschafft(KONTAKTE3) || E.kontakte >= 3 },
  ];

  // ---------- C1: Anleitung „Zum Home-Bildschirm“ ----------
  function anleitungHtml() {
    const tab = (key, name) => `<button type="button" class="chip ${anlTab === key ? 'on' : ''}" data-act="er-anl-tab" data-tab="${key}" aria-pressed="${anlTab === key}">${name}</button>`;
    const iphone = `
      <ol class="anl">
        <li>Öffne <b>app.tanjawissel.ch</b> in <b>Safari</b>.</li>
        <li>Tippe unten auf das Teilen-Symbol (Quadrat mit Pfeil nach oben).</li>
        <li>Scrolle etwas nach unten und tippe auf <b>„Zum Home-Bildschirm“</b>.</li>
        <li>Tippe oben rechts auf <b>„Hinzufügen“</b>.</li>
        <li>Öffne die App jetzt über das neue Symbol auf deinem Home-Bildschirm und melde dich dort einmal an. Nimm dafür den <b>6-stelligen Code</b> aus der Login-Mail (der Link in der Mail öffnet Safari, nicht die App).</li>
      </ol>
      <p class="small muted">Push-Nachrichten gehen auf dem iPhone ab iOS 16.4. Du findest deine Version unter Einstellungen › Allgemein › Info.</p>`;
    const android = `
      <ol class="anl">
        <li>Öffne <b>app.tanjawissel.ch</b> in <b>Chrome</b>.</li>
        <li>Tippe auf <b>„App installieren“</b>, wenn Chrome das unten anbietet. Sonst: oben rechts auf die drei Punkte ⋮ und dann <b>„Zum Startbildschirm hinzufügen“</b> oder <b>„App installieren“</b>.</li>
        <li>Bestätige mit <b>„Installieren“</b>.</li>
        <li>Öffne die App über das neue Symbol. Meist bist du schon angemeldet.</li>
      </ol>`;
    return `
      <div class="chips" role="group" aria-label="Gerät">${tab('iphone', 'iPhone')}${tab('android', 'Android')}</div>
      ${anlTab === 'iphone' ? iphone : android}
      ${installPrompt ? '<div class="actions"><button type="button" class="btn small" data-act="er-installieren">App installieren</button></div>' : ''}
      <p class="small muted">Am Computer: Die App läuft auch im Browser. Erinnerungen bekommst du dort per Mail oder, in Chrome und Edge, auch als Push.</p>`;
  }

  // ---------- Karten auf „Heute“ ----------
  function karteHome() {
    if (standalone() || geschafft(HOME) || ls.get('tw-home-spaeter')) return '';
    return `<section class="card fu-box">
      <h2>Hol dir die App auf deinen Home-Bildschirm</h2>
      <p>So öffnest du die App mit einem Tipp, wie jede andere App. Und nur so können dich auf dem iPhone Erinnerungen erreichen. Dauert eine Minute.</p>
      ${anleitungHtml()}
      <div class="actions"><button type="button" class="btn small" data-act="er-home-erledigt">Erledigt</button>
        <button type="button" class="btn ghost small" data-act="er-home-spaeter">Später</button></div>
    </section>`;
  }
  function karteWillkommen() {
    if (!standalone() || ls.get('tw-willkommen-app') || E.endpoint) return '';
    return `<section class="card sand">
      <p style="margin:0">Schön, dass du da bist. Willst du Erinnerungen bekommen?</p>
      <div class="actions"><a class="btn small" href="#/erinnerungen" data-act="er-willkommen">Erinnerungen einstellen</a>
        <button type="button" class="btn ghost small" data-act="er-willkommen">Später</button></div>
    </section>`;
  }
  function karteSchritte() {
    const s = SCHRITTE();
    const n = s.filter((x) => x.done).length;
    if (n === s.length) return '';
    return `<section class="card">
      <div class="card-head"><h2>Deine ersten Schritte</h2><span class="counter">${n} von ${s.length}</span></div>
      <ul class="prio">${s.map((x) => `
        <li class="${x.done ? 'done' : ''}">
          <input type="checkbox" ${x.done ? 'checked' : ''} ${x.selbst && !x.done ? 'data-act="er-academy"' : 'disabled'} aria-label="${esc(x.text)}${x.done ? ' erledigt' : ''}">
          <span class="p-text">${esc(x.text)}${x.selbst && !x.done ? ' <span class="small muted">(selbst abhaken)</span>' : ''}</span>
          ${x.done ? '' : `<a class="go" href="${esc(x.href)}" ${x.extern ? 'target="_blank" rel="noopener"' : ''} aria-label="${esc(x.text)}">›</a>`}
        </li>`).join('')}</ul>
    </section>`;
  }
  T.heuteKarten = (T.heuteKarten || []).concat([karteWillkommen, karteHome, karteSchritte]);

  // ---------- C3: Einstellungen „Erinnerungen“ ----------
  const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const ZEITEN = (() => { const z = []; for (let m = 5 * 60; m <= 22 * 60; m += 15) z.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`); return z; })();
  const datum = (iso) => new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const kurz = (iso) => new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }) + '.';

  function pushStatus() {
    if (!pushMoeglich()) {
      return istIOS && !standalone()
        ? '<p class="notice warm">Auf dem iPhone kommen Erinnerungen nur an, wenn die App auf dem Home-Bildschirm liegt. <button type="button" class="linklike" data-act="er-anleitung">So geht\'s</button></p>'
        : '<p class="small muted">Dieser Browser kann keine Push-Nachrichten empfangen. Wir erinnern dich gern per Mail.</p>';
    }
    const hier = E.endpoint && E.abos.some((a) => a.endpoint === E.endpoint);
    return `<p class="small">${hier
      ? 'Auf diesem Gerät eingeschaltet ✓ <button type="button" class="linklike" data-act="er-probe">Probe-Nachricht schicken</button>'
      : 'Auf diesem Gerät noch nicht eingeschaltet → <button type="button" class="linklike" data-act="er-push-an">Einschalten</button>'}</p>`;
  }
  function geraeteListe() {
    if (!E.abos.length) return '';
    return `<ul class="clist" style="margin-bottom:6px">${E.abos.map((a) => `<li><div class="c-item"><div class="c-top">
      <span class="c-name">${esc(a.geraet || 'Gerät')}${a.endpoint === E.endpoint ? ' <span class="small muted">(dieses)</span>' : ''}</span>
      <span class="due">seit ${kurz(a.erstellt_am)} · <button type="button" class="linklike" data-act="er-geraet-weg" data-id="${esc(a.id)}">Entfernen</button></span>
    </div></div></li>`).join('')}</ul>`;
  }
  function kalenderBlock() {
    const knopf = '<button type="button" class="btn small" data-act="er-kal-hinzu">Zu meinem Kalender hinzufügen</button>';
    if (!E.kalSeit) return `<div class="actions">${knopf}</div>`;
    return `<p class="small">Kalender-Abo aktiv seit ${datum(E.kalSeit)}</p>
      <div class="actions">${E.kalToken ? knopf : ''}
        <button type="button" class="linklike" data-act="er-kal-neu">Neue Adresse erzeugen</button>
        <button type="button" class="linklike" data-act="er-kal-ende">Kalender-Abo beenden</button></div>`;
  }

  function viewErinnerungen() {
    const e = E.einst || { kanal: 'email', uhrzeit: '08:00', ruhetage: [7], kalender_modus: 'tag', sponsor_push: true };
    const uhr = String(e.uhrzeit || '08:00').slice(0, 5);
    const radio = (name, wert, text, an) => `<label class="check"><input type="radio" name="${name}" value="${wert}" ${an ? 'checked' : ''}><span>${text}</span></label>`;
    const hatSponsor = !!(T.state.profil && T.state.profil.sponsor_id);
    return `
      <a class="back" href="#/profil">← Profil</a>
      <h1>Erinnerungen</h1>
      <p class="lead">Kleine Erinnerungen, damit dein Tag leicht bleibt. Du bestimmst wann und wie. An Ruhetagen ist Ruhe.</p>
      ${T.notice()}
      <form class="card" data-er-form="einstellungen" novalidate>
        <h3 style="margin-top:0">Wie möchtest du erinnert werden?</h3>
        ${radio('kanal', 'push', 'Push aufs Handy', e.kanal === 'push')}
        ${radio('kanal', 'email', 'E-Mail', e.kanal === 'email')}
        ${radio('kanal', 'beides', 'Beides', e.kanal === 'beides')}
        ${radio('kanal', 'aus', 'Gar nicht', e.kanal === 'aus')}
        ${pushStatus()}
        ${geraeteListe()}

        <label class="field" for="er-uhrzeit">Um welche Uhrzeit?</label>
        <select id="er-uhrzeit" name="uhrzeit">${(ZEITEN.includes(uhr) ? ZEITEN : ZEITEN.concat(uhr).sort()).map((z) => `<option ${z === uhr ? 'selected' : ''}>${z}</option>`).join('')}</select>
        <p class="small muted">Die Erinnerung kommt nur, wenn an dem Tag etwas ansteht.</p>

        <h3>Ruhetage</h3>
        <p class="small muted" style="margin-bottom:4px">Keine Erinnerung, keine Kalendereinträge.</p>
        <div class="tage">${WT.map((t, i) => `<label class="tag"><input type="checkbox" name="ruhetag" value="${i + 1}" ${(e.ruhetage || []).includes(i + 1) ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>

        <h3>Kalender</h3>
        <p class="small">Deine Aufgaben auch im eigenen Kalender sehen. Ohne Zugriff auf deinen Kalender: Die App liefert nur Einträge dazu.</p>
        ${radio('kalender_modus', 'tag', 'Jeden Tag ein Eintrag mit deiner Tagesaufgabe', e.kalender_modus !== 'woche')}
        ${radio('kalender_modus', 'woche', 'Einmal pro Woche eine Wochenübersicht (montags)', e.kalender_modus === 'woche')}
        ${kalenderBlock()}
        <p class="small muted">Kalender holen Neues nur alle paar Stunden, Google manchmal erst nach einem Tag. Abhaken geht in der App.</p>

        ${E.partner ? `<h3>Für dein Team</h3>
        <label class="check"><input type="checkbox" name="sponsor_push" ${e.sponsor_push ? 'checked' : ''}>
          <span>Push, wenn meine direkten Partner einen Meilenstein schaffen<br><span class="small muted">Du erfährst nur, was sie mit dir teilen. Nie etwas aus ihren Kontakten.</span></span></label>` : ''}

        ${hatSponsor ? `<h3>Was du teilst</h3>
        <label class="check"><input type="checkbox" name="meilensteine_teilen" ${E.sponsorFrei ? 'checked' : ''}>
          <span>Meilensteine mit meiner Sponsorin teilen<br><span class="small muted">Deine Sponsorin bekommt eine kurze Nachricht, wenn du einen Meilenstein schaffst, nur wenn du „Meilensteine“ freigibst.</span></span></label>` : ''}
      </form>`;
  }
  T.views.erinnerungen = { html: viewErinnerungen, tab: 'profil' };

  async function speichern(form, quelle) {
    const d = new FormData(form);
    const patch = {
      kanal: d.get('kanal') || 'email',
      uhrzeit: d.get('uhrzeit') || '08:00',
      ruhetage: d.getAll('ruhetag').map(Number).sort(),
      kalender_modus: d.get('kalender_modus') === 'woche' ? 'woche' : 'tag',
      zeitzone: (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich').slice(0, 40),
    };
    if (E.partner) patch.sponsor_push = d.get('sponsor_push') === 'on';
    if (quelle === 'meilensteine_teilen') {
      const an = d.get('meilensteine_teilen') === 'on';
      const { error } = await sb.from('freigaben').update({ meilensteine: an }).eq('owner_id', uid());
      if (error) { toast('Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.'); return T.render(); }
      E.sponsorFrei = an; toast('Gespeichert'); return;
    }
    const { data, error } = await sb.from('erinnerung_einstellungen').update(patch).eq('owner_id', uid()).select().maybeSingle();
    if (error || !data) { console.error(error); toast('Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.'); return T.render(); }
    E.einst = data;
    toast('Erinnerungen gespeichert');
    melden(EINGESTELLT);
  }

  // ---------- C2: Push einschalten ----------
  function einwilligungDialog() {
    T.openModal(`
      <h2>Erinnerungen aufs Handy</h2>
      <p>Die App schickt dir höchstens eine Erinnerung am Tag, zu deiner Uhrzeit und nur, wenn etwas ansteht. Als Sponsorin oder Sponsor bekommst du zusätzlich kurze Nachrichten, wenn deine direkten Partner einen Meilenstein schaffen, den sie mit dir teilen.</p>
      <p>Damit das klappt, läuft die Nachricht über den Push-Dienst deines Browsers (bei iPhone Apple, bei Android Google, bei Firefox Mozilla). Der Inhalt ist verschlüsselt, der Dienst sieht nur, dass eine Nachricht an dein Gerät geht. Auf dem Sperrbildschirm stehen keine Namen deiner Kontakte.</p>
      <p>Du kannst Push jederzeit hier oder in den Einstellungen deines Handys ausschalten. Mehr dazu in der <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p>
      <label class="check"><input type="checkbox" id="er-ok" data-act="er-ok"><span>Einverstanden, schick mir Push-Nachrichten.</span></label>
      <div class="actions"><button type="button" class="btn" data-act="er-push-ja" disabled>Einschalten</button>
        <button type="button" class="btn ghost" data-act="modal-close">Lieber nicht</button></div>`);
  }
  function iphoneHinweis() {
    T.openModal(`<h2>Hol dir die App auf deinen Home-Bildschirm</h2>
      <p>Auf dem iPhone kommen Erinnerungen nur an, wenn die App auf dem Home-Bildschirm liegt.</p>
      ${anleitungHtml()}
      <div class="actions"><button type="button" class="btn secondary" data-act="modal-close">Schließen</button></div>`);
  }
  const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };

  async function pushEinschalten() {
    // Die Rückfrage des Browsers muss direkt aus dem Tippen kommen, darum als Erstes
    const erlaubnis = Notification.requestPermission();
    T.closeModal();
    let p;
    try { p = await erlaubnis; } catch (_) { p = Notification.permission; }
    if (p !== 'granted') {
      T.openModal(`<h2>Mitteilungen blockiert</h2>
        <p>Dein Handy hat Mitteilungen für die App blockiert. Du kannst sie in den Einstellungen wieder erlauben (iPhone: Einstellungen › Mitteilungen › Tanja Wissel). Bis dahin erinnern wir dich gern per Mail.</p>
        <div class="actions"><button type="button" class="btn secondary" data-act="modal-close">Verstanden</button></div>`);
      return;
    }
    try {
      if (!C.vapidPublicKey) throw new Error('VAPID-Schlüssel fehlt in config.js');
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(C.vapidPublicKey) });
      const j = sub.toJSON();
      const { error } = await sb.rpc('push_abo_speichern', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_geraet: geraetName() });
      if (error) throw error;
      const patch = { einwilligung_push_am: new Date().toISOString() };
      if (!E.einst || E.einst.kanal === 'email' || E.einst.kanal === 'aus') patch.kanal = E.einst && E.einst.kanal === 'email' ? 'beides' : 'push';
      const up = await sb.from('erinnerung_einstellungen').update(patch).eq('owner_id', uid()).select().maybeSingle();
      if (up.data) E.einst = up.data;
      E.endpoint = j.endpoint;
      const a = await sb.from('push_abos').select('id, endpoint, geraet, erstellt_am').order('erstellt_am');
      if (!a.error) E.abos = a.data;
      toast('Push ist auf diesem Gerät eingeschaltet');
      melden(EINGESTELLT);
    } catch (e) {
      console.error(e);
      toast('Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.');
    }
    T.render();
  }

  async function serverAufruf(url, body) {
    const { data } = await sb.auth.getSession();
    const token = data.session && data.session.access_token;
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token, apikey: C.supabaseAnonKey }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    return { ok: res.ok, out };
  }

  // ---------- Kalender ----------
  function kalenderDialog() {
    const https = `${C.kalenderUrl}?t=${E.kalToken}`;
    const webcal = https.replace(/^https:/, 'webcal:');
    const name = 'Tanja Wissel · Meine Schritte';
    T.openModal(`
      <h2>Zu meinem Kalender hinzufügen</h2>
      <div class="options">
        <a class="option" href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}" target="_blank" rel="noopener"><b>Google Kalender</b><small>öffnet Google mit der Abo-Adresse</small></a>
        <a class="option" href="${esc(webcal)}"><b>Apple Kalender</b><small>iPhone, iPad, Mac: öffnet die Kalender-App</small></a>
        <a class="option" href="https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&amp;name=${encodeURIComponent(name)}" target="_blank" rel="noopener"><b>Outlook</b><small>öffnet outlook.com mit der Abo-Adresse</small></a>
        <button type="button" class="option" data-act="er-kal-kopieren" data-url="${esc(https)}"><b>Adresse kopieren</b><small>für andere Kalender</small></button>
      </div>
      <p class="small muted" style="margin-top:12px">Die Adresse ist geheim und gehört nur dir. Wer sie kennt, sieht deine Kalendereinträge (ohne Namen). Du kannst sie jederzeit neu erzeugen.</p>
      <div class="actions"><button type="button" class="btn secondary" data-act="modal-close">Fertig</button></div>`);
  }
  async function kalenderErzeugen() {
    const { data, error } = await sb.rpc('kalender_abo_erneuern');
    if (error || !data) { toast('Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.'); return false; }
    E.kalToken = data; E.kalSeit = new Date().toISOString();
    return true;
  }

  // ---------- C7: Einladung per Mail ----------
  function einladungMailDialog(code) {
    T.openModal(`
      <h2>Einladung per Mail schicken</h2>
      <form data-er-form="einladung-mail" data-code="${esc(code)}" novalidate>
        <label class="field" for="er-mail">E-Mail-Adresse</label>
        <input type="email" id="er-mail" name="email" autocomplete="off" inputmode="email" required>
        <label class="field" for="er-zeile">Persönliche Zeile <span class="opt">(optional)</span></label>
        <textarea id="er-zeile" name="zeile" class="short" maxlength="300"></textarea>
        <p class="small muted">Die Mail kommt von academy@tanjawissel.ch mit deinem Vornamen, dem Code und dem Link. Die Adresse wird nur für den Versand verwendet und nicht gespeichert.</p>
        <div class="actions"><button class="btn">Schicken</button><button type="button" class="btn ghost" data-act="modal-close">Abbrechen</button></div>
      </form>`);
  }

  // ---------- Ereignisse ----------
  document.addEventListener('change', (ev) => {
    const form = ev.target.closest('form[data-er-form="einstellungen"]');
    if (!form) return;
    const t = ev.target;
    // Push gewählt, aber auf diesem Gerät noch nicht an: zuerst Einwilligung
    if (t.name === 'kanal' && (t.value === 'push' || t.value === 'beides') && !E.endpoint) {
      speichern(form, 'kanal').then(() => { if (pushMoeglich()) einwilligungDialog(); else if (istIOS && !standalone()) iphoneHinweis(); else T.render(); });
      return;
    }
    speichern(form, t.name).then(() => { if (t.name === 'kanal') T.render(); });
  });

  document.addEventListener('submit', async (ev) => {
    const f = ev.target.closest('form[data-er-form="einladung-mail"]');
    if (!f) return;
    ev.preventDefault();
    const email = String(new FormData(f).get('email') || '').trim().toLowerCase();
    const zeile = String(new FormData(f).get('zeile') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Bitte gib eine gültige E-Mail-Adresse ein.'); return; }
    const btn = f.querySelector('button.btn'); btn.disabled = true;
    try {
      const r = await serverAufruf(C.einladungMailUrl, { code: f.dataset.code, email, zeile });
      if (r.ok) { T.closeModal(); toast('Einladung verschickt'); return; }
      toast(r.out.error === 'code_ungueltig_oder_grenze' ? 'Der Code ist nicht mehr gültig, oder du hast heute schon 10 Einladungen verschickt.' : 'Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.');
    } catch (_) { toast('Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.'); }
    btn.disabled = false;
  });

  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act^="er-"]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'er-anl-tab') { anlTab = b.dataset.tab; if (document.querySelector('.sheet')) iphoneHinweis(); else T.render(); return; }
    if (act === 'er-installieren' && installPrompt) { installPrompt.prompt(); const r = await installPrompt.userChoice.catch(() => null); installPrompt = null; if (r && r.outcome === 'accepted') melden(HOME); T.render(); return; }
    if (act === 'er-home-erledigt') { await melden(HOME); return T.render(); }
    if (act === 'er-home-spaeter') { ls.set('tw-home-spaeter', '1'); return T.render(); }
    if (act === 'er-willkommen') { ls.set('tw-willkommen-app', '1'); if (b.tagName !== 'A') T.render(); return; }
    if (act === 'er-academy') { ev.preventDefault(); await melden(ACADEMY); return T.render(); }
    if (act === 'er-anleitung') { iphoneHinweis(); return; }
    if (act === 'er-push-an') { if (pushMoeglich()) einwilligungDialog(); else iphoneHinweis(); return; }
    if (act === 'er-ok') { const j = document.querySelector('[data-act="er-push-ja"]'); if (j) j.disabled = !b.checked; return; }
    if (act === 'er-push-ja') { if (document.getElementById('er-ok')?.checked) pushEinschalten(); return; }
    if (act === 'er-probe') {
      try {
        const r = await serverAufruf(C.erinnerungUrl, { aktion: 'probe' });
        toast(r.ok ? 'Probe-Nachricht ist unterwegs' : 'Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.');
      } catch (_) { toast('Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.'); }
      return;
    }
    if (act === 'er-geraet-weg') {
      const a = E.abos.find((x) => x.id === b.dataset.id);
      const { error } = await sb.from('push_abos').delete().eq('id', b.dataset.id);
      if (error) { toast('Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.'); return; }
      if (a && a.endpoint === E.endpoint) {
        try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (_) { /* egal */ }
        E.endpoint = null;
      }
      E.abos = E.abos.filter((x) => x.id !== b.dataset.id);
      toast('Gerät entfernt'); return T.render();
    }
    if (act === 'er-kal-hinzu') {
      if (!E.kalToken && !(await kalenderErzeugen())) return;
      T.render(); kalenderDialog(); return;
    }
    if (act === 'er-kal-neu') {
      T.openModal(`<h2>Neue Adresse erzeugen?</h2>
        <p>Die alte Adresse funktioniert dann sofort nicht mehr. Dein Kalender zeigt keine neuen Einträge, bis du die neue Adresse hinzufügst. Neue Adresse erzeugen?</p>
        <div class="actions"><button type="button" class="btn" data-act="er-kal-neu-ja">Ja, neu erzeugen</button>
          <button type="button" class="btn ghost" data-act="modal-close">Abbrechen</button></div>`);
      return;
    }
    if (act === 'er-kal-neu-ja') {
      T.closeModal();
      if (!(await kalenderErzeugen())) return;
      toast('Neue Kalender-Adresse erzeugt'); T.render(); kalenderDialog(); return;
    }
    if (act === 'er-kal-ende') {
      if (!window.confirm('Kalender-Abo beenden? Die Adresse funktioniert dann nicht mehr.')) return;
      const { error } = await sb.rpc('kalender_abo_loeschen');
      if (error) { toast('Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.'); return; }
      E.kalSeit = null; E.kalToken = null; return T.render();
    }
    if (act === 'er-kal-kopieren') { T.copyText(b.dataset.url, 'Adresse kopiert'); return; }
    if (act === 'er-einladung-mail') { einladungMailDialog(b.dataset.code); return; }
  });
})();
