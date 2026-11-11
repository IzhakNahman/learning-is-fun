import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** A throw-away folder that looks like the repo: public/audio/he and public/audio/en. For tests. */
export async function makeTestRepo(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'audio-admin-test-'));
  for (const language of ['he', 'en']) {
    const dir = path.join(root, 'public', 'audio', language);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'manifest.json'), '[]\n');
  }
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export async function writeTestClip(
  root: string,
  language: string,
  fileName: string,
  content = 'fake mp3',
): Promise<void> {
  await writeFile(path.join(root, 'public', 'audio', language, fileName), content);
}
