// @vitest-environment node
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BACKUP_FOLDER,
  backupClip,
  latestBackup,
  listBackedUpClipIds,
  restoreLatestBackup,
  timeStamp,
} from './backup';
import { makeTestRepo, writeTestClip } from './testRepo';

let root = '';
let cleanup: () => Promise<void> = async () => {};

beforeEach(async () => {
  ({ root, cleanup } = await makeTestRepo());
});
afterEach(() => cleanup());

const clipPath = (): string => path.join(root, 'public/audio/he/num-01.mp3');
const at = (seconds: number): Date => new Date(2026, 10, 11, 12, 0, seconds);

describe('timeStamp', () => {
  it('is sortable and has no path characters', () => {
    expect(timeStamp(new Date(2026, 0, 2, 3, 4, 5, 6))).toBe('20260102-030405-006');
  });
});

describe('backupClip', () => {
  it('does nothing when there is no clip', async () => {
    expect(await backupClip(root, 'he', 'num-01')).toBeNull();
  });

  it('copies the clip outside public/', async () => {
    await writeTestClip(root, 'he', 'num-01.mp3', 'first');
    const saved = await backupClip(root, 'he', 'num-01', at(1));
    expect(saved).toBe(path.join(root, BACKUP_FOLDER, 'he', 'num-01.20261111-120001-000.mp3'));
    expect(await readFile(saved ?? '', 'utf8')).toBe('first');
    expect(existsSync(clipPath())).toBe(true);
  });

  it('keeps two backups made in the same millisecond, newest last', async () => {
    await writeTestClip(root, 'he', 'num-01.mp3', 'a');
    await backupClip(root, 'he', 'num-01', at(1));
    await writeTestClip(root, 'he', 'num-01.mp3', 'b');
    await backupClip(root, 'he', 'num-01', at(1));
    const newest = await latestBackup(root, 'he', 'num-01');
    const content = await readFile(path.join(root, BACKUP_FOLDER, 'he', newest ?? ''), 'utf8');
    expect(content).toBe('b');
  });

  it('refuses unknown clip ids', async () => {
    expect(await backupClip(root, 'he', '../../package')).toBeNull();
  });
});

describe('restoreLatestBackup', () => {
  it('returns false when there is no backup', async () => {
    expect(await restoreLatestBackup(root, 'he', 'num-01')).toBe(false);
  });

  it('brings back a deleted clip', async () => {
    await writeTestClip(root, 'he', 'num-01.mp3', 'old');
    await backupClip(root, 'he', 'num-01', at(1));
    await import('node:fs/promises').then((fs) => fs.rm(clipPath()));
    expect(await restoreLatestBackup(root, 'he', 'num-01', at(2))).toBe(true);
    expect(await readFile(clipPath(), 'utf8')).toBe('old');
  });

  it('swaps a replaced clip back, keeping the newer one as a backup', async () => {
    await writeTestClip(root, 'he', 'num-01.mp3', 'old');
    await backupClip(root, 'he', 'num-01', at(1));
    await writeTestClip(root, 'he', 'num-01.mp3', 'new');
    expect(await restoreLatestBackup(root, 'he', 'num-01', at(2))).toBe(true);
    expect(await readFile(clipPath(), 'utf8')).toBe('old');
    expect(await restoreLatestBackup(root, 'he', 'num-01', at(3))).toBe(true);
    expect(await readFile(clipPath(), 'utf8')).toBe('new');
  });
});

describe('listBackedUpClipIds', () => {
  it('lists clips that have a backup', async () => {
    await writeTestClip(root, 'he', 'num-01.mp3');
    await backupClip(root, 'he', 'num-01');
    expect([...(await listBackedUpClipIds(root, 'he'))]).toEqual(['num-01']);
    expect(await readdir(path.join(root, BACKUP_FOLDER, 'he'))).toHaveLength(1);
  });
});
