export type LanguageCode = 'he' | 'en';
export type GameId = 'numbers' | 'letters' | 'colors' | 'words' | 'sky';
export type TextDirection = 'rtl' | 'ltr';

/**
 * One thing the app says out loud. `clipId` names a recorded audio file
 * (audio/<lang>/<clipId>.mp3); when no recording exists the device voice reads `speech`.
 */
export interface SpokenPart {
  clipId: string;
  speech: string;
}

export interface LetterEntry {
  /** Base character used for matching, e.g. 'ב' or 'b'. */
  key: string;
  /** Ascii id used in audio file names, e.g. 'bet'. */
  id: string;
  /** Text on the letter tile and the big letter display, e.g. 'ב' or 'Bb'. */
  tileText: string;
  /** Text drawn on a sky-game box, e.g. 'ב' or 'B'. */
  boxText: string;
  name: string;
  nameSpeech: string;
  soundText: string;
  soundSpeech: string;
}

/** A final-form letter (Hebrew only), e.g. ם is the final form of מ. */
export interface FinalLetterEntry {
  char: string;
  baseKey: string;
}

export interface SlotSpec {
  /** What the slot shows once filled, e.g. 'ם' or 'B'. */
  text: string;
  /** Base letter key that fills it. */
  key: string;
}

export interface WordEntry {
  id: string;
  startKey: string;
  /** The word as shown to the child (with niqqud in Hebrew). */
  shown: string;
  /** The word as spoken by the device voice. */
  speech: string;
  emoji: string;
  slots: SlotSpec[];
}

export interface ColorEntry {
  id: string;
  /** CSS colour shown on the tile and the big preview. */
  hex: string;
  name: string;
  nameSpeech: string;
  /** Something with that colour: a picture and the full phrase, e.g. "תפוח אדום" / "red apple". */
  example: { emoji: string; phrase: string; speech: string };
}

export interface NumberNames {
  /** Index = number (index 0 unused). Spoken counting form. */
  spoken: readonly string[];
  /** Index = number (index 0 unused). Written name shown on screen. */
  shown: readonly string[];
}

export interface AboutSection {
  icon: string;
  game: GameId;
  body: string;
}

export interface UiText {
  appName: string;
  chooseGame: string;
  aboutButton: string;
  credit: string;
  gameNames: Record<GameId, string>;
  /** How each game name is spoken (Hebrew: with niqqud). */
  gameNameSpeech: Record<GameId, string>;
  numbers: { placeholder: string; placeholderSpeech: string };
  colors: { placeholder: string; placeholderSpeech: string };
  letters: {
    placeholder: string;
    placeholderSpeech: string;
    finalSuffix: string;
    finalSuffixSpeech: string;
  };
  words: { stepLetterName: string; stepLetter: string; stepSound: string; stepWord: string };
  sky: {
    quit: string;
    endTitle: string;
    countHint: string;
    again: string;
    rotatePhone: string;
    confirm: string;
    /** Praise shown and said after a word is completed. */
    wellDone: string;
    wellDoneSpeech: string;
  };
  voice: { found: string; missing: string };
  about: {
    title: string;
    intro: string;
    sections: AboutSection[];
    skills: string;
    tipsTitle: string;
    tips: string[];
    voiceNote: string;
    close: string;
  };
}

export interface LanguagePack {
  code: LanguageCode;
  /** Name of the language in its own language, for the language switch. */
  nativeName: string;
  dir: TextDirection;
  /** BCP-47 tag for the device voice. */
  speechLang: string;
  ui: UiText;
  letters: LetterEntry[];
  finalLetters: FinalLetterEntry[];
  words: WordEntry[];
  colors: ColorEntry[];
  numbers: NumberNames;
  /** Largest number the app can say; used when counting achieved words. */
  maxCount: number;
  /** Splits a shown word into its first letter (with any vowel marks) and the rest. */
  splitFirstLetter(shown: string): [string, string];
  /** On-screen text shown when the game ends. */
  gameOverText(wordCount: number): string;
  /** The sentence spoken when the game ends. */
  gameOverParts(wordCount: number): SpokenPart[];
}
