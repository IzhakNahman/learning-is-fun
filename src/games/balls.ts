import { countingPart } from '../content';
import type { LanguagePack } from '../content';
import { byId, clearChildren, createElement } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback } from '../core/playback';
import { playCountBlip } from '../core/sfx';
import { SPEECH_RATE, speakPart } from '../core/voice';
import { showInstruction } from '../ui/instruction';
import { celebrateFinish, createStarTracker, type StarTracker } from '../ui/progressUi';

/**
 * The very first game: ten balls. Every tap lights a ball and the voice counts how many are lit
 * (whichever ball was tapped). When all ten are lit, the game is finished.
 */

export const BALL_COUNT = 10;
const BALL_COLORS = ['#ff5d5d', '#ff9f1c', '#ffd23f', '#3ccf6b', '#4d96ff'];

let tracker: StarTracker | null = null;
/** True from the tenth ball until its "well done": taps then wait, so nothing talks over it. */
let celebrating = false;

export function initBallsGame(): void {
  if (!document.getElementById('bboard')) return;
  onLanguageChange(renderBallsGame);
  renderBallsGame(getPack());
}

const ballId = (index: number): string => `ball-${index + 1}`;

function renderBallsGame(pack: LanguagePack): void {
  const board = byId('bboard');
  clearChildren(board);
  const balls = new Map<string, HTMLElement>();
  for (let index = 0; index < BALL_COUNT; index++) {
    const ball = createElement('button', { className: 'big-ball' });
    ball.style.setProperty('--ball-color', BALL_COLORS[index % BALL_COLORS.length] ?? '#4d96ff');
    ball.setAttribute('aria-label', String(index + 1));
    ball.dataset.ball = ballId(index);
    ball.addEventListener('click', () => void onBallTapped(pack, ballId(index)));
    balls.set(ballId(index), ball);
    board.append(ball);
  }
  showInstruction(byId('bprompt'), pack, 'balls');
  const again = byId('bagain');
  again.textContent = `↺ ${pack.ui.progress.playAgain}`;
  again.onclick = () => tracker?.playAgain();
  tracker = createStarTracker({
    game: 'balls',
    pack,
    screen: byId('balls'),
    goal: BALL_COUNT,
    // A lit ball is a "starred" ball: it shows its colour instead of a ⭐ badge.
    tileFor: (id) => balls.get(id) ?? null,
    itemIds: [...balls.keys()],
    celebrateLater: true,
    onPlayAgain: showCount,
  });
  showCount();
}

/** When all the balls are lit, a big "↺ play again" shows under them. */
function allLit(): boolean {
  return litCount() >= BALL_COUNT;
}

/** Lit balls carry the tracker's "starred" class (it is kept in step with the saved stars). */
function litCount(): number {
  return byId('bboard').querySelectorAll('.big-ball.starred').length;
}

function showCount(): void {
  const lit = litCount();
  byId('bcount').textContent = lit > 0 ? String(lit) : '';
  byId('bagain').hidden = !allLit();
}

async function onBallTapped(pack: LanguagePack, id: string): Promise<void> {
  if (celebrating) return;
  // After a finished count, tapping a ball starts counting again from one.
  if (allLit()) tracker?.playAgain();
  if (byId('bboard').querySelector(`[data-ball="${id}"]`)?.classList.contains('starred')) return;
  const finished = tracker?.markDone(id) ?? null;
  if (finished) celebrating = true;
  const lit = litCount();
  showCount();
  playCountBlip(lit);
  beginPlayback();
  await speakPart(countingPart(pack, lit), SPEECH_RATE.COUNTING);
  // "Well done" waits for "ten", so it does not cut the counting off.
  if (!finished) return;
  celebrateFinish(finished, pack);
  celebrating = false;
}
