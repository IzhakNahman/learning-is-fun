import { niqqudNamePart, niqqudSoundPart } from '../content';
import type { LanguagePack, NiqqudEntry } from '../content';
import { byId, clearChildren, createElement } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback } from '../core/playback';
import { SPEECH_RATE, speakPartsInOrder } from '../core/voice';
import { showInstruction } from '../ui/instruction';

export function initNiqqudGame(): void {
  onLanguageChange(renderNiqqudGame);
  renderNiqqudGame(getPack());
}

function renderNiqqudGame(pack: LanguagePack): void {
  const grid = byId('qgrid');
  clearChildren(grid);
  for (const entry of pack.niqqud) {
    const tile = createElement('button', {
      className: 'tile niqqud-tile',
      text: entry.sample,
      title: entry.name,
    });
    tile.addEventListener('click', () => onNiqqudTapped(entry, tile));
    grid.append(tile);
  }
  byId('qbig').textContent = pack.niqqud[0]?.sample ?? '';
  showInstruction(byId('qname'), pack, 'niqqud');
  byId('qsound').textContent = '';
}

function onNiqqudTapped(entry: NiqqudEntry, tile: HTMLElement): void {
  document.querySelectorAll('#qgrid .tile').forEach((other) => other.classList.remove('sel'));
  tile.classList.add('sel');
  byId('qbig').textContent = entry.sample;
  byId('qname').textContent = entry.name;
  byId('qsound').textContent = entry.soundText;

  void speakPartsInOrder(
    [niqqudNamePart(entry), niqqudSoundPart(entry)],
    beginPlayback(),
    SPEECH_RATE.LETTER_SOUND,
  );
}
