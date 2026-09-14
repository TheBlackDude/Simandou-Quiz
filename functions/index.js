/* Gouvernement QCM — Cloud Functions (2e génération, europe-west1).
   - submit  : reçoit les réponses (jamais un score), corrige côté serveur, applique la limite de tentatives,
               enregistre la tentative et met à jour le classement agrégé (leaderboard/{quiz}).
   - state   : tentatives utilisées, statut administrateur et progression du parcours pour l'appareil.
   - reset   : remet à zéro le parcours par sections de l'appareil pour un quiz.
   Les questions et réponses officielles sont figées dans questions.json (généré par build/build_site.py). */
'use strict';
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const rank = require('./rank');
const BANK = require('./questions.json');

setGlobalOptions({ region: 'europe-west1', memory: '256MiB', timeoutSeconds: 30, maxInstances: 200, concurrency: 80 });
initializeApp();
const db = getFirestore();
const ATTEMPT_LIMIT = 2;         // résultats enregistrés par appareil et par quiz (quiz complet ou parcours terminé)
const PASS = 0.8;                // seuil de validation d'une section
const SECTION_MIN_GAP_MS = 3000; // anti-rafale sur les sections
const ENFORCE_APPCHECK = process.env.ENFORCE_APPCHECK === 'true';
const now = () => FieldValue.serverTimestamp();
const callOpts = { enforceAppCheck: ENFORCE_APPCHECK, cors: true };
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

function cleanName(s) { return String(s || '').replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, 60); }
function quizOf(id) { const q = BANK.quizzes[id]; if (!q) throw new HttpsError('invalid-argument', 'Quiz inconnu.'); return q; }
function checkVersion(v) { if (v !== BANK.version) throw new HttpsError('failed-precondition', 'version', { version: BANK.version }); }
function grade(key, answers) {
  if (!Array.isArray(answers) || answers.length !== key.length) throw new HttpsError('invalid-argument', 'Nombre de réponses incorrect.');
  const results = key.map((a, i) => Number.isInteger(answers[i]) && answers[i] === a);
  return { results, ok: results.filter(Boolean).length, tot: key.length };
}
async function isAdmin(auth) {
  const t = auth && auth.token; if (!t || !t.email || !t.email_verified) return false;
  if (t.firebase && t.firebase.sign_in_provider === 'anonymous') return false;
  const d = await db.doc('admins/' + String(t.email).toLowerCase()).get();
  return d.exists && d.get('exempt') === true;
}
function requireAuth(req) { if (!req.auth || !req.auth.uid) throw new HttpsError('unauthenticated', 'Connexion requise.'); return req.auth; }
function progressView(p) { return { unlocked: p.unlocked || 0, best: p.best || {}, recorded: !!p.recorded, parcoursOk: p.parcoursOk === undefined ? null : p.parcoursOk }; }

/** Met à jour le top du quiz (transaction courte sur un seul document). */
async function updateBoard(quiz, entry) {
  const ref = db.doc('leaderboard/' + quiz);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const top = (snap.exists && snap.get('top')) || [];
    const next = rank.insert(top, entry);
    if (next) tx.set(ref, { top: next, updatedAt: now() }, { merge: true });
  });
}

