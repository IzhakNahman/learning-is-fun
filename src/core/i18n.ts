import { DEFAULT_LANGUAGE, isLanguageCode, packs } from '../content';
import type { LanguageCode, LanguagePack } from '../content';
import { readSetting, writeSetting } from './storage';

type LanguageListener = (pack: LanguagePack) => void;

let activePack: LanguagePack = packs[DEFAULT_LANGUAGE];
const listeners = new Set<LanguageListener>();

export function getPack(): LanguagePack {
  return activePack;
}

export function onLanguageChange(listener: LanguageListener): void {
  listeners.add(listener);
}

export function setLanguage(code: LanguageCode, options: { remember?: boolean } = {}): void {
  const { remember = true } = options;
  const nextPack = packs[code];
  if (nextPack === activePack) return;
  activePack = nextPack;
  document.documentElement.lang = nextPack.code;
  document.documentElement.dir = nextPack.dir;
  document.title = nextPack.ui.appName;
  if (remember) writeSetting('language', code);
  listeners.forEach((listener) => listener(nextPack));
}

/** Applies the saved language (or the default) before the first screen is built. */
export function initLanguage(): void {
  const saved = readSetting('language');
  const code = isLanguageCode(saved) ? saved : DEFAULT_LANGUAGE;
  activePack = packs[code];
  document.documentElement.lang = activePack.code;
  document.documentElement.dir = activePack.dir;
  document.title = activePack.ui.appName;
}
