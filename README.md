# Learning is Fun / לומדים בכיף

Four short games that teach Hebrew and English letters, sounds, numbers and words to young children.
No login, no tracking, nothing saved except the chosen language.

## Run
```
npm install
npm run dev          # local dev server
npm run build        # type-check + one self-contained dist/index.html
npm run check        # type-check, lint, tests
npm run recording-lists   # regenerate docs/recording-list.<lang>.md
```

## Structure
```
src/
  content/   language packs (he.ts, en.ts), shared types, recording-id helpers
  core/      language, router, speech + recorded audio, sound effects, loop, DOM helpers
  games/     numbers, letters, words, sky/ (config, boxes, controls, render, hud, overlays, state flow)
  ui/        home screen, about page
public/      manifest, service worker, icons, audio/<lang>/ (recordings go here)
docs/        generated recording lists
```

## Adding a language
Create `src/content/<code>.ts` that satisfies `LanguagePack` (the compiler lists everything missing),
register it in `src/content/index.ts`, and run `npm run check`. Tests verify every pack has one word
per letter, working counting, and unique audio ids.

## Recorded audio
Put `<clip id>.mp3` files in `public/audio/<lang>/` and list their ids in that folder's `manifest.json`.
Any clip that is missing falls back to the device voice, so recordings can be added gradually.
Clip ids and wording are in `docs/recording-list.<lang>.md`.

## Code conventions
- Early returns (guard clauses) instead of nested ifs.
- Names say what things do (`speakInterrupting`, `findPunchTarget`, `advanceBoxes`).
- All tunable numbers live in `games/sky/config.ts`.
- The sky game uses an explicit `phase` (playing, breaking, letterPause, wordPause, counting, finished);
  async steps check a `runId` so abandoned games stop cleanly.
- Text is inserted with `textContent`, never HTML strings.
- Pure logic (box picking, hit testing, counting phrases) is unit-tested.

## Store path (later)
The build is a self-contained web app, so it can be wrapped with Capacitor for iOS and Android:
`npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`, `npx cap init`, `npx cap add ios|android`,
then `npm run build && npx cap sync`. Before submitting:
- Use a current Capacitor version and the current Xcode / Android target API required by the stores.
- Kids Category: no links out of the app or purchases unless behind a parental gate; no third-party ads or analytics.
- Add a privacy policy (the app collects nothing).
- Record real audio first: device voices inside native web views are less reliable for letter sounds.
- Lock the sky game to landscape and add proper app icons and splash screens.

## Tests

Unit tests live next to the code (`*.test.ts`) and run with vitest in a fake browser (happy-dom).

```bash
npm test          # run the unit tests once
npm run check     # types + lint + tests + build — run this after every change
```

What is covered: content/data integrity (every number, colour and game has text, recording ids are unique),
the speech layer (playback cancelling, recorded clip vs. device voice, order of spoken parts), the router,
language switching, safe storage, the sky-game box logic and HUD, and the colours game.
When you change logic, add or update a test next to it.

## Adding a game to the home road

1. Add the game screen and its `GameId` (see `src/content/types.ts`) plus its name in each language pack.
2. Add one line to `STOPS` in `src/journey/stops.ts`. The road, layout and stop button are built from that list.

To make games open one by one later, pass `sequentialPolicy(completedGames)` instead of `openPolicy` in `src/ui/home.ts`.
