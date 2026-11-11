import { copyFile, mkdir, readdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { LanguageCode } from '../../src/content';
import { clipFilePath } from './clips';

/** Old recordings go here (outside public/, ignored by git) so a replace or delete can be undone. */
export const BACKUP_FOLDER = '.audio-backup';

function backupDir(repoRoot: string, language: LanguageCode): string {
  return path.join(repoRoot, BACKUP_FOLDER, language);
}

/** A sortable time stamp like 20261111-124501-123. */
export function timeStamp(now: Date): string {
  const pad = (value: number, width = 2): string => String(value).padStart(width, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${date}-${time}-${pad(now.getMilliseconds(), 3)}`;
}

async function freeBackupPath(dir: string, clipId: string, now: Date): Promise<string> {
  const stamp = timeStamp(now);
  let candidate = path.join(dir, `${clipId}.${stamp}.mp3`);
  for (let extra = 1; existsSync(candidate); extra++) {
    // "~" sorts after ".", so a second backup in the same millisecond still counts as newer.
    candidate = path.join(dir, `${clipId}.${stamp}~${extra}.mp3`);
  }
  return candidate;
}

/** Copies the current clip into the backup folder. Returns the backup path, or null if no clip. */
export async function backupClip(
  repoRoot: string,
  language: LanguageCode,
  clipId: string,
  now: Date = new Date(),
): Promise<string | null> {
  const current = clipFilePath(repoRoot, language, clipId);
  if (!current || !existsSync(current)) return null;
  const dir = backupDir(repoRoot, language);
  await mkdir(dir, { recursive: true });
  const target = await freeBackupPath(dir, clipId, now);
  await copyFile(current, target);
  return target;
}

async function listBackupFiles(repoRoot: string, language: LanguageCode): Promise<string[]> {
  return readdir(backupDir(repoRoot, language)).catch(() => [] as string[]);
}

/** Newest backup file name for a clip, or null. */
export async function latestBackup(
  repoRoot: string,
  language: LanguageCode,
  clipId: string,
): Promise<string | null> {
  const prefix = `${clipId}.`;
  const matching = (await listBackupFiles(repoRoot, language))
    .filter((name) => name.startsWith(prefix) && name.endsWith('.mp3'))
    .sort();
  return matching.at(-1) ?? null;
}

/** Clip ids that have at least one backup (so the page can offer "undo"). */
export async function listBackedUpClipIds(
  repoRoot: string,
  language: LanguageCode,
): Promise<Set<string>> {
  const names = await listBackupFiles(repoRoot, language);
  return new Set(names.filter((name) => name.endsWith('.mp3')).map((name) => name.split('.')[0]));
}

/**
 * Puts the newest backup back in place. The clip that is there now is backed up first,
 * so undo never loses a recording (pressing undo again swaps them back).
 * Returns false when there is nothing to restore.
 */
export async function restoreLatestBackup(
  repoRoot: string,
  language: LanguageCode,
  clipId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const target = clipFilePath(repoRoot, language, clipId);
  if (!target) return false;
  const newest = await latestBackup(repoRoot, language, clipId);
  if (!newest) return false;
  const newestPath = path.join(backupDir(repoRoot, language), newest);
  await backupClip(repoRoot, language, clipId, now);
  await mkdir(path.dirname(target), { recursive: true });
  await rename(newestPath, target);
  return true;
}
