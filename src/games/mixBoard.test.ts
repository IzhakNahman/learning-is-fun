import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpokenPart } from '../content';

const sequences: SpokenPart[][] = [];
vi.mock('../core/voice', () => ({
  SPEECH_RATE: { DEFAULT: 0.8 },
  speakPartsInOrder: vi.fn((parts: SpokenPart[]) => {
    sequences.push(parts);
    return Promise.resolve();
  }),
  speakPart: vi.fn(() => Promise.resolve()),
}));
vi.mock('../core/speech', () => ({ cancelSpeech: vi.fn() }));
vi.mock('../core/sfx', () => ({
  playCelebrationSound: vi.fn(),
  playWinSound: vi.fn(),
  playTryAgainSound: vi.fn(),
}));

const { initMixGame } = await import('./mix');
const { setLanguage } = await import('../core/i18n');

describe('mix board', () => {
  beforeEach(() => {
    sequences.length = 0;
    document.body.innerHTML = '<div id="mix"><div id="mixplay"></div></div>';
    setLanguage('he', { remember: false });
    initMixGame();
  });

  it('shows two overlapping circles with a "?" in the overlap', () => {
    const svg = document.querySelector('.mix-venn-svg')!;
    // two coloured discs and two outlines, plus the overlap and the circle that cuts it
    expect(svg.querySelectorAll(':scope > circle')).toHaveLength(5);
    expect(svg.querySelector('.mix-lens-mark')!.textContent).toBe('?');
  });

  it('colours only the overlap: the right circle cut by the left circle', () => {
    const svg = document.querySelector('.mix-venn-svg')!;
    const lens = svg.querySelector('.mix-lens')!;
    const clipId = lens.getAttribute('clip-path')!.match(/#([^)]+)/)![1]!;
    const cut = svg.querySelector(`#${clipId} circle`)!;
    expect(lens.getAttribute('r')).toBe(cut.getAttribute('r'));
    expect(lens.getAttribute('cx')).not.toBe(cut.getAttribute('cx'));
  });

  it('says "with" (עִם) between the two colours, not "plus"', () => {
    document.querySelector<HTMLElement>('.mix-venn')!.click();
    const ids = sequences[0]!.map((part) => part.clipId);
    expect(ids[1]).toBe('phrase-with');
    expect(sequences[0]![1]!.speech).toBe('עִם');
  });
});

describe('mix board targets', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="mix"><div id="mixplay"></div></div>';
    setLanguage('he', { remember: false });
    initMixGame();
  });

  it('after tapping a colour, rings only the overlap as the place to put it', () => {
    const choice = document.querySelector<HTMLElement>('.play-choices .mix-swatch')!;
    choice.setPointerCapture = () => undefined;
    choice.hasPointerCapture = () => false;
    choice.releasePointerCapture = () => undefined;
    const tap = { pointerId: 1, bubbles: true, button: 0, clientX: 5, clientY: 5 };
    choice.dispatchEvent(new PointerEvent('pointerdown', tap));
    choice.dispatchEvent(new PointerEvent('pointerup', tap));
    expect(document.querySelector('.mix-lens-target')!.classList.contains('ready')).toBe(true);
    expect(document.querySelector('.mix-circle.ready')).toBeNull();
  });
});
