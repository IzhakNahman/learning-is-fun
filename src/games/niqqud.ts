import { niqqudNamePart, niqqudSoundPart } from '../content';
import type { LanguagePack, NiqqudEntry } from '../content';
import { byId, clearChildren, createElement } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback } from '../core/playback';
import { SPEECH_RATE, speakPartsInOrder } from '../core/voice';
import { showInstruction } from '../ui/instruction';
import { createStarTracker, markDoneAfterSpeech, type StarTracker } from '../ui/progressUi';
import { buildMouthFace, mouthOf } from '../ui/mouthFace';

let tracker: StarTracker | null = null;

export function initNiqqudGame(): void {
  onLanguageChange(renderNiqqudGame);
  renderNiqqudGame(getPack());
}

function renderNiqqudGame(pack: LanguagePack): void {
  const grid = byId('qgrid');
  clearChildren(grid);
  const tiles = new Map<string, HTMLElement>();
  for (const entry of pack.niqqud) {
    const tile = createElement('button', {
      className: 'tile niqqud-tile',
      text: entry.sample,
      title: entry.name,
    });
    tile.addEventListener('click', () => onNiqqudTapped(entry, tile));
    tiles.set(entry.id, tile);
    grid.append(tile);
  }
  byId('qbig').textContent = pack.niqqud[0]?.sample ?? '';
  showMouth(pack.niqqud[0]?.id ?? '');
  showInstruction(byId('qname'), pack, 'niqqud');
  byId('qsound').textContent = '';
  // English has no niqqud game: no stars bar there (and none left over from Hebrew).
  if (tiles.size === 0) {
    byId('niqqud').querySelector('.progress-bar')?.remove();
    return;
  }
  tracker = createStarTracker({
    game: 'niqqud',
    pack,
    screen: byId('niqqud'),
    goal: tiles.size,
    tileFor: (id) => tiles.get(id) ?? null,
    itemIds: [...tiles.keys()],
    celebrateLater: true,
  });
}

function onNiqqudTapped(entry: NiqqudEntry, tile: HTMLElement): void {
  document.querySelectorAll('#qgrid .tile').forEach((other) => other.classList.remove('sel'));
  tile.classList.add('sel');
  byId('qbig').textContent = entry.sample;
  showMouth(entry.id);
  byId('qname').textContent = entry.name;
  byId('qsound').textContent = entry.soundText;

  const speech = speakPartsInOrder(
    [niqqudNamePart(entry), niqqudSoundPart(entry)],
    beginPlayback(),
    SPEECH_RATE.LETTER_SOUND,
  );
  void markDoneAfterSpeech(tracker, entry.id, getPack(), speech);
}

/** The owl's face next to the mark, with the mouth the vowel makes. */
function showMouth(niqqudId: string): void {
  const face = byId('qface');
  clearChildren(face);
  const mouth = mouthOf(niqqudId);
  if (!mouth) return;
  face.append(buildMouthFace(mouth));
}
