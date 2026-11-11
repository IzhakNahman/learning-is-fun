import { describe, expect, it } from 'vitest';
import { packs } from '../content';
import { makeLookalikeRound } from './lookalike';

describe.each(['he', 'en'] as const)('look-alike rounds (%s)', (code) => {
  const pack = packs[code];

  it('gives every picture a shape that exists', () => {
    const shapeIds = pack.shapes.map((shape) => shape.id);
    for (const entry of pack.lookalikes) {
      expect(shapeIds).toContain(entry.shapeId);
      expect(entry.emoji && entry.name && entry.nameSpeech).toBeTruthy();
    }
    expect(new Set(pack.lookalikes.map((entry) => entry.id)).size).toBe(pack.lookalikes.length);
  });

  it('offers two shapes when easy and three when hard, with exactly one right', () => {
    for (let run = 0; run < 100; run++) {
      for (const [level, count] of [
        ['easy', 2],
        ['hard', 3],
      ] as const) {
        const round = makeLookalikeRound(pack.lookalikes, level);
        expect(round.shapeIds).toHaveLength(count);
        expect(new Set(round.shapeIds).size).toBe(count);
        expect(round.shapeIds.filter((id) => id === round.object.shapeId)).toHaveLength(1);
      }
    }
  });

  it('never repeats the previous picture', () => {
    for (let run = 0; run < 50; run++) {
      expect(makeLookalikeRound(pack.lookalikes, 'easy', 'pizza').object.id).not.toBe('pizza');
    }
  });

  it('keeps look-alikes apart when easy and together when hard', () => {
    for (let run = 0; run < 200; run++) {
      const easy = makeLookalikeRound(pack.lookalikes, 'easy');
      if (easy.object.shapeId === 'rectangle') expect(easy.shapeIds).not.toContain('square');
      const hard = makeLookalikeRound(pack.lookalikes, 'hard');
      if (hard.object.shapeId === 'rectangle') expect(hard.shapeIds).toContain('square');
    }
  });
});
