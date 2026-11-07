import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpokenPart } from '../content';

const sequences: SpokenPart[][] = [];
vi.mock('../core/voice', () => ({
  SPEECH_RATE: { DEFAULT: 0.8 },
  speakPartsInOrder: vi.fn((parts: SpokenPart[]) => {
    sequences.push(parts);
    return Promise.resolve();
  }),
}));
vi.mock('../core/speech', () => ({ cancelSpeech: vi.fn() }));

const { initColorsGame } = await import('./colors');
const { getPack, setLanguage } = await import('../core/i18n');

function buildScreen(): void {
  document.body.innerHTML = `
    <div id="cgrid"></div><div id="cbig"></div><div id="cname"></div><div id="cexample"></div>`;
}

describe('colours game', () => {
  beforeEach(() => {
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
});
