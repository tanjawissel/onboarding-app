/* Nachrichten (Archiv der Mitteilungen, freigegeben 24.11.2026, „Push-Nachrichtenarchiv - Entwurf zur Freigabe.md“).
   Glocke mit Zähler oben rechts, Seite #/nachrichten: neueste oben, ungelesene markiert,
   Tippen markiert als gelesen und führt zur passenden Stelle. Einträge legt nur der Server an
   (Funktionen „erinnerung“ und „konto_loeschen“), nach 30 Tagen räumt die Datenbank sie auf.
   Daten: Tabelle nachrichten (RLS: nur die eigenen lesen, nur gelesen_am ändern). */
(function () {
  'use strict';
  const T = window.TW;
  const sb = T.sb;
  const esc = T.esc;

  const glocke = document.getElementById('glocke');
  const zahl = document.getElementById('glocke-zahl');
  const ZIEL = /^#\/[A-Za-z0-9/_?=&-]*$/;
  const ID = /^[0-9a-f-]{36}$/i;
  let liste = null;   // geladene Nachrichten (nur während die Seite offen ist)
  let ungelesen = 0;

  function glockeZeigen() {
    if (!glocke) return;
    glocke.hidden = !T.state.session;
    zahl.textContent = ungelesen > 9 ? '9+' : String(ungelesen);
    zahl.hidden = !ungelesen;
    glocke.setAttribute('aria-label', ungelesen ? `Nachrichten, ${ungelesen} ungelesen` : 'Nachrichten');
    glocke.classList.toggle('active', T.route().name === 'nachrichten');
  }

  async function zaehlen() {
    if (!T.state.session) { ungelesen = 0; return glockeZeigen(); }
    const { count, error } = await sb.from('nachrichten').select('id', { count: 'exact', head: true }).is('gelesen_am', null);
    if (!error) ungelesen = count || 0;
    glockeZeigen();
  }

  async function gelesen(ids) {
    if (!ids.length) return;
    const { error } = await sb.from('nachrichten').update({ gelesen_am: new Date().toISOString() }).in('id', ids).is('gelesen_am', null);
    if (error) return;
    if (liste) liste.forEach((n) => { if (ids.includes(n.id) && !n.gelesen_am) n.gelesen_am = new Date().toISOString(); });
    await zaehlen();
  }

  // Aus einer Push-Mitteilung geöffnet: #/…?n=<id> → als gelesen markieren, n aus der Adresse nehmen
  function ausPush(r) {
    const id = r.params && r.params.n;
    if (!id || !ID.test(id)) return;
    const [pfad, query] = location.hash.split('?');
    const rest = new URLSearchParams(query || ''); rest.delete('n');
    history.replaceState(null, '', location.pathname + location.search + pfad + (rest.toString() ? '?' + rest : ''));
    gelesen([id]);
  }

  // „Heute, 07:30“ · „Gestern, 08:00“ · „Mo., 22.11., 18:00“
  function wann(iso) {
    const d = new Date(iso);
    const zeit = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    const tag = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((tag(new Date()) - tag(d)) / 86400000);
    if (diff === 0) return `Heute, ${zeit}`;
    if (diff === 1) return `Gestern, ${zeit}`;
    const wt = d.toLocaleDateString('de-CH', { weekday: 'short' });
    return `${wt.replace(/\.?$/, '.')}, ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}., ${zeit}`;
  }

  async function laden() {
    const { data, error } = await sb.from('nachrichten').select('id, art, titel, text, ziel, gesendet_am, gelesen_am')
      .order('gesendet_am', { ascending: false }).limit(200);
    if (error) throw error;
    liste = data || [];
  }

  async function viewNachrichten() {
    try { await laden(); } catch (_) {
      return `<h1>Nachrichten</h1><p class="notice warm" role="status">Deine Nachrichten konnten gerade nicht geladen werden. Bitte versuch es gleich noch einmal.</p>`;
    }
    const offen = liste.filter((n) => !n.gelesen_am).length;
    const eintraege = liste.map((n) => `
      <li class="nachricht${n.gelesen_am ? '' : ' neu'}">
        <a href="${esc(ZIEL.test(n.ziel) ? n.ziel : '#/heute')}" data-nachricht="${esc(n.id)}">
          <span class="n-kopf">${n.gelesen_am ? '' : '<span class="n-punkt" aria-hidden="true"></span><span class="sr-only">Ungelesen: </span>'}${esc(wann(n.gesendet_am))}${n.art === 'tageserinnerung' ? '' : ' · Team'}</span>
          <span class="n-text">${esc(n.text)}</span>
          <span class="n-pfeil" aria-hidden="true">›</span>
        </a>
      </li>`).join('');
    return `
      <div class="actions split" style="margin-top:0">
        <h1 style="margin:0">Nachrichten</h1>
        ${offen ? '<button class="btn ghost small" data-act="nachrichten-alle-gelesen">Alle gelesen ✓</button>' : ''}
      </div>
      ${liste.length
        ? `<ul class="nachrichten">${eintraege}</ul><p class="muted small">Mitteilungen bleiben 30 Tage hier.</p>`
        : '<div class="card"><p style="margin:0">Hier sammeln sich deine Mitteilungen aus der App. Sie bleiben 30 Tage hier.</p></div>'}`;
  }

  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('[data-nachricht]');
    if (a) { gelesen([a.dataset.nachricht]); return; } // Link führt selbst weiter
    const b = ev.target.closest && ev.target.closest('[data-act="nachrichten-alle-gelesen"]');
    if (b && liste) { b.disabled = true; gelesen(liste.filter((n) => !n.gelesen_am).map((n) => n.id)).then(() => T.render()); }
  });

  // Zähler frisch halten: beim Zurückkehren in die App und wenn eine Mitteilung bei offener App ankommt
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && T.state.ready) zaehlen(); });

  T.onLogin.push(async () => { await zaehlen(); ausPush(T.route()); });
  T.onLogout.push(() => { liste = null; ungelesen = 0; glockeZeigen(); });
  T.onRoute.push((r) => { if (r.name !== 'nachrichten') liste = null; ausPush(r); glockeZeigen(); });
  T.views.nachrichten = { html: viewNachrichten, tab: '' };
})();
