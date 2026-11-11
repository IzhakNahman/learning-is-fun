import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { LanguageCode } from '../../src/content';
import { clipIdFromFileName, languageAudioDir } from './clips';

/** Clip ids that have an mp3 in public/audio/<language>/, sorted. Unknown files are ignored. */
export async function listRecordedClipIds(
  repoRoot: string,
  language: LanguageCode,
): Promise<string[]> {
  const dir = languageAudioDir(repoRoot, language);
  const fileNames = await readdir(dir).catch(() => [] as string[]);
  const ids = fileNames
    .map((fileName) => clipIdFromFileName(language, fileName))
    .filter((id): id is string => id !== null);
  return ids.sort();
}

/** Rewrites manifest.json from the files that really exist. Returns the ids written. */
export async function syncManifest(repoRoot: string, language: LanguageCode): Promise<string[]> {
  const ids = await listRecordedClipIds(repoRoot, language);
  const manifestPath = path.join(languageAudioDir(repoRoot, language), 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(ids, null, 2)}\n`);
  return ids;
}
