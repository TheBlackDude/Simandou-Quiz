'use strict';
const test = require('node:test'), assert = require('node:assert');
const lib = require('./concours_lib');
const a = (num, ok, ms, submittedMs = 0, submitted = true) => ({ num, ok, ms, submittedMs, submitted });

test('classement : score puis temps puis ancienneté d\'envoi', () => {
  const r = lib.rankList([a(1, 30, 5000), a(2, 35, 9000), a(3, 35, 4000), a(4, 35, 4000, 10), a(5, 35, 4000, 5), a(6, 40, 99999, 0, false)]);
  assert.deepStrictEqual(r.map(x => [x.num, x.rank]), [[3, 1], [5, 2], [4, 3], [2, 4], [1, 5]]);
});
test('permutation : chaque indice une fois', () => {
  for (let n = 1; n < 6; n++) { const p = lib.shuffled(n); assert.deepStrictEqual(p.slice().sort((x, y) => x - y), Array.from({ length: n }, (_, i) => i)); }
});
test('correction avec ordre des questions et des options mélangés', () => {
  const key = [1, 2, 0];                       // bonnes réponses d'origine
  const order = [2, 0, 1];                     // question affichée 0 = question 2, etc.
  const perm = [[3, 0, 1, 2], [1, 0, 2, 3], [0, 1, 2, 3]];
  // question affichée 0 (origine 2, bonne = 0) : option affichée 1 → origine 0 : juste
  // question affichée 1 (origine 0, bonne = 1) : option affichée 0 → origine 1 : juste
  // question affichée 2 (origine 1, bonne = 2) : option affichée 1 → origine 1 : faux ; null → faux
  assert.deepStrictEqual(lib.gradeShuffled(key, order, perm, [1, 0, 1]), { results: [true, true, false], ok: 2, tot: 3, answered: 3 });
  assert.strictEqual(lib.gradeShuffled(key, order, perm, [1, null, 7]).ok, 1);
});
test('étapes : validation', () => {
  assert.deepStrictEqual(lib.normStages([{ quiz: 'histoire', quota: '100' }, { quiz: 'cnrd', quota: 20 }], ['histoire', 'cnrd']), [{ quiz: 'histoire', quota: 100 }, { quiz: 'cnrd', quota: 20 }]);
  assert.throws(() => lib.normStages([{ quiz: 'x', quota: 1 }], ['histoire']));
  assert.throws(() => lib.normStages([{ quiz: 'histoire', quota: 0 }], ['histoire']));
  assert.throws(() => lib.normStages([], ['histoire']));
});
