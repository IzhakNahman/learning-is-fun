import { countingPart } from '../content';
import type { LanguagePack } from '../content';
import { byId, clearChildren, createElement, wait } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback, isCurrentPlayback } from '../core/playback';
import { playCountBlip } from '../core/sfx';
import { SPEECH_RATE, speakPart } from '../core/voice';
import { showInstruction } from '../ui/instruction';

const LARGEST_NUMBER = 20;
const BALLS_PER_ROW = 5;
const PAUSE_BEFORE_COUNTING_MS = 250;

export function initNumbersGame(): void {
  onLanguageChange(renderNumbersGame);
  renderNumbersGame(getPack());
}

function renderNumbersGame(pack: LanguagePack): void {
  const grid = byId('ngrid');
  clearChildren(grid);
  for (let count = 1; count <= LARGEST_NUMBER; count++) {
    const tile = createElement('button', {
      className: count > 10 ? 'tile tile-teens' : 'tile',
      text: String(count),
    });
    tile.addEventListener('click', () => void onNumberTapped(count, tile));
    grid.append(tile);
  }

  const balls = byId('nballs');
  clearChildren(balls);
  for (let index = 0; index < LARGEST_NUMBER; index++) {
    const rowColor = Math.floor(index / BALLS_PER_ROW) % 2;
    const ball = createElement('button', { className: `ball r${rowColor}` });
    ball.addEventListener('click', () => void onBallTapped(index + 1));
    balls.append(ball);
  }

  byId('nbig').textContent = '?';
  showInstruction(byId('nname'), pack, 'numbers');
}

/** The child counts by tapping: the balls up to the tapped one light up and its number is said. */
async function onBallTapped(position: number): Promise<void> {
  const balls = [...byId('nballs').children] as HTMLElement[];
  balls.forEach((ball, index) => ball.classList.toggle('on', index < position));
  playCountBlip(position);
  beginPlayback();
  await speakPart(countingPart(getPack(), position), SPEECH_RATE.COUNTING);
}

async function onNumberTapped(count: number, tile: HTMLElement): Promise<void> {
  const pack = getPack();
  document.querySelectorAll('#ngrid .tile').forEach((other) => other.classList.remove('sel'));
  tile.classList.add('sel');

  byId('nbig').textContent = String(count);
  byId('nname').textContent = pack.numbers.shown[count] ?? '';

  const balls = [...byId('nballs').children] as HTMLElement[];
  balls.forEach((ball, index) => {
    ball.classList.remove('on');
    ball.style.visibility = index < count ? 'visible' : 'hidden';
  });

  const playbackId = beginPlayback();
  await speakPart(countingPart(pack, count), SPEECH_RATE.DEFAULT);
  if (!isCurrentPlayback(playbackId)) return;

  if (count === 1) {
    balls[0]?.classList.add('on');
    return;
  }
  await wait(PAUSE_BEFORE_COUNTING_MS);
  for (let step = 1; step <= count; step++) {
    if (!isCurrentPlayback(playbackId)) return;
    balls[step - 1]?.classList.add('on');
    playCountBlip(step);
    await speakPart(countingPart(pack, step), SPEECH_RATE.COUNTING);
  }
}
