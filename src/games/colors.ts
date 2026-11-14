import { colorPhrasePart, colorNamePart } from '../content';
import type { ColorEntry, LanguagePack } from '../content';
import { byId, clearChildren, createElement } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback } from '../core/playback';
import { SPEECH_RATE, speakPartsInOrder } from '../core/voice';
import { showInstruction } from '../ui/instruction';
import { createStarTracker, markDoneAfterSpeech, type StarTracker } from '../ui/progressUi';

let tracker: StarTracker | null = null;

export function initColorsGame(): void {
  onLanguageChange(renderColorsGame);
  renderColorsGame(getPack());
}

function renderColorsGame(pack: LanguagePack): void {
  const grid = byId('cgrid');
  clearChildren(grid);
  const tiles = new Map<string, HTMLElement>();
  for (const color of pack.colors) {
    const tile = createElement('button', { className: 'tile swatch', title: color.name });
    tile.style.background = color.hex;
    tile.addEventListener('click', () => onColorTapped(color, tile));
    tiles.set(color.id, tile);
    grid.append(tile);
  }
  resetPreview(pack);
  tracker = createStarTracker({
    game: 'colors',
    pack,
    screen: byId('colors'),
    goal: tiles.size,
    tileFor: (id) => tiles.get(id) ?? null,
    itemIds: [...tiles.keys()],
    celebrateLater: true,
  });
}

function resetPreview(pack: LanguagePack): void {
  const preview = byId('cbig');
  preview.style.background = '';
  preview.textContent = '🎨';
  showInstruction(byId('cname'), pack, 'colors');
  byId('cexample').textContent = '';
}

function onColorTapped(color: ColorEntry, tile: HTMLElement): void {
  document.querySelectorAll('#cgrid .tile').forEach((other) => other.classList.remove('sel'));
  tile.classList.add('sel');

  const preview = byId('cbig');
  preview.style.background = color.hex;
  preview.textContent = color.example.emoji;
  byId('cname').textContent = color.name;
  byId('cexample').textContent = `${color.example.emoji} ${color.example.phrase}`;

  const speech = speakPartsInOrder(
    [colorNamePart(color), colorPhrasePart(color)],
    beginPlayback(),
    SPEECH_RATE.DEFAULT,
  );
  void markDoneAfterSpeech(tracker, color.id, getPack(), speech);
}