/* ---------- submit ---------- */
exports.submit = onCall(callOpts, async req => {
  const auth = requireAuth(req), uid = auth.uid, d = req.data || {};
  const quiz = String(d.quiz || ''), Q = quizOf(quiz);
  checkVersion(d.v);
  const name = cleanName(d.name); if (name.length < 2) throw new HttpsError('invalid-argument', 'Nom manquant.');
  const adminUser = await isAdmin(auth);
  const provider = (auth.token.firebase && auth.token.firebase.sign_in_provider) || 'anonymous';
  const userRef = db.doc('users/' + uid);
  const baseUser = { name, provider, admin: adminUser, email: adminUser ? auth.token.email : FieldValue.delete(), updatedAt: now() };

  if (d.mode === 'full') {
    const key = [].concat(...Q.sections);
    const g = grade(key, d.answers);
    const attemptRef = db.collection('attempts').doc();
    const r = await db.runTransaction(async tx => {
      const u = (await tx.get(userRef)).data() || {};
      const used = (u.attempts && u.attempts[quiz]) || 0;
      if (!adminUser && used >= ATTEMPT_LIMIT) return { recorded: false, used };
      tx.set(userRef, Object.assign({}, baseUser, { createdAt: u.createdAt || now(), attempts: { [quiz]: used + 1 } }), { merge: true });
      tx.set(attemptRef, { uid, quiz, mode: 'Quiz complet', name, ok: g.ok, tot: g.tot, admin: adminUser, answers: d.answers.map(a => Number.isInteger(a) ? a : null), v: BANK.version, date: new Date().toISOString(), createdAt: now() });
      return { recorded: true, used: used + 1 };
    });
    if (r.recorded && !adminUser) await updateBoard(quiz, { name, ok: g.ok, tot: g.tot, mode: 'Quiz complet', date: new Date().toISOString() });
    return { ok: g.ok, tot: g.tot, results: g.results, recorded: r.recorded, attemptsUsed: r.used, limit: ATTEMPT_LIMIT, admin: adminUser, reason: r.recorded ? null : 'limit' };
  }

  if (d.mode === 'section') {
    const sec = d.section;
    if (!Number.isInteger(sec) || sec < 0 || sec >= Q.sections.length) throw new HttpsError('invalid-argument', 'Section inconnue.');
    const g = grade(Q.sections[sec], d.answers), ratio = g.ok / g.tot, passed = ratio >= PASS - 1e-9;
    const progRef = db.doc('progress/' + uid + '_' + quiz);
    const r = await db.runTransaction(async tx => {
      const [ps, us] = await Promise.all([tx.get(progRef), tx.get(userRef)]);
      const p = ps.data() || { unlocked: 0, best: {} }, u = us.data() || {};
      const t = Date.now();
      if (p.lastAt && t - p.lastAt < SECTION_MIN_GAP_MS) throw new HttpsError('resource-exhausted', 'Trop de soumissions rapprochées.');
      if (sec > (p.unlocked || 0)) throw new HttpsError('failed-precondition', 'locked');
      const best = Object.assign({}, p.best || {});
      if (passed) { if (best[sec] === undefined || ratio > best[sec]) best[sec] = ratio; p.unlocked = Math.max(p.unlocked || 0, sec + 1); }
      const complete = Q.sections.every((s, i) => best[i] !== undefined);
      let used = (u.attempts && u.attempts[quiz]) || 0, recorded = false, parcours = null, boardEntry = null, reason = null;
      const upd = { uid, quiz, unlocked: p.unlocked || 0, best, lastAt: t, updatedAt: now() };
      if (complete) {
        const pOk = Q.sections.reduce((s, sc, i) => s + Math.round(best[i] * sc.length), 0), pTot = Q.sections.reduce((s, sc) => s + sc.length, 0);
        parcours = { ok: pOk, tot: pTot };
        const date = new Date().toISOString();
        if (p.recorded) { // parcours déjà enregistré : on améliore la tentative si le cumul progresse
          if (pOk > (p.parcoursOk || 0)) { tx.update(db.doc('attempts/' + p.recorded), { ok: pOk, date, updatedAt: now() }); upd.parcoursOk = pOk; boardEntry = { name, ok: pOk, tot: pTot, mode: 'Parcours par sections', date }; }
          recorded = true;
        } else if (adminUser || used < ATTEMPT_LIMIT) {
          const attemptRef = db.collection('attempts').doc();
          tx.set(attemptRef, { uid, quiz, mode: 'Parcours par sections', name, ok: pOk, tot: pTot, admin: adminUser, best, v: BANK.version, date, createdAt: now() });
          used += 1; upd.recorded = attemptRef.id; upd.parcoursOk = pOk; recorded = true;
          boardEntry = { name, ok: pOk, tot: pTot, mode: 'Parcours par sections', date };
        } else reason = 'limit';
      }
      tx.set(progRef, upd, { merge: true });
      tx.set(userRef, Object.assign({}, baseUser, { createdAt: u.createdAt || now(), attempts: { [quiz]: used } }), { merge: true });
      return { progress: progressView(Object.assign({}, p, upd)), used, recorded, parcours, boardEntry, reason };
    });
    if (r.boardEntry && !adminUser) await updateBoard(quiz, r.boardEntry);
    return { ok: g.ok, tot: g.tot, results: g.results, passed, progress: r.progress, parcours: r.parcours, recorded: r.recorded, attemptsUsed: r.used, limit: ATTEMPT_LIMIT, admin: adminUser, reason: r.reason };
  }
  throw new HttpsError('invalid-argument', 'Mode inconnu.');
});

/* ---------- state ---------- */
exports.state = onCall(callOpts, async req => {
  const auth = requireAuth(req), uid = auth.uid, d = req.data || {};
  const quiz = String(d.quiz || ''); quizOf(quiz);
  const [adminUser, us, ps] = await Promise.all([isAdmin(auth), db.doc('users/' + uid).get(), db.doc('progress/' + uid + '_' + quiz).get()]);
  const u = us.data() || {};
  return { attemptsUsed: (u.attempts && u.attempts[quiz]) || 0, limit: ATTEMPT_LIMIT, admin: adminUser, email: adminUser ? auth.token.email : null, name: u.name || null, progress: progressView(ps.data() || {}), version: BANK.version };
});

/* ---------- reset ---------- */
exports.reset = onCall(callOpts, async req => {
  const auth = requireAuth(req), d = req.data || {};
  const quiz = String(d.quiz || ''); quizOf(quiz);
  await db.doc('progress/' + auth.uid + '_' + quiz).delete();
  return { ok: true };
});
