# Ion Forge — Design Spec

Date: 2026-10-20
Status: Approved by Eduardo

## Goal

A polished, arcade-feel browser game that makes Eduardo memorize seven polyatomic
ions (name, formula, charge) without it feeling like studying. It must look and feel
like a shipped mobile game, run on phone and desktop, and need no build step or server.

## Content (fixed scope)

| Formula | Charge | Name |
|---------|--------|------|
| NH4 | 1+ | Ammonium |
| OH | 1− | Hydroxide |
| NO3 | 1− | Nitrate |
| HCO3 | 1− | Hydrogencarbonate |
| CO3 | 2− | Carbonate |
| SO4 | 2− | Sulfate |
| PO4 | 3− | Phosphate |

Atoms available in the reactor: N, H, O, C, S, P. Nothing else. No other ions.

## Core loop

The screen is a dark reactor. A glowing core sits in the center; atom orbs drift
around it. A target card at the top states the current round's prompt. A heat bar
drains continuously; each correct answer refills part of it. Heat reaching zero ends
the run and shows the score card.

### Round types (rotate; boss every 7th success)

1. **Build** (name → formula + charge). Prompt shows the ion name. Player taps atom
   orbs to pull them into the core; the core displays the formula assembled so far
   (e.g. "S O₄"). Tapping an atom in the core ejects it. Player presses Stabilize,
   then picks a charge from a radial picker with four options: 3−, 2−, 1−, 1+.
   Correct = formula multiset matches AND charge matches.
2. **Identify** (formula → name). Prompt shows the formula with charge. Four name
   buttons; one correct, three distractors drawn from the other six ions.
3. **Charge Snap** (name + formula → charge). Prompt shows both; player picks only the
   charge from the radial picker. Heat drains 1.5× faster during this round.
4. **Boss** (every 7th success). Three Build rounds back to back, heat drains 1.5×,
   points doubled, distinct visual treatment (red core, warning pulse).

Round type for a normal round: cycle Build, Identify, Charge Snap, Build, Identify…
with Build appearing twice per cycle because it is the richest retrieval.

### Feedback

- Correct: ion "crystallizes" (burst of particles in the ion's color), combo +1, heat
  +25% (capped), score += base × combo multiplier, short rising chime, light haptic.
- Wrong: reactor flickers red, screen shakes, combo resets to 0, the correct formula
  with charge and name is shown for 2 seconds in the core before the next round,
  low buzz, heavy haptic. Heat is not refilled.
- Score: Build 100, Identify 60, Charge Snap 40. Combo multiplier = 1 + 0.25 × combo,
  capped at 3×. Boss rounds ×2.

### Difficulty ramp (by successes in the current run)

- 0–6: 8 atom orbs on screen, enough of each needed atom plus 2 distractors; heat
  drains over 14 s.
- 7–20: 10 orbs, 4 distractors, 11 s drain.
- 21+: 12 orbs, 6 distractors, orbs drift faster, 9 s drain.

"Drain" = seconds for a full bar to empty.

## Hidden spaced repetition

Each ion has a weight, initial 1.0, stored in localStorage.

- Miss: weight = weight × 3, capped at 27.
- Hit: weight = max(1, weight × 0.6).
- Next ion = weighted random over all ions except the immediately previous one.

The game never surfaces this. The collection shelf (below) reflects mastery
indirectly.

## Progression and persistence (localStorage key `ionforge.v1`)

- `weights` per ion, `hits`/`misses` per ion.
- `bestScore`, `xp`, `runs`.
- XP = score / 10 per run. Levels at 0, 200, 600, 1500, 3500, 7000 XP with titles:
  Lab Rat, Bench Tech, Chemist, Alchemist, Reactor Lead, Ion Forger.
- Collection shelf screen: each ion shown as a crystal. Crystal size/brightness tier
  from accuracy and hit count: dull (<5 hits), clear (≥5 hits, ≥70% accuracy),
  radiant (≥12 hits, ≥90% accuracy).

All localStorage reads/writes wrapped in try/catch; game runs fully without storage.

## Screens

1. **Title**: logo, Play, Collection, best score, level title. Subtle animated
   reactor in background.
2. **Game**: HUD (score, combo, heat bar, level), target card, reactor canvas, action
   area (Stabilize button / name buttons / charge picker depending on round).
3. **Score card**: score, best, combo max, accuracy this run, XP gained, level-up
   banner if any, Play Again, Collection.
4. **Collection**: 7 crystals with names and formulas, tier visual.

## Visual and audio

- Canvas 2D for reactor, orbs, particles, glow; DOM for HUD and buttons.
- Palette: near-black background, cyan core, per-ion accent colors (ammonium violet,
  hydroxide teal, nitrate amber, hydrogencarbonate lime, carbonate green, sulfate
  gold, phosphate magenta).
- Juice: screen shake on wrong, particle burst on right, orb trails, combo flash,
  heat bar pulses when below 30%.
- Audio: Web Audio API synthesized tones only (no files). Mute toggle persisted.
- Haptics via `navigator.vibrate` when available.
- `prefers-reduced-motion`: disable shake and reduce particle count.
- Layout works from 360 px wide to desktop; touch and mouse both supported.

## Architecture

Two files, no build:

- `game-logic.js` — pure, dependency-free ES module exporting: `IONS`, `ATOMS`,
  `formulaMatches(built, ion)`, `scoreFor(roundType, combo, isBoss)`,
  `comboMultiplier(combo)`, `Scheduler` (weights, `record(ion, hit)`,
  `next(prevId, rng)`), `distractorNames(ionId, rng)`, `roundTypeFor(successes)`,
  `difficultyFor(successes)`, `levelFor(xp)`, `crystalTier(hits, misses)`,
  `spawnPlan(ion, difficulty, rng)` (which orbs to show).
- `index.html` — CSS, screens, renderer, audio, input, state machine; imports
  `game-logic.js` as a module.
- `tests/game-logic.test.js` — `node --test` coverage for every exported function.

Serving note: ES module import needs http, not file://. README documents
`python3 -m http.server` and GitHub Pages.

## Error handling

- Storage unavailable → in-memory state, no crash.
- Web Audio blocked until first gesture → create context lazily on first tap.
- Canvas resize on orientation change → recompute layout, orbs re-clamped.

## Testing

- Unit: scheduler weighting (miss raises, hit decays, no immediate repeat), formula
  matching (order-insensitive, counts exact, charge exact), scoring/multiplier caps,
  difficulty and round-type tables, level thresholds, crystal tiers, spawn plan always
  includes required atoms.
- Manual: play through in the built-in browser at phone and desktop widths; verify
  wrong-answer teaching flash, boss round, score card, persistence across reload.

## Out of scope

Accounts, server, leaderboards beyond local best, more ions, i18n.
