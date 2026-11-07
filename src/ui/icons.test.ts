import { describe, expect, it } from 'vitest';
import { LANGUAGE_ORDER, packs } from '../content';
import { STOPS } from '../journey/stops';

/** A game icon must be exactly one emoji (one visible symbol). */
function visibleSymbolCount(text: string): number {
  return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length;
}

describe('game icons', () => {
  it('each road stop has exactly one emoji', () => {
    for (const card of STOPS) expect(visibleSymbolCount(card.icon), card.game).toBe(1);
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
