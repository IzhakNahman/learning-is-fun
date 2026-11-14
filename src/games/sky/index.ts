import {
  countingPart,
  letterNamePart,
  letterSoundPart,
  wellDonePart,
  wordPart,
} from '../../content';
import type { LanguagePack, WordEntry } from '../../content';
import { byId, wait } from '../../core/dom';
import { getPack } from '../../core/i18n';
import { beginPlayback, isCurrentPlayback } from '../../core/playback';
import { clamp } from '../../core/math';
import { shuffled } from '../../core/random';
import { navigateTo } from '../../core/router';
import type { ScreenHooks } from '../../core/router';
import {
  playBreakSound,
  playCelebrationSound,
  playHitSound,
  playSwingSound,
  playTapBlip,
  playWrongLetterSound,
} from '../../core/sfx';
import { SPEECH_RATE, speakPart, speakPartsInOrder } from '../../core/voice';
import {
  advanceBoxes,
  createBox,
  createCloud,
  findPunchTarget,
  hasNeededLetter,
  isLive,
  pickBoxLetter,
} from './boxes';
import { SKY } from './config';
import { createSkyControls } from './controls';
import type { SkyControls } from './controls';
import { addAchievedWordChip, renderWordBar, resetHud, setClock, setScore } from './hud';
import {
  hideEndScreen,
  hidePause,
  showEndScreen,
  showLetterPause,
  showWordPause,
} from './overlays';
import {
  emitBreakBurst,
  emitConfetti,
  emitFloatingText,
  emitHitSparks,
  updateParticles,
} from './particles';
import { createSkyRenderer } from './render';
import type { SkyRenderer } from './render';
import type { Box, SkyState } from './types';
import { finishRoundGame } from '../../ui/progressUi';

/** This many words or more in one game earn a bonus trophy. */
const SKY_BONUS_WORDS = 3;

const PAUSE_BEFORE_FINAL_MESSAGE_MS = 300;
/** Longest the OK button waits for the voice, in case the device never reports that it finished. */
const MAX_CONFIRM_LOCK_MS = 4000;

let renderer: SkyRenderer | null = null;
let controls: SkyControls | null = null;
let state: SkyState | null = null;
/** Changes whenever a game is started or abandoned, so stale async steps stop themselves. */
let runId = 0;
let pendingConfirm: (() => void) | null = null;
/** While the letter or word is still being spoken, OK is disabled so the voice is never cut off. */
let confirmLockId = 0;
let confirmLocked = false;

export const skyScreenHooks: ScreenHooks = { enter: startSkyGame, leave: abandonSkyGame };

export function initSkyGame(): void {
  renderer = createSkyRenderer(byId<HTMLCanvasElement>('c'));
  renderer.resize();
  window.addEventListener('resize', () => renderer?.resize());
  window.addEventListener('orientationchange', () => renderer?.resize());
  controls = createSkyControls({
    isScreenActive: () => state !== null && !byId('sky').classList.contains('hidden'),
    isAwaitingConfirm: () => pendingConfirm !== null,
    canPlay: () => state?.phase === 'playing',
    onPunch: punch,
    onConfirm: confirmPause,
    onQuit: finishGame,
  });
  byId('quit').addEventListener('click', finishGame);
  byId('skyhome').addEventListener('click', () => navigateTo('home'));
}

/** Called every animation frame while the sky screen is visible. */
export function updateSkyFrame(seconds: number): void {
  if (!state || !renderer) return;
  updateParticles(state, seconds);
  if (state.phase === 'playing') updateGameplay(state, seconds);
  renderer.draw(state);
}

// ---------- starting and leaving ----------

function orderWordsShortToLong(words: readonly WordEntry[]): WordEntry[] {
  return shuffled(words).sort((a, b) => a.slots.length - b.slots.length);
}

function createInitialState(pack: LanguagePack): SkyState {
  return {
    phase: 'playing',
    secondsLeft: SKY.GAME_SECONDS,
    elapsedSeconds: 0,
    player: { x: 0, y: 0, velocityX: 0, velocityY: 0 },
    camera: { x: 0, y: 0 },
    boxes: [],
    clouds: Array.from({ length: SKY.CLOUD_COUNT }, () => createCloud(8 + Math.random() * 112)),
    particles: [],
    wordQueue: orderWordsShortToLong(pack.words),
    nextWordIndex: 0,
    currentWord: null,
    slots: [],
    completedWords: [],
    spawnTimer: 1,
    punchCooldown: 0,
    punchAnimation: 0,
  };
}

