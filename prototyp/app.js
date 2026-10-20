/* CRM + Tagesdashboard — klickbarer Prototyp.
   Alles läuft im Browser. Daten liegen nur im Speicher dieses Browsers (localStorage), nichts wird verschickt.
   Aufbau der Daten = Datenmodell aus „CRM - Datenmodell und Skizzen“ (kontakte, notizen, verlauf, entwuerfe, prioritaeten). */
(function () {
  'use strict';
  const C = window.CRM_DATA;
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  const STORE_KEY = 'crm-prototyp-v1';

  // ---------- Hilfen ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const now = () => { const d = new Date(); return `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const today = () => iso(new Date());
  const addDays = (isoDate, n) => { const d = new Date(isoDate + 'T12:00'); d.setDate(d.getDate() + n); return iso(d); };
  const daysBetween = (a, b) => Math.round((new Date(b.slice(0, 10) + 'T12:00') - new Date(a.slice(0, 10) + 'T12:00')) / 86400000);
  const weekStart = () => { const d = new Date(); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); };
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const fmtDate = (isoDate) => { const d = new Date(isoDate.slice(0, 10) + 'T12:00'); return `${WD[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`; };
  const fmtShort = (isoDate) => { const d = new Date(isoDate.slice(0, 10) + 'T12:00'); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`; };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '[Name]';
  const statusOf = (key) => C.STATUS.find((s) => s.key === key) || C.STATUS[0];
  const artOf = (key) => C.ARTS.find((a) => a.key === key);
  const statusIndex = (key) => C.STATUS.findIndex((s) => s.key === key);

  // ---------- Speicher ----------
  let S;
  function seed() {
    const T = today();
    const k = (id, name, status, statusSeit, extra) => Object.assign({
      id, name, kanal: 'whatsapp', telefon: '', herkunft: 'freundeskreis', status, status_seit: statusSeit + 'T10:00',
      smartship: false, typ_geschaetzt: null, business_offen: false, follow_up_am: null, follow_up_art: null, follow_up_notiz: '',
      erstellt_am: addDays(T, -20) + 'T09:00', geaendert_am: statusSeit + 'T10:00',
    }, extra);
    const kontakte = [
      k('irene', 'Irene vom Yoga', 'angesprochen', addDays(T, -7), { herkunft: 'hobby', typ_geschaetzt: 'anker', follow_up_am: T, follow_up_art: 'nachfassen', follow_up_notiz: 'nach dem Urlaub fragen', erstellt_am: addDays(T, -9) + 'T18:00' }),
      k('peter', 'Peter', 'neu', addDays(T, -1), { erstellt_am: addDays(T, -1) + 'T20:00' }),
      k('mara', 'Mara', 'kunde', addDays(T, -2), { smartship: true, typ_geschaetzt: 'funke', follow_up_am: addDays(T, 12), follow_up_art: 'danke_pflege', business_offen: true }),
      k('jonas', 'Jonas', 'test_eingeladen', addDays(T, -9), { herkunft: 'arbeit', typ_geschaetzt: 'pfeil', follow_up_am: addDays(T, -2), follow_up_art: 'nachfassen' }),
      k('sabine', 'Sabine', 'test_gemacht', addDays(T, -1), { herkunft: 'familie', typ_geschaetzt: 'kristall', follow_up_am: addDays(T, 2), follow_up_art: 'einladung_ausprobieren' }),
      k('nadine', 'Nadine', 'angesprochen', T, { herkunft: 'empfehlung', follow_up_am: addDays(T, 7), follow_up_art: 'nachfassen', erstellt_am: addDays(T, -3) + 'T09:00' }),
      k('lukas', 'Lukas', 'gerade_nicht', addDays(T, -20), { herkunft: 'arbeit', follow_up_am: addDays(T, 70), follow_up_art: 'nachfassen' }),
      k('elena', 'Elena', 'partner', addDays(T, -60), { herkunft: 'freundeskreis', typ_geschaetzt: 'funke' }),
    ];
    const v = (kid, ereignis, von, nach, am) => ({ id: uid(), kontakt_id: kid, ereignis, von, nach, am });
    const verlauf = [
      v('irene', 'angelegt', '', '', addDays(T, -9) + 'T18:00'),
      v('irene', 'entwurf_kopiert', '', 'erstkontakt', addDays(T, -7) + 'T19:02'),
      v('irene', 'status', 'neu', 'angesprochen', addDays(T, -7) + 'T19:03'),
      v('peter', 'angelegt', '', '', addDays(T, -1) + 'T20:00'),
      v('nadine', 'angelegt', '', '', addDays(T, -3) + 'T09:00'),
      v('nadine', 'status', 'neu', 'angesprochen', T + 'T08:15'),
      v('mara', 'status', 'probiert', 'kunde', addDays(T, -2) + 'T10:00'),
      v('jonas', 'status', 'angesprochen', 'test_eingeladen', addDays(T, -9) + 'T10:00'),
      v('sabine', 'status', 'test_eingeladen', 'test_gemacht', addDays(T, -1) + 'T10:00'),
    ];
    const notizen = [
      { id: uid(), kontakt_id: 'irene', art: 'sprache', text: 'Irene hat vom Yoga-Wochenende erzählt, ist offen für Neues. Fährt nächste Woche in den Urlaub.', erstellt_am: addDays(T, -7) + 'T19:10' },
      { id: uid(), kontakt_id: 'sabine', art: 'text', text: 'Hat den Screenshot geschickt, möchte erst im Handbuch nachlesen.', erstellt_am: addDays(T, -1) + 'T10:05' },
    ];
    return {
      profil: { vorname: 'Tanja', kontakte_pro_woche: 5, superpatch_link: '', morgen_bis: '11:00', abend_ab: '18:00', steckbrief: true, steckbrief_daten: Object.assign({}, C.DEMO_STECKBRIEF), testcode: '' },
      kontakte, notizen, verlauf, entwuerfe: [], prioritaeten: [],
    };
  }
  function load() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) return JSON.parse(raw); } catch (_) { /* privat */ }
    return seed();
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (_) { /* privat */ } }
  S = load();
  // ältere Prototyp-Stände ergänzen
  if (!S.profil.steckbrief_daten) S.profil.steckbrief_daten = Object.assign({}, C.DEMO_STECKBRIEF);
  if (S.profil.testcode == null) S.profil.testcode = '';
  // Testcode aus dem Link (?code=…) übernehmen, wie bei der Kompass-Testseite
  const codeParam = new URLSearchParams(location.search).get('code');
  if (codeParam) { S.profil.testcode = codeParam.trim(); save(); }

  const kontakt = (id) => S.kontakte.find((k) => k.id === id);
  const log = (kid, ereignis, von, nach) => S.verlauf.push({ id: uid(), kontakt_id: kid, ereignis, von: von || '', nach: nach || '', am: now() });

  // ---------- Fachlogik ----------
  function setStatus(k, key) {
    if (k.status === key) return;
    log(k.id, 'status', k.status, key);
    k.status = key; k.status_seit = now(); k.geaendert_am = now();
    if (key !== 'kunde') k.smartship = false;
  }
  function setFollowUp(k, date, art, notiz) {
    k.follow_up_am = date || null; k.follow_up_art = date ? (art || 'nachfassen') : null; k.follow_up_notiz = date ? (notiz || '') : '';
    k.geaendert_am = now();
  }
  const isDue = (k) => k.follow_up_am && k.follow_up_am <= today();
  const angesprochenDieseWoche = () => {
    const ws = weekStart();
    return new Set(S.verlauf.filter((v) => v.ereignis === 'status' && v.nach === 'angesprochen' && v.am.slice(0, 10) >= ws).map((v) => v.kontakt_id)).size;
  };
  const neuDieseWoche = () => S.kontakte.filter((k) => k.erstellt_am.slice(0, 10) >= weekStart()).length;

  function fuText(k) {
    const n = k.name;
    switch (k.follow_up_art) {
      case 'erstkontakt': return `${n} kontaktieren`;
      case 'einladung_test': return `${n} zum Test einladen`;
      case 'einladung_ausprobieren': return `${n} zum Ausprobieren einladen`;
      case 'danke_pflege': return `${n}: Danke & Kundenpflege`;
      case 'sonstiges': return `${n}: ${k.follow_up_notiz || 'melden'}`;
      default: return `${n} nachfassen`;
    }
  }
  // Vorschlagslogik: 1. fällige Follow-ups (älteste zuerst) → 2. Kontakte im Status Neu → 3. neue Kunden ohne Danke
  function suggestPrios() {
    const used = new Set();
    const out = [];
    const add = (k, text) => { if (out.length < 3 && !used.has(k.id)) { used.add(k.id); out.push({ text, kontakt_id: k.id }); } };
    S.kontakte.filter(isDue).sort((a, b) => a.follow_up_am.localeCompare(b.follow_up_am)).forEach((k) => add(k, fuText(k)));
    S.kontakte.filter((k) => k.status === 'neu').sort((a, b) => a.erstellt_am.localeCompare(b.erstellt_am)).forEach((k) => add(k, `${k.name} kontaktieren`));
    S.kontakte.filter((k) => k.status === 'kunde' && daysBetween(k.status_seit, today()) <= 14
      && !S.verlauf.some((v) => v.kontakt_id === k.id && v.ereignis === 'entwurf_kopiert' && v.nach === 'danke_pflege' && v.am >= k.status_seit))
      .forEach((k) => add(k, `${k.name}: Danke für die Bestellung`));
    return out;
  }
  function todaysPrios() {
    const T = today();
    let list = S.prioritaeten.filter((p) => p.datum === T);
    if (!list.length) {
      list = suggestPrios().map((p, i) => ({ id: uid(), datum: T, position: i + 1, text: p.text, kontakt_id: p.kontakt_id, quelle: 'vorschlag', erledigt_am: null }));
      S.prioritaeten = S.prioritaeten.filter((p) => p.datum >= addDays(T, -14)).concat(list);
      save();
    }
    return list.sort((a, b) => a.position - b.position);
  }

  function greeting() {
    const d = new Date(); const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (hm < (S.profil.morgen_bis || '11:00')) return 'Guten Morgen';
    if (hm >= (S.profil.abend_ab || '18:00')) return 'Guten Abend';
    return 'Hallo';
  }

  function dueLabel(k) {
    if (!k.follow_up_am) return '';
    const diff = daysBetween(today(), k.follow_up_am);
    if (diff < 0) return `<span class="due over">⏰ überfällig (${-diff} T.)</span>`;
    if (diff === 0) return '<span class="due today">⏰ heute</span>';
    if (diff === 1) return '<span class="due">⏰ morgen</span>';
    return `<span class="due">⏰ ${fmtDate(k.follow_up_am)}</span>`;
  }
  const seitText = (k) => { const d = daysBetween(k.status_seit, today()); return d === 0 ? 'seit heute' : d === 1 ? 'seit gestern' : `seit ${d} Tagen`; };
  const herkunftName = (key) => (C.HERKUNFT.find(([k]) => k === key) || [, ''])[1];
  const kanalName = (key) => (C.KANAL.find(([k]) => k === key) || [, ''])[1];

  // ---------- Hinweis unten ----------
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // Kopieren: Clipboard-API, sonst der alte Weg über ein unsichtbares Textfeld. Wartet nicht auf eine Antwort.
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

  // ---------- Router ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'heute';
    const [path, query] = h.split('?');
    const parts = path.split('/');
    const params = Object.fromEntries(new URLSearchParams(query || ''));
    return { name: parts[0], id: parts[1], sub: parts[2], params };
  }
  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

  function render() {
    const r = route();
    const views = { heute: viewHeute, kontakte: viewKontakte, kontakt: viewKontakt, neu: viewForm, sprachnotiz: viewSprachnotiz, entwurf: viewEntwurf, profil: viewProfil };
    const v = views[r.name] || viewHeute;
    app.innerHTML = v(r);
    const tab = { kontakt: 'kontakte', entwurf: 'kontakte', sprachnotiz: 'heute' }[r.name] || r.name;
    document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
    if (v.after) v.after(r);
  }

  // ---------- Dashboard ----------
  function viewHeute() {
    const prios = todaysPrios();
    const done = prios.filter((p) => p.erledigt_am).length;
    const aktiv = S.kontakte.filter((k) => k.status !== 'gerade_nicht').length;
    const due = S.kontakte.filter(isDue);
    const over = due.filter((k) => k.follow_up_am < today()).length;
    const goal = Math.max(1, Number(S.profil.kontakte_pro_woche) || 5);
    const got = angesprochenDieseWoche();
    const rest = Math.max(0, goal - got);
    const daysLeft = 7 - ((new Date().getDay() + 6) % 7);
    return `
      <div class="greet">
        <h1>${esc(greeting())}${S.profil.vorname ? ', ' + esc(S.profil.vorname) : ''}!</h1>
        <p class="lead">Dein Business-Fokus für heute</p>
      </div>
      <div class="tiles">
        <a class="tile" href="#/kontakte">
          <div class="t-label">👥 Kontakte</div>
          <div class="t-num">${aktiv}</div>
          <div class="t-sub">aktiv · ${neuDieseWoche()} neu diese Woche</div>
        </a>
        <a class="tile" href="#/kontakte?f=faellig">
          <div class="t-label">⏰ Follow-ups</div>
          <div class="t-num">${due.length}</div>
          <div class="t-sub ${over ? 'alert' : ''}">${due.length ? (over ? `fällig · davon ${over} überfällig` : 'heute fällig') : 'nichts fällig'}</div>
        </a>
      </div>

      <section class="card">
        <div class="card-head"><h2>Deine ${prios.length === 1 ? 'Priorität' : prios.length + ' Prioritäten'}</h2><span class="counter">${done} von ${prios.length} erledigt</span></div>
        ${prios.length ? `<ul class="prio">${prios.map((p) => `
          <li class="${p.erledigt_am ? 'done' : ''}">
            <input type="checkbox" data-act="prio-toggle" data-id="${p.id}" ${p.erledigt_am ? 'checked' : ''} aria-label="${esc(p.text)} erledigt">
            <span class="p-text">${esc(p.text)}</span>
            ${p.kontakt_id && kontakt(p.kontakt_id) ? `<a class="go" href="#/kontakt/${p.kontakt_id}" aria-label="Zu ${esc(kontakt(p.kontakt_id).name)}">›</a>` : ''}
          </li>`).join('')}</ul>` : '<p class="muted">Heute ist nichts fällig. Trag dir eine eigene Priorität ein.</p>'}
        ${prios.length && done === prios.length ? '<p class="praise">Alles erledigt. Schön, dass du dranbleibst.</p>' : ''}
        <div class="actions end"><button class="btn ghost small" data-act="prio-edit">✎ anpassen</button></div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Wochenziel</h2><span class="counter">${got} von ${goal}</span></div>
        <div class="muted">Neue Kontakte angesprochen (Mo–So)</div>
        <div class="goal-track" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${got}"><div class="goal-fill ${got >= goal ? 'full' : ''}" style="width:${Math.min(100, (got / goal) * 100)}%"></div></div>
        <p class="small" style="margin:0">${got >= goal ? 'Wochenziel erreicht. Stark!' : `Noch ${rest} in ${daysLeft === 1 ? 'diesem letzten Tag' : `den nächsten ${daysLeft} Tagen`}. Du schaffst das.`}
          ${S.kontakte.some((k) => k.status === 'neu') ? ' <a href="#/kontakte?f=neu" class="small">Neue Kontakte ansehen ›</a>' : ''}</p>
      </section>

      <section class="card record-card">
        <h2>🎙 Gespräch dokumentieren</h2>
        <p class="muted">Halt kurz fest, was besprochen wurde.</p>
        <a class="rec-btn" href="#/sprachnotiz">🎙 Gespräch notieren</a>
        <p class="small muted" style="margin:10px 0 0">Sprechen statt tippen: mit dem Mikrofon deiner Tastatur.</p>
      </section>`;
  }

  // ---------- Kontaktliste ----------
  let listSearch = '';
  function viewKontakte(r) {
    const f = r.params.f || 'alle';
    const counts = Object.fromEntries(C.STATUS.map((s) => [s.key, S.kontakte.filter((k) => k.status === s.key).length]));
    const nDue = S.kontakte.filter(isDue).length;
    const chips = [['alle', 'Alle'], ['faellig', `Fällig ${nDue}`]].concat(C.STATUS.filter((s) => counts[s.key]).map((s) => [s.key, `${s.icon} ${s.name} ${counts[s.key]}`]));
    return `
      <div class="card-head"><h1>Kontakte</h1><a class="btn small" href="#/neu">＋ Neu</a></div>
      <input type="search" class="search" id="search" placeholder="🔍 Suchen …" value="${esc(listSearch)}" aria-label="Kontakte suchen">
      <div class="chips" role="tablist">${chips.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}" role="tab" aria-selected="${f === k}">${esc(l)}</button>`).join('')}</div>
      <div id="list">${listHtml(f)}</div>`;
  }
  function listHtml(f) {
    const q = listSearch.trim().toLowerCase();
    let list = S.kontakte.slice();
    if (f === 'faellig') list = list.filter(isDue);
    else if (f !== 'alle') list = list.filter((k) => k.status === f);
    if (q) list = list.filter((k) => k.name.toLowerCase().includes(q));
    list.sort((a, b) => {
      const da = isDue(a) ? 0 : 1, db = isDue(b) ? 0 : 1;
      if (da !== db) return da - db;
      if (!da) return a.follow_up_am.localeCompare(b.follow_up_am);
      return b.geaendert_am.localeCompare(a.geaendert_am);
    });
    if (!S.kontakte.length) return '<div class="card empty">Trag deinen ersten Kontakt ein. Nur Menschen, die damit einverstanden sind.<div class="actions" style="justify-content:center"><a class="btn" href="#/neu">＋ Kontakt eintragen</a></div></div>';
    if (!list.length) return '<div class="card empty">Hier ist gerade niemand.</div>';
    return `<ul class="clist">${list.map((k) => {
      const s = statusOf(k.status);
      return `<li><a href="#/kontakt/${k.id}">
        <div class="c-top"><span class="c-name">${esc(k.name)}</span>${dueLabel(k)}</div>
        <div class="c-sub">${s.icon} ${s.name}${k.status === 'kunde' && k.smartship ? ' · SmartShip' : ''} · ${seitText(k)}${k.herkunft ? ' · ' + esc(herkunftName(k.herkunft)) : ''}</div>
      </a></li>`;
    }).join('')}</ul>`;
  }
  viewKontakte.after = () => {
    const s = document.getElementById('search');
    s.addEventListener('input', () => { listSearch = s.value; document.getElementById('list').innerHTML = listHtml(route().params.f || 'alle'); });
  };

  // ---------- Kontaktdetail ----------
  function viewKontakt(r) {
    const k = kontakt(r.id);
    if (!k) return '<p>Diesen Kontakt gibt es nicht mehr.</p><a class="btn" href="#/kontakte">Zur Kontaktliste</a>';
    if (r.sub === 'bearbeiten') return viewForm(r, k);
    const s = statusOf(k.status);
    const t = k.typ_geschaetzt && C.TYPES[k.typ_geschaetzt];
    const timeline = S.notizen.filter((n) => n.kontakt_id === k.id).map((n) => ({ am: n.erstellt_am, html: `${n.art === 'sprache' ? '🎙' : '✎'} <span class="note">„${esc(n.text)}“</span>` }))
      .concat(S.verlauf.filter((v) => v.kontakt_id === k.id).map((v) => ({ am: v.am, html: verlaufText(v) })))
      .sort((a, b) => b.am.localeCompare(a.am));
    const saved = S.entwuerfe.filter((e) => e.kontakt_id === k.id).sort((a, b) => b.erstellt_am.localeCompare(a.erstellt_am));
    return `
      <a class="back" href="#/kontakte">← Kontakte</a>
      <div class="detail-head">
        <div>
          <h1>${esc(k.name)}</h1>
          <button class="pill" data-act="status" aria-label="Status ändern">${s.icon} ${s.name}${k.status === 'kunde' && k.smartship ? ' · SmartShip' : ''} · ${seitText(k)} ▾</button>
          <p class="muted" style="margin-top:8px">${[herkunftName(k.herkunft), kanalName(k.kanal), k.telefon ? '📱 ' + esc(k.telefon) : ''].filter(Boolean).join(' · ')}</p>
        </div>
        <button class="btn ghost small" data-act="menu" aria-label="Weitere Aktionen">⋯</button>
      </div>

      <section class="card fu-box ${k.follow_up_am ? '' : 'none'}">
        ${k.follow_up_am ? `
          <div><b>⏰ Follow-up: ${daysBetween(today(), k.follow_up_am) === 0 ? 'heute' : fmtDate(k.follow_up_am)}</b> · ${esc((artOf(k.follow_up_art) || { name: 'Sonstiges' }).name)} ${dueLabel(k) && k.follow_up_am < today() ? dueLabel(k) : ''}</div>
          ${k.follow_up_notiz ? `<div class="muted">„${esc(k.follow_up_notiz)}“</div>` : ''}
          <div class="actions"><button class="btn olive small" data-act="fu-done">✓ Erledigt</button><button class="btn secondary small" data-act="fu-edit">Verschieben</button></div>`
        : `<div class="muted">Kein Follow-up eingetragen.</div><div class="actions"><button class="btn secondary small" data-act="fu-edit">＋ Follow-up eintragen</button></div>`}
      </section>

      <div class="btn-grid" style="margin-bottom:16px">
        <a class="btn wide" href="#/entwurf/${k.id}">✉ Nachricht vorschlagen</a>
        <a class="btn secondary" href="#/sprachnotiz?k=${k.id}">🎙 Gespräch notieren</a>
        <button class="btn secondary" data-act="note">✎ Notiz</button>
      </div>

      <section class="card">
        <div class="card-head"><div><b>Typ (geschätzt):</b> ${t ? `${t.icon} ${t.name}` : '<span class="muted">weiß ich noch nicht</span>'}</div><button class="linklike small" data-act="guess">${t ? 'ändern' : 'Hilf mir schätzen'} ›</button></div>
        ${t ? `<div class="small muted">So erreichst du den Kontakt: ${esc(t.weg)}</div>` : ''}
        <div class="lock">🔒 Deine persönliche Einschätzung, nur für dich. Sie hilft dir, den richtigen Ton zu treffen, und ist kein Urteil über den Menschen.</div>
      </section>

      ${saved.length ? `<section class="card"><h2>Gemerkte Entwürfe</h2>${saved.map((e) => `
        <div class="small muted">${esc(artOf(e.art).name)} · ${fmtShort(e.erstellt_am)}</div>
        <div class="saved-draft">${esc(e.text)}</div>
        <div class="actions" style="margin-top:0"><button class="btn ghost small" data-act="copy-saved" data-id="${e.id}">📋 Kopieren</button><button class="btn ghost small" data-act="del-saved" data-id="${e.id}">Entfernen</button></div>`).join('')}</section>` : ''}

      <section class="card">
        <h2>Verlauf</h2>
        ${timeline.length ? `<ul class="timeline">${timeline.map((e) => `<li><span class="when">${fmtShort(e.am)}</span><span>${e.html}</span></li>`).join('')}</ul>` : '<p class="muted">Noch nichts.</p>'}
      </section>`;
  }
  viewKontakt.after = (r) => { if (r.sub === 'bearbeiten' && kontakt(r.id)) viewForm.after(r); };
  function verlaufText(v) {
    switch (v.ereignis) {
      case 'angelegt': return 'angelegt';
      case 'status': return `Status → ${statusOf(v.nach).icon} ${statusOf(v.nach).name}`;
      case 'follow_up_erledigt': return `✓ Follow-up erledigt${v.nach ? ' (' + esc((artOf(v.nach) || { name: v.nach }).name) + ')' : ''}`;
      case 'entwurf_kopiert': return `✉ ${esc((artOf(v.nach) || { name: 'Entwurf' }).name)}-Entwurf ${v.von === 'whatsapp' ? 'in WhatsApp geöffnet' : 'kopiert'}`;
      default: return esc(v.ereignis);
    }
  }

  // ---------- Kontakt anlegen / bearbeiten ----------
  let F = null; // Formular-Zwischenstand (bleibt erhalten, während die Schätzhilfe offen ist)
  function viewForm(r, k) {
    const editing = !!k;
    if (!F || F._for !== (k ? k.id : 'neu')) {
      F = k ? Object.assign({}, k, { _for: k.id }) : { _for: 'neu', name: '', herkunft: '', kanal: 'whatsapp', telefon: '', typ_geschaetzt: null, business_offen: false, einverstanden: false, smartship: false };
    }
    const opt = (list, val) => list.map(([v, l]) => `<option value="${v}" ${val === v ? 'selected' : ''}>${l}</option>`).join('');
    return `
      <a class="back" href="${editing ? '#/kontakt/' + k.id : '#/kontakte'}">← ${editing ? esc(k.name) : 'Kontakte'}</a>
      <h1>${editing ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</h1>
      <form id="kform" class="card" novalidate>
        <label class="field" for="f-name">Name *</label>
        <input type="text" id="f-name" name="name" maxlength="80" value="${esc(F.name)}" placeholder="so, wie du den Kontakt nennst, z. B. „Irene vom Yoga“" required>
        <div class="row2">
          <div><label class="field" for="f-herkunft">Woher kennt ihr euch? <span class="opt">(optional)</span></label>
            <select id="f-herkunft" name="herkunft"><option value="">–</option>${opt(C.HERKUNFT, F.herkunft)}</select></div>
          <div><label class="field" for="f-kanal">Kanal <span class="opt">(optional)</span></label>
            <select id="f-kanal" name="kanal"><option value="">–</option>${opt(C.KANAL, F.kanal)}</select></div>
        </div>
        <label class="field" for="f-tel">Telefon <span class="opt">(optional, nur für „In WhatsApp öffnen“)</span></label>
        <input type="tel" id="f-tel" name="telefon" value="${esc(F.telefon)}" placeholder="+41 …">
        <label class="field" for="f-typ">Typ (geschätzt) <span class="opt">(optional)</span></label>
        <select id="f-typ" name="typ_geschaetzt"><option value="">weiß ich noch nicht</option>${C.TYPE_ORDER.map((t) => `<option value="${t}" ${F.typ_geschaetzt === t ? 'selected' : ''}>${C.TYPES[t].icon} ${C.TYPES[t].name}</option>`).join('')}</select>
        <p style="margin:6px 0 0"><button type="button" class="linklike small" data-act="guess-form">Hilf mir schätzen ›</button></p>
        <div class="lock">🔒 Deine persönliche Einschätzung, nur für dich. Sie hilft dir, den richtigen Ton zu treffen, und ist kein Urteil über den Menschen.</div>
        ${editing && F.status === 'kunde' ? `<label class="check"><input type="checkbox" name="smartship" ${F.smartship ? 'checked' : ''}><span>SmartShip (Vorzugskunde)</span></label>` : ''}
        <label class="check"><input type="checkbox" name="business_offen" ${F.business_offen ? 'checked' : ''}><span>Offen für das Business-Thema<br><span class="muted small">Nur dann bietet der Entwurf es an, und auch dann nur, wenn du es dort auswählst.</span></span></label>
        ${editing ? '' : `<label class="check"><input type="checkbox" name="einverstanden" ${F.einverstanden ? 'checked' : ''}><span>Der Kontakt ist einverstanden, dass ich ihn hier notiere.</span></label>`}
        <p class="small muted">Bitte keine Gesundheitsangaben notieren.</p>
        <p id="f-err" class="notice warm" hidden></p>
        <div class="actions split">
          ${editing ? '<button type="button" class="btn danger small" data-act="delete">Kontakt löschen</button>' : '<span></span>'}
          <button class="btn" type="submit">Speichern</button>
        </div>
      </form>`;
  }
  function readForm() {
    const fm = document.getElementById('kform'); if (!fm) return;
    const d = new FormData(fm);
    ['name', 'herkunft', 'kanal', 'telefon'].forEach((n) => { F[n] = String(d.get(n) || '').trim(); });
    F.typ_geschaetzt = d.get('typ_geschaetzt') || null;
    F.business_offen = d.get('business_offen') === 'on';
    F.smartship = d.get('smartship') === 'on';
    F.einverstanden = d.get('einverstanden') === 'on';
  }
  viewForm.after = (r) => {
    const fm = document.getElementById('kform');
    fm.addEventListener('input', readForm);
    fm.addEventListener('change', readForm);
    fm.addEventListener('submit', (e) => {
      e.preventDefault(); readForm();
      const err = document.getElementById('f-err');
      const editing = F._for !== 'neu';
      if (!F.name) { err.textContent = 'Bitte gib einen Namen ein.'; err.hidden = false; return; }
      if (!editing && !F.einverstanden) { err.textContent = 'Bitte bestätige, dass der Kontakt einverstanden ist.'; err.hidden = false; return; }
      if (editing) {
        const k = kontakt(F._for);
        Object.assign(k, { name: F.name, herkunft: F.herkunft, kanal: F.kanal, telefon: F.telefon, typ_geschaetzt: F.typ_geschaetzt, business_offen: F.business_offen, smartship: k.status === 'kunde' && F.smartship, geaendert_am: now() });
        save(); F = null; toast('Gespeichert'); go('#/kontakt/' + k.id);
      } else {
        const id = uid();
        S.kontakte.push({ id, name: F.name, kanal: F.kanal, telefon: F.telefon, herkunft: F.herkunft, status: 'neu', status_seit: now(), smartship: false,
          typ_geschaetzt: F.typ_geschaetzt, business_offen: F.business_offen, follow_up_am: null, follow_up_art: null, follow_up_notiz: '', erstellt_am: now(), geaendert_am: now() });
        log(id, 'angelegt');
        save(); F = null; toast('Kontakt eingetragen'); go('#/kontakt/' + id);
      }
    });
    if (r.name === 'neu') document.getElementById('f-name').focus();
  };

  // ---------- Gespräch dokumentieren ----------
  // Entschieden 20.10.2026 (Variante A): Diktieren über das Mikrofon der Handy-Tastatur.
  // Die App nimmt selbst nichts auf und verarbeitet keine Audiodaten.
  let REC = null; // { text, kontakt_id, neuName, einverstanden, status, fu }
  function viewSprachnotiz(r) {
    if (!REC || REC._hash !== location.hash) {
      REC = { _hash: location.hash, text: '', kontakt_id: r.params.k || '', neuName: '', einverstanden: false, status: '', fu: 'auto' };
    }
    const fixed = r.params.k && kontakt(r.params.k);
    const back = fixed ? `#/kontakt/${fixed.id}` : '#/heute';
    const k = REC.kontakt_id && kontakt(REC.kontakt_id);
    const curStatus = k ? k.status : 'neu';
    const selStatus = REC.status || curStatus;
    const fuDays = statusOf(selStatus).fu;
    return `<a class="back" href="${back}">← ${fixed ? esc(fixed.name) : 'Heute'}</a>
      <h1>Gespräch dokumentieren</h1>
      ${fixed ? `<p class="lead">mit ${esc(fixed.name)}</p>` : ''}
      <section class="card">
        <div class="dictate">
          <span class="mic" aria-hidden="true">🎙</span>
          <span><b>Lieber sprechen als tippen?</b><br>Tipp ins Textfeld und dann aufs <b>Mikrofon deiner Tastatur</b>. Erzähl einfach, dein Handy schreibt mit.</span>
        </div>
        <label class="field" for="r-text">Was wurde besprochen?</label>
        <textarea id="r-text" data-rec="text" maxlength="2000" placeholder="z. B. Hat vom Urlaub erzählt, will den Test nächste Woche machen …">${esc(REC.text)}</textarea>
        <p class="small muted" style="margin-top:6px">Bitte keine Gesundheitsangaben. Lies den Text kurz durch, Diktate verhören sich manchmal.</p>
        ${fixed ? '' : `
          <label class="field" for="r-k">Zu welchem Kontakt?</label>
          <select id="r-k" data-rec="kontakt_id"><option value="">– bitte wählen –</option><option value="__neu" ${REC.kontakt_id === '__neu' ? 'selected' : ''}>＋ neuer Kontakt</option>
            ${S.kontakte.slice().sort((a, b) => a.name.localeCompare(b.name)).map((x) => `<option value="${x.id}" ${REC.kontakt_id === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
          ${REC.kontakt_id === '__neu' ? `<label class="field" for="r-new">Name des neuen Kontakts</label><input type="text" id="r-new" data-rec="neuName" value="${esc(REC.neuName)}" maxlength="80">
            <label class="check"><input type="checkbox" data-rec="einverstanden" ${REC.einverstanden ? 'checked' : ''}><span>Der Kontakt ist einverstanden, dass ich ihn hier notiere.</span></label>` : ''}`}
        <div class="row2">
          <div><label class="field" for="r-status">Status ändern?</label>
            <select id="r-status" data-rec="status">${C.STATUS.map((s) => `<option value="${s.key}" ${selStatus === s.key ? 'selected' : ''}>${s.icon} ${s.name}${s.key === curStatus ? ' (bleibt)' : ''}</option>`).join('')}</select></div>
          <div><label class="field" for="r-fu">Follow-up?</label>
            <select id="r-fu" data-rec="fu">
              <option value="auto" ${REC.fu === 'auto' ? 'selected' : ''}>${fuDays && selStatus !== curStatus ? `in ${fuLabel(fuDays)} (Vorschlag)` : 'unverändert'}</option>
              ${[1, 3, 7, 14].map((d) => `<option value="${d}" ${REC.fu === String(d) ? 'selected' : ''}>in ${fuLabel(d)}</option>`).join('')}
              <option value="none" ${REC.fu === 'none' ? 'selected' : ''}>kein Follow-up</option></select></div>
        </div>
        <p id="r-err" class="notice warm" hidden></p>
        <div class="actions end"><button class="btn" data-act="rec-save">Speichern</button></div>
      </section>`;
  }
  const fuLabel = (d) => d === 1 ? '1 Tag' : d >= 90 ? '3 Monaten' : `${d} Tagen`;
  viewSprachnotiz.after = () => {
    const ta = document.getElementById('r-text');
    if (ta && !REC._focused) { REC._focused = true; ta.focus(); }
    document.querySelectorAll('[data-rec]').forEach((el) => {
      const key = el.dataset.rec;
      const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        REC[key] = el.type === 'checkbox' ? el.checked : el.value;
        if (el.tagName !== 'SELECT' || key === 'fu') return;
        if (key === 'kontakt_id') REC.status = '';
        if (key === 'status') REC.fu = 'auto';
        render();
      });
    });
  };
  function saveRec() {
    const err = document.getElementById('r-err');
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    if (!REC.text.trim()) return fail('Der Text ist noch leer.');
    let k;
    if (REC.kontakt_id === '__neu') {
      if (!REC.neuName.trim()) return fail('Bitte gib einen Namen für den neuen Kontakt ein.');
      if (!REC.einverstanden) return fail('Bitte bestätige, dass der Kontakt einverstanden ist.');
      k = { id: uid(), name: REC.neuName.trim(), kanal: 'whatsapp', telefon: '', herkunft: '', status: 'neu', status_seit: now(), smartship: false, typ_geschaetzt: null,
        business_offen: false, follow_up_am: null, follow_up_art: null, follow_up_notiz: '', erstellt_am: now(), geaendert_am: now() };
      S.kontakte.push(k); log(k.id, 'angelegt');
    } else {
      k = kontakt(REC.kontakt_id);
      if (!k) return fail('Bitte wähl einen Kontakt aus.');
    }
    S.notizen.push({ id: uid(), kontakt_id: k.id, art: 'text', text: REC.text.trim().slice(0, 2000), erstellt_am: now() });
    const before = k.status;
    if (REC.status && REC.status !== k.status) setStatus(k, REC.status);
    const st = statusOf(k.status);
    const days = REC.fu === 'auto' ? (k.status !== before ? st.fu : null) : REC.fu === 'none' ? 0 : Number(REC.fu);
    if (days) setFollowUp(k, addDays(today(), days), st.art);
    else if (REC.fu === 'none') setFollowUp(k, null);
    save(); REC = null; toast('Gespräch gespeichert'); go('#/kontakt/' + k.id);
  }

  // ---------- Nachrichtenentwurf ----------
  // Mit Testcode schreibt die KI (Server-Funktion „wortstil“, Aktion crm_entwurf), sonst ein fester Beispielentwurf.
  // An die KI gehen nur: Steckbrief, Art, Typ (geschätzt), die letzten 3 Notizen (Vorname ersetzt durch [Name]), Business ja/nein.
  const AI_URL = String(window.CRM_AI_URL || '').trim();
  const aiReady = () => !!(AI_URL && String(S.profil.testcode || '').trim());
  const AI_ERRORS = {
    bad_code: 'Der Testcode stimmt nicht. Prüf ihn bitte im Profil.',
    rate_limited: 'Gerade sind es zu viele Anfragen. Versuch es in ein paar Minuten nochmal.',
    refused: 'Die KI konnte dazu nichts schreiben. Versuch es nochmal oder schreib selbst.',
    network: 'Keine Verbindung zum Server. Prüf deine Internetverbindung.',
    server_config: 'Die KI ist gerade nicht richtig eingerichtet. Gib Tanja bitte kurz Bescheid.',
  };
  let DR = null; // { _for, art, business, text, source: 'ki'|'beispiel', loading, error, cache, token }
  function fillPlaceholders(k, text) {
    return String(text || '').replace(/\[Name\]/g, firstName(k.name)).replace(/\[(?:Link|dein Link)\]/g, S.profil.superpatch_link || '[dein Link]');
  }
  function buildDraft(k, art, business) {
    const tpl = (C.DRAFTS[art] || {})[k.typ_geschaetzt || 'neutral'] || C.DRAFTS[art].neutral;
    let text = tpl.replace(/\{name\}/g, firstName(k.name)).replace(/\{link\}/g, S.profil.superpatch_link || '[dein Link]');
    if (business) text += '\n\n' + C.BUSINESS_LINE;
    return text;
  }
  function notesForAi(k) {
    const words = [firstName(k.name)].filter((w) => w.length >= 2).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const hide = words.length ? new RegExp(`(^|[^\\p{L}])(${words.join('|')})(?![\\p{L}])`, 'giu') : null;
    return S.notizen.filter((n) => n.kontakt_id === k.id).sort((a, b) => b.erstellt_am.localeCompare(a.erstellt_am)).slice(0, 3)
      .map((n) => (hide ? n.text.replace(hide, '$1[Name]') : n.text).slice(0, 600));
  }
  // opts: { fresh: true } ignoriert den Zwischenspeicher, { feedback } für „Was soll anders sein?“
  async function generate(k, opts) {
    const o = opts || {};
    const key = `${DR.art}|${DR.business ? 1 : 0}`;
    DR.error = '';
    if (!o.fresh && !o.feedback && DR.cache[key]) { Object.assign(DR, DR.cache[key]); render(); return; }
    if (!aiReady()) {
      DR.text = buildDraft(k, DR.art, DR.business); DR.source = 'beispiel'; DR.loading = false;
      DR.cache[key] = { text: DR.text, source: DR.source };
      render(); return;
    }
    const token = ++DR.token;
    const previous = DR.text;
    DR.loading = true; render();
    let text = '', error = '';
    try {
      const res = await fetch(AI_URL, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'crm_entwurf', code: S.profil.testcode.trim(), art: DR.art, typ: k.typ_geschaetzt || null,
          profile: S.profil.steckbrief ? S.profil.steckbrief_daten : null, notes: notesForAi(k), business: !!DR.business,
          previous: o.feedback ? previous : undefined, feedback: o.feedback || undefined,
        }),
      });
      let data = {};
      try { data = await res.json(); } catch (_) { /* leer */ }
      if (!res.ok || data.error || !data.text) error = data.error || 'upstream_error'; else text = data.text;
    } catch (_) { error = 'network'; }
    if (!DR || DR.token !== token) return; // Kontakt oder Art wurde inzwischen gewechselt
    DR.loading = false;
    if (error) {
      DR.error = (AI_ERRORS[error] || 'Das hat leider nicht geklappt. Versuch es bitte nochmal.') + ` (Fehlercode: ${error})`;
      // Bei einem neuen Versuch bleibt der bisherige Text stehen, sonst gibt es den Beispielentwurf.
      if (!previous) { DR.text = buildDraft(k, DR.art, DR.business); DR.source = 'beispiel'; }
    } else {
      DR.text = fillPlaceholders(k, text); DR.source = 'ki';
      DR.cache[key] = { text: DR.text, source: DR.source };
    }
    if (route().name === 'entwurf') render();
  }
  function viewEntwurf(r) {
    const k = kontakt(r.id);
    if (!k) return '<p>Diesen Kontakt gibt es nicht mehr.</p>';
    if (!DR || DR._for !== k.id) {
      DR = { _for: k.id, art: r.params.art || statusOf(k.status).art, business: false, text: '', source: '', loading: false, error: '', cache: {}, token: 0, _new: true };
    }
    const t = k.typ_geschaetzt && C.TYPES[k.typ_geschaetzt];
    const needsLink = /einladung_test|einladung_ausprobieren/.test(DR.art) && !S.profil.superpatch_link;
    const waNum = (k.telefon || '').replace(/[^\d]/g, '');
    const off = DR.loading ? 'disabled' : '';
    const hint = DR.source === 'ki'
      ? 'Von der KI aus deinem Wortstil, dem Typ und deinen Notizen. Bitte lies ihn durch und pass ihn an, bevor du ihn verschickst. Klingt das nach dir?'
      : `Beispielentwurf ohne KI.${AI_URL && !aiReady() ? ' Für KI-Entwürfe trag im Profil deinen Testcode ein.' : ''}`;
    return `
      <a class="back" href="#/kontakt/${k.id}">← ${esc(k.name)}</a>
      <h1>Nachricht an ${esc(firstName(k.name))}</h1>
      <div class="art-chips" role="tablist">${C.ARTS.map((a) => `<button class="chip ${DR.art === a.key ? 'on' : ''}" data-act="art" data-art="${a.key}" role="tab" aria-selected="${DR.art === a.key}" ${off}>${a.short}</button>`).join('')}</div>
      <p class="type-line">${t ? `Typ: ${t.icon} ${t.name} (geschätzt) bestimmt den Aufbau` : 'Typ: weiß ich noch nicht, darum ein neutraler Aufbau'} · Stimme: ${S.profil.steckbrief ? 'deine' : 'neutral'}</p>
      ${S.profil.steckbrief ? '' : '<p class="notice warm">Mach zuerst die Wortstil-Probe (ca. 10 Min.), dann klingen die Entwürfe nach dir.</p>'}
      ${needsLink ? '<p class="notice warm">Trag im Profil „Mein Superpatch-Link“ ein, dann steht er direkt im Entwurf.</p>' : ''}
      ${k.business_offen ? `<label class="check"><input type="checkbox" data-act="business" ${DR.business ? 'checked' : ''} ${off}><span>Business-Thema erwähnen <span class="muted small">(nur weil du es beim Kontakt freigeschaltet hast)</span></span></label>` : ''}
      <label class="field" for="d-text">Entwurf <span class="opt">(bearbeitbar)</span></label>
      ${DR.loading ? '<div class="draft-area thinking-box"><div class="thinking"><span class="dot"></span>Die KI schreibt deinen Entwurf …</div></div>'
        : `<textarea id="d-text" class="draft-area" maxlength="2000">${esc(DR.text)}</textarea>`}
      ${DR.error ? `<p class="notice warm">${esc(DR.error)}</p>` : ''}
      <p class="small muted" style="margin-top:6px">${esc(hint)}</p>
      <div class="actions">
        <button class="btn secondary small" data-act="retry" ${off}>↻ Neuer Versuch</button>
        <button class="btn secondary small" data-act="feedback" ${off}>✎ Was soll anders sein?</button>
        <button class="btn secondary small" data-act="remember" ${off}>☆ Merken</button>
      </div>
      <div class="btn-grid" style="margin-top:16px">
        <button class="btn" data-act="copy" ${off}>📋 Kopieren</button>
        ${DR.loading ? '<button class="btn olive" disabled>WhatsApp</button>'
          : `<a class="btn olive" data-act="wa" href="https://wa.me/${waNum}?text=${encodeURIComponent(DR.text)}" target="_blank" rel="noopener">${waNum ? 'In WhatsApp öffnen' : 'WhatsApp (Chat wählen)'}</a>`}
      </div>
      <p class="small muted" style="text-align:center;margin-top:10px">Du verschickst die Nachricht selbst. Die App versendet nie.</p>`;
  }
  viewEntwurf.after = (r) => {
    if (DR && DR._new) { DR._new = false; const k = kontakt(r.id); if (k) generate(k); return; }
    const ta = document.getElementById('d-text');
    if (!ta) return;
    ta.addEventListener('input', () => {
      DR.text = ta.value;
      const wa = document.querySelector('[data-act=wa]');
      if (wa) wa.href = wa.href.split('?')[0] + '?text=' + encodeURIComponent(DR.text);
    });
  };
  function afterSent(k, how) {
    log(k.id, 'entwurf_kopiert', how, DR.art);
    save();
    const next = artOf(DR.art).next;
    const target = next && statusIndex(next) > statusIndex(k.status) ? next : k.status;
    statusDialog(k, target, 'Nachricht verschickt?', `Wenn du sie abgeschickt hast: ${target !== k.status ? 'Status und Follow-up' : 'Follow-up'} eintragen?`, true);
  }

  // ---------- Profil ----------
  function viewProfil() {
    const p = S.profil;
    return `
      <h1>Profil</h1>
      <form id="pform" class="card">
        <label class="field" for="p-name">Vorname</label>
        <input type="text" id="p-name" name="vorname" value="${esc(p.vorname)}" maxlength="40">
        <label class="field" for="p-goal">Wochenziel: neue Kontakte ansprechen</label>
        <input type="number" id="p-goal" name="kontakte_pro_woche" min="1" max="30" value="${esc(p.kontakte_pro_woche)}">
        <p class="small muted">Vorschlag aus deinem Freiheits-Kompass (Ziel D3): unter 3 Std. = 3 · 3–5 Std. = 5 · 5–10 Std. = 8 · mehr als 10 Std. = 14.</p>
        <label class="field" for="p-link">Mein Superpatch-Link</label>
        <input type="text" id="p-link" name="superpatch_link" value="${esc(p.superpatch_link)}" placeholder="https://deinname.superpatch.com">
        <h3>Begrüßung</h3>
        <div class="row2">
          <div><label class="field" for="p-m">„Guten Morgen“ bis</label><input type="time" id="p-m" name="morgen_bis" value="${esc(p.morgen_bis)}"></div>
          <div><label class="field" for="p-a">„Guten Abend“ ab</label><input type="time" id="p-a" name="abend_ab" value="${esc(p.abend_ab)}"></div>
        </div>
        <p class="small muted">Dazwischen steht „Hallo“.</p>
        <h3>Wortstil-Steckbrief</h3>
        <label class="check"><input type="checkbox" name="steckbrief" ${p.steckbrief ? 'checked' : ''}><span>Steckbrief vorhanden <span class="muted small">(im Prototyp zum Umschalten; in der App kommt er aus der Wortstil-Probe)</span></span></label>
        <details><summary class="small">Steckbrief ansehen und anpassen (Beispiel)</summary>
          ${C.STECKBRIEF_FIELDS.map(([key, label]) => `<label class="field" for="sb-${key}">${esc(label)}</label><input type="text" id="sb-${key}" name="sb-${key}" maxlength="300" value="${esc((p.steckbrief_daten || {})[key] || '')}">`).join('')}
        </details>
        <h3>KI für Entwürfe</h3>
        <label class="field" for="p-code">Testcode <span class="opt">(von Tanja)</span></label>
        <input type="text" id="p-code" name="testcode" value="${esc(p.testcode || '')}" autocomplete="off" spellcheck="false">
        <p class="small muted">${AI_URL ? 'Mit Testcode schreibt die KI die Nachrichtenentwürfe. Dafür gehen dein Steckbrief, die Art, der geschätzte Typ und deine letzten 3 Notizen (ohne Namen) an die KI. Gespeichert wird dort nichts.' : 'In dieser Version ist keine KI eingerichtet.'}</p>
        <div class="actions end"><button class="btn" type="submit">Speichern</button></div>
      </form>
      <section class="card sand">
        <h2>Academy</h2>
        <p class="muted">Onboarding-Schritte und Videos findest du in der Academy (systeme.io, bald unter academy.tanjawissel.ch).</p>
      </section>
      <section class="card">
        <h2>Prototyp</h2>
        <p class="muted small">Alle Daten liegen nur in diesem Browser. Die Beispielkontakte sind erfunden.</p>
        <button class="btn danger small" data-act="reset">Beispieldaten zurücksetzen</button>
      </section>`;
  }
  viewProfil.after = () => {
    document.getElementById('pform').addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(e.target);
      Object.assign(S.profil, {
        vorname: String(d.get('vorname') || '').trim(), kontakte_pro_woche: Math.min(30, Math.max(1, Number(d.get('kontakte_pro_woche')) || 5)),
        superpatch_link: String(d.get('superpatch_link') || '').trim(), morgen_bis: d.get('morgen_bis') || '11:00', abend_ab: d.get('abend_ab') || '18:00',
        steckbrief: d.get('steckbrief') === 'on', testcode: String(d.get('testcode') || '').trim(),
        steckbrief_daten: Object.fromEntries(C.STECKBRIEF_FIELDS.map(([key]) => [key, String(d.get('sb-' + key) || '').trim()])),
      });
      save(); DR = null; toast('Profil gespeichert'); render();
    });
  };

  // ---------- Dialoge ----------
  let M = null;
  function openModal(html, after) {
    modalRoot.innerHTML = `<div class="backdrop" data-act="modal-bg"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
    const first = modalRoot.querySelector('input, select, textarea, button');
    if (first) first.focus();
    if (after) after(modalRoot);
  }
  function closeModal() { modalRoot.innerHTML = ''; M = null; }

  // Status ändern + Follow-up-Vorschlag (auch nach dem Kopieren eines Entwurfs)
  // freshFu = true: immer den Vorschlag zeigen (z. B. nach dem Verschicken), sonst ein bestehendes Follow-up übernehmen.
  function statusDialog(k, preselect, title, lead, freshFu) {
    M = { type: 'status', k, title, lead, freshFu, smartship: k.smartship };
    pickStatus(preselect || k.status);
    renderStatusDialog();
  }
  function pickStatus(key) {
    const k = M.k, st = statusOf(key);
    M.sel = key;
    if (!M.freshFu && key === k.status && k.follow_up_am) { M.fuOn = true; M.fuDate = k.follow_up_am; M.fuArt = k.follow_up_art; return; }
    M.fuOn = !!st.fu; M.fuDate = addDays(today(), st.fu || 7); M.fuArt = st.art;
  }
  function renderStatusDialog() {
    const { k } = M;
    openModal(`
      <h2>${esc(M.title || 'Status von ' + k.name)}</h2>
      ${M.lead ? `<p class="muted">${esc(M.lead)}</p>` : ''}
      <div class="options compact">${C.STATUS.map((s) => `<button class="option ${M.sel === s.key ? 'selected' : ''}" data-act="pick-status" data-key="${s.key}" title="${esc(s.text)}">${s.icon} <b>${s.name}</b>${s.key === k.status ? '<small>aktuell</small>' : ''}</button>`).join('')}</div>
      <p class="small muted" style="margin:8px 0 0">${esc(statusOf(M.sel).icon + ' ' + statusOf(M.sel).name)}: ${esc(statusOf(M.sel).text)}</p>
      ${M.sel === 'kunde' ? `<label class="check"><input type="checkbox" id="m-ss" ${M.smartship ? 'checked' : ''}><span>SmartShip (Vorzugskunde)</span></label>` : ''}
      <h3>Follow-up</h3>
      <label class="check"><input type="checkbox" id="m-fuon" ${M.fuOn ? 'checked' : ''}><span>Follow-up eintragen ${statusOf(M.sel).fu ? `<span class="muted small">(Vorschlag: in ${fuLabel(statusOf(M.sel).fu)})</span>` : ''}</span></label>
      <div class="row2" ${M.fuOn ? '' : 'hidden'} id="m-furow">
        <div><label class="field" for="m-fudate">Datum</label><input type="date" id="m-fudate" value="${M.fuDate}" min="${today()}"></div>
        <div><label class="field" for="m-fuart">Art</label><select id="m-fuart">${C.ARTS.map((a) => `<option value="${a.key}" ${M.fuArt === a.key ? 'selected' : ''}>${a.name}</option>`).join('')}<option value="sonstiges" ${M.fuArt === 'sonstiges' ? 'selected' : ''}>Sonstiges</option></select></div>
      </div>
      <div class="actions split"><button class="btn ghost" data-act="modal-close">Abbrechen</button><button class="btn" data-act="status-save">Übernehmen</button></div>`,
    (root) => {
      root.querySelector('#m-fuon').addEventListener('change', (e) => { M.fuOn = e.target.checked; root.querySelector('#m-furow').hidden = !M.fuOn; });
      root.querySelector('#m-fudate').addEventListener('change', (e) => { M.fuDate = e.target.value; });
      root.querySelector('#m-fuart').addEventListener('change', (e) => { M.fuArt = e.target.value; });
      const ss = root.querySelector('#m-ss'); if (ss) ss.addEventListener('change', (e) => { M.smartship = e.target.checked; });
    });
  }

  // Follow-up verschieben / neu eintragen
  function followUpDialog(k, afterDone) {
    const st = statusOf(k.status);
    const base = afterDone ? addDays(today(), st.fu || 7) : (k.follow_up_am && k.follow_up_am > today() ? k.follow_up_am : addDays(today(), 1));
    M = { type: 'fu', k, afterDone };
    openModal(`
      <h2>${afterDone ? 'Erledigt! Neues Follow-up?' : 'Follow-up für ' + esc(k.name)}</h2>
      ${afterDone ? `<p class="muted">Vorschlag für ${st.icon} ${st.name}: ${st.fu ? 'in ' + fuLabel(st.fu) : 'keins'}.</p>` : ''}
      <div class="chips">${[1, 3, 7, 14].map((d) => `<button class="chip" data-act="fu-quick" data-d="${d}">in ${fuLabel(d)}</button>`).join('')}</div>
      <div class="row2">
        <div><label class="field" for="m-fudate">Datum</label><input type="date" id="m-fudate" value="${base}" min="${today()}"></div>
        <div><label class="field" for="m-fuart">Art</label><select id="m-fuart">${C.ARTS.map((a) => `<option value="${a.key}" ${(afterDone ? st.art : k.follow_up_art || st.art) === a.key ? 'selected' : ''}>${a.name}</option>`).join('')}<option value="sonstiges">Sonstiges</option></select></div>
      </div>
      <label class="field" for="m-funote">Notiz <span class="opt">(optional)</span></label>
      <input type="text" id="m-funote" maxlength="200" value="${afterDone ? '' : esc(k.follow_up_notiz)}" placeholder="z. B. nach dem Urlaub fragen">
      <div class="actions split"><button class="btn ghost" data-act="${afterDone ? 'fu-none' : 'modal-close'}">${afterDone ? 'Kein neues' : 'Abbrechen'}</button><button class="btn" data-act="fu-save">Eintragen</button></div>`);
  }

  // Schätzhilfe: zwei Fragen entlang der Achsen des Modells
  function guessDialog(onPick) {
    M = { type: 'guess', tempo: '', fokus: '', onPick };
    renderGuess();
  }
  function renderGuess() {
    const typ = M.tempo && M.fokus ? C.TYPE_ORDER.find((t) => C.TYPES[t].tempo === M.tempo && C.TYPES[t].fokus === M.fokus) : null;
    M.result = typ;
    const o = (field, val, label) => `<button class="option ${M[field] === val ? 'selected' : ''}" data-act="guess-pick" data-field="${field}" data-val="${val}">${label}</button>`;
    openModal(`
      <h2>Hilf mir schätzen</h2>
      <p><b>Wie wirkt der Kontakt auf dich?</b></p>
      <div class="two">${o('tempo', 'schnell', 'eher schnell und entschlossen')}${o('tempo', 'bedacht', 'eher ruhig und bedacht')}</div>
      <p style="margin-top:14px"><b>Worüber spricht der Kontakt lieber?</b></p>
      <div class="two">${o('fokus', 'menschen', 'eher über Menschen und Erlebnisse')}${o('fokus', 'sache', 'eher über Sachen, Zahlen und Fakten')}</div>
      ${typ ? `<div class="card sand" style="margin-top:16px"><div>Vermutlich: <b>${C.TYPES[typ].icon} ${C.TYPES[typ].name}</b></div>
        <div class="small">Daran erkennst du ihn: ${esc(C.TYPES[typ].merkmal)}</div>
        <div class="small muted">So erreichst du ihn: ${esc(C.TYPES[typ].weg)}</div></div>` : ''}
      <p class="small muted">🔒 Deine persönliche Einschätzung, nur für dich. Kein Urteil über den Menschen.</p>
      <div class="actions split"><button class="btn ghost" data-act="modal-close">Abbrechen</button><button class="btn" data-act="guess-take" ${typ ? '' : 'disabled'}>Übernehmen</button></div>`);
  }

  // Prioritäten anpassen
  function prioDialog() {
    const list = todaysPrios();
    M = { type: 'prio', rows: [0, 1, 2].map((i) => list[i] ? { text: list[i].text, kontakt_id: list[i].kontakt_id || '', id: list[i].id, erledigt_am: list[i].erledigt_am, quelle: list[i].quelle } : { text: '', kontakt_id: '', id: uid(), erledigt_am: null, quelle: 'eigen' }) };
    renderPrio();
  }
  function renderPrio() {
    const opts = (sel) => `<option value="">– ohne Kontakt –</option>` + S.kontakte.slice().sort((a, b) => a.name.localeCompare(b.name)).map((k) => `<option value="${k.id}" ${sel === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('');
    openModal(`
      <h2>Deine 3 Prioritäten für heute</h2>
      <p class="muted small">Vorschläge kommen aus fälligen Follow-ups, neuen Kontakten und neuen Kunden. Du kannst jeden Punkt ändern.</p>
      ${M.rows.map((r, i) => `
        <div class="card" style="padding:12px;margin-bottom:10px">
          <label class="field" for="pr-t${i}" style="margin-top:0">${i + 1}.</label>
          <input type="text" id="pr-t${i}" data-prio="text" data-i="${i}" maxlength="120" value="${esc(r.text)}" placeholder="z. B. Peter kontaktieren">
          <select data-prio="kontakt_id" data-i="${i}" style="margin-top:8px" aria-label="Kontakt zu Priorität ${i + 1}">${opts(r.kontakt_id)}</select>
        </div>`).join('')}
      <div class="actions split"><button class="btn ghost small" data-act="prio-suggest">↻ Vorschläge neu laden</button><button class="btn" data-act="prio-save">Speichern</button></div>`,
    (root) => root.querySelectorAll('[data-prio]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      const row = M.rows[Number(el.dataset.i)];
      row[el.dataset.prio] = el.value; row.quelle = 'eigen';
      if (el.dataset.prio === 'kontakt_id' && el.value && !row.text.trim()) { row.text = kontakt(el.value).name + ' kontaktieren'; renderPrio(); }
    })));
  }

  function noteDialog(k) {
    M = { type: 'note', k };
    openModal(`
      <h2>Notiz zu ${esc(k.name)}</h2>
      <textarea id="m-note" maxlength="2000" placeholder="Was möchtest du dir merken?"></textarea>
      <p class="small muted">Bitte keine Gesundheitsangaben notieren.</p>
      <div class="actions split"><button class="btn ghost" data-act="modal-close">Abbrechen</button><button class="btn" data-act="note-save">Speichern</button></div>`);
  }

  function menuDialog(k) {
    M = { type: 'menu', k };
    openModal(`
      <h2>${esc(k.name)}</h2>
      <div class="options">
        <a class="option" href="#/kontakt/${k.id}/bearbeiten" data-act="modal-close-nav">✎ Bearbeiten</a>
        <button class="option" data-act="delete">🗑 Kontakt löschen</button>
      </div>
      <div class="actions end"><button class="btn ghost" data-act="modal-close">Schließen</button></div>`);
  }
  function deleteDialog(k) {
    M = { type: 'delete', k };
    openModal(`
      <h2>${esc(k.name)} löschen?</h2>
      <p>Der Kontakt wird mit allen Notizen, dem Verlauf und gemerkten Entwürfen gelöscht. Das lässt sich nicht rückgängig machen.</p>
      <div class="actions split"><button class="btn ghost" data-act="modal-close">Abbrechen</button><button class="btn danger" data-act="delete-confirm">Endgültig löschen</button></div>`);
  }

  // ---------- Klicks ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const r = route();
    const k = (M && M.k) || (r.id && kontakt(r.id));
    switch (act) {
      case 'modal-bg': if (e.target === el) closeModal(); return;
      case 'modal-close': closeModal(); return;
      case 'modal-close-nav': closeModal(); return; // Link navigiert selbst

      // Dashboard
      case 'prio-toggle': {
        const p = S.prioritaeten.find((x) => x.id === el.dataset.id);
        p.erledigt_am = el.checked ? now() : null; save(); render();
        const pk = p.erledigt_am && p.kontakt_id && kontakt(p.kontakt_id);
        if (pk && pk.status === 'neu') statusDialog(pk, 'angesprochen', `${pk.name} angesprochen?`, 'Dann setz den Status, das zählt fürs Wochenziel.', true);
        else if (pk && isDue(pk)) { log(pk.id, 'follow_up_erledigt', '', pk.follow_up_art); setFollowUp(pk, null); save(); render(); followUpDialog(pk, true); }
        return;
      }
      case 'prio-edit': prioDialog(); return;
      case 'prio-suggest': {
        const sug = suggestPrios();
        M.rows = [0, 1, 2].map((i) => sug[i] ? { text: sug[i].text, kontakt_id: sug[i].kontakt_id, id: uid(), erledigt_am: null, quelle: 'vorschlag' } : { text: '', kontakt_id: '', id: uid(), erledigt_am: null, quelle: 'eigen' });
        renderPrio(); return;
      }
      case 'prio-save': {
        const T = today();
        S.prioritaeten = S.prioritaeten.filter((p) => p.datum !== T).concat(M.rows.filter((x) => x.text.trim()).map((x, i) => ({ id: x.id, datum: T, position: i + 1, text: x.text.trim(), kontakt_id: x.kontakt_id || null, quelle: x.quelle, erledigt_am: x.erledigt_am })));
        if (!S.prioritaeten.some((p) => p.datum === T)) S.prioritaeten.push({ id: uid(), datum: T, position: 1, text: 'Einen Kontakt ansprechen', kontakt_id: null, quelle: 'eigen', erledigt_am: null });
        save(); closeModal(); render(); return;
      }

      // Liste
      case 'filter': go('#/kontakte' + (el.dataset.f === 'alle' ? '' : '?f=' + el.dataset.f)); return;

      // Kontakt
      case 'status': statusDialog(k); return;
      case 'pick-status': {
        pickStatus(el.dataset.key);
        renderStatusDialog(); return;
      }
      case 'status-save': {
        setStatus(M.k, M.sel);
        if (M.sel === 'kunde') M.k.smartship = !!M.smartship;
        if (M.fuOn && M.fuDate) setFollowUp(M.k, M.fuDate, M.fuArt, M.k.follow_up_am ? M.k.follow_up_notiz : '');
        else setFollowUp(M.k, null);
        save(); closeModal(); DR = null; render(); toast('Gespeichert'); return;
      }
      case 'fu-done': log(k.id, 'follow_up_erledigt', '', k.follow_up_art); setFollowUp(k, null); save(); render(); followUpDialog(k, true); return;
      case 'fu-edit': followUpDialog(k, false); return;
      case 'fu-quick': document.getElementById('m-fudate').value = addDays(today(), Number(el.dataset.d)); return;
      case 'fu-none': closeModal(); render(); return;
      case 'fu-save': {
        const d = document.getElementById('m-fudate').value;
        if (!d) return;
        setFollowUp(M.k, d, document.getElementById('m-fuart').value, document.getElementById('m-funote').value.trim());
        save(); closeModal(); render(); toast('Follow-up eingetragen'); return;
      }
      case 'note': noteDialog(k); return;
      case 'note-save': {
        const t = document.getElementById('m-note').value.trim();
        if (!t) return;
        S.notizen.push({ id: uid(), kontakt_id: M.k.id, art: 'text', text: t, erstellt_am: now() });
        M.k.geaendert_am = now(); save(); closeModal(); render(); toast('Notiz gespeichert'); return;
      }
      case 'guess': guessDialog((typ) => { k.typ_geschaetzt = typ; k.geaendert_am = now(); save(); render(); }); return;
      case 'guess-form': readForm(); guessDialog((typ) => { F.typ_geschaetzt = typ; render(); }); return;
      case 'guess-pick': M[el.dataset.field] = el.dataset.val; renderGuess(); return;
      case 'guess-take': { const cb = M.onPick, t = M.result; closeModal(); cb(t); toast('Typ übernommen'); return; }
      case 'menu': menuDialog(k); return;
      case 'delete': if (r.sub === 'bearbeiten') readForm(); deleteDialog(k); return;
      case 'delete-confirm': {
        const id = M.k.id;
        S.kontakte = S.kontakte.filter((x) => x.id !== id);
        ['notizen', 'verlauf', 'entwuerfe'].forEach((t) => { S[t] = S[t].filter((x) => x.kontakt_id !== id); });
        S.prioritaeten.forEach((p) => { if (p.kontakt_id === id) p.kontakt_id = null; });
        save(); closeModal(); F = null; toast('Kontakt gelöscht'); go('#/kontakte'); return;
      }
      case 'copy-saved': {
        const d = S.entwuerfe.find((x) => x.id === el.dataset.id);
        copyText(d.text, 'Kopiert'); return;
      }
      case 'del-saved': S.entwuerfe = S.entwuerfe.filter((x) => x.id !== el.dataset.id); save(); render(); return;

      // Sprachnotiz
      case 'rec-save': saveRec(); return;

      // Entwurf
      case 'art': if (DR.loading) return; DR.art = el.dataset.art; DR.text = ''; generate(k); return;
      case 'business': if (DR.loading) return; DR.business = el.checked; DR.text = ''; generate(k); return;
      case 'retry':
        if (!aiReady()) { toast('Ohne KI gibt es pro Art und Typ einen Beispielentwurf.'); return; }
        generate(k, { fresh: true }); return;
      case 'feedback': {
        if (!aiReady()) { toast('Ohne KI kann der Entwurf nicht neu geschrieben werden. Pass ihn einfach selbst an.'); return; }
        M = { type: 'fb', k };
        openModal(`<h2>Was soll anders sein?</h2><input type="text" id="m-fb" maxlength="600" placeholder="z. B. kürzer, ohne Emoji, lockerer">
          <p class="small muted">Die KI schreibt dann einen neuen Versuch.</p>
          <div class="actions split"><button class="btn ghost" data-act="modal-close">Abbrechen</button><button class="btn" data-act="fb-send">Neuer Versuch</button></div>`);
        return;
      }
      case 'fb-send': {
        const fb = document.getElementById('m-fb').value.trim();
        if (!fb) return;
        const fk = M.k; closeModal(); generate(fk, { feedback: fb }); return;
      }
      case 'remember': S.entwuerfe.push({ id: uid(), kontakt_id: k.id, art: DR.art, text: DR.text.trim(), erstellt_am: now() }); save(); toast('Entwurf gemerkt'); return;
      case 'copy': {
        copyText(DR.text, 'Kopiert. Jetzt selbst verschicken.');
        afterSent(k, 'kopiert'); return;
      }
      case 'wa': setTimeout(() => afterSent(k, 'whatsapp'), 300); return; // Link öffnet WhatsApp in neuem Tab

      // Profil
      case 'reset': S = seed(); save(); DR = null; F = null; REC = null; toast('Beispieldaten zurückgesetzt'); go('#/heute'); return;
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalRoot.innerHTML) closeModal(); });

  window.addEventListener('hashchange', () => { closeModal(); window.scrollTo(0, 0); const r = route(); if (r.name !== 'entwurf') DR = null; if (!(r.name === 'neu' || r.sub === 'bearbeiten')) F = null; render(); });
  render();
})();
