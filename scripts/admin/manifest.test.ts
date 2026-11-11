// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listRecordedClipIds, syncManifest } from './manifest';
import { makeTestRepo, writeTestClip } from './testRepo';

let root = '';
let cleanup: () => Promise<void> = async () => {};

beforeEach(async () => {
  ({ root, cleanup } = await makeTestRepo());
});
afterEach(() => cleanup());

const readManifest = async (language: string): Promise<unknown> =>
  JSON.parse(await readFile(path.join(root, 'public/audio', language, 'manifest.json'), 'utf8'));

describe('syncManifest', () => {
  it('writes an empty list when there are no clips', async () => {
    expect(await syncManifest(root, 'he')).toEqual([]);
    expect(await readManifest('he')).toEqual([]);
  });

  it('lists the mp3 files that exist, sorted', async () => {
    await writeTestClip(root, 'he', 'num-02.mp3');
    await writeTestClip(root, 'he', 'letter-name-alef.mp3');
    expect(await syncManifest(root, 'he')).toEqual(['letter-name-alef', 'num-02']);
    expect(await readManifest('he')).toEqual(['letter-name-alef', 'num-02']);
  });

  it('ignores unknown names, other formats and the other language', async () => {
    await writeTestClip(root, 'he', 'letter-name-alef.mp3');
    await writeTestClip(root, 'he', 'letter-name-bet.wav');
    await writeTestClip(root, 'he', 'not-a-clip.mp3');
    await writeTestClip(root, 'he', '.DS_Store');
    await writeTestClip(root, 'en', 'num-01.mp3');
    expect(await syncManifest(root, 'he')).toEqual(['letter-name-alef']);
    expect(await syncManifest(root, 'en')).toEqual(['num-01']);
  });

  it('drops ids whose file was removed', async () => {
    await writeTestClip(root, 'he', 'num-01.mp3');
    await syncManifest(root, 'he');
    await import('node:fs/promises').then((fs) =>
      fs.rm(path.join(root, 'public/audio/he/num-01.mp3')),
    );
    expect(await syncManifest(root, 'he')).toEqual([]);
  });
});

describe('listRecordedClipIds', () => {
  it('returns an empty list when the folder is missing', async () => {
    expect(await listRecordedClipIds(path.join(root, 'nowhere'), 'he')).toEqual([]);
  });
});