function startSkyGame(): void {
  const pack = getPack();
  cancelPendingConfirm();
  runId += 1;
  renderer?.resize();
  const fresh = createInitialState(pack);
  state = fresh;

  hideEndScreen();
  hidePause();
  byId('skyhud').classList.remove('hidden');
  setPausedLook(false);
  resetHud(pack, fresh.secondsLeft);
  advanceToNextWord(fresh);
  SKY.FIRST_BOX_DISTANCES.forEach((distance) => spawnBox(fresh, distance));
}

function abandonSkyGame(): void {
  cancelPendingConfirm();
  runId += 1;
  controls?.releaseAll();
  hidePause();
  hideEndScreen();
  if (state) state.phase = 'finished';
}

/**
 * Dims the screen during a pause. Held keys and the joystick are NOT released here: the child's
 * thumb usually stays on the joystick, and must keep working when the game continues.
 */
function setPausedLook(isPaused: boolean): void {
  byId('sky').classList.toggle('paused', isPaused);
}

// ---------- words and boxes ----------

function advanceToNextWord(current: SkyState): boolean {
  const next = current.wordQueue[current.nextWordIndex];
  if (!next) return false;
  current.nextWordIndex += 1;
  current.currentWord = next;
  current.slots = next.slots.map((spec) => ({ spec, filled: false }));
  renderWordBar(next, current.slots);
  return true;
}

function neededLetterKeys(current: SkyState): string[] {
  return current.slots.filter((slot) => !slot.filled).map((slot) => slot.spec.key);
}

function spawnBox(current: SkyState, distance: number): void {
  const allKeys = getPack().letters.map((letter) => letter.key);
  const letterKey = pickBoxLetter(neededLetterKeys(current), current.boxes, allKeys);
  current.boxes.push(createBox(letterKey, distance, current.boxes));
}

// ---------- gameplay ----------

function updateGameplay(current: SkyState, seconds: number): void {
  current.elapsedSeconds += seconds;
  current.secondsLeft -= seconds;
  current.punchCooldown -= seconds;
  current.punchAnimation -= seconds;

  movePlayer(current, seconds);
  moveCamera(current, seconds);
  for (const cloud of current.clouds) {
    cloud.z -= SKY.CLOUD_SPEED * seconds;
    if (cloud.z >= SKY.BOX_REMOVE_Z) continue;
    const [nearest, farthest] = SKY.CLOUD_RESPAWN_Z;
    Object.assign(cloud, createCloud(nearest + Math.random() * (farthest - nearest)));
  }
  current.boxes = advanceBoxes(current.boxes, seconds);
  spawnBoxesWhenNeeded(current, seconds);

  setClock(current.secondsLeft);
  if (current.secondsLeft <= 0) finishGame();
}

function movePlayer(current: SkyState, seconds: number): void {
  const input = controls?.input;
  if (!input) return;
  const held = input.heldDirections;
  const horizontal = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0) + input.stick.x;
  const vertical = (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0) + input.stick.y;
  const player = current.player;
  const blend = Math.min(1, SKY.PLAYER_SMOOTHING * seconds);
  player.velocityX += (clamp(horizontal, -1, 1) * SKY.PLAYER_SPEED_X - player.velocityX) * blend;
  player.velocityY += (clamp(vertical, -1, 1) * SKY.PLAYER_SPEED_Y - player.velocityY) * blend;
  player.x = clamp(player.x + player.velocityX * seconds, -SKY.PLAYER_LIMIT_X, SKY.PLAYER_LIMIT_X);
  player.y = clamp(player.y + player.velocityY * seconds, -SKY.PLAYER_LIMIT_Y, SKY.PLAYER_LIMIT_Y);
}

function moveCamera(current: SkyState, seconds: number): void {
  const blend = Math.min(1, SKY.CAMERA_SMOOTHING * seconds);
  current.camera.x += (current.player.x * SKY.CAMERA_FOLLOW - current.camera.x) * blend;
  current.camera.y += (current.player.y * SKY.CAMERA_FOLLOW - current.camera.y) * blend;
}

