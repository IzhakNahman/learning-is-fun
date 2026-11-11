import { describe, expect, it } from 'vitest';
import { LANGUAGE_ORDER, packs } from '../content';
import { STOPS, stopIcon } from '../journey/stops';

/** A game icon must be exactly one visible symbol: an emoji, or a drawn letter. */
function visibleSymbolCount(text: string): number {
  return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length;
}

describe('game icons', () => {
  it('each road stop has exactly one emoji', () => {
    for (const card of STOPS) expect(visibleSymbolCount(card.icon), card.game).toBe(1);
  });

  it('draws the letters games with a letter of the language instead of an emoji', () => {
    const letters = STOPS.find((stop) => stop.game === 'letters');
    const starts = STOPS.find((stop) => stop.game === 'starts');
    if (!letters || !starts) throw new Error('missing stop');
    expect(stopIcon(letters, packs.he)).toBe('א');
    expect(stopIcon(starts, packs.he)).toBe('ב');
    expect(stopIcon(letters, packs.en)).toBe('A');
    expect(stopIcon(starts, packs.en)).toBe('C');
  });

  it('keeps the emoji for the other stops', () => {
    const numbers = STOPS.find((stop) => stop.game === 'numbers');
    if (!numbers) throw new Error('missing stop');
    expect(stopIcon(numbers, packs.he)).toBe(numbers.icon);
  });

  it.each(LANGUAGE_ORDER)('each %s About section has exactly one emoji', (code) => {
    for (const section of packs[code].ui.about.sections) {
      expect(visibleSymbolCount(section.icon), section.game).toBe(1);
    }
  });

  it.each(LANGUAGE_ORDER)('each %s colour example has exactly one emoji', (code) => {
    for (const color of packs[code].colors) {
      expect(visibleSymbolCount(color.example.emoji), color.id).toBe(1);
    }
  });
});
