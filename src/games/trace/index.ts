import { finalSuffixPart, letterNamePart, letterSoundPart } from '../../content';
import type { LanguageCode, LanguagePack } from '../../content';
import { byId, clearChildren, createElement, wait } from '../../core/dom';
import { getPack, onLanguageChange } from '../../core/i18n';
import { beginPlayback, isCurrentPlayback } from '../../core/playback';
import { playTapBlip } from '../../core/sfx';
import { readSetting, writeSetting } from '../../core/storage';
import { SPEECH_RATE, speakPartsInOrder } from '../../core/voice';
import { showInstruction } from '../../ui/instruction';
import { advanceAlong, isAtEnd, isNearDot, sampleStroke } from './engine';
import { resolveLetter } from './letters';
import { ADDITION_COLOR, DRAWING_BOX } from './shapes';
import type { LetterShape, Point, TraceFamily, TraceSet } from './shapes';
import { englishTrace } from './shapes.en';
import { hebrewTrace } from './shapes.he';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const PAUSE_BETWEEN_NAME_AND_SOUND_MS = 200;
const LINE_WIDTH = 9;
const TRACE_SETS: Record<LanguageCode, TraceSet> = { he: hebrewTrace, en: englishTrace };

interface ActiveLetter {
  shapeKey: string;
  shape: LetterShape;
  family: TraceFamily;
  samples: Point[][];
  strokeIndex: number;
  sampleIndex: number;
  dragging: boolean;
  finished: boolean;
}

let familyIndex = 0;
let active: ActiveLetter | null = null;
let completed = new Set<string>();

