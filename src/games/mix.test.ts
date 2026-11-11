import { describe, expect, it } from 'vitest';
import { LANGUAGE_ORDER, packs } from '../content';
import { MIX_RECIPES, makeMixRound } from './mix';

describe('mix recipes', () => {
  it.each(LANGUAGE_ORDER)('only use colours that exist in the %s pack', (code) => {
    const ids = packs[code].colors.map((color) => color.id);
    for (const recipe of MIX_RECIPES) {
      expect(ids).toContain(recipe.first);
      expect(ids).toContain(recipe.second);
      expect(ids).toContain(recipe.result);
    }
  });
});

describe('makeMixRound', () => {
  const ids = packs.he.colors.map((color) => color.id);

  it('offers the right colour among wrong ones that are not part of the mix', () => {
    for (const level of ['easy', 'hard'] as const) {
      for (let step = 0; step < 25; step++) {
        const round = makeMixRound(level, ids, null, () => (step * 0.137) % 1);
        const { recipe, choices } = round;
        expect(choices).toHaveLength(level === 'easy' ? 3 : 4);
        expect(new Set(choices).size).toBe(choices.length);
        expect(choices).toContain(recipe.result);
        expect(choices).not.toContain(recipe.first);
        expect(choices).not.toContain(recipe.second);
      }
    }
  });

  it('does not repeat the previous recipe', () => {
    const previous = MIX_RECIPES[0] ?? null;
    for (let step = 0; step < 25; step++) {
      expect(makeMixRound('easy', ids, previous, () => (step * 0.071) % 1).recipe).not.toBe(
        previous,
      );
    }
  });
});
