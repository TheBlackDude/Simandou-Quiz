/* Concours en direct — fonctions pures partagées par la Cloud Function, les outils et les tests.
   Classement d'une étape : score décroissant, puis temps de réponse croissant, puis envoi le plus ancien, puis numéro. */
'use strict';
const STAGE_MAX = 6, QUOTA_MAX = 1000, MINUTES_MAX = 180;

/** Permutation aléatoire de 0..n-1 (ordre des questions et des options propre à chaque participant). */
function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

function cmp(a, b) { return (b.ok - a.ok) || (a.ms - b.ms) || (a.submittedMs - b.submittedMs) || ((a.num || 0) - (b.num || 0)); }

/** Ne garde que les tentatives envoyées, triées ; ajoute rank (1..n). */
function rankList(list) {
  return (list || []).filter(a => a && a.submitted).slice().sort(cmp).map((a, i) => Object.assign({}, a, { rank: i + 1 }));
}

/** Valide la configuration des étapes : [{quiz, quota}] ; le quota de la dernière étape est le nombre de lauréats. */
function normStages(stages, quizIds) {
  if (!Array.isArray(stages) || !stages.length || stages.length > STAGE_MAX) throw new Error('Il faut entre 1 et ' + STAGE_MAX + ' étapes.');
  return stages.map((s, i) => {
    const quiz = String((s && s.quiz) || ''), quota = Number(s && s.quota);
    if (quizIds.indexOf(quiz) < 0) throw new Error('Étape ' + (i + 1) + ' : quiz inconnu.');
    if (!Number.isInteger(quota) || quota < 1 || quota > QUOTA_MAX) throw new Error('Étape ' + (i + 1) + ' : nombre de qualifiés invalide (1 à ' + QUOTA_MAX + ').');
    return { quiz, quota };
  });
}

/** Correction : question affichée i = question d'origine order[i] ; option affichée c = option d'origine perm[i][c]. */
function gradeShuffled(key, order, perm, answers) {
  const results = order.map((qi, i) => { const c = answers[i]; return Number.isInteger(c) && c >= 0 && c < perm[i].length && perm[i][c] === key[qi]; });
  return { results, ok: results.filter(Boolean).length, tot: key.length, answered: answers.filter(c => Number.isInteger(c)).length };
}

module.exports = { STAGE_MAX, QUOTA_MAX, MINUTES_MAX, shuffled, rankList, normStages, gradeShuffled, cmp };
