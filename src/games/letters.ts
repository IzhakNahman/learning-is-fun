import { finalSuffixPart, letterNamePart, letterSoundPart } from '../content';
import type { LanguagePack } from '../content';
import { byId, clearChildren, createElement, wait } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback, isCurrentPlayback } from '../core/playback';
import { SPEECH_RATE, speakPartsInOrder } from '../core/voice';
import { showInstruction } from '../ui/instruction';

const PAUSE_BETWEEN_NAME_AND_SOUND_MS = 200;

export function initLettersGame(): void {
  onLanguageChange(renderLettersGame);
  renderLettersGame(getPack());
}

function renderLettersGame(pack: LanguagePack): void {
  const grid = byId('lgrid');
  clearChildren(grid);

  for (const entry of pack.letters) {
    const tile = createElement('button', { className: 'tile', text: entry.tileText });
    tile.addEventListener('click', () => void onLetterTapped(entry.key, false, tile));
    grid.append(tile);
  }
  for (const finalLetter of pack.finalLetters) {
    const tile = createElement('button', { className: 'tile fin', text: finalLetter.char });
    tile.addEventListener('click', () => void onLetterTapped(finalLetter.baseKey, true, tile));
    grid.append(tile);
  }

  byId('lbig').textContent = '?';
  showInstruction(byId('lname'), pack, 'letters');
  byId('lsnd').textContent = '';
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

  const finalSuffix = isFinalForm ? pack.ui.letters.finalSuffix : '';
  byId('lbig').textContent = isFinalForm ? tile.textContent : entry.tileText;
  byId('lname').textContent = `${entry.name} ${finalSuffix}`.trim();
  byId('lsnd').textContent = entry.soundText;

  const playbackId = beginPlayback();
  const nameSequence = isFinalForm ? [nameParts, finalSuffixPart(pack)] : [nameParts];
  await speakPartsInOrder(nameSequence, playbackId, SPEECH_RATE.LETTER_NAME);
  if (!isCurrentPlayback(playbackId)) return;
  await wait(PAUSE_BETWEEN_NAME_AND_SOUND_MS);
  await speakPartsInOrder([soundPart], playbackId, SPEECH_RATE.LETTER_SOUND);
}
