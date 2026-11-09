import type { LanguagePack } from '../../content';

const DAGESH = 'ּ';

export interface ResolvedLetter {
  /** Key of the entry in `pack.letters` (holds the name and the sound). */
  letterKey: string;
  /** True for a final-form letter such as ם, which is said as "mem sofit". */
  isFinal: boolean;
}

/**
 * Finds the pack letter that a tracing shape stands for: ב matches the dotted ב (בֵּית),
 * ם matches מ as a final letter, and English "B" matches "b".
 */
export function resolveLetter(pack: LanguagePack, shapeKey: string): ResolvedLetter | null {
  const final = pack.finalLetters.find((entry) => entry.char === shapeKey);
  if (final) return { letterKey: final.baseKey, isFinal: true };
  const candidates = [`${shapeKey}${DAGESH}`, shapeKey, shapeKey.toLowerCase()];
  for (const candidate of candidates) {
    if (pack.letters.some((entry) => entry.key === candidate)) {
      return { letterKey: candidate, isFinal: false };
    }
  }
  return null;
}
