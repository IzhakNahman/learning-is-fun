import { countingPart } from '../content';
import type { GameId, LanguagePack } from '../content';
import { byId, clearChildren, createElement, wait } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback, isCurrentPlayback } from '../core/playback';
import { playCountBlip } from '../core/sfx';
import { SPEECH_RATE, speakPart } from '../core/voice';
import { showInstruction } from '../ui/instruction';
import { createStarTracker, markDoneAfterSpeech, type StarTracker } from '../ui/progressUi';

const BALLS_PER_ROW = 5;
const PAUSE_BEFORE_COUNTING_MS = 250;

/** One "meet the numbers" game: 1–10 or 11–20. Every number heard gets a ⭐. */
interface NumbersGame {
  game: Extract<GameId, 'numbers' | 'teens'>;
  first: number;
  last: number;
  /** Ids of the screen parts: grid, big number, name, balls, ▶ button. */
  ids: { grid: string; big: string; name: string; balls: string; play: string };
}

const NUMBERS_1_TO_10: NumbersGame = {
  game: 'numbers',
  first: 1,
  last: 10,
  ids: { grid: 'ngrid', big: 'nbig', name: 'nname', balls: 'nballs', play: 'nplay' },
};
const NUMBERS_11_TO_20: NumbersGame = {
  game: 'teens',
  first: 11,
  last: 20,
  ids: { grid: 'tngrid', big: 'tnbig', name: 'tnname', balls: 'tnballs', play: 'tnplay' },
};

export function initNumbersGame(): void {
  for (const config of [NUMBERS_1_TO_10, NUMBERS_11_TO_20]) setUpNumbersGame(config);
}

function setUpNumbersGame(config: NumbersGame): void {
  if (!document.getElementById(config.ids.grid)) return;
  const render = (pack: LanguagePack): void => renderNumbersGame(config, pack);
  onLanguageChange(render);
  render(getPack());
}

function numbersOf(config: NumbersGame): number[] {
  return Array.from({ length: config.last - config.first + 1 }, (_, index) => config.first + index);
}

function renderNumbersGame(config: NumbersGame, pack: LanguagePack): void {
  const { ids } = config;
  const grid = byId(ids.grid);
  clearChildren(grid);
  const tiles = new Map<string, HTMLElement>();
  let selected = 0;
  let tracker: StarTracker | null = null;

  for (const count of numbersOf(config)) {
    const tile = createElement('button', {
      className: count > 10 ? 'tile tile-teens' : 'tile',
      text: String(count),
    });
    tile.addEventListener('click', () => {
      selected = count;
      play.disabled = false;
      void markDoneAfterSpeech(tracker, String(count), pack, onNumberTapped(config, count, tile));
    });
    tiles.set(String(count), tile);
    grid.append(tile);
  }

  const balls = byId(ids.balls);
  clearChildren(balls);
  for (let index = 0; index < config.last; index++) {
    const rowColor = Math.floor(index / BALLS_PER_ROW) % 2;
    const ball = createElement('button', { className: `ball r${rowColor}` });
    ball.addEventListener('click', () => void onBallTapped(config, index + 1));
    balls.append(ball);
  }

  const play = byId<HTMLButtonElement>(ids.play);
  play.textContent = `▶ ${pack.ui.countAloud}`;
  play.disabled = true;
  play.onclick = () => {
    if (selected > 0) void countAloud(config, selected);
  };

  byId(ids.big).textContent = '?';
  showInstruction(byId(ids.name), pack, config.game);

  const screen = document.getElementById(config.game);
  if (!screen) return;
  tracker = createStarTracker({
    game: config.game,
    pack,
    screen,
    goal: tiles.size,
    tileFor: (id) => tiles.get(id) ?? null,
    itemIds: [...tiles.keys()],
    celebrateLater: true,
  });
}

function ballsOf(config: NumbersGame): HTMLElement[] {
  return [...byId(config.ids.balls).children] as HTMLElement[];
}

/** The child counts by tapping: the balls up to the tapped one light up and its number is said. */
async function onBallTapped(config: NumbersGame, position: number): Promise<void> {
  ballsOf(config).forEach((ball, index) => ball.classList.toggle('on', index < position));
  playCountBlip(position);
  beginPlayback();
  await speakPart(countingPart(getPack(), position), SPEECH_RATE.COUNTING);
}

/** Shows the number, how many balls it is, and says it once (▶ counts them). */
async function onNumberTapped(
  config: NumbersGame,
  count: number,
  tile: HTMLElement,
): Promise<void> {
  const pack = getPack();
  byId(config.ids.grid)
    .querySelectorAll('.tile')
    .forEach((other) => other.classList.remove('sel'));
  tile.classList.add('sel');
  byId(config.ids.big).textContent = String(count);
  byId(config.ids.name).textContent = pack.numbers.shown[count] ?? '';
  ballsOf(config).forEach((ball, index) => {
    ball.classList.remove('on');
    ball.style.visibility = index < count ? 'visible' : 'hidden';
  });

  beginPlayback();
  await speakPart(countingPart(pack, count), SPEECH_RATE.DEFAULT);
}

/** ▶: lights the balls one by one and counts them out loud. */
async function countAloud(config: NumbersGame, count: number): Promise<void> {
  const pack = getPack();
  const balls = ballsOf(config);
  balls.forEach((ball) => ball.classList.remove('on'));
  const playbackId = beginPlayback();
  await wait(PAUSE_BEFORE_COUNTING_MS);
  for (let step = 1; step <= count; step++) {
    if (!isCurrentPlayback(playbackId)) return;
    balls[step - 1]?.classList.add('on');
    playCountBlip(step);
    await speakPart(countingPart(pack, step), SPEECH_RATE.COUNTING);
  }
}
