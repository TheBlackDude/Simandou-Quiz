/* Classement : meilleur résultat par participant (nom insensible à la casse et aux accents),
   tri par pourcentage décroissant puis date croissante, 100 lignes au plus.
   Partagé entre les Cloud Functions et les outils d'import (tools/). */
'use strict';
const BOARD_MAX = 100;
const key = n => String(n || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const pct = e => e.ok / e.tot;
const ts = e => { const n = Date.parse(e.date); return isNaN(n) ? Infinity : n; };
const better = (a, b) => pct(a) > pct(b) || (pct(a) === pct(b) && ts(a) < ts(b));
const sort = list => list.sort((a, b) => pct(b) - pct(a) || ts(a) - ts(b));

/** Insère une entrée dans un top déjà trié ; renvoie le nouveau top, ou null si rien ne change. */
function insert(top, e) {
  if (!e || !e.name || !(e.tot > 0) || !(e.ok >= 0)) return null;
  const k = key(e.name), i = top.findIndex(x => key(x.name) === k);
  let next;
  if (i > -1) { if (!better(e, top[i])) return null; next = top.slice(); next[i] = e; }
  else { if (top.length >= BOARD_MAX && !better(e, top[top.length - 1])) return null; next = top.concat([e]); }
  return sort(next).slice(0, BOARD_MAX);
}

/** Reconstruit un top complet à partir d'une liste brute de résultats. */
function build(list) {
  const best = {};
  list.forEach(e => { if (!e || !e.name || !(e.tot > 0) || !(e.ok >= 0)) return; const k = key(e.name); if (!best[k] || better(e, best[k])) best[k] = e; });
  return sort(Object.values(best)).slice(0, BOARD_MAX);
}

module.exports = { BOARD_MAX, key, insert, build };
