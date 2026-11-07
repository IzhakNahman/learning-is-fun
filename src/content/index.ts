import type { LanguageCode, LanguagePack } from './types';
import { englishPack } from './en';
import { hebrewPack } from './he';

export const packs: Record<LanguageCode, LanguagePack> = { he: hebrewPack, en: englishPack };
export const LANGUAGE_ORDER: readonly LanguageCode[] = ['he', 'en'];
export const DEFAULT_LANGUAGE: LanguageCode = 'he';

export function isLanguageCode(value: unknown): value is LanguageCode {
  return value === 'he' || value === 'en';
}

export * from './types';
export * from './clips';