export function initTraceGame(): void {
  const svg = byId<HTMLElement>('tsvg');
  const { x, y, width, height } = DRAWING_BOX;
  svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', stopDragging);
  svg.addEventListener('pointercancel', stopDragging);
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

function renderTraceGame(pack: LanguagePack): void {
  familyIndex = 0;
  active = null;
  completed = loadCompleted(pack);
  renderFamilies(pack);
  renderLetterTiles(pack);
  renderControls(pack);
  clearChildren(byId('tdrawing'));
  byId('tlegend').textContent = '';
  showInstruction(byId('tname'), pack, 'trace');
}

function renderFamilies(pack: LanguagePack): void {
  const container = byId('tfamilies');
  clearChildren(container);
  currentSet(pack).families.forEach((family, index) => {
    const button = createElement('button', {
      className: index === familyIndex ? 'tile trace-family sel' : 'tile trace-family',
      text: pack.ui.trace.familyTitles[index] ?? family.id,
    });
    button.style.borderBottomColor = family.color;
    button.addEventListener('click', () => selectFamily(index));
    container.append(button);
  });
}

function renderLetterTiles(pack: LanguagePack): void {
  const grid = byId('tgrid');
  clearChildren(grid);
  const family = currentSet(pack).families[familyIndex];
  if (!family) return;
  for (const shapeKey of family.letters) {
    const classes = ['tile'];
    if (completed.has(shapeKey)) classes.push('done');
    if (active?.shapeKey === shapeKey) classes.push('sel');
    const tile = createElement('button', { className: classes.join(' '), text: shapeKey });
    tile.addEventListener('click', () => startLetter(shapeKey));
    grid.append(tile);
  }
}

function renderControls(pack: LanguagePack): void {
  const controls = byId('tcontrols');
  clearChildren(controls);
  controls.append(
    createElement('button', { className: 'btn', text: pack.ui.trace.restart, onClick: restart }),
    createElement('button', { className: 'btn', text: pack.ui.trace.next, onClick: goToNext }),
  );
}

function selectFamily(index: number): void {
  const pack = getPack();
  familyIndex = index;
  active = null;
  renderFamilies(pack);
  renderLetterTiles(pack);
  clearChildren(byId('tdrawing'));
  byId('tlegend').textContent = '';
  showInstruction(byId('tname'), pack, 'trace');
}

function startLetter(shapeKey: string): void {
  const pack = getPack();
  const set = currentSet(pack);
  const shape = set.shapes[shapeKey];
  const family = set.families[familyIndex];
  if (!shape || !family) return;
  beginPlayback();
  active = {
    shapeKey,
    shape,
    family,
    samples: shape.strokes.map((stroke) => sampleStroke(stroke)),
    strokeIndex: 0,
    sampleIndex: 0,
    dragging: false,
    finished: false,
  };
  renderLetterTiles(pack);
  showLetterName(pack, shapeKey);
  renderLegend(pack, family);
  draw();
}

function showLetterName(pack: LanguagePack, shapeKey: string): void {
  const resolved = resolveLetter(pack, shapeKey);
  const entry = pack.letters.find((item) => item.key === resolved?.letterKey);
  const suffix = resolved?.isFinal ? pack.ui.letters.finalSuffix : '';
  byId('tname').textContent = entry ? `${entry.name} ${suffix}`.trim() : shapeKey;
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

function colorOfStroke(letter: ActiveLetter, strokeIndex: number): string {
  return strokeIndex < letter.shape.baseStrokes ? letter.family.color : ADDITION_COLOR;
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NAMESPACE, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

function polyline(points: readonly Point[], color: string, opacity: number): SVGElement {
  return svgElement('polyline', {
    points: points.map(([x, y]) => `${x},${y}`).join(' '),
    fill: 'none',
    stroke: color,
    'stroke-opacity': String(opacity),
    'stroke-width': String(LINE_WIDTH),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
}

function draw(): void {
  const drawing = byId('tdrawing');
  clearChildren(drawing);
  if (!active) return;

  active.samples.forEach((samples, index) => {
    const done = index < active!.strokeIndex || active!.finished;
    drawing.append(polyline(samples, colorOfStroke(active!, index), done ? 1 : 0.22));
  });
  if (active.finished) return;

  const samples = active.samples[active.strokeIndex];
  const dot = samples?.[active.sampleIndex];
  if (!samples || !dot) return;
  const color = colorOfStroke(active, active.strokeIndex);
  drawing.append(polyline(samples.slice(0, active.sampleIndex + 1), color, 1));
  if (active.sampleIndex === 0) {
    drawing.append(
      svgElement('circle', {
        cx: String(dot[0]),
        cy: String(dot[1]),
        r: '9',
        fill: color,
        'fill-opacity': '0.3',
      }),
    );
  }
  drawing.append(
    svgElement('circle', {
      cx: String(dot[0]),
      cy: String(dot[1]),
      r: '6.5',
      fill: '#ef9f27',
      stroke: '#854f0b',
      'stroke-width': '1',
    }),
  );
  const number = svgElement('text', {
    x: String(dot[0]),
    y: String(dot[1] + 2.5),
    'font-size': '7',
    'text-anchor': 'middle',
    fill: '#412402',
    'font-weight': '700',
  });
  number.textContent = String(active.strokeIndex + 1);
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

function finishStroke(letter: ActiveLetter): void {
  letter.dragging = false;
  playTapBlip(letter.strokeIndex);
  letter.strokeIndex += 1;
  letter.sampleIndex = 0;
  if (letter.strokeIndex >= letter.samples.length) finishLetter(letter);
  else draw();
}

function finishLetter(letter: ActiveLetter): void {
  letter.finished = true;
  completed.add(letter.shapeKey);
  writeSetting(storageKey(getPack()), [...completed].join(','));
  renderLetterTiles(getPack());
  draw();
  void sayLetter(letter.shapeKey);
}

async function sayLetter(shapeKey: string): Promise<void> {
  const pack = getPack();
  const resolved = resolveLetter(pack, shapeKey);
  if (!resolved) return;
  const nameParts = letterNamePart(pack, resolved.letterKey);
  const soundPart = letterSoundPart(pack, resolved.letterKey);
  if (!nameParts || !soundPart) return;
  const playbackId = beginPlayback();
  const nameSequence = resolved.isFinal ? [nameParts, finalSuffixPart(pack)] : [nameParts];
  await speakPartsInOrder(nameSequence, playbackId, SPEECH_RATE.LETTER_NAME);
  if (!isCurrentPlayback(playbackId)) return;
  await wait(PAUSE_BETWEEN_NAME_AND_SOUND_MS);
  await speakPartsInOrder([soundPart], playbackId, SPEECH_RATE.LETTER_SOUND);
}

function restart(): void {
  if (active) startLetter(active.shapeKey);
}

/** Moves to the next letter of the family, then to the first letter of the next family. */
function goToNext(): void {
  const pack = getPack();
  const families = currentSet(pack).families;
  const family = families[familyIndex];
  if (!family) return;
  const position = active ? family.letters.indexOf(active.shapeKey) : -1;
  const nextInFamily = family.letters[position + 1];
  if (nextInFamily) {
    startLetter(nextInFamily);
    return;
  }
  selectFamily((familyIndex + 1) % families.length);
  const first = currentSet(pack).families[familyIndex]?.letters[0];
  if (first) startLetter(first);
}
