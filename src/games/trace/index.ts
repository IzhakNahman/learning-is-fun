import { finalSuffixPart, letterNamePart, letterSoundPart } from '../../content';
import type { LanguageCode, LanguagePack } from '../../content';
import { byId, clearChildren, createElement, wait } from '../../core/dom';
import { getPack, onLanguageChange } from '../../core/i18n';
import { beginPlayback, isCurrentPlayback } from '../../core/playback';
import { registerScreen } from '../../core/router';
import { WIN_SOUND_SECONDS, playTapBlip, playWinSound } from '../../core/sfx';
import { readSetting, writeSetting } from '../../core/storage';
import { SPEECH_RATE, speakPartsInOrder } from '../../core/voice';
import { showInstruction } from '../../ui/instruction';
import { advanceAlong, isAtEnd, isNearDot, sampleStroke } from './engine';
import { svgElement } from '../../core/svg';
import { polyline, shapeIcon } from './icon';
import { resolveLetter } from './letters';
import { ADDITION_COLOR, DRAWING_BOX } from './shapes';
import type { LetterShape, Point, TraceFamily, TraceSet } from './shapes';
import { englishTrace } from './shapes.en';
import { hebrewTrace } from './shapes.he';

const PAUSE_BETWEEN_NAME_AND_SOUND_MS = 200;
const PAUSE_AFTER_WIN_SOUND_MS = 150;
const WIN_SOUND_MS = WIN_SOUND_SECONDS * 1000;
const TRACE_SETS: Record<LanguageCode, TraceSet> = { he: hebrewTrace, en: englishTrace };
/** The first tile of every group: the group's basic shape, practised on its own. */
const BASIC_KEY = 'basic';
/** Sizes in drawing units (the drawing box is 100 wide). */
const DOT_RADIUS = 6.5;
const DOT_HALO_RADIUS = 9;
const DOT_HALO_OPACITY = 0.3;
const DOT_NUMBER_FONT_SIZE = 7;
const DOT_NUMBER_OFFSET_Y = 2.5;
/** How faded a stroke is until the child has drawn it. */
const PENDING_STROKE_OPACITY = 0.22;

interface ActiveItem {
  /** A letter key, or `BASIC_KEY` for the group's basic shape. */
  itemKey: string;
  shape: LetterShape;
  family: TraceFamily;
  samples: Point[][];
  strokeIndex: number;
  sampleIndex: number;
  dragging: boolean;
  finished: boolean;
}

let familyIndex = 0;
let active: ActiveItem | null = null;
let completed = new Set<string>();

export function initTraceGame(): void {
  const svg = byId<HTMLElement>('tsvg');
  const { x, y, width, height } = DRAWING_BOX;
  svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', stopDragging);
  svg.addEventListener('pointercancel', stopDragging);
  svg.addEventListener('lostpointercapture', stopDragging);
  // Nothing may stay "held" when the page is hidden or the game is left.
  window.addEventListener('blur', stopDragging);
  document.addEventListener('visibilitychange', stopDragging);
  registerScreen('trace', { leave: stopDragging });
  onLanguageChange(renderTraceGame);
  renderTraceGame(getPack());
}

function storageKey(pack: LanguagePack): string {
  return `trace-done-${pack.code}`;
}

function loadCompleted(pack: LanguagePack): Set<string> {
  const saved = readSetting(storageKey(pack));
  return new Set(saved ? saved.split(',').filter(Boolean) : []);
}

function currentSet(pack: LanguagePack): TraceSet {
  return TRACE_SETS[pack.code];
}

/** Progress key: a letter's own key, or "basic:<group id>" for a group's basic shape. */
function progressKey(family: TraceFamily, itemKey: string): string {
  return itemKey === BASIC_KEY ? `${BASIC_KEY}:${family.id}` : itemKey;
}

/** The items of a group in order: the basic shape first, then its letters. */
function itemsOf(family: TraceFamily): string[] {
  return [BASIC_KEY, ...family.letters];
}

function renderTraceGame(pack: LanguagePack): void {
  familyIndex = 0;
  completed = loadCompleted(pack);
  renderControls(pack);
  showNothingSelected(pack);
}

function showNothingSelected(pack: LanguagePack): void {
  active = null;
  renderFamilies(pack);
  renderItemTiles(pack);
  clearChildren(byId('tdrawing'));
  clearChildren(byId('tletter'));
  clearChildren(byId('tlegend'));
  showInstruction(byId('tname'), pack, 'trace');
}

