import { describe, expect, it, vi } from 'vitest';

vi.mock('../../core/voice', () => ({
  SPEECH_RATE: {},
  speakPartsInOrder: vi.fn(),
  speakPart: vi.fn(),
}));

const { completesFamily, isFamilyDone, itemsOf, progressKey } = await import('./index');
const { hebrewTrace } = await import('./shapes.he');

const vav = hebrewTrace.families.find((family) => family.id === 'vav')!;
const allButLast = (): Set<string> =>
  new Set(
    itemsOf(vav)
      .slice(0, -1)
      .map((key) => progressKey(vav, key)),
  );

describe('write the letters: a whole group finishes the game', () => {
  it('is done only when the basic shape and every letter of the group are written', () => {
    expect(isFamilyDone(vav, allButLast())).toBe(false);
    const all = new Set(itemsOf(vav).map((key) => progressKey(vav, key)));
    expect(isFamilyDone(vav, all)).toBe(true);
  });

  it('finishes when the last missing item is written, and not again after that', () => {
    const last = itemsOf(vav).at(-1)!;
    expect(completesFamily(vav, last, allButLast())).toBe(true);
    const all = new Set(itemsOf(vav).map((key) => progressKey(vav, key)));
    expect(completesFamily(vav, last, all)).toBe(false);
  });

  it('does not finish while other items are still missing', () => {
    expect(completesFamily(vav, itemsOf(vav)[0]!, new Set())).toBe(false);
  });
});
