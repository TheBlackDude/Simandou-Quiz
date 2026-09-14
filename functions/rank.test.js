'use strict';
const test = require('node:test'), assert = require('node:assert');
const rank = require('./rank');
const e = (name, ok, date, tot = 40) => ({ name, ok, tot, mode: 'Quiz complet', date });
test('meilleur résultat par nom, insensible à la casse et aux accents', () => {
  const top = rank.build([e('Mariama Camara', 30, '2026-09-10T10:00:00Z'), e('mariama  camara', 35, '2026-09-11T10:00:00Z'), e('Sékou Touré', 35, '2026-09-09T10:00:00Z'), e('sekou toure', 20, '2026-09-12T10:00:00Z')]);
  assert.deepStrictEqual(top.map(x => [x.name, x.ok]), [['Sékou Touré', 35], ['mariama  camara', 35]]);
});
test('insert : égalité de score → le plus ancien reste devant, ligne inchangée → null', () => {
  let top = rank.build([e('A', 40, '2026-09-10T10:00:00Z')]);
  top = rank.insert(top, e('B', 40, '2026-09-11T10:00:00Z')); assert.deepStrictEqual(top.map(x => x.name), ['A', 'B']);
  assert.strictEqual(rank.insert(top, e('A', 39, '2026-09-12T10:00:00Z')), null);
  top = rank.insert(top, e('B', 40, '2026-09-09T10:00:00Z')); assert.deepStrictEqual(top.map(x => x.name), ['B', 'A']);
});
test('top limité à 100 : un score trop faible ne modifie rien', () => {
  const list = []; for (let i = 0; i < 100; i++) list.push(e('P' + i, 30 + (i % 10), '2026-09-01T00:00:0' + (i % 10) + 'Z'));
  const top = rank.build(list); assert.strictEqual(top.length, 100);
  assert.strictEqual(rank.insert(top, e('Nouveau', 29, '2026-09-13T00:00:00Z')), null);
  const t2 = rank.insert(top, e('Nouveau', 40, '2026-09-13T00:00:00Z')); assert.strictEqual(t2.length, 100); assert.strictEqual(t2[0].name, 'Nouveau');
});
test('entrées invalides ignorées', () => { assert.strictEqual(rank.insert([], { name: '', ok: 1, tot: 40 }), null); assert.deepStrictEqual(rank.build([{ name: 'X', ok: 5, tot: 0 }]), []); });
