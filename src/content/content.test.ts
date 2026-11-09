import { describe, expect, it } from 'vitest';
import { LANGUAGE_ORDER, listRecordingItems, packs } from './index';

describe.each(LANGUAGE_ORDER)('language pack "%s"', (code) => {
  const pack = packs[code];
  const letterKeys = pack.letters.map((letter) => letter.key);

  it('has unique letter keys and audio ids', () => {
    expect(new Set(letterKeys).size).toBe(letterKeys.length);
    expect(new Set(pack.letters.map((letter) => letter.id)).size).toBe(letterKeys.length);
  });

  it('has a word for the sounds that start words, each starting with a known letter', () => {
    const starts = pack.words.map((word) => word.startKey);
    expect(new Set(starts).size).toBe(starts.length);
    for (const key of starts) expect(letterKeys).toContain(key);
    expect(pack.words.length).toBeGreaterThanOrEqual(letterKeys.length - 3);
    for (const word of pack.words) expect(word.slots[0]?.key).toBe(word.startKey);
  });

  it('only uses known letters in word slots', () => {
    for (const word of pack.words) {
      for (const slot of word.slots) expect(letterKeys).toContain(slot.key);
    }
  });

  it('has twelve colours with unique ids, names and examples', () => {
    expect(pack.colors).toHaveLength(12);
    expect(new Set(pack.colors.map((color) => color.id)).size).toBe(12);
    for (const color of pack.colors) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(
        color.name && color.nameSpeech && color.example.phrase && color.example.speech,
      ).toBeTruthy();
    }
  });

  it('has unique word ids', () => {
    const ids = pack.words.map((word) => word.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('can count up to maxCount and covers every word the game can achieve', () => {
    expect(pack.maxCount).toBeGreaterThanOrEqual(pack.words.length);
    for (let count = 1; count <= pack.maxCount; count++) {
      expect(pack.numbers.spoken[count]).toBeTruthy();
    }
    for (let count = 1; count <= 20; count++) expect(pack.numbers.shown[count]).toBeTruthy();
  });

  it('final letters point to existing base letters', () => {
    for (const finalLetter of pack.finalLetters) expect(letterKeys).toContain(finalLetter.baseKey);
  });

  it('shows Hebrew text with niqqud', () => {
    if (code !== 'he') return;
    const hasNiqqud = (text: string): boolean => /[\u05B0-\u05C7]/u.test(text);
    const texts: string[] = [
      pack.ui.appName,
      pack.ui.aboutButton,
      pack.ui.letters.finalSuffix,
      pack.ui.guide.label,
      pack.ui.trace.placeholder,
      pack.ui.trace.baseLegend,
      pack.ui.trace.next,
      pack.ui.about.title,
      pack.ui.about.intro,
      ...pack.ui.about.sections.map((section) => section.body),
      ...Object.values(pack.ui.gameNames),
      ...pack.colors.flatMap((color) => [color.name, color.example.phrase]),
      ...pack.letters.map((letter) => letter.name),
    ];
    for (const text of texts) expect(hasNiqqud(text), text).toBe(true);
  });

  it('splits the first letter from the rest of a word', () => {
    for (const word of pack.words) {
      const [first, rest] = pack.splitFirstLetter(word.shown);
      expect(first.length).toBeGreaterThan(0);
      expect(first + rest).toBe(word.shown);
    }
  });

  it('describes the game result for every possible count', () => {
    for (let count = 0; count <= pack.maxCount; count++) {
      expect(pack.gameOverText(count)).toContain(
        count === 1 ? '' : String(count === 0 ? 0 : count),
      );
      const parts = pack.gameOverParts(count);
      expect(parts.length).toBeGreaterThan(1);
      for (const part of parts) {
        expect(part.clipId).toBeTruthy();
        expect(part.speech).toBeTruthy();
      }
    }
  });

  it('lists every recording exactly once', () => {
    const ids = listRecordingItems(pack).map((item) => item.clipId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Hebrew specifics', () => {
  const hebrew = packs.he;

  it('fills a final-form slot with its base letter', () => {
    const water = hebrew.words.find((word) => word.id === 'mayim');
    const lastSlot = water?.slots.at(-1);
    expect(lastSlot?.text).toBe('ם');
    expect(lastSlot?.key).toBe('מ');
  });

  it('uses the special phrases for one and two words', () => {
    expect(hebrew.gameOverParts(1).at(-1)?.speech).toBe('מִלָּה אַחַת');
    expect(hebrew.gameOverParts(2).at(-1)?.speech).toBe('שְׁתֵּי מִלִּים');
  });
});

describe('English specifics', () => {
  it('turns "X-ray" into four letter slots', () => {
    const xray = packs.en.words.find((word) => word.id === 'xray');
    expect(xray?.slots.map((slot) => slot.text).join('')).toBe('XRAY');
  });
});
