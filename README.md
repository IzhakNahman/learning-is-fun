# My First Step / הַצַּעַד הָרִאשׁוֹן שֶׁלִּי

Six short games that teach Hebrew and English letters, sounds, numbers and words to young children.
No login, no tracking, nothing saved except the chosen language.

## Run
```
npm install
npm run dev          # local dev server
npm run build        # type-check + one self-contained dist/index.html
npm run check        # type-check, lint, tests
npm run recording-lists   # regenerate docs/recording-list.<lang>.md
npm run admin        # local page for recording and replacing audio clips
```

## Structure
```
src/
  content/   language packs (he.ts, en.ts), shared types, recording-id helpers
  core/      language, router, speech + recorded audio, sound effects, loop, DOM helpers
  games/     numbers, letters, words, trace/ (write the letters), sky/ (config, boxes, controls, render, hud, overlays, state flow)
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

## Audio admin (`npm run admin`)
A local page at http://localhost:5180 for recording and replacing clips. It needs ffmpeg
(`brew install ffmpeg`; install Homebrew from brew.sh first if `brew` is missing).

- Every clip for Hebrew and English, grouped like the game, comes from the same language packs the game uses.
  Each row has: play my recording, hear the device voice, record, delete, undo. You can also show missing clips only, search, and see progress.
- **Record**: the browser asks for the microphone once. Keys in the recorder: Space = record / stop
  (or retry after a take), Enter = keep, arrows = previous / next, Esc = close.
  **Next missing clip** goes through the missing clips one after another.
  Recording starts 1 second after you press Space or click ● Record, and the last 0.3 seconds
  are cut off, so the key or mouse click is not in the clip.
- **Upload**: drag an m4a, wav or mp3 file onto a row.
- Every clip is converted to mono mp3: silence trimmed at both ends, volume evened out.
- **✨ Clean voice** (on by default) also cuts low rumble, removes steady background noise (fan, hum)
  and softens sharp "s/sh" sounds. **✨ Play cleaned** lets you hear a take exactly as it will be saved.
- Replaced and deleted clips are copied to `.audio-backup/<lang>/` (ignored by git). **Undo** swaps the last backup back.
- `public/audio/<lang>/manifest.json` is rewritten from the files that exist after every change.
- **Publish** shows the changes, and after you confirm runs `git add`, `git commit` and `git push` for `public/audio` only.
  A push to `main` updates the live game.
- Safety: the server listens on 127.0.0.1 only, accepts only clip ids from the language packs, writes only in
  `public/audio/<lang>/`, and refuses requests that don't come from its own page (host, origin and a per-run token).

Code: `scripts/admin/` (server, tests next to each file) and `scripts/admin/page/` (the page).

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
