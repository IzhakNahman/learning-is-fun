import { lookalikeNamePart, shapeNamePart } from '../content';
import type { LanguagePack, LookalikeEntry, ShapeEntry } from '../content';
import { byId, clearChildren, createElement, wait } from '../core/dom';
import { makeDraggable } from '../core/drag';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback } from '../core/playback';
import { pickDistinct, pickRandom, shuffled } from '../core/random';
import type { RandomSource } from '../core/random';
import { playTryAgainSound } from '../core/sfx';
import { SPEECH_RATE, speakPart, speakPartsInOrder } from '../core/voice';
import { CHEER_MS, buildPrompt, buildStars, cheer, sayWellDone } from '../ui/playScreen';
import { buildShapeSvg, shapeColor } from './shapeArt';
import { ROUNDS_PER_SET, finishedSet, levelFor } from './rounds';
import type { Level } from './rounds';

const CHOICES_BY_LEVEL: Record<Level, number> = { easy: 2, hard: 3 };
const TRIES_BEFORE_HINT = 2;
const NEXT_ROUND_DELAY_MS = 900;

/** Shapes that are easy to mix up; the hard level offers them together on purpose. */
const LOOK_ALIKES: Record<string, string> = {
  square: 'rectangle',
  rectangle: 'square',
  circle: 'oval',
  oval: 'circle',
  rhombus: 'square',
};

export interface LookalikeRound {
  object: LookalikeEntry;
  /** Shape ids in the order shown; exactly one is the shape the picture looks like. */
  shapeIds: string[];
}

/** Picks a picture (never the previous one) and the shapes to choose from. */
export function makeLookalikeRound(
  objects: readonly LookalikeEntry[],
  level: Level,
  previousId: string | null = null,
  random: RandomSource = Math.random,
): LookalikeRound {
  const candidates = objects.filter((entry) => entry.id !== previousId);
  const object = pickRandom(candidates, random) ?? objects[0];
  if (!object) throw new Error('No look-alike pictures');
  const allShapes = [...new Set(objects.map((entry) => entry.shapeId))];
  const similar = LOOK_ALIKES[object.shapeId];
  const others = allShapes.filter((id) => id !== object.shapeId);
  const wanted = CHOICES_BY_LEVEL[level] - 1;
  const wrong: string[] = [];
  if (level === 'hard' && similar && others.includes(similar)) wrong.push(similar);
  // Easy rounds avoid the shape that is easiest to confuse with the right one.
  const pool = others.filter((id) => !wrong.includes(id) && (level === 'hard' || id !== similar));
  wrong.push(...pickDistinct(pool, wanted - wrong.length, random));
  return { object, shapeIds: shuffled([object.shapeId, ...wrong], random) };
}

let solvedRounds = 0;
let wrongTries = 0;
let busy = false;
let round: LookalikeRound | null = null;

export function initLookalikeGame(): void {
  onLanguageChange(() => startRound());
  startRound();
}

function startRound(): void {
  busy = false;
  wrongTries = 0;
  const pack = getPack();
  round = makeLookalikeRound(pack.lookalikes, levelFor(solvedRounds), round?.object.id ?? null);
  renderRound(pack, round);
}

function findShape(pack: LanguagePack, id: string): ShapeEntry {
  const shape = pack.shapes.find((entry) => entry.id === id);
  if (!shape) throw new Error(`Unknown shape "${id}"`);
  return shape;
}

function renderRound(pack: LanguagePack, current: LookalikeRound): void {
  const { object } = current;
  const root = byId('lookalikeplay');
  clearChildren(root);

  const caption = createElement('div', { className: 'starts-word' });
  const picture = createElement('div', { className: 'starts-picture', text: object.emoji });
  const targets = createElement('div', { className: 'play-choices' });
  const shapeTiles: HTMLElement[] = [];

  makeDraggable(picture, {
    targets: () => shapeTiles,
    onDrop: (target) => onPictureDropped(pack, object, target, picture, caption),
    onReject: () => onWrong(targets, object),
    onTap: () => void speakPart(lookalikeNamePart(object), SPEECH_RATE.WORD),
  });

  for (const id of current.shapeIds) {
    const shape = findShape(pack, id);
    const index = pack.shapes.indexOf(shape);
    const tile = createElement('div', {
      className: 'tile lookalike-target',
      title: shape.name,
      dataset: { shape: id },
    });
    tile.append(buildShapeSvg(id, shapeColor(index)));
    shapeTiles.push(tile);
    targets.append(tile);
  }

  root.append(
    buildPrompt(pack, 'lookalike'),
    buildStars(solvedRounds, ROUNDS_PER_SET),
    createElement('div', { className: 'starts-stage' }, picture, caption),
    targets,
  );
}

function onPictureDropped(
  pack: LanguagePack,
  object: LookalikeEntry,
  target: HTMLElement,
  picture: HTMLElement,
  caption: HTMLElement,
): boolean {
  if (busy || target.dataset.shape !== object.shapeId) return false;
  busy = true;
  target.classList.add('right');
  picture.classList.add('placed');
  caption.textContent = `${object.name} – ${findShape(pack, object.shapeId).name}`;
  solvedRounds += 1;
  void finishRound(pack, object);
  return true;
}

async function finishRound(pack: LanguagePack, object: LookalikeEntry): Promise<void> {
  const setFinished = finishedSet(solvedRounds);
  byId('lookalikeplay')
    .querySelector('.play-stars')
    ?.replaceWith(buildStars(solvedRounds, ROUNDS_PER_SET));
  cheer(setFinished);
  await wait(CHEER_MS);
  const playbackId = beginPlayback();
  await speakPartsInOrder(
    [lookalikeNamePart(object), shapeNamePart(findShape(pack, object.shapeId))],
    playbackId,
    SPEECH_RATE.WORD,
  );
  if (setFinished) await sayWellDone(pack);
  await wait(NEXT_ROUND_DELAY_MS);
  startRound();
}

function onWrong(targets: HTMLElement, object: LookalikeEntry): void {
  if (busy) return;
  playTryAgainSound();
  wrongTries += 1;
  if (wrongTries < TRIES_BEFORE_HINT) return;
  targets.querySelector(`[data-shape="${object.shapeId}"]`)?.classList.add('hint');
}
