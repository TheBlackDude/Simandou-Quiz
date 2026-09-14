/* Outils d'administration (import de l'ancien classement, reconstruction du top) — SDK Admin.
   Authentification : `gcloud auth application-default login` (ADC) ou GOOGLE_APPLICATION_CREDENTIALS. */
'use strict';
const path = require('path');
const NM = path.join(__dirname, '..', 'functions', 'node_modules');
const { initializeApp, getApps } = require(path.join(NM, 'firebase-admin', 'lib', 'app'));
const { getFirestore, FieldValue, Timestamp } = require(path.join(NM, 'firebase-admin', 'lib', 'firestore'));
const rank = require(path.join(__dirname, '..', 'functions', 'rank.js'));
const PROJECT = process.env.FIREBASE_PROJECT || 'gouvernement-qcm';
if (!getApps().length) initializeApp({ projectId: PROJECT });
const db = getFirestore();
const QUIZ_IDS = Object.keys(require(path.join(__dirname, '..', 'functions', 'questions.json')).quizzes);

/** Reconstruit leaderboard/{quiz} pour chaque quiz à partir de toutes les tentatives non administrateur. */
async function rebuildLeaderboards() {
  for (const quiz of QUIZ_IDS) {
    const snap = await db.collection('attempts').where('quiz', '==', quiz).get();
    const list = snap.docs.map(d => d.data()).filter(e => !e.admin).map(e => ({ name: e.name, ok: e.ok, tot: e.tot, mode: e.mode, date: e.date }));
    const top = rank.build(list);
    await db.doc('leaderboard/' + quiz).set({ top, count: list.length, updatedAt: FieldValue.serverTimestamp() });
    console.log(quiz + ' : ' + list.length + ' résultats, top de ' + top.length + ' lignes');
  }
}
module.exports = { db, rank, FieldValue, Timestamp, QUIZ_IDS, rebuildLeaderboards };
