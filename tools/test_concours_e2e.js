/* Test de bout en bout du concours en direct dans l'émulateur Firebase (fonctions + Firestore).
   Lancement : npx firebase emulators:exec --only functions,firestore --project demo-gouvernement-qcm "node tools/test_concours_e2e.js"
   Simule un administrateur et 10 participants : inscription (code d'accès), démarrage, envoi, blocage, clôture,
   qualification, repêchage, expiration du temps, finale, lauréats, retour, réinitialisation. */
'use strict';
const path = require('path'), assert = require('node:assert');
const NM = path.join(__dirname, '..', 'functions', 'node_modules');
const { initializeApp } = require(path.join(NM, 'firebase-admin', 'lib', 'app'));
const { getFirestore } = require(path.join(NM, 'firebase-admin', 'lib', 'firestore'));
const BANK = require('../functions/questions.json');
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-gouvernement-qcm';
const URL = 'http://127.0.0.1:5001/' + PROJECT + '/europe-west1/concours';
initializeApp({ projectId: PROJECT }); const db = getFirestore();
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (uid, extra) => b64({ alg: 'none', typ: 'JWT' }) + '.' + b64(Object.assign({ iss: 'https://securetoken.google.com/' + PROJECT, aud: PROJECT, sub: uid, user_id: uid, iat: 1700000000, exp: 4102444800, auth_time: 1700000000, firebase: { sign_in_provider: 'anonymous', identities: {} } }, extra || {})) + '.';
const ADMIN = { email: 'admin@test.local', email_verified: true, firebase: { sign_in_provider: 'google.com', identities: {} } };
async function call(token, action, data) {
  const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ data: Object.assign({ action }, data || {}) }) });
  const j = await r.json();
  if (j.error) { const e = new Error(j.error.message); e.code = j.error.status; throw e; }
  return j.result;
}
const expectErr = async (p, msg) => { try { await p; } catch (e) { if (e.message === msg || e.code === msg) return e; throw new Error('Erreur inattendue : ' + e.code + ' ' + e.message + ' (attendu ' + msg + ')'); } throw new Error('Aucune erreur (attendu ' + msg + ')'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const key = quiz => [].concat(...BANK.quizzes[quiz].sections);
/** Réponses (positions affichées) donnant exactement n bonnes réponses pour la tentative stockée. */
async function answersFor(evId, uid, stage, n) {
  const a = (await db.doc('events/' + evId + '/attempts/' + uid + '_' + stage).get()).data(), k = key(a.quiz);
  return a.order.map((qi, i) => { const good = a.perm.slice(i * 4, i * 4 + 4).indexOf(k[qi]); return i < n ? good : (good + 1) % 4; });
}
let step = 0; const log = s => console.log('  ' + (++step) + '. ' + s);

(async () => {
  const admin = jwt('admin-uid', ADMIN), P = Array.from({ length: 10 }, (_, i) => ({ uid: 'part-' + i, tok: jwt('part-' + i) }));
  await db.doc('admins/admin@test.local').set({ exempt: true });

  await expectErr(call(P[0].tok, 'list'), 'PERMISSION_DENIED'); log('un participant ne peut pas appeler une action administrateur');
  assert.strictEqual((await call(P[0].tok, 'state')).event, null); log('sans concours actif, state renvoie event = null');
  const { id } = await call(admin, 'create', { name: 'Test concours', pin: '1234', stages: [{ quiz: 'histoire', quota: 6 }, { quiz: 'cnrd', quota: 3 }, { quiz: 'armee', quota: 2 }] });
  await expectErr(call(admin, 'create', { name: 'x', stages: [{ quiz: 'nope', quota: 1 }] }), 'INVALID_ARGUMENT');
  await call(admin, 'activate', { id, on: true }); log('concours créé et activé : ' + id);
  const st0 = await call(P[0].tok, 'state'); assert.strictEqual(st0.event.id, id); assert.strictEqual(st0.me, null); assert.strictEqual(st0.event.status, 'waiting');

  await expectErr(call(P[0].tok, 'join', { name: 'Participant 0', pin: '0000' }), 'pin'); log('mauvais code d\'accès refusé');
  for (const [i, p] of P.entries()) { const r = await call(p.tok, 'join', { name: 'Participant ' + i, pin: '1234', phone: '62000000' + i }); assert.strictEqual(r.me.num, i + 1); }
  assert.strictEqual((await call(P[3].tok, 'join', { name: 'Autre nom', pin: '1234' })).me.num, 4); log('10 inscrits numérotés 1..10, réinscription idempotente');
  await expectErr(call(P[0].tok, 'start'), 'waiting'); log('démarrage refusé avant le signal');

  const op = await call(admin, 'open', { id, minutes: 1 }); assert.ok(op.deadlineMs > Date.now()); log('étape 1 démarrée (1 min)');
  const starts = await Promise.all(P.map(p => call(p.tok, 'start')));
  starts.forEach(s => { assert.strictEqual(s.questions.length, 40); assert.ok(s.questions.every(q => q.opts.length === 4 && q.q)); assert.strictEqual(s.stage, 0); });
  assert.notStrictEqual(starts[0].questions[0].q + starts[0].questions[1].q, starts[1].questions[0].q + starts[1].questions[1].q); log('40 questions par participant, ordre propre à chacun');
  const again = await call(P[0].tok, 'start'); assert.strictEqual(again.startedMs, starts[0].startedMs); log('redémarrage (rechargement) : même chrono, mêmes questions');
  await expectErr(call(P[0].tok, 'submit', { answers: [1, 2] }), 'INVALID_ARGUMENT');
  // participant i : 40 - i bonnes réponses ; le participant 9 ne répond pas
  for (let i = 0; i < 9; i++) { const r = await call(P[i].tok, 'submit', { answers: await answersFor(id, P[i].uid, 0, 40 - i) }); assert.strictEqual(r.ok, 40 - i); assert.strictEqual(r.tot, 40); assert.ok(r.ms >= 0); }
  log('9 envois corrigés par le serveur (40, 39, … 32 bonnes réponses)');
  const dup = await call(P[0].tok, 'submit', { answers: await answersFor(id, P[0].uid, 0, 0) }); assert.strictEqual(dup.already, true); assert.strictEqual(dup.ok, 40); log('second envoi ignoré : une seule tentative par appareil et par étape');
  await call(admin, 'block', { id }); await expectErr(call(P[9].tok, 'submit', { answers: new Array(40).fill(0) }), 'blocked'); await expectErr(call(P[9].tok, 'start'), 'blocked'); log('bloqué : aucun envoi ne passe');
  await call(admin, 'unblock', { id }); assert.strictEqual((await call(P[9].tok, 'state')).event.status, 'open'); log('débloqué');
  const cl = await call(admin, 'close', { id }); assert.strictEqual(cl.ranked, 9); assert.strictEqual(cl.qualified, 6); assert.strictEqual(cl.finished, false);
  let ev = (await db.doc('events/' + id).get()).data();
  assert.deepStrictEqual(ev.qualified['1'], P.slice(0, 6).map(p => p.uid)); assert.strictEqual(ev.results['0'].n, 9); assert.strictEqual(ev.results['0'].joined, 10);
  const s7 = await call(P[7].tok, 'state'); assert.strictEqual(s7.attempts[0].rank, 8); assert.strictEqual(s7.qualified, true); log('étape 1 clôturée : top 6 qualifié, rangs écrits (participant 7 → 8e)');
  await expectErr(call(P[9].tok, 'join', { name: 'Retard', pin: '1234' }), 'closed');
  await call(admin, 'next', { id }); assert.strictEqual((await call(P[7].tok, 'state')).qualified, false); assert.strictEqual((await call(P[5].tok, 'state')).qualified, true); await expectErr(call(P[7].tok, 'start'), 'waiting');
  await call(admin, 'open', { id, minutes: 1 }); await expectErr(call(P[7].tok, 'start'), 'not-qualified'); log('étape 2 : les non-qualifiés ne peuvent pas démarrer');
  const rq = await call(admin, 'qualify', { id, num: 8 }); assert.strictEqual(rq.name, 'Participant 7'); assert.strictEqual((await call(P[7].tok, 'start')).stage, 1); log('repêchage du n° 8 : il peut démarrer');
  // égalité de score : le plus rapide gagne (ordre d'envoi 5,4,3,2,1,0 ; le 7 répond mal)
  await Promise.all(P.slice(0, 6).map(p => call(p.tok, 'start')));
  for (const i of [5, 4, 3, 2, 1, 0]) { await sleep(120); assert.strictEqual((await call(P[i].tok, 'submit', { answers: await answersFor(id, P[i].uid, 1, 35) })).ok, 35); }
  await call(P[7].tok, 'submit', { answers: await answersFor(id, P[7].uid, 1, 10) });
  await call(admin, 'close', { id }); ev = (await db.doc('events/' + id).get()).data();
  assert.deepStrictEqual(ev.qualified['2'], [P[5].uid, P[4].uid, P[3].uid]); log('étape 2 : à score égal, les 3 plus rapides sont qualifiés');
  await expectErr(call(admin, 'update', { id, stages: [{ quiz: 'histoire', quota: 6 }] }), 'FAILED_PRECONDITION');
  await call(admin, 'update', { id, stages: [{ quiz: 'sgg', quota: 1 }, { quiz: 'sgg', quota: 1 }, { quiz: 'simandou', quota: 2 }] }); ev = (await db.doc('events/' + id).get()).data();
  assert.deepStrictEqual(ev.stages.map(s => s.quiz), ['histoire', 'cnrd', 'simandou']); log('modification : les étapes déjà jouées sont conservées, la finale devient Simandou');
  await call(admin, 'next', { id }); await call(admin, 'open', { id, minutes: 1 });
  await Promise.all([5, 4, 3].map(i => call(P[i].tok, 'start')));
  await db.doc('events/' + id).update({ deadlineMs: Date.now() - 20000 }); await expectErr(call(P[5].tok, 'submit', { answers: new Array(40).fill(0) }), 'expired'); await expectErr(call(P[4].tok, 'start'), 'expired');
  await db.doc('events/' + id).update({ deadlineMs: Date.now() - 3000 }); log('temps écoulé : envoi refusé au-delà de la tolérance, accepté juste après zéro (envoi automatique)');
  assert.strictEqual((await call(P[5].tok, 'submit', { answers: await answersFor(id, P[5].uid, 2, 30), auto: true })).ok, 30);
  assert.strictEqual((await call(P[4].tok, 'submit', { answers: await answersFor(id, P[4].uid, 2, 38), auto: true })).ok, 38);
  assert.strictEqual((await call(P[3].tok, 'submit', { answers: await answersFor(id, P[3].uid, 2, 38), auto: true })).ok, 38);
  const fin = await call(admin, 'close', { id }); assert.strictEqual(fin.finished, true); ev = (await db.doc('events/' + id).get()).data();
  assert.strictEqual(ev.status, 'finished'); assert.deepStrictEqual(ev.winners.map(w => [w.name, w.rank, w.ok]), [['Participant 4', 1, 38], ['Participant 3', 2, 38]]); assert.ok(ev.winners[0].ms <= ev.winners[1].ms);
  log('finale : 2 lauréats, égalité départagée par le temps');
  const s4 = await call(P[4].tok, 'state'); assert.strictEqual(s4.attempts.length, 3); assert.strictEqual(s4.attempts[2].rank, 1);
  await call(admin, 'back', { id }); ev = (await db.doc('events/' + id).get()).data(); assert.strictEqual(ev.stage, 1); assert.strictEqual(ev.status, 'closed'); log('retour à l\'étape précédente');
  await expectErr(call(admin, 'delete', { id }), 'active');
  await call(admin, 'reset', { id }); ev = (await db.doc('events/' + id).get()).data();
  assert.strictEqual(ev.stage, 0); assert.strictEqual(ev.status, 'waiting'); assert.deepStrictEqual(ev.qualified, {}); assert.strictEqual((await db.collection('events/' + id + '/attempts').get()).size, 0);
  assert.strictEqual((await call(P[0].tok, 'state')).me, null); log('réinitialisation : inscrits et résultats effacés, l\'épreuve revient à l\'étape 1');
  await call(admin, 'activate', { id, on: false }); await call(admin, 'delete', { id }); assert.strictEqual((await db.doc('events/' + id).get()).exists, false); log('suppression');
  console.log('\nOK : concours en direct — ' + step + ' vérifications réussies.');
  process.exit(0);
})().catch(e => { console.error('\nÉCHEC à l\'étape ' + (step + 1) + ' :', e); process.exit(1); });
