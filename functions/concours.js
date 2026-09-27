/* Gouvernement QCM — Concours en direct (épreuves successives devant jury, données séparées du quiz public).
   Une seule Cloud Function « concours » (action dans la requête) :
   - participants (connexion anonyme) : state, join, start, submit ;
   - administrateurs (connexion Google + admins/{email}) : list, create, update, activate, open, block, unblock, close,
     next, back, qualify, reset, delete.
   Données : events/{id} (état public de l'épreuve, lu en temps réel par les navigateurs), events/{id}/participants/{uid},
   events/{id}/attempts/{uid_étape}, events/{id}/private/pin (code d'accès), events/{id}/meta/counter (numéros).
   Règles : 1 tentative par appareil et par étape ; envoi refusé hors statut « open », après la fin du compte à rebours
   (tolérance réseau GRACE_MS pour les envois automatiques partis à zéro) ou sans qualification pour l'étape ;
   classement = score décroissant puis temps croissant (mesuré par le serveur entre start et submit). */
'use strict';
const lib = require('./concours_lib');

module.exports = function (ctx) {
  const { onCall, HttpsError, db, BANK, FieldValue, isAdmin, requireAuth, cleanName, callOpts } = ctx;
  const GRACE_MS = 8000;
  const QUIZ_IDS = Object.keys(BANK.quizzes);
  const ts = () => FieldValue.serverTimestamp();
  const evRef = id => db.doc('events/' + id);
  const evId = s => { const id = String(s || '').trim(); if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(id)) throw new HttpsError('invalid-argument', 'Concours inconnu.'); return id; };
  const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'concours';
  const cleanPin = p => String(p || '').replace(/\D/g, '').slice(0, 8);
  const cleanPhone = p => String(p || '').replace(/[^\d+ ]/g, '').trim().slice(0, 20);
  const keyOf = quiz => [].concat(...BANK.quizzes[quiz].sections);
  const itemsOf = quiz => [].concat(...(BANK.quizzes[quiz].items || []));
  const attId = (uid, k) => uid + '_' + k;
  // Firestore n'accepte pas les tableaux imbriqués : les permutations d'options sont stockées à plat (4 entiers par question).
  const OPTS = 4, flat = perms => [].concat(...perms), permOf = a => Array.from({ length: a.order.length }, (_, i) => a.perm.slice(i * OPTS, i * OPTS + OPTS));
  const isQualified = (ev, uid, k) => k === 0 || (((ev.qualified || {})[k]) || []).indexOf(uid) > -1;
  const fail = (code, msg) => new HttpsError(code, msg);
  const stageOf = (ev, k) => { const s = (ev.stages || [])[k]; if (!s) throw fail('failed-precondition', 'Étape inconnue.'); return s; };
  const attView = a => a ? { stage: a.stage, quiz: a.quiz, started: true, startedMs: a.startedMs, submitted: !!a.submitted, ok: a.submitted ? a.ok : null, tot: a.tot, ms: a.submitted ? a.ms : null, rank: a.rank || null, auto: !!a.auto, answered: a.answered === undefined ? null : a.answered } : null;

  async function activeEvent() {
    const s = await db.collection('events').where('active', '==', true).limit(1).get();
    return s.empty ? null : Object.assign({ id: s.docs[0].id }, s.docs[0].data());
  }
  async function needActive() { const ev = await activeEvent(); if (!ev) throw fail('failed-precondition', 'no-event'); return ev; }
  async function loadEvent(id) { const s = await evRef(evId(id)).get(); if (!s.exists) throw fail('not-found', 'Concours introuvable.'); return Object.assign({ id: s.id }, s.data()); }
  async function myHistory(evid, uid) { const s = await evRef(evid).collection('attempts').where('uid', '==', uid).get(); return s.docs.map(d => attView(d.data())).sort((a, b) => a.stage - b.stage); }

  /* ---------- participants ---------- */
  async function pState(uid) {
    const ev = await activeEvent(); if (!ev) return { event: null, now: Date.now() };
    const [ps, attempts] = await Promise.all([evRef(ev.id).collection('participants').doc(uid).get(), myHistory(ev.id, uid)]);
    return { event: ev, me: ps.exists ? ps.data() : null, attempts, qualified: ps.exists && isQualified(ev, uid, ev.stage), now: Date.now() };
  }
  async function pJoin(uid, d) {
    const ev = await needActive();
    if (ev.stage > 0 || ev.status === 'closed' || ev.status === 'finished') throw fail('failed-precondition', 'closed');
    const name = cleanName(d.name); if (name.length < 2) throw fail('invalid-argument', 'Nom manquant.');
    const phone = cleanPhone(d.phone);
    const pinDoc = await evRef(ev.id).collection('private').doc('pin').get();
    const pin = (pinDoc.exists && pinDoc.get('pin')) || '';
    if (pin && cleanPin(d.pin) !== pin) throw fail('permission-denied', 'pin');
    const pRef = evRef(ev.id).collection('participants').doc(uid), cRef = evRef(ev.id).collection('meta').doc('counter');
    const me = await db.runTransaction(async tx => {
      const [ps, cs] = await Promise.all([tx.get(pRef), tx.get(cRef)]);
      if (ps.exists) return ps.data();
      const num = ((cs.exists && cs.get('n')) || 0) + 1;
      const p = { uid, num, name, phone, joinedMs: Date.now(), joinedAt: ts() };
      tx.set(cRef, { n: num, updatedAt: ts() }, { merge: true }); tx.set(pRef, p);
      return p;
    });
    return { me, event: ev, now: Date.now() };
  }
  function checkPlayable(ev, uid, k) {
    if (ev.status === 'waiting') throw fail('failed-precondition', 'waiting');
    if (ev.status === 'blocked') throw fail('failed-precondition', 'blocked');
    if (ev.status !== 'open') throw fail('failed-precondition', 'closed');
    if (!isQualified(ev, uid, k)) throw fail('permission-denied', 'not-qualified');
  }
  async function pStart(uid) {
    const ev = await needActive(), k = ev.stage, t = Date.now();
    checkPlayable(ev, uid, k);
    if (t > ev.deadlineMs) throw fail('failed-precondition', 'expired');
    const st = stageOf(ev, k), key = keyOf(st.quiz), items = itemsOf(st.quiz);
    if (items.length !== key.length) throw fail('internal', 'Questions indisponibles côté serveur (relancer build/build_site.py et redéployer).');
    const pRef = evRef(ev.id).collection('participants').doc(uid), aRef = evRef(ev.id).collection('attempts').doc(attId(uid, k));
    const a = await db.runTransaction(async tx => {
      const [ps, as] = await Promise.all([tx.get(pRef), tx.get(aRef)]);
      if (!ps.exists) throw fail('failed-precondition', 'not-joined');
      if (as.exists) return as.data();
      const p = ps.data(), order = lib.shuffled(key.length), perm = flat(order.map(() => lib.shuffled(OPTS)));
      const na = { uid, num: p.num, name: p.name, stage: k, quiz: st.quiz, tot: key.length, order, perm, startedMs: t, startedAt: ts(), submitted: false };
      tx.set(aRef, na); return na;
    });
    if (a.submitted) throw fail('failed-precondition', 'done');
    const perm = permOf(a), questions = a.order.map((qi, i) => ({ q: items[qi].q, opts: perm[i].map(j => items[qi].opts[j]) }));
    return { questions, startedMs: a.startedMs, deadlineMs: ev.deadlineMs, tot: a.tot, stage: k, quiz: st.quiz, now: Date.now() };
  }
  async function pSubmit(uid, d) {
    const ev = await needActive(), k = ev.stage, t = Date.now();
    if (Number.isInteger(d.stage) && d.stage !== k) throw fail('failed-precondition', 'stage');
    checkPlayable(ev, uid, k);
    if (t > ev.deadlineMs + GRACE_MS) throw fail('failed-precondition', 'expired');
    const st = stageOf(ev, k), key = keyOf(st.quiz);
    const answers = Array.isArray(d.answers) ? d.answers.map(c => Number.isInteger(c) ? c : null) : null;
    if (!answers || answers.length !== key.length) throw fail('invalid-argument', 'Nombre de réponses incorrect.');
    const aRef = evRef(ev.id).collection('attempts').doc(attId(uid, k));
    const r = await db.runTransaction(async tx => {
      const as = await tx.get(aRef); if (!as.exists) throw fail('failed-precondition', 'not-started');
      const a = as.data(); if (a.submitted) return { already: true, a };
      const g = lib.gradeShuffled(key, a.order, permOf(a), answers);
      const upd = { submitted: true, submittedMs: t, submittedAt: ts(), ok: g.ok, ms: Math.max(0, t - a.startedMs), answers, answered: g.answered, auto: !!d.auto };
      tx.update(aRef, upd); return { a: Object.assign(a, upd) };
    });
    return { ok: r.a.ok, tot: r.a.tot, ms: r.a.ms, answered: r.a.answered, submittedMs: r.a.submittedMs, already: !!r.already, now: Date.now() };
  }

  /* ---------- administration ---------- */
  const stagesOf = d => { try { return lib.normStages(d.stages, QUIZ_IDS); } catch (e) { throw fail('invalid-argument', e.message); } };
  async function aList() {
    const s = await db.collection('events').orderBy('createdMs', 'desc').limit(50).get();
    return { events: s.docs.map(x => Object.assign({ id: x.id }, x.data())), quizzes: QUIZ_IDS.map(id => ({ id, title: BANK.quizzes[id].title })), now: Date.now() };
  }
  async function aCreate(auth, d) {
    const name = cleanName(d.name) || 'Concours', stages = stagesOf(d), pin = cleanPin(d.pin);
    let id = slug(name); if ((await evRef(id).get()).exists) id += '-' + Date.now().toString(36).slice(-4);
    const ev = { name, organizer: cleanName(d.organizer) || 'Secrétariat général du Gouvernement', stages, stage: 0, status: 'waiting', deadlineMs: null, openedMs: null, durationMin: null,
      qualified: {}, results: {}, winners: [], active: false, createdMs: Date.now(), createdAt: ts(), createdBy: auth.token.email || null, updatedAt: ts() };
    const b = db.batch(); b.set(evRef(id), ev); b.set(evRef(id).collection('private').doc('pin'), { pin }); b.set(evRef(id).collection('meta').doc('counter'), { n: 0, updatedAt: ts() }); await b.commit();
    return { id, now: Date.now() };
  }
  async function aUpdate(d) {
    const ev = await loadEvent(d.id), upd = { updatedAt: ts() };
    if (d.name !== undefined) upd.name = cleanName(d.name) || ev.name;
    if (d.organizer !== undefined) upd.organizer = cleanName(d.organizer) || ev.organizer;
    if (d.stages !== undefined) { // les étapes déjà jouées (ou en cours) sont conservées
      const ns = stagesOf(d), keep = ev.status === 'waiting' ? ev.stage : ev.stage + 1;
      if (ns.length < keep) throw fail('failed-precondition', 'Impossible de supprimer une étape déjà jouée.');
      for (let i = 0; i < keep; i++) ns[i] = ev.stages[i];
      upd.stages = ns;
    }
    const b = db.batch(); b.update(evRef(ev.id), upd);
    if (d.pin !== undefined) b.set(evRef(ev.id).collection('private').doc('pin'), { pin: cleanPin(d.pin) });
    await b.commit(); return { ok: true, now: Date.now() };
  }
  async function aActivate(d) {
    const ev = await loadEvent(d.id), s = await db.collection('events').where('active', '==', true).get(), b = db.batch();
    s.docs.forEach(x => { if (x.id !== ev.id) b.update(x.ref, { active: false, updatedAt: ts() }); });
    b.update(evRef(ev.id), { active: !!(d.on === undefined || d.on), updatedAt: ts() }); await b.commit(); return { ok: true, now: Date.now() };
  }
  async function aOpen(d) {
    const ev = await loadEvent(d.id); if (ev.status === 'finished') throw fail('failed-precondition', 'finished');
    const min = Number(d.minutes); if (!(min >= 0.5 && min <= lib.MINUTES_MAX)) throw fail('invalid-argument', 'Durée invalide.');
    const t = Date.now();
    await evRef(ev.id).update({ status: 'open', openedMs: t, deadlineMs: t + Math.round(min * 60000), durationMin: min, updatedAt: ts() });
    return { ok: true, deadlineMs: t + Math.round(min * 60000), now: t };
  }
  async function setStatus(d, from, to) {
    const ev = await loadEvent(d.id); if (from.indexOf(ev.status) < 0) throw fail('failed-precondition', ev.status);
    await evRef(ev.id).update({ status: to, updatedAt: ts() }); return { ok: true, now: Date.now() };
  }
  async function aClose(d) {
    const ev = await loadEvent(d.id), k = ev.stage, st = stageOf(ev, k);
    const snap = await evRef(ev.id).collection('attempts').where('stage', '==', k).get();
    const list = snap.docs.map(x => x.data()), ranked = lib.rankList(list);
    let b = db.batch(), n = 0; // rang écrit dans chaque tentative envoyée (lisible par le participant)
    for (const a of ranked) { b.update(evRef(ev.id).collection('attempts').doc(attId(a.uid, k)), { rank: a.rank }); if (++n % 400 === 0) { await b.commit(); b = db.batch(); } }
    if (n % 400) await b.commit();
    const top = ranked.slice(0, st.quota).map(a => ({ uid: a.uid, num: a.num, name: a.name, ok: a.ok, tot: a.tot, ms: a.ms, rank: a.rank, quiz: a.quiz }));
    const last = k >= ev.stages.length - 1, t = Date.now();
    const upd = { status: last ? 'finished' : 'closed', updatedAt: ts() };
    upd['results.' + k] = { n: ranked.length, started: list.length, joined: k === 0 ? await joinedCount(ev.id) : ((ev.qualified || {})[k] || []).length, closedMs: t, top: top.slice(0, 100) };
    if (last) { upd.winners = top; upd.finishedMs = t; } else upd['qualified.' + (k + 1)] = top.map(a => a.uid);
    await evRef(ev.id).update(upd);
    return { ok: true, ranked: ranked.length, qualified: top.length, finished: last, now: t };
  }
  async function joinedCount(id) { const c = await evRef(id).collection('meta').doc('counter').get(); return (c.exists && c.get('n')) || 0; }
  async function aNext(d) {
    const ev = await loadEvent(d.id); if (ev.status !== 'closed') throw fail('failed-precondition', ev.status);
    if (ev.stage + 1 >= ev.stages.length) throw fail('failed-precondition', 'last');
    await evRef(ev.id).update({ stage: ev.stage + 1, status: 'waiting', deadlineMs: null, openedMs: null, durationMin: null, updatedAt: ts() }); return { ok: true, now: Date.now() };
  }
  async function aBack(d) {
    const ev = await loadEvent(d.id); if (ev.stage === 0) throw fail('failed-precondition', 'first');
    await evRef(ev.id).update({ stage: ev.stage - 1, status: 'closed', deadlineMs: null, openedMs: null, durationMin: null, updatedAt: ts() }); return { ok: true, now: Date.now() };
  }
  async function aQualify(d) { // repêchage manuel d'un participant (par numéro) pour l'étape en cours
    const ev = await loadEvent(d.id), k = ev.stage; if (k === 0) throw fail('failed-precondition', 'first');
    const num = Number(d.num), s = await evRef(ev.id).collection('participants').where('num', '==', num).limit(1).get();
    if (s.empty) throw fail('not-found', 'Aucun participant n° ' + num + '.');
    const uid = s.docs[0].id, on = d.on === undefined || d.on;
    await evRef(ev.id).update({ ['qualified.' + k]: on ? FieldValue.arrayUnion(uid) : FieldValue.arrayRemove(uid), updatedAt: ts() });
    return { ok: true, name: s.docs[0].get('name'), now: Date.now() };
  }
  async function wipe(id) {
    for (const col of ['participants', 'attempts']) {
      for (;;) { const s = await evRef(id).collection(col).limit(400).get(); if (s.empty) break; const b = db.batch(); s.docs.forEach(x => b.delete(x.ref)); await b.commit(); }
    }
    await evRef(id).collection('meta').doc('counter').set({ n: 0, updatedAt: ts() });
  }
  async function aReset(d) {
    const ev = await loadEvent(d.id); await wipe(ev.id);
    await evRef(ev.id).update({ stage: 0, status: 'waiting', deadlineMs: null, openedMs: null, durationMin: null, qualified: {}, results: {}, winners: [], finishedMs: null, updatedAt: ts() });
    return { ok: true, now: Date.now() };
  }
  async function aDelete(d) {
    const ev = await loadEvent(d.id); if (ev.active) throw fail('failed-precondition', 'active');
    await wipe(ev.id); const b = db.batch(); b.delete(evRef(ev.id).collection('private').doc('pin')); b.delete(evRef(ev.id).collection('meta').doc('counter')); b.delete(evRef(ev.id)); await b.commit();
    return { ok: true, now: Date.now() };
  }

  return onCall(Object.assign({ timeoutSeconds: 60, memory: '512MiB' }, callOpts), async req => {
    const auth = requireAuth(req), d = req.data || {}, action = String(d.action || '');
    const P = { state: () => pState(auth.uid), join: () => pJoin(auth.uid, d), start: () => pStart(auth.uid), submit: () => pSubmit(auth.uid, d) };
    if (P[action]) return P[action]();
    const A = { list: () => aList(), create: () => aCreate(auth, d), update: () => aUpdate(d), activate: () => aActivate(d), open: () => aOpen(d),
      block: () => setStatus(d, ['open'], 'blocked'), unblock: () => setStatus(d, ['blocked'], 'open'), close: () => aClose(d), next: () => aNext(d), back: () => aBack(d),
      qualify: () => aQualify(d), reset: () => aReset(d), delete: () => aDelete(d) };
    if (!A[action]) throw fail('invalid-argument', 'Action inconnue.');
    if (!(await isAdmin(auth))) throw fail('permission-denied', 'Réservé aux administrateurs.');
    return A[action]();
  });
};