function spawnBoxesWhenNeeded(current: SkyState, seconds: number): void {
  current.spawnTimer -= seconds;
  const liveCount = current.boxes.filter(isLive).length;

  if (current.spawnTimer <= 0) {
    current.spawnTimer = SKY.SPAWN_INTERVAL_SECONDS;
    if (liveCount < SKY.MAX_LIVE_BOXES) spawnBox(current, SKY.BOX_SPAWN_Z);
    return;
  }
  const neededIsMissing = !hasNeededLetter(current.boxes, neededLetterKeys(current));
  const canAddExtra = liveCount < SKY.MAX_LIVE_BOXES_WHEN_NEEDED_LETTER_MISSING;
  if (
    neededIsMissing &&
    canAddExtra &&
    current.spawnTimer > SKY.NEEDED_LETTER_SPAWN_DELAY_SECONDS
  ) {
    current.spawnTimer = SKY.NEEDED_LETTER_SPAWN_DELAY_SECONDS;
    spawnBox(current, SKY.BOX_SPAWN_Z);
  }
}

function punch(): void {
  const current = state;
  if (!current || current.phase !== 'playing' || current.punchCooldown > 0) return;
  current.punchCooldown = SKY.PUNCH_COOLDOWN_SECONDS;
  current.punchAnimation = SKY.PUNCH_ANIMATION_SECONDS;
  playSwingSound();

  const target = findPunchTarget(current.boxes, current.player);
  if (!target || !renderer) return;
  target.punchesTaken += 1;
  target.shakeSeconds = SKY.BOX_SHAKE_SECONDS;
  playHitSound();

  const pack = getPack();
  const spot = renderer.project(current, target.x, target.y + 1.2, target.z);
  emitFloatingText(
    current,
    spot.x,
    spot.y,
    String(target.punchesTaken),
    pack.numbers.spoken[target.punchesTaken] ?? '',
  );
  emitHitSparks(current, spot.x, spot.y, target.hue);

  if (target.punchesTaken >= SKY.PUNCHES_PER_BOX) void breakBox(current, target, runId);
}

// ---------- pauses: letter, word ----------

function waitForConfirm(): Promise<void> {
  return new Promise((resolve) => {
    pendingConfirm = resolve;
  });
}

/** Disables the OK button until the voice has finished (or a safety time has passed). */
function lockConfirmUntilSpoken(button: HTMLButtonElement, speaking: Promise<void>): void {
  confirmLockId += 1;
  const lockId = confirmLockId;
  confirmLocked = true;
  button.disabled = true;
  const unlock = (): void => {
    if (lockId !== confirmLockId) return;
    confirmLocked = false;
    button.disabled = false;
  };
  void speaking.then(unlock, unlock);
  setTimeout(unlock, MAX_CONFIRM_LOCK_MS);
}

function confirmPause(): void {
  if (!pendingConfirm || confirmLocked) return;
  const resolve = pendingConfirm;
  pendingConfirm = null;
  beginPlayback();
  resolve();
}

function cancelPendingConfirm(): void {
  confirmLockId += 1;
  confirmLocked = false;
  if (!pendingConfirm) return;
  const resolve = pendingConfirm;
  pendingConfirm = null;
  resolve();
}

function resumePlaying(current: SkyState): void {
  current.phase = 'playing';
  setPausedLook(false);
}

async function breakBox(current: SkyState, box: Box, run: number): Promise<void> {
  current.phase = 'breaking';
  setPausedLook(true);
  current.boxes = current.boxes.filter((other) => other !== box);
  if (renderer) {
    const spot = renderer.project(current, box.x, box.y, box.z);
    emitBreakBurst(current, spot.x, spot.y, box.hue);
  }
  playBreakSound();

  // A short beat so the break animation is seen before the letter is announced.
  await wait(SKY.BREAK_DELAY_MS);
  if (run !== runId) return;
  await announceLetter(current, box.letterKey, run);
}

