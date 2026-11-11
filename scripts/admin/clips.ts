import path from 'node:path';
import {
  isLanguageCode,
  listRecordingItems,
  packs,
  type LanguageCode,
  type RecordingItem,
} from '../../src/content';

/** The only shape a clip id may have. Checked before looking it up, so odd input never gets far. */
const CLIP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Clip lists come from the same language packs the game uses, so they never go out of date. */
export function listClips(language: LanguageCode): RecordingItem[] {
  return listRecordingItems(packs[language]);
}

const knownIdsCache = new Map<LanguageCode, Set<string>>();

function knownClipIds(language: LanguageCode): Set<string> {
  const cached = knownIdsCache.get(language);
  if (cached) return cached;
  const ids = new Set(listClips(language).map((item) => item.clipId));
  knownIdsCache.set(language, ids);
  return ids;
}

export function parseLanguage(value: unknown): LanguageCode | null {
  if (!isLanguageCode(value)) return null;
  return value;
}

export function isKnownClipId(language: LanguageCode, clipId: unknown): clipId is string {
  if (typeof clipId !== 'string') return false;
  if (!CLIP_ID_PATTERN.test(clipId)) return false;
  return knownClipIds(language).has(clipId);
}

/** public/audio/<language>/ inside the given repo root. */
export function languageAudioDir(repoRoot: string, language: LanguageCode): string {
  return path.join(repoRoot, 'public', 'audio', language);
}

/**
 * The mp3 path for a clip, or null if the id is not one the game uses.
 * The final check makes sure the path really stays inside public/audio/<language>/.
 */
export function clipFilePath(
  repoRoot: string,
  language: LanguageCode,
  clipId: unknown,
): string | null {
  if (!isKnownClipId(language, clipId)) return null;
  const dir = path.resolve(languageAudioDir(repoRoot, language));
  const file = path.resolve(dir, `${clipId}.mp3`);
  if (path.dirname(file) !== dir) return null;
  return file;
}

/** Turns a file name like "letter-name-alef.mp3" back into its clip id, if it is a known clip. */
export function clipIdFromFileName(language: LanguageCode, fileName: string): string | null {
  if (!fileName.endsWith('.mp3')) return null;
  const clipId = fileName.slice(0, -'.mp3'.length);
  if (!isKnownClipId(language, clipId)) return null;
  return clipId;
}
