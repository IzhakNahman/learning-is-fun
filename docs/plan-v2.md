# My First Step: plan v2 (stars, trophies and new games)

Status: **phases A and B built** (2026-11-14), not committed yet. Phases C–D not started.

Backup made on 2026-11-14 before any change:
- git tag `backup-before-v2-2026-11-14` (local; to go back: `git checkout backup-before-v2-2026-11-14`)
- zip `../LearningGame-backup-2026-11-14.zip` (476 files, without `node_modules` and `dist`)

---

## 1. The requests, in English

1. **New, very first game:** 10 balls. The child taps each ball, and a voice counts as they tap (1, 2, 3 ...). When all balls are tapped, the game is finished.
2. **No green ✓ on a game until it is finished.** ("Finished" is defined in section 3.)
3. **Meet the Numbers:**
   a. Split into two games: 1–10 and 11–20.
   b. Counting does not start automatically when a number is tapped. A **Play** button starts it.
   Every number the child taps gets a small star (done).
4. **Meet the Colours:** every colour tapped gets a small star. When all are starred, the game is finished.
5. **Star system:** every item finished in every game gets a star, so trophies can be given later. For now, it shows when a game is finished.
6. **The owl** moves on to the next game only when the current game is finished.
7. **Two new shape games after Meet the Shapes:**
   a. **Trace the shape:** like Write the Letters, drag a dot to complete the shape, so the child learns how to draw it.
   b. **Draw from a shape:** a shape is shown and the child gets simple paint tools to turn it into a drawing. A **Save** button at the end.
8. **Find the Shape:** some objects do not match their shape (for example, the Belgian waffle looks round but must be matched to the square). Check all of them and fix.
9. **Meet the Letters:** the same stars for every letter learned, plus a **Next letter** button.
10. **Mix the Colours:**
    - Say "with" (עִם) instead of "plus" (וְעוֹד).
    - The two colour circles overlap. The overlap shows a "?", and the child drags the right colour onto it.
11. **Word Treasure:** a star for every word learned.
12. **New game based on Word Treasure:** a word with a speaker button. The child taps it, hears the word, and drags or picks the matching picture (like the other games).
13. **Add It Up:** show it as a **balance scale** with a simple animation and "=" in the middle. The child drags the missing amount to balance the scale.
14. **Write the Letters:**
    - In the basic shape that looks like ר, the vertical line must be as long as the horizontal one. Fix the letters' proportions to match.
    - In group 2, the top horizontal line should be a little shorter.
15. **Word Game (sky):** make it playable in portrait too, so the phone does not have to be turned.
16. **Meet the Niqqud:** next to each vowel mark, a face (the owl can be used) showing the mouth shape of that vowel.
17. **New game: match a niqqud mark to its mouth face** (based on item 16; the request says "14", which looks like a typo).
18. **Plan more games so the difficulty rises step by step.** Where the jump between two games is too big, add a small game in between.

Then: back up, expand and improve the requests, plan points and trophies (fewer trophies for replaying a finished game, by best practice), define acceptance tests, build, code review, and UI tests with Playwright.

---

## 2. Assumptions to confirm

- **A.** Item 12 says "microphone". I read it as a **speaker** button (the child *listens* to the word). The child does not speak into the phone.
- **B.** Item 17 builds on item 16 (the niqqud faces), not 14.
- **C.** Stars and "finished" are **saved on the device**, like the ✓ today, so progress stays after closing the app.
- **D.** "Group 2" in Write the Letters is the **ו family** (ו י ז ן ג), the second group on screen.
- **E.** Drawings from 7b are saved **on the device** (a small gallery in that game), not uploaded anywhere. The game collects no data, as it does today.

---

## 3. Expanded spec, fitted to the project

### 3.1 One progress model for every game (items 2, 4, 5, 6, 9, 11)

Today:
- Five "star games" get a ✓ after 5 solved rounds.
- All other games get a ✓ as soon as they are opened (`src/journey/played.ts`).

New: every game defines **items** and **a goal**.

