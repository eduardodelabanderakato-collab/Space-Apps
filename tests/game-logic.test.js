import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  IONS, ATOMS, ionById, formulaMatches, formulaText, chargeLabel, scoreFor, comboMultiplier,
  roundTypeFor, isBossRound, difficultyFor, levelFor, crystalTier, Scheduler,
  distractorNames, nameOptions, spawnPlan,
} from '../game-logic.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('seven ions from the slide', () => {
  assert.equal(IONS.length, 7);
  assert.deepEqual(IONS.map((i) => i.name), [
    'Ammonium', 'Hydroxide', 'Nitrate', 'Hydrogencarbonate', 'Carbonate', 'Sulfate', 'Phosphate',
  ]);
});

test('formula text matches slide conventions', () => {
  assert.equal(formulaText(ionById('ammonium').atoms, 1), 'NH₄ +');
  assert.equal(formulaText(ionById('hydroxide').atoms, -1), 'OH −');
  assert.equal(formulaText(ionById('nitrate').atoms), 'NO₃');
  assert.equal(formulaText(ionById('hydrogencarbonate').atoms, -1), 'HCO₃ −');
  assert.equal(formulaText(ionById('carbonate').atoms, -2), 'CO₃ 2−');
  assert.equal(formulaText(ionById('sulfate').atoms, -2), 'SO₄ 2−');
  assert.equal(formulaText(ionById('phosphate').atoms, -3), 'PO₄ 3−');
  assert.equal(chargeLabel(1), '+');
  assert.equal(chargeLabel(-3), '3−');
});

test('formulaMatches is exact on counts and ignores order', () => {
  const sulfate = ionById('sulfate');
  assert.ok(formulaMatches({ O: 4, S: 1 }, sulfate));
  assert.ok(!formulaMatches({ S: 1, O: 3 }, sulfate));
  assert.ok(!formulaMatches({ S: 1, O: 4, H: 1 }, sulfate));
  assert.ok(!formulaMatches({}, sulfate));
  assert.ok(formulaMatches({ S: 1, O: 4, N: 0 }, sulfate));
});

test('scoring and combo cap', () => {
  assert.equal(comboMultiplier(0), 1);
  assert.equal(comboMultiplier(4), 2);
  assert.equal(comboMultiplier(50), 3);
  assert.equal(scoreFor('build', 0), 100);
  assert.equal(scoreFor('identify', 2), 90);
  assert.equal(scoreFor('charge', 0, true), 80);
  assert.throws(() => scoreFor('nope', 0));
});

test('round cycle and boss cadence', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(roundTypeFor), ['build', 'identify', 'charge', 'build', 'identify', 'build']);
  assert.ok(!isBossRound(0));
  assert.ok(isBossRound(7));
  assert.ok(isBossRound(14));
  assert.ok(!isBossRound(8));
});

test('difficulty ramps', () => {
  assert.equal(difficultyFor(0).orbs, 8);
  assert.equal(difficultyFor(7).distractors, 4);
  assert.equal(difficultyFor(21).drainSeconds, 9);
});

test('levels and crystal tiers', () => {
  assert.deepEqual(levelFor(0), { level: 1, title: 'Lab Rat', nextXp: 200 });
  assert.equal(levelFor(650).title, 'Chemist');
  assert.equal(levelFor(9000).nextXp, null);
  assert.equal(crystalTier(0, 0), 'dull');
  assert.equal(crystalTier(5, 2), 'clear');
  assert.equal(crystalTier(12, 1), 'radiant');
  assert.equal(crystalTier(12, 5), 'clear');
});

test('scheduler: misses raise weight, hits decay, no immediate repeat', () => {
  const s = new Scheduler();
  assert.equal(s.record('nitrate', false), 3);
  assert.equal(s.record('nitrate', false), 9);
  assert.equal(s.record('nitrate', false), 27);
  assert.equal(s.record('nitrate', false), 27);
  assert.ok(s.record('nitrate', true) < 27);
  const fresh = new Scheduler();
  fresh.record('sulfate', true);
  assert.equal(fresh.weights.sulfate, 1);
  // Heavily weighted ion gets picked most of the time.
  const w = new Scheduler();
  for (let i = 0; i < 3; i++) w.record('phosphate', false);
  let picks = 0;
  for (let i = 0; i < 300; i++) if (w.next('ammonium').id === 'phosphate') picks++;
  assert.ok(picks > 150, 'phosphate picked ' + picks);
  for (let i = 0; i < 200; i++) assert.notEqual(w.next('phosphate').id, 'phosphate');
  // Persisted weights round-trip.
  const restored = new Scheduler(w.weights);
  assert.equal(restored.weights.phosphate, 27);
});

test('name options contain the answer and three distinct distractors', () => {
  const ion = ionById('carbonate');
  const d = distractorNames('carbonate', seq([0.1, 0.5, 0.9]));
  assert.equal(d.length, 3);
  assert.ok(!d.includes('Carbonate'));
  assert.equal(new Set(d).size, 3);
  const opts = nameOptions(ion, Math.random);
  assert.equal(opts.length, 4);
  assert.ok(opts.includes('Carbonate'));
});

test('spawn plan always includes every required atom', () => {
  for (const ion of IONS) {
    for (const succ of [0, 7, 21]) {
      const plan = spawnPlan(ion, difficultyFor(succ), Math.random);
      const counts = {};
      for (const a of plan) counts[a] = (counts[a] || 0) + 1;
      for (const [sym, n] of Object.entries(ion.atoms)) assert.ok(counts[sym] >= n, `${ion.id} missing ${sym}`);
      for (const a of plan) assert.ok(ATOMS.includes(a));
      const required = Object.values(ion.atoms).reduce((a, b) => a + b, 0);
      assert.equal(plan.length, required + difficultyFor(succ).distractors);
    }
  }
});
