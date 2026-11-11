# Working rules for this repo

My First Step / הַצַּעַד הָרִאשׁוֹן שֶׁלִּי: a kids learning game in Hebrew and English (TypeScript + Vite, no framework).

## How to work
- **Plan first.** Read the relevant code, send a short plan, and wait for an OK before changing anything.
- Work in small steps, one change at a time.
- **Tests after every change.** Unit tests live next to the code (`*.test.ts`). Run `npm run check`
  (types, lint, tests) after every change, and keep it green.
- **Never push without the owner's OK.** Commit only when asked. Push only after the owner says "push".
  Commit messages: short and clear.

## Code style
- Early returns (guard clauses) instead of nested ifs.
- Names that say what things do.
- Insert text with `textContent`, never HTML strings.
- Keep dependencies to a minimum.

## Text on screen
- All visible Hebrew text has niqqud (נִקּוּד).
- Numbers are always shown left to right (also inside right-to-left Hebrew text).

## Useful commands
- `npm run dev`: run the game locally
- `npm run check`: types + lint + tests
- `npm run admin`: local audio admin page (http://localhost:5180), see README
