/* Kontakte vom Handy übernehmen (Tanja, 09.11.2026).
   Liest nur Name und Telefonnummer aus dem, was die Person selbst auswählt:
   Kontakt-Auswahl des Handys (Android/Chrome), Kontakt-Datei (.vcf) oder Tabelle (.csv).
   Alles andere in den Dateien (Adresse, Geburtstag, Foto, Mail …) wird überlesen und nie gespeichert.
   Reine Hilfsfunktionen ohne Datenbank; die Ansicht steckt in crm.js. */
(function () {
  'use strict';

  const TEL = /^\+?[0-9 ()/-]{4,30}$/;
  const MAX_NAME = 80;

  // Nummer aufräumen: „tel:“, Punkte und Sonderzeichen weg; passt sie dann nicht, bleibt sie leer
  function cleanTel(raw) {
    let s = String(raw || '').trim().replace(/^tel:/i, '').replace(/[.  ]/g, ' ');
    s = s.replace(/[^0-9+ ()/-]/g, '').replace(/\s+/g, ' ').trim();
    s = s.replace(/(?!^)\+/g, '');
    return TEL.test(s) ? s : '';
  }
  const cleanName = (raw) => String(raw || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();

  // Für den Abgleich: Name klein ohne Leerzeichen-Unterschiede, Nummer = letzte 9 Ziffern
  const nameKey = (n) => cleanName(n).toLowerCase();
  const telKey = (t) => { const d = String(t || '').replace(/\D/g, ''); return d.length >= 6 ? d.slice(-9) : ''; };

  // ---------- vCard ----------
  function decodeQP(s, charset) {
    const bytes = [];
    const str = s.replace(/=\r?\n/g, '');
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '=' && /^[0-9A-F]{2}$/i.test(str.substr(i + 1, 2))) { bytes.push(parseInt(str.substr(i + 1, 2), 16)); i += 2; }
      else bytes.push(str.charCodeAt(i) & 0xff);
    }
    try { return new TextDecoder(charset || 'utf-8').decode(new Uint8Array(bytes)); } catch (_) { return new TextDecoder('utf-8').decode(new Uint8Array(bytes)); }
  }
  const unescapeV = (s) => s.replace(/\\n/gi, ' ').replace(/\\([,;\\:])/g, '$1');

  function parseVcf(text) {
    // Zeilen auffalten (Fortsetzung beginnt mit Leerzeichen/Tab); bei Quoted-Printable endet die Zeile mit „=“
    const raw = String(text || '').replace(/^﻿/, '').split(/\r\n|\r|\n/);
    const lines = [];
    for (const l of raw) {
      const prev = lines[lines.length - 1];
      if (prev !== undefined && /^[ \t]/.test(l)) lines[lines.length - 1] = prev + l.slice(1);
      else if (prev !== undefined && /QUOTED-PRINTABLE/i.test(prev.split(':')[0]) && /=$/.test(prev)) lines[lines.length - 1] = prev.slice(0, -1) + l;
      else lines.push(l);
    }
    const out = [];
    let cur = null;
    for (const line of lines) {
      if (/^BEGIN:VCARD/i.test(line)) { cur = { fn: '', n: '', tels: [] }; continue; }
      if (/^END:VCARD/i.test(line)) {
        if (cur) {
          let name = cur.fn;
          if (!name && cur.n) {
            const [fam, giv, mid] = cur.n.split(';');
            name = [giv, mid, fam].filter(Boolean).join(' ');
          }
          const tels = cur.tels.slice().sort((a, b) => b.score - a.score).map((t) => cleanTel(t.value)).filter(Boolean);
          const rawTel = cur.tels.length ? cur.tels[0].value : '';
          out.push({ name: cleanName(name), telefon: tels[0] || '', telVerworfen: !tels[0] && !!rawTel });
        }
        cur = null; continue;
      }
      if (!cur) continue;
      const i = line.indexOf(':');
      if (i < 0) continue;
      const head = line.slice(0, i), value = line.slice(i + 1);
      const parts = head.split(';');
      const prop = parts[0].replace(/^item\d+\./i, '').toUpperCase();
      if (prop !== 'FN' && prop !== 'N' && prop !== 'TEL') continue; // alles andere wird überlesen
      const params = parts.slice(1).join(';').toUpperCase();
      let v = value;
      if (/QUOTED-PRINTABLE/.test(params)) {
        const cs = (params.match(/CHARSET=([A-Z0-9-]+)/) || [])[1];
        v = decodeQP(v, cs && cs.toLowerCase());
      }
      if (prop === 'TEL') {
        const score = (/PREF/.test(params) ? 2 : 0) + (/CELL|MOBILE|IPHONE/.test(params) ? 1 : 0) - (/FAX|PAGER/.test(params) ? 5 : 0);
        cur.tels.push({ value: v, score });
      } else if (prop === 'FN') cur.fn = unescapeV(v);
      else cur.n = v.split(';').map(unescapeV).join(';');
    }
    return out;
  }

  // ---------- CSV ----------
  function splitCsv(text, sep) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim()));
  }

  // Erwartet eine Kopfzeile mit „Name“ (oder Vorname + Nachname) und „Telefon“/„Handy“/„Mobil“/„Phone“.
  // Passt auf die Datei aus „Kontakte herunterladen“ (Semikolon), Excel, Numbers und Google.
  function parseCsv(text) {
    const t = String(text || '').replace(/^﻿/, '');
    const first = t.split(/\r?\n/)[0] || '';
    const count = (ch) => first.split(ch).length - 1;
    const sep = [';', ',', '\t'].sort((a, b) => count(b) - count(a))[0];
    const rows = splitCsv(t, sep);
    if (!rows.length) return { kontakte: [], fehler: 'leer' };
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const find = (re, not) => head.findIndex((h) => re.test(h) && !(not && not.test(h)));
    const iName = find(/^(name|anzeigename|display name|full name|vollständiger name)$/);
    const iVor = find(/^(vorname|first name|given name)$/);
    const iNach = find(/^(nachname|last name|family name|surname)$/);
    const iTel = find(/(telefon|handy|mobil|phone|natel|^tel)/, /(typ|type|label)/);
    if (iName < 0 && iVor < 0) return { kontakte: [], fehler: 'kopf' };
    const strip = (s) => String(s || '').trim().replace(/^'(?=[=+\-@])/, '');
    const kontakte = rows.slice(1).map((r) => {
      const name = iName >= 0 && strip(r[iName]) ? strip(r[iName]) : [strip(r[iVor]), iNach >= 0 ? strip(r[iNach]) : ''].filter(Boolean).join(' ');
      const rawTel = iTel >= 0 ? strip(r[iTel]).split(/\s*:::\s*/)[0] : '';
      const telefon = cleanTel(rawTel);
      return { name: cleanName(name), telefon, telVerworfen: !telefon && !!rawTel };
    });
    return { kontakte, fehler: null };
  }

  // Kontakt-Auswahl des Handys (navigator.contacts.select liefert name[] und tel[])
  function fromPicker(list) {
    return (list || []).map((c) => {
      const tels = (c.tel || []).map(cleanTel).filter(Boolean);
      return { name: cleanName((c.name || [])[0]), telefon: tels[0] || '', telVerworfen: !tels[0] && !!(c.tel || []).length };
    });
  }

  // Vorschau vorbereiten: ohne Namen weg, Doppelte (in der App oder in der Auswahl selbst) markieren
  function vorschau(eingang, vorhanden) {
    const names = new Set(), tels = new Set();
    (vorhanden || []).forEach((k) => { names.add(nameKey(k.name)); const t = telKey(k.telefon); if (t) tels.add(t); });
    const out = [];
    let ohneName = 0;
    for (const k of eingang) {
      if (!k.name) { ohneName++; continue; }
      const nk = nameKey(k.name), tk = telKey(k.telefon);
      const doppelt = names.has(nk) || (!!tk && tels.has(tk));
      out.push(Object.assign({}, k, { doppelt, an: !doppelt }));
      names.add(nk); if (tk) tels.add(tk);
    }
    return { liste: out, ohneName };
  }

  window.KONTAKT_IMPORT = { parseVcf, parseCsv, fromPicker, vorschau, cleanTel, telKey, nameKey,
    pickerDa: () => 'contacts' in navigator && 'ContactsManager' in window };
})();
