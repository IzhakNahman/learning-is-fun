import { describe, expect, it } from 'vitest';
import { LANGUAGE_ORDER, listRecordingItems, packs } from './index';

describe.each(LANGUAGE_ORDER)('%s recording list and data integrity', (code) => {
  const pack = packs[code];

  it('has a unique clip id for every recording item', () => {
    const ids = listRecordingItems(pack).map((item) => item.clipId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has something to say for every recording item', () => {
    for (const item of listRecordingItems(pack)) {
      expect(item.speech.trim(), item.clipId).not.toBe('');
    }
  });

  it('can say every number up to maxCount', () => {
    for (let count = 1; count <= pack.maxCount; count++) {
      expect(pack.numbers.spoken[count], `spoken ${count}`).toBeTruthy();
      expect(pack.numbers.shown[count], `shown ${count}`).toBeTruthy();
    }
  });

  it('has a name for every game', () => {
    for (const name of Object.values(pack.ui.gameNames)) expect(name).toBeTruthy();
  });

  it('has an About section for every game', () => {
    const games = Object.keys(pack.ui.gameNames).sort();
    expect(pack.ui.about.sections.map((section) => section.game).sort()).toEqual(games);
  });
});

describe('Hebrew colour phrases', () => {
  const hebrew = packs.he;

  it('use the masculine singular colour word after the noun', () => {
    for (const color of hebrew.colors) {
      expect(color.example.phrase.endsWith(color.name), color.id).toBe(true);
    }
  });

  it('use singular masculine nouns (so the colour word agrees)', () => {
    expect(hebrew.colors.map((color) => color.example.phrase)).toEqual([
      'תפוח אדום',
      'גזר כתום',
      'אפרוח צהוב',
      'מלפפון ירוק',
      'ים כחול',
      'ענב סגול',
      'פרח ורוד',
      'דוב חום',
      'ענן לבן',
      'חתול שחור',
      'דולפין טורקיז',
      'פיל אפור',
    ]);
  });
});

describe.each(LANGUAGE_ORDER)('%s praise after a word', (code) => {
  it('has praise text, spoken praise and a recording id in the list', () => {
    const pack = packs[code];
    expect(pack.ui.sky.wellDone).toBeTruthy();
    expect(pack.ui.sky.wellDoneSpeech).toBeTruthy();
    const ids = listRecordingItems(pack).map((item) => item.clipId);
    expect(ids).toContain('phrase-well-done');
  });
});

describe.each(LANGUAGE_ORDER)('%s word pictures', (code) => {
  it('gives every word its own picture', () => {
    const emojis = packs[code].words.map((word) => word.emoji);
    expect(new Set(emojis).size).toBe(emojis.length);
  });
});

describe('Hebrew letters with and without a dot', () => {
  const hebrew = packs.he;
  const DAGESH = 'ּ';

  it('has a dotted and an undotted version of ב, כ and פ', () => {
    const keys = hebrew.letters.map((letter) => letter.key);
    for (const base of ['ב', 'כ', 'פ']) {
      expect(keys, base).toContain(base);
      expect(keys, `${base} with dot`).toContain(base + DAGESH);
    }
    expect(hebrew.letters).toHaveLength(25);
  });

  it('uses the dotted פ in פיל and תפוח', () => {
    const slotKeys = (id: string): string[] =>
      hebrew.words.find((word) => word.id === id)?.slots.map((slot) => slot.key) ?? [];
    expect(slotKeys('pil')[0]).toBe('פ' + DAGESH);
    expect(slotKeys('tapuah')).toContain('פ' + DAGESH);
  });

  it('keeps the final ף as the undotted פ', () => {
    expect(hebrew.finalLetters.find((letter) => letter.char === 'ף')?.baseKey).toBe('פ');
  });
});

describe('colour data', () => {
  it.each(LANGUAGE_ORDER)('%s colours have unique ids and unique hex values', (code) => {
    const colors = packs[code].colors;
    expect(new Set(colors.map((color) => color.id)).size).toBe(colors.length);
    expect(new Set(colors.map((color) => color.hex.toLowerCase())).size).toBe(colors.length);
  });

  it('both languages list the same colours in the same order', () => {
    expect(packs.he.colors.map((color) => color.id)).toEqual(
      packs.en.colors.map((color) => color.id),
    );
  });
});
