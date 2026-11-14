import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/voice', () => ({
  SPEECH_RATE: { DEFAULT: 0.8, LETTER_NAME: 0.75, LETTER_SOUND: 0.7 },
  speakPartsInOrder: vi.fn(() => Promise.resolve()),
  speakPart: vi.fn(() => Promise.resolve()),
}));
vi.mock('../core/sfx', () => ({ playCelebrationSound: vi.fn(), playWinSound: vi.fn() }));
vi.mock('../core/speech', () => ({ cancelSpeech: vi.fn() }));
vi.mock('../core/dom', async (original) => ({
  ...(await original<typeof import('../core/dom')>()),
  wait: () => Promise.resolve(),
}));

const { initLettersGame } = await import('./letters');
const { getPack, setLanguage } = await import('../core/i18n');

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const tiles = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('#lgrid .tile')];
const tileWithText = (text: string): HTMLElement =>
  tiles().find((tile) => tile.textContent === text)!;
const starred = (): string[] =>
  tiles()
    .filter((tile) => tile.classList.contains('starred'))
    .map((tile) => tile.textContent ?? '');

describe('meet the letters', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `<div id="letters"><div id="lgrid"></div><div id="lbig"></div>
      <div id="lname"></div><div id="lsnd"></div><button id="lnext"></button></div>`;
    setLanguage('he', { remember: false });
    initLettersGame();
  });

  it('stars the tapped letter, also when jumping ahead', async () => {
    tileWithText('ר').click();
    await settle();
    expect(starred()).toEqual(['ר']);
  });

  it('gives a final letter its own star, not its plain letter’s', async () => {
    tileWithText('ך').click();
    await settle();
    expect(starred()).toEqual(['ך']);
    tileWithText('ם').click();
    await settle();
    expect(starred()).toEqual(['ך', 'ם']);
  });

  it('counts every tile, final letters too, toward finishing', () => {
    const pack = getPack();
    expect(document.querySelector('.progress-count')!.textContent).toBe(
      `⭐ 0/${pack.letters.length + pack.finalLetters.length}`,
    );
  });

  it('"next letter" goes on from the letter shown', async () => {
    tileWithText('י').click();
    await settle();
    document.querySelector<HTMLElement>('#lnext')!.click();
    await settle();
    expect(document.querySelector('#lbig')!.textContent).toBe(
      getPack().letters[getPack().letters.findIndex((entry) => entry.tileText === 'י') + 1]!
        .tileText,
    );
  });
});
