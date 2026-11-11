import { countingPart } from '../content';
import type { LanguagePack } from '../content';
import { byId, clearChildren, createElement, wait } from '../core/dom';
import { makeDraggable } from '../core/drag';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback } from '../core/playback';
import { pickDistinct, pickRandom, shuffled } from '../core/random';
import type { RandomSource } from '../core/random';
import { playCountBlip, playTryAgainSound } from '../core/sfx';
import { SPEECH_RATE, speakPart } from '../core/voice';
import { CHEER_MS, buildPrompt, buildStars, cheer, sayWellDone } from '../ui/playScreen';
import { ROUNDS_PER_SET, finishedSet, levelFor } from './rounds';
import type { Level } from './rounds';

const OBJECTS = ['🍎', '🎈', '⭐', '🐟', '🚗', '🌸', '🐥', '🍪'] as const;
const CHOICE_COUNT = 3;
/** With more objects than this they are drawn smaller so they all fit. */
const MANY_OBJECTS = 6;
const LARGEST_BY_LEVEL: Record<Level, number> = { easy: 5, hard: 10 };
const SMALLEST_BY_LEVEL: Record<Level, number> = { easy: 1, hard: 3 };
/** After this many wrong tries the right number lights up. */
const TRIES_BEFORE_HINT = 2;
const NEXT_ROUND_DELAY_MS = 900;

export interface CountRound {
  object: string;
  count: number;
  /** Number choices in the order shown; exactly one equals `count`. */
  choices: number[];
}

export function makeCountRound(level: Level, random: RandomSource = Math.random): CountRound {
  const largest = LARGEST_BY_LEVEL[level];
  const smallest = SMALLEST_BY_LEVEL[level];
  const count = smallest + Math.floor(random() * (largest - smallest + 1));
  const others = Array.from(
    { length: Math.max(largest, count + 2) },
    (_, index) => index + 1,
  ).filter((number) => number !== count);
  const choices = shuffled([count, ...pickDistinct(others, CHOICE_COUNT - 1, random)], random);
  return { object: pickRandom(OBJECTS, random) ?? '🍎', count, choices };
}

let solvedRounds = 0;
let wrongTries = 0;
let round: CountRound = makeCountRound('easy');
let busy = false;

export function initCountGame(): void {
  onLanguageChange(() => startRound());
  startRound();
}

function startRound(): void {
  busy = false;
  wrongTries = 0;
  round = makeCountRound(levelFor(solvedRounds));
  renderRound(getPack());
}

function renderRound(pack: LanguagePack): void {
  const root = byId('countplay');
  clearChildren(root);

  const box = createElement('div', {
    className: round.count > MANY_OBJECTS ? 'count-box many' : 'count-box',
    id: 'countbox',
  });
  for (let position = 1; position <= round.count; position++) {
    const item = createElement('button', {
      className: 'count-item',
      text: round.object,
      dataset: { keepTap: '1' },
    });
    item.addEventListener('click', () => void onItemTapped(box, position, pack));
    box.append(item);
  }

  const slot = createElement('div', { className: 'count-slot', text: '?' });
  const choices = createElement('div', { className: 'play-choices' });
  for (const number of round.choices) {
    const tile = createElement('div', {
      className: 'tile choice',
      text: String(number),
      dataset: { number: String(number) },
    });
    makeDraggable(tile, {
      targets: () => [box, slot],
      onDrop: () => onNumberDropped(tile, number, box, slot, pack),
      onReject: () => onWrong(choices),
      onTap: () => void speakPart(countingPart(pack, number), SPEECH_RATE.DEFAULT),
    });
    choices.append(tile);
  }

  root.append(
    buildPrompt(pack, 'count'),
    buildStars(solvedRounds, ROUNDS_PER_SET),
    box,
    slot,
    choices,
  );
}

/** Counting by tapping: the objects up to the tapped one light up and its number is said. */
async function onItemTapped(box: HTMLElement, position: number, pack: LanguagePack): Promise<void> {
  [...box.children].forEach((item, index) => item.classList.toggle('on', index < position));
  playCountBlip(position);
  beginPlayback();
  await speakPart(countingPart(pack, position), SPEECH_RATE.COUNTING);
}

function onNumberDropped(
  tile: HTMLElement,
  number: number,
  box: HTMLElement,
  slot: HTMLElement,
  pack: LanguagePack,
): boolean {
  if (busy || number !== round.count) return false;
  busy = true;
  slot.textContent = String(number);
  slot.classList.add('done');
  tile.classList.add('placed');
  [...box.children].forEach((item) => item.classList.add('on'));
  box.classList.add('done');
  box.dataset.answer = String(number);
  solvedRounds += 1;
  void finishRound(pack);
  return true;
}

async function finishRound(pack: LanguagePack): Promise<void> {
  const setFinished = finishedSet(solvedRounds);
  byId('countplay')
    .querySelector('.play-stars')
    ?.replaceWith(buildStars(solvedRounds, ROUNDS_PER_SET));
  cheer(setFinished);
  await wait(CHEER_MS);
  beginPlayback();
  await speakPart(countingPart(pack, round.count), SPEECH_RATE.DEFAULT);
  if (setFinished) await sayWellDone(pack);
  await wait(NEXT_ROUND_DELAY_MS);
  startRound();
}

function onWrong(choices: HTMLElement): void {
  if (busy) return;
  playTryAgainSound();
  wrongTries += 1;
  if (wrongTries < TRIES_BEFORE_HINT) return;
  const right = choices.querySelector(`[data-number="${round.count}"]`);
  right?.classList.add('hint');
}
