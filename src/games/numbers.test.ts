import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpokenPart } from '../content';

const spoken: SpokenPart[] = [];
vi.mock('../core/voice', () => ({
  SPEECH_RATE: { DEFAULT: 0.8, COUNTING: 1 },
  speakPart: vi.fn((part: SpokenPart) => {
    spoken.push(part);
    return Promise.resolve();
  }),
}));
vi.mock('../core/sfx', () => ({
  playCountBlip: vi.fn(),
  playCelebrationSound: vi.fn(),
  playWinSound: vi.fn(),
}));
vi.mock('../core/speech', () => ({ cancelSpeech: vi.fn() }));
vi.mock('../core/dom', async (original) => ({
  ...(await original<typeof import('../core/dom')>()),
  wait: () => Promise.resolve(),
}));

const { initNumbersGame } = await import('./numbers');
const { setLanguage } = await import('../core/i18n');

const screen = (game: string, prefix: string): string => `<div id="${game}">
  <div id="${prefix}grid"></div><div id="${prefix}big"></div><div id="${prefix}name"></div>
  <div id="${prefix}balls"></div><button id="${prefix}play"></button></div>`;

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const tiles = (id: string): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>(`#${id} .tile`),
];
const lit = (id: string): number => document.querySelectorAll(`#${id} .ball.on`).length;

describe('numbers games', () => {
  beforeEach(() => {
    localStorage.clear();
    spoken.length = 0;
    document.body.innerHTML = screen('numbers', 'n') + screen('teens', 'tn');
    setLanguage('he', { remember: false });
    initNumbersGame();
  });

  it('splits the numbers into 1–10 and 11–20', () => {
    expect(tiles('ngrid').map((tile) => tile.textContent)).toEqual(
      Array.from({ length: 10 }, (_, index) => String(index + 1)),
    );
    expect(tiles('tngrid').map((tile) => tile.textContent)).toEqual(
      Array.from({ length: 10 }, (_, index) => String(index + 11)),
    );
  });

  it('says a tapped number once, without counting, and gives it a star', async () => {
    tiles('ngrid')[6]!.click();
    await settle();
    expect(spoken.map((part) => part.clipId)).toEqual(['num-07']);
    expect(lit('nballs')).toBe(0);
    expect(tiles('ngrid')[6]!.classList.contains('starred')).toBe(true);
  });

  it('counts the balls out loud only when ▶ is tapped', async () => {
    const play = document.querySelector<HTMLButtonElement>('#nplay')!;
    expect(play.disabled).toBe(true);
    tiles('ngrid')[2]!.click();
    await settle();
    spoken.length = 0;
    expect(play.disabled).toBe(false);
    play.click();
    await settle();
    expect(spoken.map((part) => part.clipId)).toEqual(['num-01', 'num-02', 'num-03']);
    expect(lit('nballs')).toBe(3);
  });

  it('still lets the child count by tapping a ball', async () => {
    document.querySelectorAll<HTMLElement>('#nballs .ball')[4]!.click();
    await settle();
    expect(lit('nballs')).toBe(5);
    expect(spoken.map((part) => part.clipId)).toEqual(['num-05']);
  });

  it('finishes 1–10 when all ten numbers were heard, and 11–20 is separate', async () => {
    for (const tile of tiles('ngrid')) tile.click();
    await settle();
    const saved = JSON.parse(localStorage.getItem('learning-is-fun:progress-v2')!);
    expect(saved.games.numbers.finishes).toBe(1);
    expect(saved.games.teens).toBeUndefined();
  });
});