async function announceLetter(current: SkyState, letterKey: string, run: number): Promise<void> {
  const pack = getPack();
  const letter = pack.letters.find((item) => item.key === letterKey);
  const nameParts = letterNamePart(pack, letterKey);
  const soundPart = letterSoundPart(pack, letterKey);
  if (!letter || !nameParts || !soundPart) {
    resumePlaying(current);
    return;
  }

  const matchingSlot = current.slots.find((slot) => !slot.filled && slot.spec.key === letterKey);
  if (matchingSlot) {
    matchingSlot.filled = true;
    if (current.currentWord) renderWordBar(current.currentWord, current.slots);
  } else {
    playWrongLetterSound();
  }

  current.phase = 'letterPause';
  const letterOkButton = showLetterPause(
    {
      boxText: letter.boxText,
      matchesWord: Boolean(matchingSlot),
      name: letter.name,
      sound: letter.soundText,
    },
    pack.ui.sky.confirm,
    confirmPause,
  );
  lockConfirmUntilSpoken(
    letterOkButton,
    speakPartsInOrder([nameParts, soundPart], beginPlayback(), SPEECH_RATE.LETTER_NAME),
  );

  await waitForConfirm();
  if (run !== runId) return;
  hidePause();

  const wordIsComplete = Boolean(matchingSlot) && current.slots.every((slot) => slot.filled);
  if (wordIsComplete) {
    const gameContinues = await completeWord(current, run);
    if (!gameContinues) return;
  }
  resumePlaying(current);
}

/** Returns false when the game is over or was abandoned during the pause. */
async function completeWord(current: SkyState, run: number): Promise<boolean> {
  const word = current.currentWord;
  if (!word) return true;
  const pack = getPack();

  current.completedWords.push(word);
  setScore(current.completedWords.length);
  addAchievedWordChip(word);

  current.phase = 'wordPause';
  const wordOkButton = showWordPause(word, pack.ui.sky.wellDone, pack.ui.sky.confirm, confirmPause);
  playCelebrationSound();
  emitConfetti(current, window.innerWidth / 2, window.innerHeight / 2);
  const spokenWord = wordPart(pack, word.id);
  if (spokenWord) {
    const wordThenPraise = [spokenWord, wellDonePart(pack)];
    lockConfirmUntilSpoken(
      wordOkButton,
      speakPartsInOrder(wordThenPraise, beginPlayback(), SPEECH_RATE.WORD),
    );
  }

  await waitForConfirm();
  if (run !== runId) return false;
  hidePause();

  if (advanceToNextWord(current)) return true;
  finishGame();
  return false;
}

// ---------- ending and counting ----------

function finishGame(): void {
  const existing = state;
  if (!existing || existing.phase === 'counting' || existing.phase === 'finished') return;
  const current: SkyState = existing;

  cancelPendingConfirm();
  runId += 1;
  const run = runId;
  beginPlayback();
  hidePause();
  byId('skyhud').classList.add('hidden');
  setPausedLook(false);

  const pack = getPack();
  const totalWords = current.completedWords.length;
  current.phase = totalWords === 0 ? 'finished' : 'counting';

  const endScreen = showEndScreen({
    pack,
    words: current.completedWords,
    onWordCounted: (countedSoFar) => void countWord(countedSoFar),
  });

  function announceResult(): void {
    current.phase = 'finished';
    endScreen.showFinalMessage(pack.gameOverText(totalWords), startSkyGame, () =>
      navigateTo('home'),
    );
    playCelebrationSound();
    void speakPartsInOrder(pack.gameOverParts(totalWords), beginPlayback(), SPEECH_RATE.END_COUNT);
    // A game with at least one word is a finished game; 3 or more words earn a bonus trophy.
    if (totalWords > 0) finishRoundGame('sky', pack, totalWords >= SKY_BONUS_WORDS ? 1 : 0);
  }

  async function countWord(countedSoFar: number): Promise<void> {
    playTapBlip(countedSoFar);
    const playbackId = beginPlayback();
    await speakPart(countingPart(pack, countedSoFar), SPEECH_RATE.END_COUNT);
    if (run !== runId || !isCurrentPlayback(playbackId)) return;
    if (countedSoFar < totalWords) return;
    await wait(PAUSE_BEFORE_FINAL_MESSAGE_MS);
    if (run === runId) announceResult();
  }

  if (totalWords === 0) announceResult();
}