| Game | Item (gets a ⭐) | Finished when |
|---|---|---|
| Pop the Balls (new) | each ball | all 10 tapped |
| Numbers 1–10 / 11–20 | each number tapped | all 10 starred |
| Meet the Colours | each colour tapped | all colours starred |
| Meet the Shapes | each shape tapped | all shapes starred |
| Trace the Shape (new) | each shape traced | all shapes traced |
| Draw from a Shape (new) | a saved drawing | 1 drawing saved |
| Meet the Letters | each letter heard (name + sound) | all letters starred |
| Word Treasure | each word played | all words starred |
| Hear & Find (new) | each right answer | 5 right answers |
| Drag games (find shape, how many, mix, first letter, add) | each solved round | 5 rounds (one set, as today) |
| Write the Letters | each letter written | all letters of one group |
| Word Game (sky) | each word completed | end of a game |
| Niqqud / Niqqud Faces | each mark heard / matched | all marks |

- **Small stars:** the item's tile shows a small ⭐ in its corner once done. Stars are saved per game.
- **Progress bar:** the game screen shows how many items are done ("⭐ 7/10", numbers left to right).
- **Finished:** when the goal is reached, a short celebration plays and the game is marked finished.
- **✓ on the road** is shown only for finished games (item 2). Opening a game no longer marks it.
- **The owl** stands at the first *unfinished* game on the road (item 6).
- **Play again:** a finished game can always be played again. A small "↺ Play again" button clears its stars so the child can earn them again. The ✓ stays.
- **Old saves:** games that were ✓ only because they were opened lose the ✓. Games finished with stars keep it.

Code: a new `src/journey/progress.ts` (pure, tested) replaces `played.ts`. Each game reports `markItemDone(game, itemId)` and the progress module decides when the game is finished.

### 3.2 Trophies 🏆 (points)

Trophies are only collected and shown for now (a shop comes later).

Best practice for young children's reward systems, which I've followed here:
- Reward finishing and effort, never take anything away.
- No timers, streak pressure, or "you lost your streak".
- Replaying is welcome but worth less, so new games stay attractive. This is the "diminishing returns" pattern many learning apps use: a practice round earns less than a new lesson.
- Caps stop endless farming.
- Rewards are shown right away, big and clear.

**Rules:**

| When | Trophies |
|---|---|
| A game is **finished for the first time** | the game's base value (below) |
| The **same game is finished again** | 1 🏆, at most 2 times per game per day |
| More replays that day | ⭐ stars and celebration as usual, 0 🏆, with a friendly "you already got today's trophies here" |

- **Base value** grows with the level on the road: level 1 = 2 🏆, level 2 = 3 🏆, level 3 = 4 🏆, level 4 = 5 🏆.
- **The Word Game (sky)** gives +1 🏆 for 3 or more words, on top.
- **Shown:** a trophy counter at the top of the home screen (🏆 12), plus a short "+3 🏆" pop-up on the finish screen.
- **Saved** on the device: the total, plus per game the number of finishes and the date and count of the last replay reward.

Code: `src/journey/trophies.ts` (pure rules plus tests). The "day" is the device's local date.

### 3.3 Item by item

1. **Pop the Balls** (`balls`, new first stop):
   - 10 big balls in two rows of 5. Tapping a ball pops it in, lights it and says the next number, counting by how many are lit, not by which ball was tapped.
   - After 10, the game is finished with a celebration.
   - Uses the existing `num-01` … `num-10` clips.
3. **Numbers** become `numbers` (1–10) and `numbers-teens` (11–20).
   - Tapping a number shows it big, says it once, shows that many balls, and stars the tile.
   - A **▶ Play** button counts the balls aloud (today this happens on every tap).
   - Each game is finished when its 10 numbers are starred.
4. **Colours:** a star on each swatch; finished when all are starred.
7. **a. Trace the Shape** (`shape-trace`): reuses the trace engine (`src/games/trace/engine.ts`) with stroke paths for circle, square, triangle, rectangle, star and heart. Finished when all are traced.
   **b. Draw from a Shape** (`shape-draw`):
   - A big outline shape on a canvas, 6 colour crayons, 2 brush sizes, an eraser, and Undo.
   - **💾 Save** stores the drawing (PNG, max 12) in a small gallery in the same game.
   - Finished when 1 drawing is saved.
