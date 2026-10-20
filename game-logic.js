// Ion Forge — pure game logic. No DOM, no side effects.

export const IONS = [
  { id: 'ammonium', name: 'Ammonium', atoms: { N: 1, H: 4 }, charge: 1, color: '#a78bfa' },
  { id: 'hydroxide', name: 'Hydroxide', atoms: { O: 1, H: 1 }, charge: -1, color: '#2dd4bf' },
  { id: 'nitrate', name: 'Nitrate', atoms: { N: 1, O: 3 }, charge: -1, color: '#fbbf24' },
  { id: 'hydrogencarbonate', name: 'Hydrogencarbonate', atoms: { H: 1, C: 1, O: 3 }, charge: -1, color: '#a3e635' },
  { id: 'carbonate', name: 'Carbonate', atoms: { C: 1, O: 3 }, charge: -2, color: '#4ade80' },
  { id: 'sulfate', name: 'Sulfate', atoms: { S: 1, O: 4 }, charge: -2, color: '#f59e0b' },
  { id: 'phosphate', name: 'Phosphate', atoms: { P: 1, O: 4 }, charge: -3, color: '#f472b6' },
];

export const ATOMS = ['N', 'H', 'O', 'C', 'S', 'P'];
export const CHARGES = [-3, -2, -1, 1];

const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const ORDER = ['N', 'H', 'C', 'S', 'P', 'O'];

export function ionById(id) {
  return IONS.find((i) => i.id === id);
}

export function chargeLabel(charge) {
  if (charge === 0) return '';
  const mag = Math.abs(charge);
  return (mag === 1 ? '' : String(mag)) + (charge > 0 ? '+' : '−');
}

// Formula display: ordered as on the slide (N, H, C, S, P then O) with subscripts.
export function formulaText(atoms, withCharge = null) {
  // Hydrogencarbonate is conventionally written HCO3; ammonium NH4; hydroxide OH.
  const keys = Object.keys(atoms).filter((k) => atoms[k] > 0);
  let ordered;
  if (keys.includes('H') && keys.includes('C')) ordered = ['H', 'C', 'O'];
  else if (keys.includes('O') && keys.includes('H') && keys.length === 2) ordered = ['O', 'H'];
  else ordered = ORDER.filter((k) => keys.includes(k));
  const extra = keys.filter((k) => !ordered.includes(k));
  const s = [...ordered, ...extra]
    .map((k) => k + (atoms[k] > 1 ? String(atoms[k]).replace(/\d/g, (d) => SUB[d]) : ''))
    .join('');
  return withCharge == null ? s : s + (withCharge === 0 ? '' : ' ' + chargeLabel(withCharge));
}

export function formulaMatches(built, ion) {
  const keys = new Set([...Object.keys(built), ...Object.keys(ion.atoms)]);
  for (const k of keys) {
    if ((built[k] || 0) !== (ion.atoms[k] || 0)) return false;
  }
  return true;
}

export const ROUND_BASE = { build: 100, identify: 60, charge: 40 };

export function comboMultiplier(combo) {
  return Math.min(3, 1 + 0.25 * Math.max(0, combo));
}

export function scoreFor(roundType, combo, isBoss = false) {
  const base = ROUND_BASE[roundType];
  if (base == null) throw new Error('unknown round type ' + roundType);
  return Math.round(base * comboMultiplier(combo) * (isBoss ? 2 : 1));
}

const CYCLE = ['build', 'identify', 'charge', 'build', 'identify'];

export function roundTypeFor(successes) {
  return CYCLE[successes % CYCLE.length];
}

export function isBossRound(successes) {
  return successes > 0 && successes % 7 === 0;
}

export function difficultyFor(successes) {
  if (successes >= 21) return { orbs: 12, distractors: 6, drainSeconds: 9, speed: 1.6 };
  if (successes >= 7) return { orbs: 10, distractors: 4, drainSeconds: 11, speed: 1.25 };
  return { orbs: 8, distractors: 2, drainSeconds: 14, speed: 1 };
}

export const LEVELS = [
  { xp: 0, title: 'Lab Rat' },
  { xp: 200, title: 'Bench Tech' },
  { xp: 600, title: 'Chemist' },
  { xp: 1500, title: 'Alchemist' },
  { xp: 3500, title: 'Reactor Lead' },
  { xp: 7000, title: 'Ion Forger' },
];

export function levelFor(xp) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) idx = i;
  const next = LEVELS[idx + 1] || null;
  return { level: idx + 1, title: LEVELS[idx].title, nextXp: next ? next.xp : null };
}

export function crystalTier(hits, misses) {
  const total = hits + misses;
  const acc = total === 0 ? 0 : hits / total;
  if (hits >= 12 && acc >= 0.9) return 'radiant';
  if (hits >= 5 && acc >= 0.7) return 'clear';
  return 'dull';
}

export class Scheduler {
  constructor(weights = null) {
    this.weights = {};
    for (const ion of IONS) this.weights[ion.id] = weights && weights[ion.id] > 0 ? weights[ion.id] : 1;
  }
  record(ionId, hit) {
    const w = this.weights[ionId] ?? 1;
    this.weights[ionId] = hit ? Math.max(1, w * 0.6) : Math.min(27, w * 3);
    return this.weights[ionId];
  }
  next(prevId = null, rng = Math.random) {
    const pool = IONS.filter((i) => i.id !== prevId);
    const total = pool.reduce((s, i) => s + this.weights[i.id], 0);
    let r = rng() * total;
    for (const ion of pool) {
      r -= this.weights[ion.id];
      if (r <= 0) return ion;
    }
    return pool[pool.length - 1];
  }
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function distractorNames(ionId, rng = Math.random, count = 3) {
  const others = IONS.filter((i) => i.id !== ionId).map((i) => i.name);
  return shuffle(others, rng).slice(0, count);
}

export function nameOptions(ion, rng = Math.random) {
  return shuffle([ion.name, ...distractorNames(ion.id, rng)], rng);
}

// Which atom orbs to spawn: every required atom (with multiplicity) plus distractors.
export function spawnPlan(ion, difficulty, rng = Math.random) {
  const required = [];
  for (const [sym, n] of Object.entries(ion.atoms)) for (let i = 0; i < n; i++) required.push(sym);
  const extras = [];
  const pool = ATOMS.slice();
  while (extras.length < difficulty.distractors) {
    extras.push(pool[Math.floor(rng() * pool.length)]);
  }
  return shuffle([...required, ...extras], rng);
}
