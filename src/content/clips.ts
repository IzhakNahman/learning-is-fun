import type {
  ColorEntry,
  GameId,
  LanguagePack,
  LookalikeEntry,
  NiqqudEntry,
  ShapeEntry,
  SpokenPart,
} from './types';

/** Zero-padded number clip id, e.g. 7 -> "num-07". */
export function numberClipId(count: number): string {
  return `num-${String(count).padStart(2, '0')}`;
}

export function countingPart(pack: LanguagePack, count: number): SpokenPart {
  return { clipId: numberClipId(count), speech: pack.numbers.spoken[count] ?? String(count) };
}

export function gameNamePart(pack: LanguagePack, game: GameId): SpokenPart {
  return { clipId: `game-name-${game}`, speech: pack.ui.gameNameSpeech[game] };
}

export function letterNamePart(pack: LanguagePack, letterKey: string): SpokenPart | null {
  const entry = pack.letters.find((item) => item.key === letterKey);
  if (!entry) return null;
  return { clipId: `letter-name-${entry.id}`, speech: entry.nameSpeech };
}

/** The sound is said twice, like "דְּ דְּ". */
export function letterSoundPart(pack: LanguagePack, letterKey: string): SpokenPart | null {
  const entry = pack.letters.find((item) => item.key === letterKey);
  if (!entry) return null;
  return {
    clipId: `letter-sound-${entry.id}`,
    speech: `${entry.soundSpeech} ${entry.soundSpeech}`,
  };
}

export function colorNamePart(color: ColorEntry): SpokenPart {
  return { clipId: `color-${color.id}`, speech: color.nameSpeech };
}

export function colorPhrasePart(color: ColorEntry): SpokenPart {
  return { clipId: `color-phrase-${color.id}`, speech: color.example.speech };
}

export function shapeNamePart(shape: ShapeEntry): SpokenPart {
  return { clipId: `shape-${shape.id}`, speech: shape.nameSpeech };
}

export function lookalikeNamePart(entry: LookalikeEntry): SpokenPart {
  return { clipId: `object-${entry.id}`, speech: entry.nameSpeech };
}

export function niqqudNamePart(entry: NiqqudEntry): SpokenPart {
  return { clipId: `niqqud-name-${entry.id}`, speech: entry.nameSpeech };
}

export function niqqudSoundPart(entry: NiqqudEntry): SpokenPart {
  return { clipId: `niqqud-sound-${entry.id}`, speech: entry.soundSpeech };
}

export type PhraseWord = 'plus' | 'with' | 'equals' | 'makes';

/** A little linking word, e.g. the "plus" in "two plus one equals three". */
export function phraseWordPart(pack: LanguagePack, word: PhraseWord): SpokenPart {
  return { clipId: `phrase-${word}`, speech: pack.ui.phrases[word] };
}

/** Games that start with an instruction line (their clip is `phrase-tap-<game>`). */
export const INSTRUCTION_GAMES = [
  'balls',
  'numbers',
  'teens',
  'letters',
  'trace',
  'colors',
  'shapes',
  'lookalike',
  'count',
  'mix',
  'starts',
  'add',
  'niqqud',
] as const;
export type InstructionGame = (typeof INSTRUCTION_GAMES)[number];

/** The "tap a ..." / "drag the ..." instruction shown before the child plays. */
export function instructionPart(pack: LanguagePack, game: InstructionGame): SpokenPart {
  return { clipId: `phrase-tap-${game}`, speech: pack.ui[game].placeholderSpeech };
}

export function wellDonePart(pack: LanguagePack): SpokenPart {
  return { clipId: 'phrase-well-done', speech: pack.ui.sky.wellDoneSpeech };
}

/** What the little guide on the home road says when tapped. */
export function guidePart(pack: LanguagePack): SpokenPart {
  return { clipId: 'phrase-lets-play', speech: pack.ui.guide.speech };
}

export function finalSuffixPart(pack: LanguagePack): SpokenPart {
  return { clipId: 'letter-final', speech: pack.ui.letters.finalSuffixSpeech };
}

export function wordPart(pack: LanguagePack, wordId: string): SpokenPart | null {
  const entry = pack.words.find((item) => item.id === wordId);
  if (!entry) return null;
  return { clipId: `word-${entry.id}`, speech: entry.speech };
}

export interface RecordingItem {
  clipId: string;
  speech: string;
  /** The normal spelling to show the person recording, when the voice text is spelled oddly on purpose. */
  display?: string;
  group:
    | 'game names'
    | 'letter names'
    | 'letter sounds'
    | 'colors'
    | 'shapes'
    | 'objects'
    | 'niqqud'
    | 'words'
    | 'numbers'
    | 'phrases';
}

function shownIfDifferent(shown: string, speech: string): { display?: string } {
  if (shown === speech) return {};
  return { display: shown };
}

/** Every clip the app can play for a language. The recording lists are generated from this. */
export function listRecordingItems(pack: LanguagePack): RecordingItem[] {
  const items: RecordingItem[] = [];
  for (const game of pack.availableGames) {
    items.push({ ...gameNamePart(pack, game), group: 'game names' });
  }
  for (const entry of pack.letters) {
    items.push({
      clipId: `letter-name-${entry.id}`,
      speech: entry.nameSpeech,
      ...shownIfDifferent(entry.name, entry.nameSpeech),
      group: 'letter names',
    });
  }
  if (pack.finalLetters.length > 0) {
    items.push({ ...finalSuffixPart(pack), group: 'letter names' });
  }
  for (const entry of pack.letters) {
    items.push({
      clipId: `letter-sound-${entry.id}`,
      speech: entry.soundSpeech,
      ...shownIfDifferent(entry.soundText, entry.soundSpeech),
      group: 'letter sounds',
    });
  }
  for (const color of pack.colors) {
    items.push({ ...colorNamePart(color), group: 'colors' });
    items.push({ ...colorPhrasePart(color), group: 'colors' });
  }
  for (const shape of pack.shapes) {
    items.push({ ...shapeNamePart(shape), group: 'shapes' });
  }
  for (const entry of pack.lookalikes) {
    items.push({ ...lookalikeNamePart(entry), group: 'objects' });
  }
  for (const entry of pack.niqqud) {
    items.push({ ...niqqudNamePart(entry), group: 'niqqud' });
    items.push({ ...niqqudSoundPart(entry), group: 'niqqud' });
  }
  for (const entry of pack.words) {
    items.push({ clipId: `word-${entry.id}`, speech: entry.speech, group: 'words' });
  }
  for (let count = 1; count <= pack.maxCount; count++) {
    items.push({ ...countingPart(pack, count), group: 'numbers' });
  }
  const phraseParts = [
    wellDonePart(pack),
    guidePart(pack),
    ...(['plus', 'with', 'equals', 'makes'] as const).map((word) => phraseWordPart(pack, word)),
    ...INSTRUCTION_GAMES.filter((game) => pack.availableGames.includes(game)).map((game) =>
      instructionPart(pack, game),
    ),
    ...[0, 1, 2, 3].flatMap((count) => pack.gameOverParts(count)),
  ];
  const seen = new Set<string>();
  for (const part of phraseParts) {
    if (!part.clipId.startsWith('phrase-') || seen.has(part.clipId)) continue;
    seen.add(part.clipId);
    items.push({ ...part, group: 'phrases' });
  }
  return items;
}
