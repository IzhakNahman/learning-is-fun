export type LanguageCode = 'he' | 'en';
export type GameId =
  | 'numbers'
  | 'colors'
  | 'shapes'
  | 'lookalike'
  | 'letters'
  | 'count'
  | 'trace'
  | 'mix'
  | 'words'
  | 'starts'
  | 'add'
  | 'sky'
  | 'niqqud';
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

export interface ShapeEntry {
  /** Ascii id used in audio file names and to pick the drawing, e.g. 'circle'. */
  id: string;
  name: string;
  nameSpeech: string;
}

/** A picture that looks like one of the shapes (a pizza is a triangle). */
export interface LookalikeEntry {
  /** Ascii id used in audio file names, e.g. 'pizza'. */
  id: string;
  emoji: string;
  /** The id of the shape it looks like. */
  shapeId: string;
  name: string;
  nameSpeech: string;
}

/** A vowel mark (Hebrew only), shown on a letter. */
export interface NiqqudEntry {
  id: string;
  /** The letter with the mark, e.g. 'אָ'. */
  sample: string;
  name: string;
  nameSpeech: string;
  /** The sound it gives, e.g. 'אָ'. */
  soundText: string;
  soundSpeech: string;
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

/** The line that tells the child what to do in a game, shown and spoken. */
export interface PromptText {
  placeholder: string;
  placeholderSpeech: string;
}

export interface UiText {
  appName: string;
  aboutButton: string;
  credit: string;
  /** The friendly guide on the home road: its label and what it says when tapped. */
  guide: { label: string; speech: string };
  /** Label of the button that scrolls the road back to the next game to play. */
  nextGame: string;
  gameNames: Record<GameId, string>;
  /** How each game name is spoken (Hebrew: with niqqud). */
  gameNameSpeech: Record<GameId, string>;
  numbers: PromptText;
  colors: PromptText;
  shapes: PromptText;
  lookalike: PromptText;
  count: PromptText;
  mix: PromptText;
  starts: PromptText;
  add: PromptText;
  niqqud: PromptText;
  /** Little words the games string together: "red PLUS yellow MAKES orange". */
  phrases: { plus: string; equals: string; makes: string };
  letters: {
    placeholder: string;
    placeholderSpeech: string;
    finalSuffix: string;
    finalSuffixSpeech: string;
  };
  trace: {
    placeholder: string;
    placeholderSpeech: string;
    /** Word before the group number on a group button, e.g. "Group" (the number is added). */
    groupLabel: string;
    baseLegend: string;
    additionLegend: string;
    next: string;
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
  shapes: ShapeEntry[];
  lookalikes: LookalikeEntry[];
  /** Hebrew only; empty in other languages. */
  niqqud: NiqqudEntry[];
  /** The games this language offers on the road (niqqud is Hebrew only). */
  availableGames: readonly GameId[];
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
