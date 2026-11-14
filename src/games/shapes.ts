import { shapeNamePart } from '../content';
import type { LanguagePack, ShapeEntry } from '../content';
import { byId, clearChildren, createElement } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback } from '../core/playback';
import { SPEECH_RATE, speakPartsInOrder } from '../core/voice';
import { showInstruction } from '../ui/instruction';
import { buildShapeSvg, shapeColor } from './shapeArt';
import { createStarTracker, markDoneAfterSpeech, type StarTracker } from '../ui/progressUi';

let tracker: StarTracker | null = null;

export function initShapesGame(): void {
  onLanguageChange(renderShapesGame);
  renderShapesGame(getPack());
}

function renderShapesGame(pack: LanguagePack): void {
  const grid = byId('shgrid');
  clearChildren(grid);
  const tiles = new Map<string, HTMLElement>();
  pack.shapes.forEach((shape, index) => {
    const tile = createElement('button', { className: 'tile shape-tile', title: shape.name });
    tile.append(buildShapeSvg(shape.id, shapeColor(index)));
    tile.addEventListener('click', () => onShapeTapped(shape, index, tile));
    tiles.set(shape.id, tile);
    grid.append(tile);
  });
  resetPreview(pack);
  tracker = createStarTracker({
    game: 'shapes',
    pack,
    screen: byId('shapes'),
    goal: tiles.size,
    tileFor: (id) => tiles.get(id) ?? null,
    itemIds: [...tiles.keys()],
    celebrateLater: true,
  });
}

function resetPreview(pack: LanguagePack): void {
  clearChildren(byId('shbig'));
  byId('shbig').textContent = '🔷';
  showInstruction(byId('shname'), pack, 'shapes');
}

function onShapeTapped(shape: ShapeEntry, index: number, tile: HTMLElement): void {
  document.querySelectorAll('#shgrid .tile').forEach((other) => other.classList.remove('sel'));
  tile.classList.add('sel');

  const preview = byId('shbig');
  clearChildren(preview);
  preview.append(buildShapeSvg(shape.id, shapeColor(index)));
  byId('shname').textContent = shape.name;

  const speech = speakPartsInOrder([shapeNamePart(shape)], beginPlayback(), SPEECH_RATE.DEFAULT);
  void markDoneAfterSpeech(tracker, shape.id, getPack(), speech);
}
