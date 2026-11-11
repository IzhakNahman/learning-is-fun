import { countingPart, phraseWordPart } from '../content';
import type { LanguagePack, SpokenPart } from '../content';
import { byId, clearChildren, createElement, wait } from '../core/dom';
import { makeDraggable } from '../core/drag';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback } from '../core/playback';
import { pickDistinct, shuffled } from '../core/random';
import type { RandomSource } from '../core/random';
import { playTryAgainSound } from '../core/sfx';
import { SPEECH_RATE, speakPart, speakPartsInOrder } from '../core/voice';
import { CHEER_MS, buildPrompt, buildStars, cheer, sayWellDone } from '../ui/playScreen';
import { finishedSet, levelFor } from './rounds';
import type { Level } from './rounds';

/** Three sums per round, so a set is shorter than in the other games. */
const ROUNDS_PER_ADD_SET = 3;
const SUMS_PER_ROUND = 3;
const DOTS_PER_ROW = 5;
const LARGEST_SUM_BY_LEVEL: Record<Level, number> = { easy: 5, hard: 10 };
const TRIES_BEFORE_HINT = 2;
const NEXT_ROUND_DELAY_MS = 900;

export interface Sum {
  first: number;
  second: number;
  total: number;
}

export interface AddRound {
  /** The sums in the order shown; every total is different. */
  sums: Sum[];
  /** The answers in the order shown (the same totals, shuffled). */
  answers: number[];
}

/** Three sums with different totals, each made of two groups of at least one. */
export function makeAddRound(level: Level, random: RandomSource = Math.random): AddRound {
  const largest = LARGEST_SUM_BY_LEVEL[level];
  const totals = pickDistinct(
    Array.from({ length: largest - 1 }, (_, index) => index + 2),
    SUMS_PER_ROUND,
    random,
  ).sort((a, b) => a - b);
  const sums = totals.map((total) => {
    const first = 1 + Math.floor(random() * (total - 1));
    return { first, second: total - first, total };
  });
  return { sums: shuffled(sums, random), answers: shuffled(totals, random) };
}

function dots(count: number, className: string): HTMLElement {
  const group = createElement('span', { className: 'add-dots' });
  group.style.setProperty('--cols', String(Math.min(count, DOTS_PER_ROW)));
  for (let index = 0; index < count; index++) {
    group.append(createElement('span', { className: `add-dot ${className}` }));
  }
  return group;
}

function sumParts(pack: LanguagePack, sum: Sum): SpokenPart[] {
  return [
    countingPart(pack, sum.first),
    phraseWordPart(pack, 'plus'),
    countingPart(pack, sum.second),
  ];
}

let solvedRounds = 0;
let wrongTries = 0;
let matched = 0;
let round: AddRound = makeAddRound('easy');

export function initAddGame(): void {
  onLanguageChange(() => startRound());
  startRound();
}

function startRound(): void {
  wrongTries = 0;
  matched = 0;
  round = makeAddRound(levelFor(solvedRounds, ROUNDS_PER_ADD_SET));
  renderRound(getPack());
}

function renderRound(pack: LanguagePack): void {
  const root = byId('addplay');
  clearChildren(root);

  const level = levelFor(solvedRounds, ROUNDS_PER_ADD_SET);
  root.dataset.level = level;
  const board = createElement('div', { className: 'add-board' });
  const slots: HTMLElement[] = [];
  for (const sum of round.sums) {
    const slot = createElement('div', {
      className: 'add-slot',
      text: '?',
      dataset: { total: String(sum.total) },
    });
    slots.push(slot);
    const row = createElement(
      'div',
      { className: 'add-row' },
      dots(sum.first, 'a'),
      createElement('span', { className: 'add-sign', text: '+' }),
      dots(sum.second, 'b'),
      createElement('span', { className: 'add-sign', text: '=' }),
      slot,
    );
    row.addEventListener('click', () => {
      void speakPartsInOrder(sumParts(pack, sum), beginPlayback(), SPEECH_RATE.DEFAULT);
    });
    board.append(row);
  }

  const answers = createElement('div', { className: 'play-choices add-answers' });
  for (const total of round.answers) {
    const card = createElement('div', {
      className: 'add-answer',
      dataset: { total: String(total) },
    });
    card.append(dots(total, 'c'));
    makeDraggable(card, {
      targets: () => slots.filter((slot) => !slot.classList.contains('done')),
      onDrop: (target) => onAnswerDropped(pack, card, total, target),
      onReject: () => onWrong(answers),
      onTap: () => void speakPart(countingPart(pack, total), SPEECH_RATE.DEFAULT),
    });
    answers.append(card);
  }

  root.append(
    buildPrompt(pack, 'add'),
    buildStars(solvedRounds, ROUNDS_PER_ADD_SET),
    board,
    answers,
  );
}

function onAnswerDropped(
  pack: LanguagePack,
  card: HTMLElement,
  total: number,
  slot: HTMLElement,
): boolean {
  if (Number(slot.dataset.total) !== total) return false;
  const sum = round.sums.find((entry) => entry.total === total);
  if (!sum) return false;
  slot.textContent = '';
  slot.append(dots(total, 'c'));
  slot.classList.add('done');
  card.classList.add('placed');
  wrongTries = 0;
  matched += 1;
  void afterMatch(pack, sum);
  return true;
}

async function afterMatch(pack: LanguagePack, sum: Sum): Promise<void> {
  const roundDone = matched === SUMS_PER_ROUND;
  if (roundDone) solvedRounds += 1;
  const setFinished = roundDone && finishedSet(solvedRounds, ROUNDS_PER_ADD_SET);
  if (roundDone) {
    byId('addplay')
      .querySelector('.play-stars')
      ?.replaceWith(buildStars(solvedRounds, ROUNDS_PER_ADD_SET));
  }
  cheer(setFinished);
  await wait(CHEER_MS);
  const playbackId = beginPlayback();
  await speakPartsInOrder(
    [...sumParts(pack, sum), phraseWordPart(pack, 'equals'), countingPart(pack, sum.total)],
    playbackId,
    SPEECH_RATE.DEFAULT,
  );
  if (!roundDone) return;
  if (setFinished) await sayWellDone(pack);
  await wait(NEXT_ROUND_DELAY_MS);
  startRound();
}

function onWrong(answers: HTMLElement): void {
  playTryAgainSound();
  wrongTries += 1;
  if (wrongTries < TRIES_BEFORE_HINT) return;
  // Light up an answer that has not been placed yet.
  answers.querySelector('.add-answer:not(.placed)')?.classList.add('hint');
}