function renderFamilies(pack: LanguagePack): void {
  const container = byId('tfamilies');
  clearChildren(container);
  currentSet(pack).families.forEach((family, index) => {
    const label = `${pack.ui.trace.groupLabel} ${index + 1}`;
    const button = createElement('button', {
      className: index === familyIndex ? 'tile trace-family sel' : 'tile trace-family',
    });
    button.style.borderBottomColor = family.color;
    button.append(shapeIcon(family.basicShape, family.color), label);
    button.addEventListener('click', () => selectFamily(index));
    container.append(button);
  });
}

function renderItemTiles(pack: LanguagePack): void {
  const grid = byId('tgrid');
  clearChildren(grid);
  const family = currentSet(pack).families[familyIndex];
  if (!family) return;
  for (const itemKey of itemsOf(family)) {
    const classes = ['tile'];
    if (itemKey === BASIC_KEY) classes.push('basic');
    if (completed.has(progressKey(family, itemKey))) classes.push('done');
    if (active?.itemKey === itemKey) classes.push('sel');
    const tile = createElement('button', { className: classes.join(' ') });
    if (itemKey === BASIC_KEY) tile.append(shapeIcon(family.basicShape, family.color));
    else tile.textContent = itemKey;
    tile.addEventListener('click', () => startItem(itemKey));
    grid.append(tile);
  }
}

function renderControls(pack: LanguagePack): void {
  const controls = byId('tcontrols');
  clearChildren(controls);
  controls.append(
    createElement('button', { className: 'btn', text: pack.ui.trace.next, onClick: goToNext }),
  );
}

function selectFamily(index: number): void {
  familyIndex = index;
  showNothingSelected(getPack());
}

function startItem(itemKey: string): void {
  const pack = getPack();
  const set = currentSet(pack);
  const family = set.families[familyIndex];
  const shape = itemKey === BASIC_KEY ? family?.basicShape : set.shapes[itemKey];
  if (!shape || !family) return;
  beginPlayback();
  active = {
    itemKey,
    shape,
    family,
    samples: shape.strokes.map((stroke) => sampleStroke(stroke)),
    strokeIndex: 0,
    sampleIndex: 0,
    dragging: false,
    finished: false,
  };
  renderItemTiles(pack);
  showTitle(pack, family, itemKey);
  renderLegend(pack, family);
  draw();
}

/** Shows the letter itself and its name above the drawing (for the basic shape: the group). */
function showTitle(pack: LanguagePack, family: TraceFamily, itemKey: string): void {
  const letterBox = byId('tletter');
  clearChildren(letterBox);
  const name = byId('tname');
  if (itemKey === BASIC_KEY) {
    const index = currentSet(pack).families.indexOf(family);
    letterBox.append(shapeIcon(family.basicShape, family.color));
    name.textContent = `${pack.ui.trace.groupLabel} ${index + 1}`;
    return;
  }
  const resolved = resolveLetter(pack, itemKey);
  const entry = pack.letters.find((item) => item.key === resolved?.letterKey);
  const suffix = resolved?.isFinal ? pack.ui.letters.finalSuffix : '';
  const useDotted = pack.code === 'he' && !resolved?.isFinal;
  letterBox.textContent = useDotted && entry ? entry.tileText : itemKey;
  name.textContent = entry ? `${entry.name} ${suffix}`.trim() : itemKey;
}

function renderLegend(pack: LanguagePack, family: TraceFamily): void {
  const legend = byId('tlegend');
  clearChildren(legend);
  const item = (color: string, text: string): HTMLElement => {
    const dot = createElement('span', { className: 'legend-dot' });
    dot.style.background = color;
    return createElement('span', { className: 'legend-item' }, dot, text);
  };
  legend.append(
    item(family.color, pack.ui.trace.baseLegend),
    item(ADDITION_COLOR, pack.ui.trace.additionLegend),
  );
}

function colorOfStroke(item: ActiveItem, strokeIndex: number): string {
  return strokeIndex < item.shape.baseStrokes ? item.family.color : ADDITION_COLOR;
}