8. **Find the Shape audit:** I checked all 16 objects.
   - **🧇 waffle** is drawn round on iPhone: replace it with **🎁 gift box** (square).
   - **💎 gem** doesn't read as a rhombus: replace it with **🔶 orange diamond**, or drop it and keep the kite.
   - The other 14 match. A test will check that every shape has at least 2 objects.
9. **Letters:** a star per letter, and a **Next letter ▶** button that moves to the next letter and plays it.
10. **Mix:**
    - The word "with": `phrases.plus` becomes עִם in Hebrew and "with" in English.
    - The board shows two overlapping circles, like a Venn diagram. The overlap shows "?".
    - Dragging (or tapping, then tapping) the right colour onto the overlap fills it, and the game says "אָדֹם עִם צָהֹב יוֹצֵא כָּתֹם".
11. **Words:** a star per word card played.
12. **Hear & Find** (`hear-word`):
    - A big 🔊 card plays a word.
    - 3 pictures, then 4 on the hard level. The child drags or taps the matching picture.
    - Reuses Word Treasure's words and clips.
13. **Add It Up as a scale:**
    - Left pan: a group of objects (for example 3). The middle shows "=". Right pan: a smaller group (for example 1) plus an empty spot.
    - The scale tilts toward the heavier side, animated with CSS rotate.
    - The child drags the missing amount (2) from 3 choices onto the right pan. The scale levels out and the sum is spoken.
    - Easy is up to 5, hard up to 10.
14. **Trace proportions:**
    - The ר basic shape: make the vertical stroke the same length as the top horizontal stroke, then re-fit all letters built on it.
    - Group 2 (ו family): shorten the top horizontal stroke by about 25%.
    - Unit tests check the lengths.
15. **Sky game in portrait:**
    - Remove the "turn your phone" screen.
    - In portrait, the 3D view takes the top 60% of the screen and the controls (joystick and punch button) sit in the bottom 40%.
    - The camera is a little wider so the boxes stay visible.
16. **Niqqud faces:** a drawn owl face for each mouth shape, shown next to the selected mark.
    - **Open "a"** (קָמַץ, פַּתַח): mouth wide open
    - **"e"** (צֵירֵי, סֶגּוֹל): mouth half open, wide
    - **"i"** (חִירִיק): big smile
    - **"o"** (חוֹלָם): round O
    - **"u"** (שׁוּרוּק, קֻבּוּץ): small round pucker
    - **שְׁוָא:** a short, almost closed mouth
17. **Niqqud Faces** (`niqqud-faces`): a face is shown and its sound is played; the child drags the matching mark (3 choices, then 4).
18. **Learning ladder:** see section 4.

---

## 4. The learning ladder (item 18)

The road is ordered by difficulty. Each level gives more trophies. ★ = new game; ◆ = small "bridge" game I suggest adding where the jump is too big.

| Level | Games in road order |
|---|---|
| 1. Tap and listen | ★ Pop the Balls → Numbers 1–10 → Meet the Colours → Meet the Shapes |
| 2. Find and copy | Find the Shape → ★ Trace the Shape → ★ Draw from a Shape → How Many? (to 5, then 10) → Numbers 11–20 |
| 3. Letters and words | Meet the Letters → ◆ **Find the Letter** (hear a letter name, tap it among 3) → Word Treasure → ★ Hear & Find → First Letter → Write the Letters |
| 4. Thinking | Mix the Colours → ◆ **More or Less** (tap the group with more) → Add It Up (scale) → Word Game (sky) |
| 5. Reading (Hebrew) | Meet the Niqqud → ★ Niqqud Faces |

Why the two bridges:
- **Find the Letter** sits between "listen to letters" and "which letter does a word start with". Today that jump is too big.
- **More or Less** teaches "more/less/equal" before the balance scale.

---

## 5. Acceptance tests

Each one becomes an automated test: a unit test, or a Playwright UI test where it needs the screen.

