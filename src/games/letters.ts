import { finalSuffixPart, letterNamePart, letterSoundPart } from '../content';
import type { LanguagePack } from '../content';
import { byId, clearChildren, createElement, wait } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback, isCurrentPlayback } from '../core/playback';
import { SPEECH_RATE, speakPartsInOrder } from '../core/voice';
import { showInstruction } from '../ui/instruction';
import { createStarTracker, markDoneAfterSpeech, type StarTracker } from '../ui/progressUi';

const PAUSE_BETWEEN_NAME_AND_SOUND_MS = 200;

let tracker: StarTracker | null = null;
/** The letter shown now (its key), so "next letter" knows where to go on. */
let currentKey: string | null = null;

export function initLettersGame(): void {
  byId('lnext').addEventListener('click', showNextLetter);
  onLanguageChange(renderLettersGame);
  renderLettersGame(getPack());
}

function renderLettersGame(pack: LanguagePack): void {
  const grid = byId('lgrid');
  clearChildren(grid);
  currentKey = null;
  const tiles = new Map<string, HTMLElement>();

  for (const entry of pack.letters) {
    const tile = createElement('button', { className: 'tile', text: entry.tileText });
    tile.addEventListener('click', () => void onLetterTapped(entry.key, false, tile));
    tiles.set(entry.key, tile);
    grid.append(tile);
  }
  for (const finalLetter of pack.finalLetters) {
    const tile = createElement('button', { className: 'tile fin', text: finalLetter.char });
    tile.addEventListener('click', () => void onLetterTapped(finalLetter.baseKey, true, tile));
    tiles.set(finalStarId(finalLetter.char), tile);
    grid.append(tile);
  }

  byId('lbig').textContent = '?';
  showInstruction(byId('lname'), pack, 'letters');
  byId('lsnd').textContent = '';
  const next = byId('lnext');
  next.textContent = `${pack.ui.trace.next} ${pack.dir === 'rtl' ? '◀' : '▶'}`;

  // Every tile has its own ⭐, final forms (ך) too: the goal is every tile.
  tracker = createStarTracker({
    game: 'letters',
    pack,
    screen: byId('letters'),
    goal: tiles.size,
    tileFor: (key) => tiles.get(key) ?? null,
    itemIds: [...tiles.keys()],
    celebrateLater: true,
  });
}

/** A final form's own star id, so ך gets its own ⭐ and does not light up כ. */
function finalStarId(char: string): string {
  return `final:${char}`;
}

/** "Next letter": the letter after the one shown (the first one when none is shown yet). */
function showNextLetter(): void {
  const pack = getPack();
  const keys = pack.letters.map((entry) => entry.key);
  const index = currentKey === null ? -1 : keys.indexOf(currentKey);
  const nextKey = keys[(index + 1) % keys.length];
  if (nextKey === undefined) return;
  const tile = [...byId('lgrid').querySelectorAll<HTMLElement>('.tile:not(.fin)')][
    keys.indexOf(nextKey)
  ];
  if (!tile) return;
  tile.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  void onLetterTapped(nextKey, false, tile);
}

async function onLetterTapped(
  letterKey: string,
  isFinalForm: boolean,
  tile: HTMLElement,
): Promise<void> {
  const pack = getPack();
  const entry = pack.letters.find((item) => item.key === letterKey);
  const nameParts = letterNamePart(pack, letterKey);
  const soundPart = letterSoundPart(pack, letterKey);
  if (!entry || !nameParts || !soundPart) return;

  document.querySelectorAll('#lgrid .tile').forEach((other) => other.classList.remove('sel'));
  tile.classList.add('sel');
  currentKey = letterKey;

  const finalSuffix = isFinalForm ? pack.ui.letters.finalSuffix : '';
  byId('lbig').textContent = isFinalForm ? tile.textContent : entry.tileText;
  byId('lname').textContent = `${entry.name} ${finalSuffix}`.trim();
  byId('lsnd').textContent = entry.soundText;

  const playbackId = beginPlayback();
  const nameSequence = isFinalForm ? [nameParts, finalSuffixPart(pack)] : [nameParts];
  const speech = (async (): Promise<void> => {
    await speakPartsInOrder(nameSequence, playbackId, SPEECH_RATE.LETTER_NAME);
    if (!isCurrentPlayback(playbackId)) return;
    await wait(PAUSE_BETWEEN_NAME_AND_SOUND_MS);
    await speakPartsInOrder([soundPart], playbackId, SPEECH_RATE.LETTER_SOUND);
  })();
  const starId = isFinalForm ? finalStarId(tile.textContent ?? '') : letterKey;
  await markDoneAfterSpeech(tracker, starId, pack, speech);
}
