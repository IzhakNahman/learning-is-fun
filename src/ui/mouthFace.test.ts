import { describe, expect, it } from 'vitest';
import { packs } from '../content';
import { buildMouthFace, mouthOf } from './mouthFace';

describe('niqqud mouth faces', () => {
  it('has a mouth for every niqqud mark', () => {
    for (const entry of packs.he.niqqud) expect(mouthOf(entry.id), entry.id).not.toBeNull();
  });

  it('gives marks with the same sound the same mouth', () => {
    expect(mouthOf('kamatz')).toBe(mouthOf('patach'));
    expect(mouthOf('tzere')).toBe(mouthOf('segol'));
    expect(mouthOf('shuruk')).toBe(mouthOf('kubutz'));
    expect(new Set(packs.he.niqqud.map((entry) => mouthOf(entry.id))).size).toBe(6);
  });

  it('draws a different face for each mouth', () => {
    const drawings = (['a', 'e', 'i', 'o', 'u', 'shva'] as const).map(
      (mouth) => buildMouthFace(mouth).innerHTML,
    );
    expect(new Set(drawings).size).toBe(6);
  });

  it('returns null for an unknown mark', () => {
    expect(mouthOf('nothing')).toBeNull();
  });
});