| # | Given / When | Then |
|---|---|---|
| AT-1 | Pop the Balls is open; the child taps 10 balls | the numbers 1–10 are spoken in order (by count, whichever ball); after the 10th, a celebration; the road shows ✓ |
| AT-2 | A game is opened and closed without reaching its goal | no ✓ on the road; the owl still stands at that game |
| AT-3 | Numbers 1–10: the child taps 7 | 7 is shown and said once, with no automatic counting; the 7 tile gets a ⭐; ▶ Play counts 1–7 |
| AT-4 | Numbers: all 10 numbers tapped | game finished; ✓ on the road; Numbers 11–20 is a separate stop |
| AT-5 | Colours: every colour tapped once | each swatch shows ⭐; then the game is finished |
| AT-6 | The first game is finished | the owl moves to the next unfinished game, and only then |
| AT-7 | Trace the Shape: the dot is dragged along the circle | the circle is completed and gets a ⭐; dragging off the path does not complete it |
| AT-8 | Draw from a Shape: the child paints and taps 💾 Save | the drawing appears in the gallery after reloading the page; game finished |
| AT-9 | Find the Shape data | every object matches its shape (reviewed list); no 🧇 waffle on the square |
| AT-10 | Letters: tap א, then Next letter ▶ | א has ⭐; the next letter is shown and spoken |
| AT-11 | Mix: red and yellow | two overlapping circles with "?" in the overlap; dropping orange fills it; the spoken phrase uses "עִם" |
| AT-12 | Words: play a word card | that card shows ⭐ |
| AT-13 | Hear & Find: tap 🔊, then the right picture | the right answer is accepted; a wrong one slides back; after 5 right, finished |
| AT-14 | Add It Up: 3 = 1 + ? | the scale tilts left; dropping 2 levels the scale and says "שָׁלוֹשׁ שָׁוֶה אַחַת עִם שְׁתַּיִם"; a wrong amount slides back |
| AT-15 | Trace shapes data | in the ר basic shape, the vertical and horizontal lengths are equal (±2%); in the ו family the top line is shorter than before |
| AT-16 | Sky game on a 390×844 portrait screen | no "turn your phone" screen; the boxes and controls are visible; the game can be finished |
| AT-17 | Niqqud: tap חוֹלָם | the owl face with a round "o" mouth is shown next to the mark |
| AT-18 | Niqqud Faces: face "u" is shown | dropping שׁוּרוּק or קֻבּוּץ is accepted; קָמַץ slides back |
| AT-19 | Trophies: a level-1 game is finished the first time | +2 🏆 on the finish screen and on the home counter |
| AT-20 | The same game is finished again, 3 times the same day | +1, +1, then +0 with a friendly message; the counter never goes down |
| AT-21 | A new day | replay rewards are available again (+1, max 2) |
| AT-22 | Reload the page | stars, ✓, trophies and drawings are all still there |
| AT-23 | Every screen, Hebrew and English, phone portrait and landscape | no text overflow; all Hebrew text has niqqud; numbers read left to right |
| AT-24 | `npm run check` | green (types, lint, all tests) |

---

## 6. How I would build it (phases)

Each phase ends with:
- `npm run check`
- a code review (`/code-review`)
- UI tests
- a short summary for you to try
- commit and push only on your OK

| Phase | Contents |
|---|---|
| **A. Progress core** | progress + trophies modules, ✓ only on finish, owl fix, ⭐ on items, trophy counter (items 2, 4, 5, 6, 9, 11); Pop the Balls (1); Numbers split + Play (3) |
| **B. Fixes to existing games** | Find the Shape audit (8), Mix overlap + "with" (10), trace proportions (14), niqqud faces (16) |
| **C. New games** | Trace the Shape (7a), Draw from a Shape (7b), Hear & Find (12), Niqqud Faces (17), scale for Add It Up (13) |
| **D. Ladder** | road reorder by level, bridge games Find the Letter and More or Less (18), sky game in portrait (15) |

---

## 7. UI testing with Playwright

Playwright MCP is **not connected in this session yet**. Two options:

1. **Playwright tests in the repo (recommended):**
   - Add `@playwright/test` as a dev dependency, plus an `e2e/` folder with the acceptance tests above, run by `npm run e2e`.
   - It's repeatable, can run in GitHub Actions before every deploy, and phone sizes and both languages are easy to cover.
2. **Playwright MCP:**
   - Lets me click through the game by hand to explore.
   - To connect it, run this in a terminal, then start a new session:
     ```bash
     claude mcp add playwright npx @playwright/mcp@latest
     ```
   - This changes your Claude settings, so it's your call.

I can also check every phase in the app's built-in browser, as I've done so far.
