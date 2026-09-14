/* Exporte toutes les tentatives d'un quiz (ou de tous) en CSV, pour la remise des prix.
   Usage : node tools/export_attempts.js [quiz] > tentatives.csv */
'use strict';
const { db, QUIZ_IDS } = require('./lib');
const q = process.argv[2];
(async () => {
  const ids = q ? [q] : QUIZ_IDS; const esc = s => '"' + String(s === undefined || s === null ? '' : s).replace(/"/g, '""') + '"';
  console.log(['quiz', 'date', 'nom', 'score', 'total', 'mode', 'uid', 'admin', 'legacy'].join(','));
  for (const id of ids) {
    const snap = await db.collection('attempts').where('quiz', '==', id).orderBy('createdAt', 'desc').get();
    snap.docs.forEach(d => { const e = d.data(); console.log([e.quiz, e.date, e.name, e.ok, e.tot, e.mode, e.uid, e.admin ? 1 : 0, e.legacy ? 1 : 0].map(esc).join(',')); });
  }
})().catch(e => { console.error(e); process.exit(1); });
