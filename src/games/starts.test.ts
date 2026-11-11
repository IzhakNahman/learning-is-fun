import { describe, expect, it } from 'vitest';
import { LANGUAGE_ORDER, packs } from '../content';
import { makeStartsRound } from './starts';

describe.each(LANGUAGE_ORDER)('makeStartsRound (%s)', (code) => {
  const pack = packs[code];

  it('always offers the first letter of the word, once, among different letters', () => {
    for (const level of ['easy', 'hard'] as const) {
      for (let step = 0; step < 40; step++) {
        const round = makeStartsRound(pack, level, null, () => (step * 0.113) % 1);
        const keys = round.letters.map((letter) => letter.key);
        expect(keys).toHaveLength(level === 'easy' ? 3 : 4);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys.filter((key) => key === round.word.startKey)).toHaveLength(1);
      }
    }
  });

  it('does not repeat the previous word', () => {
    const previous = pack.words[0]?.id ?? null;
    for (let step = 0; step < 30; step++) {
      const round = makeStartsRound(pack, 'easy', previous, () => (step * 0.057) % 1);
      expect(round.word.id).not.toBe(previous);
    }
  });
});

describe('Hebrew look-alike letters', () => {
  it('never offers ב and בּ (or כ/כּ, פ/פּ) together', () => {
    for (let step = 0; step < 60; step++) {
      const round = makeStartsRound(packs.he, 'hard', null, () => (step * 0.0917) % 1);
      const bases = round.letters.map((letter) => letter.key.slice(0, 1));
      expect(new Set(bases).size).toBe(bases.length);
    }
  });
});