function draw(): void {
  const drawing = byId('tdrawing');
  clearChildren(drawing);
  if (!active) return;
  const item = active;

  item.samples.forEach((samples, index) => {
    const done = index < item.strokeIndex || item.finished;
    drawing.append(
      polyline(samples, colorOfStroke(item, index), done ? 1 : PENDING_STROKE_OPACITY),
    );
  });
  if (item.finished) return;

  const samples = item.samples[item.strokeIndex];
  const dot = samples?.[item.sampleIndex];
  if (!samples || !dot) return;
  const color = colorOfStroke(item, item.strokeIndex);
  drawing.append(polyline(samples.slice(0, item.sampleIndex + 1), color, 1));
  if (item.sampleIndex === 0) {
    drawing.append(
      svgElement('circle', {
        cx: String(dot[0]),
        cy: String(dot[1]),
        r: String(DOT_HALO_RADIUS),
        fill: color,
        'fill-opacity': String(DOT_HALO_OPACITY),
      }),
    );
  }
  drawing.append(
    svgElement('circle', {
      cx: String(dot[0]),
      cy: String(dot[1]),
      r: String(DOT_RADIUS),
      fill: '#ef9f27',
      stroke: '#854f0b',
      'stroke-width': '1',
    }),
  );
  const number = svgElement('text', {
    x: String(dot[0]),
    y: String(dot[1] + DOT_NUMBER_OFFSET_Y),
    'font-size': String(DOT_NUMBER_FONT_SIZE),
    'text-anchor': 'middle',
    fill: '#412402',
    'font-weight': '700',
  });
  number.textContent = String(item.strokeIndex + 1);
  drawing.append(number);
}

function toDrawingPoint(event: PointerEvent): Point | null {
  const svg = byId<HTMLElement>('tsvg') as unknown as SVGSVGElement;
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return [point.x, point.y];
}

function onPointerDown(event: PointerEvent): void {
  if (!active || active.finished) return;
  const point = toDrawingPoint(event);
  const dot = active.samples[active.strokeIndex]?.[active.sampleIndex];
  if (!point || !dot || !isNearDot(point, dot)) return;
  event.preventDefault();
  active.dragging = true;
  (event.currentTarget as Element).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (!active?.dragging) return;
  const point = toDrawingPoint(event);
  const samples = active.samples[active.strokeIndex];
  if (!point || !samples) return;
  const next = advanceAlong(samples, active.sampleIndex, point);
  if (next === active.sampleIndex) return;
  active.sampleIndex = next;
  if (isAtEnd(samples, next)) finishStroke(active);
  else draw();
}

function stopDragging(): void {
  if (active) active.dragging = false;
}

function finishStroke(item: ActiveItem): void {
  item.dragging = false;
  const isLastStroke = item.strokeIndex + 1 >= item.samples.length;
  // The last stroke gets the win sound instead of the small blip.
  if (!isLastStroke) playTapBlip(item.strokeIndex);
  item.strokeIndex += 1;
  item.sampleIndex = 0;
  if (isLastStroke) finishItem(item);
  else draw();
}

function finishItem(item: ActiveItem): void {
  const pack = getPack();
  item.finished = true;
  completed.add(progressKey(item.family, item.itemKey));
  writeSetting(storageKey(pack), [...completed].join(','));
  renderItemTiles(pack);
  draw();
  const isBasicShape = item.itemKey === BASIC_KEY;
  playWinSound(isBasicShape);
  if (!isBasicShape) void sayLetter(item.itemKey);
}

async function sayLetter(letterKey: string): Promise<void> {
  const pack = getPack();
  const resolved = resolveLetter(pack, letterKey);
  if (!resolved) return;
  const nameParts = letterNamePart(pack, resolved.letterKey);
  const soundPart = letterSoundPart(pack, resolved.letterKey);
  if (!nameParts || !soundPart) return;
  const playbackId = beginPlayback();
  // First the win sound, then the letter name and its sound.
  await wait(WIN_SOUND_MS + PAUSE_AFTER_WIN_SOUND_MS);
  if (!isCurrentPlayback(playbackId)) return;
  const nameSequence = resolved.isFinal ? [nameParts, finalSuffixPart(pack)] : [nameParts];
  await speakPartsInOrder(nameSequence, playbackId, SPEECH_RATE.LETTER_NAME);
  if (!isCurrentPlayback(playbackId)) return;
  await wait(PAUSE_BETWEEN_NAME_AND_SOUND_MS);
  await speakPartsInOrder([soundPart], playbackId, SPEECH_RATE.LETTER_SOUND);
}

/** Moves to the next item of the group, then to the basic shape of the next group. */
function goToNext(): void {
  const pack = getPack();
  const families = currentSet(pack).families;
  const family = families[familyIndex];
  if (!family) return;
  const items = itemsOf(family);
  const position = active ? items.indexOf(active.itemKey) : -1;
  const nextInGroup = items[position + 1];
  if (nextInGroup) {
    startItem(nextInGroup);
    return;
  }
  selectFamily((familyIndex + 1) % families.length);
  startItem(BASIC_KEY);
}
