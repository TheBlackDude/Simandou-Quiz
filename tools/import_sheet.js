/* Importe l'ancien classement (Google Apps Script / feuille Scores) dans Firestore, puis reconstruit les tops.
   Usage : node tools/import_sheet.js [URL_APPS_SCRIPT | fichier.json]
   - sans argument : lit leaderboardUrl dans docs/js/config.js.
   - Les anciennes lignes gardent leur score mais n'ont pas d'identifiant d'appareil : elles sont importées avec
     uid "legacy" et ne comptent pour aucune limite de tentatives. Relançable : une ligne déjà importée
     (même date + nom + quiz + score) n'est pas dupliquée. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { db, Timestamp, rebuildLeaderboards } = require('./lib');
const QUIZZES = require(path.join(__dirname, 'quizzes_meta.json'));

function quizOf(e) { if (e.quiz) return e.quiz; const t = QUIZZES.find(q => q.tag && String(e.mode || '').indexOf('(' + q.tag + ')') > -1); return t ? t.id : 'simandou'; }
async function load(src) {
  if (!src) { const cfg = fs.readFileSync(path.join(__dirname, '..', 'docs', 'js', 'config.js'), 'utf8'); src = (cfg.match(/leaderboardUrl:\s*'([^']+)'/) || [])[1]; }
  if (!src) throw new Error('Aucune source : indiquer l\'URL Apps Script ou un fichier JSON.');
  if (fs.existsSync(src)) return JSON.parse(fs.readFileSync(src, 'utf8'));
  const r = await fetch(src + (src.indexOf('?') > -1 ? '&' : '?') + 't=' + Date.now()); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}
(async () => {
  const rows = await load(process.argv[2]);
  console.log(rows.length + ' lignes lues');
  let n = 0, skipped = 0, batch = db.batch(), inBatch = 0;
  for (const e of rows) {
    const name = String(e.name || '').trim().slice(0, 60), ok = Number(e.ok), tot = Number(e.tot);
    if (!name || !(tot > 0) || !(ok >= 0) || ok > tot) { skipped++; continue; }
    const quiz = quizOf(e), mode = String(e.mode || '').replace(/\s*\([^)]*\)\s*$/, '') || 'Quiz complet';
    const date = isNaN(Date.parse(e.date)) ? new Date().toISOString() : new Date(e.date).toISOString();
    const id = 'legacy_' + crypto.createHash('sha1').update([date, name.toLowerCase(), quiz, ok, tot].join('|')).digest('hex').slice(0, 20);
    batch.set(db.doc('attempts/' + id), { uid: 'legacy', quiz, mode, name, ok, tot, admin: false, legacy: true, date, createdAt: Timestamp.fromDate(new Date(date)) });
    n++; inBatch++;
    if (inBatch === 400) { await batch.commit(); batch = db.batch(); inBatch = 0; }
  }
  if (inBatch) await batch.commit();
  console.log(n + ' tentatives importées, ' + skipped + ' lignes ignorées');
  await rebuildLeaderboards();
})().catch(e => { console.error(e); process.exit(1); });
