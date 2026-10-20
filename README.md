# Ion Forge

An arcade reactor game that drills the seven polyatomic ions from class
(ammonium, hydroxide, nitrate, hydrogencarbonate, carbonate, sulfate, phosphate)
without feeling like studying. Hidden spaced repetition brings back the ones you miss.

## Play

Open the GitHub Pages link for this repo, or run locally:

```bash
python3 -m http.server 8765
```

then visit http://localhost:8765.

## Test

```bash
node --test tests/game-logic.test.js
```

Two source files: `index.html` (rendering, audio, input) and `game-logic.js` (pure logic, unit tested).
