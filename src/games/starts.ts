import { finishRoundGame } from '../ui/progressUi';
import { letterSoundPart, wordPart } from '../content';
import type { LanguagePack, LetterEntry, WordEntry } from '../content';
import { byId, clearChildren, createElement, wait } from '../core/dom';
import { makeDraggable } from '../core/drag';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback } from '../core/playback';
import { pickRandom, shuffled } from '../core/random';
import type { RandomSource } from '../core/random';
import { playTryAgainSound } from '../core/sfx';
import { SPEECH_RATE, speakPart, speakPartsInOrder } from '../core/voice';
import { CHEER_MS, buildPrompt, buildStars, cheer, sayWellDone } from '../ui/playScreen';
import { ROUNDS_PER_SET, finishedSet, levelFor } from './rounds';
import type { Level } from './rounds';

const CHOICES_BY_LEVEL: Record<Level, number> = { easy: 3, hard: 4 };
const TRIES_BEFORE_HINT = 2;
const NEXT_ROUND_DELAY_MS = 900;
/** Hebrew letters like ב and בּ look almost the same, so they are never offered together. */
const baseCharacter = (letter: LetterEntry): string => letter.key.slice(0, 1).toLowerCase();

export interface StartsRound {
  word: WordEntry;
  /** Letters in the order shown; exactly one is the first letter of the word. */
  letters: LetterEntry[];
}

export function makeStartsRound(
  pack: Pick<LanguagePack, 'words' | 'letters'>,
  level: Level,
  previousWordId: string | null = null,
  random: RandomSource = Math.random,
): StartsRound {
  const words = pack.words.filter((word) => word.id !== previousWordId);
  const word = pickRandom(words, random) ?? pack.words[0];
  const right = pack.letters.find((letter) => letter.key === word?.startKey);
  if (!word || !right) throw new Error('A word needs a first letter');
  const wrong: LetterEntry[] = [];
  const usedBases = new Set([baseCharacter(right)]);
  for (const letter of shuffled(pack.letters, random)) {
    if (wrong.length === CHOICES_BY_LEVEL[level] - 1) break;
    if (usedBases.has(baseCharacter(letter))) continue;
    usedBases.add(baseCharacter(letter));
    wrong.push(letter);
  }
  return { word, letters: shuffled([right, ...wrong], random) };
}

let solvedRounds = 0;
let wrongTries = 0;
let busy = false;
let round: StartsRound | null = null;

export function initStartsGame(): void {
  onLanguageChange(() => startRound());
  startRound();
}

function startRound(): void {
  busy = false;
  wrongTries = 0;
  const pack = getPack();
  round = makeStartsRound(pack, levelFor(solvedRounds), round?.word.id ?? null);
  renderRound(pack, round);
}

function renderRound(pack: LanguagePack, current: StartsRound): void {
  const { word } = current;
  const root = byId('startsplay');
  clearChildren(root);

  const caption = createElement('div', { className: 'starts-word' });
  const picture = createElement('div', { className: 'starts-picture', text: word.emoji });
  const targets = createElement('div', { className: 'play-choices starts-letters' });
  const letterTiles: HTMLElement[] = [];

  const sayWord = (): void => {
    const part = wordPart(pack, word.id);
    if (part) void speakPart(part, SPEECH_RATE.WORD);
  };
  makeDraggable(picture, {
    targets: () => letterTiles,
    onDrop: (target) => onPictureDropped(pack, word, target, picture, caption),
    onReject: () => onWrong(targets, current),
    onTap: sayWord,
  });

  for (const letter of current.letters) {
    const tile = createElement('div', {
      className: 'tile starts-letter',
      text: letter.tileText,
      dataset: { key: letter.key },
    });
    letterTiles.push(tile);
    targets.append(tile);
  }

  root.append(
    buildPrompt(pack, 'starts'),
    buildStars(solvedRounds, ROUNDS_PER_SET),
    createElement('div', { className: 'starts-stage' }, picture, caption),
    targets,
  );
}

function onPictureDropped(
  pack: LanguagePack,
  word: WordEntry,
  target: HTMLElement,
  picture: HTMLElement,
  caption: HTMLElement,
): boolean {
  if (busy || target.dataset.key !== word.startKey) return false;
  busy = true;
  target.classList.add('right');
  picture.classList.add('placed');
  caption.textContent = word.shown;
  solvedRounds += 1;
  void finishRound(pack, word);
  return true;
}

async function finishRound(pack: LanguagePack, word: WordEntry): Promise<void> {
  const setFinished = finishedSet(solvedRounds);
  byId('startsplay')
    .querySelector('.play-stars')
    ?.replaceWith(buildStars(solvedRounds, ROUNDS_PER_SET));
  cheer(setFinished);
  if (setFinished) finishRoundGame('starts', pack);
  await wait(CHEER_MS);
  const playbackId = beginPlayback();
  const parts = [wordPart(pack, word.id), letterSoundPart(pack, word.startKey)];
  await speakPartsInOrder(
    parts.filter((part) => part !== null),
    playbackId,
    SPEECH_RATE.WORD,
  );
  if (setFinished) await sayWellDone(pack);
  await wait(NEXT_ROUND_DELAY_MS);
  startRound();
}

function onWrong(targets: HTMLElement, current: StartsRound): void {
  if (busy) return;
  playTryAgainSound();
  wrongTries += 1;
  if (wrongTries < TRIES_BEFORE_HINT) return;
  targets.querySelector(`[data-key="${current.word.startKey}"]`)?.classList.add('hint');
}
