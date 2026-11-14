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
vi.mock('../core/sfx', () => ({ playCelebrationSound: vi.fn(), playWinSound: vi.fn() }));
vi.mock('../core/speech', () => ({ cancelSpeech: vi.fn() }));

const { initColorsGame } = await import('./colors');
const { getPack, setLanguage } = await import('../core/i18n');

function buildScreen(): void {
  document.body.innerHTML = `<div id="colors">
    <div id="cgrid"></div><div id="cbig"></div><div id="cname"></div><div id="cexample"></div></div>`;
}

describe('colours game', () => {
  beforeEach(() => {
    localStorage.clear();
    sequences.length = 0;
    buildScreen();
    setLanguage('he', { remember: false });
    initColorsGame();
  });

  it('shows one tile per colour', () => {
    expect(document.querySelectorAll('#cgrid .tile')).toHaveLength(getPack().colors.length);
  });

  it('says the colour name first, then the full phrase', () => {
    const tile = document.querySelectorAll<HTMLElement>('#cgrid .tile')[0];
    tile?.click();
    const [first] = getPack().colors;
    expect(sequences[0]?.map((part) => part.clipId)).toEqual([
      `color-${first?.id}`,
      `color-phrase-${first?.id}`,
    ]);
    expect(document.getElementById('cexample')?.textContent).toContain(first?.example.phrase);
  });

  it('rebuilds the tiles in the new language', () => {
    setLanguage('en', { remember: false });
    const tile = document.querySelectorAll<HTMLElement>('#cgrid .tile')[0];
    expect(tile?.title).toBe('Red');
    expect(document.getElementById('cname')?.textContent).toContain(
      getPack().ui.colors.placeholder,
    );
    expect(document.querySelector('#cname .hint-speaker')).not.toBeNull();
  });

  it('gives a tapped colour its star and shows the progress', async () => {
    const tile = document.querySelectorAll<HTMLElement>('#cgrid .tile')[0]!;
    tile.click();
    await Promise.resolve();
    expect(tile.classList.contains('starred')).toBe(true);
    expect(document.querySelector('.progress-count')!.textContent).toBe(
      `⭐ 1/${getPack().colors.length}`,
    );
  });

  it('finishes the game when every colour was tapped', async () => {
    for (const tile of document.querySelectorAll<HTMLElement>('#cgrid .tile')) tile.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const saved = JSON.parse(localStorage.getItem('learning-is-fun:progress-v2')!);
    expect(saved.games.colors.finishes).toBe(1);
    expect(saved.trophies).toBe(2);
  });

  it('offers ↺ play again only once the game is finished', async () => {
    const again = document.querySelector<HTMLElement>('.progress-again')!;
    const tiles = [...document.querySelectorAll<HTMLElement>('#cgrid .tile')];
    tiles[0]!.click();
    await Promise.resolve();
    expect(again.hidden).toBe(true);
    for (const tile of tiles) tile.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(again.hidden).toBe(false);
  });
});
