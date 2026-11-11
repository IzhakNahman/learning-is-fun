// @vitest-environment node
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ClipListResponse } from './api';
import type { AudioTools, RunCommand } from './audio';
import type { GitRunner } from './publish';
import { ADMIN_HOST, createAdminServer } from './server';
import { makeTestRepo, writeTestClip } from './testRepo';

const TOKEN = 'a'.repeat(48);

/** Fake ffmpeg: "converts" by writing "mp3:" + the input; fake ffprobe says 1 second. */
const fakeAudioRun: RunCommand = async (program, args) => {
  if (program === 'ffprobe') return { stdout: '1.0\n', stderr: '' };
  ffmpegFilters.push(args[args.indexOf('-af') + 1] ?? '');
  const input = args[args.indexOf('-i') + 1];
  const output = args.at(-1) ?? '';
  await writeFile(output, `mp3:${await readFile(input, 'utf8')}`);
  return { stdout: '', stderr: '' };
};
const fakeTools: AudioTools = { ffmpeg: 'ffmpeg', ffprobe: 'ffprobe', run: fakeAudioRun };

let root = '';
let cleanup: () => Promise<void> = async () => {};
let server: http.Server;
let base = '';
let gitCalls: string[][] = [];
let ffmpegFilters: string[] = [];
let gitStatusOutput = '';

const fakeGit: GitRunner = async (args) => {
  gitCalls.push([...args]);
  if (args[0] === 'rev-parse') return { stdout: 'main\n', stderr: '' };
  if (args[0] === 'status') return { stdout: gitStatusOutput, stderr: '' };
  return { stdout: `ran git ${args[0]}`, stderr: '' };
};

async function start(tools: AudioTools | null): Promise<void> {
  server = createAdminServer({ repoRoot: root, token: TOKEN, tools, git: fakeGit });
  await new Promise<void>((resolve) => server.listen(0, ADMIN_HOST, resolve));
  base = `http://${ADMIN_HOST}:${(server.address() as AddressInfo).port}`;
}

beforeEach(async () => {
  ({ root, cleanup } = await makeTestRepo());
  gitCalls = [];
  ffmpegFilters = [];
  gitStatusOutput = '';
  await start(fakeTools);
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await cleanup();
});

const withToken = (init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { 'X-Admin-Token': TOKEN, ...(init.headers as Record<string, string>) },
});
const clipFile = (id: string, language = 'he'): string =>
  path.join(root, 'public/audio', language, `${id}.mp3`);
const manifest = async (language = 'he'): Promise<unknown> =>
  JSON.parse(await readFile(path.join(root, 'public/audio', language, 'manifest.json'), 'utf8'));

describe('security checks', () => {
  it('refuses API calls without the token', async () => {
    const response = await fetch(`${base}/api/clips?lang=he`);
    expect(response.status).toBe(403);
  });

  it('refuses a wrong token', async () => {
    const response = await fetch(`${base}/api/clips?lang=he`, {
      headers: { 'X-Admin-Token': 'b'.repeat(48) },
    });
    expect(response.status).toBe(403);
  });

  it('refuses requests from another website', async () => {
    const response = await fetch(
      `${base}/api/clips/he/num-01`,
      withToken({ method: 'DELETE', headers: { Origin: 'https://evil.example' } }),
    );
    expect(response.status).toBe(403);
  });

  it('refuses unknown clip ids and path tricks without touching files', async () => {
    for (const bad of ['..%2F..%2Fpackage', 'manifest', 'not-a-clip', 'num-01.mp3']) {
      const response = await fetch(
        `${base}/api/clips/he/${bad}`,
        withToken({ method: 'PUT', body: 'x' }),
      );
      expect(response.status, bad).toBe(404);
    }
    const badLanguage = await fetch(
      `${base}/api/clips/xx/num-01`,
      withToken({ method: 'PUT', body: 'x' }),
    );
    expect(badLanguage.status).toBe(404);
    expect(await manifest()).toEqual([]);
  });

  it('serves the page and audio without a token (the audio element cannot send one)', async () => {
    await writeTestClip(root, 'he', 'num-01.mp3', 'sound');
    const audio = await fetch(`${base}/audio/he/num-01.mp3`);
    expect(audio.status).toBe(200);
    expect(await audio.text()).toBe('sound');
  });
});

describe('page', () => {
  it('serves the page with the token filled in', async () => {
    const html = await (await fetch(`${base}/`)).text();
    expect(html).toContain(`content="${TOKEN}"`);
    expect(html).not.toContain('__ADMIN_TOKEN__');
  });

  it('serves the page script as JavaScript, with the type imports removed', async () => {
    const response = await fetch(`${base}/admin.js`);
    expect(response.headers.get('content-type')).toContain('javascript');
    const script = await response.text();
    expect(script).toContain('loadClips');
    expect(script).not.toMatch(/^import /m);
  });
});

describe('clip list', () => {
  it('lists every clip with its status', async () => {
    await writeTestClip(root, 'he', 'num-01.mp3');
    const response = await fetch(`${base}/api/clips?lang=he`, withToken());
    const body = (await response.json()) as ClipListResponse;
    expect(body.direction).toBe('rtl');
    expect(body.speechLang).toBe('he-IL');
    expect(body.ffmpegReady).toBe(true);
    expect(body.clips.find((clip) => clip.clipId === 'num-01')?.recorded).toBe(true);
    expect(body.clips.find((clip) => clip.clipId === 'num-02')?.recorded).toBe(false);
    expect(body.clips.find((clip) => clip.clipId === 'letter-name-fe')?.display).toBe('פֵא');
  });

  it('rejects an unknown language', async () => {
    const response = await fetch(`${base}/api/clips?lang=fr`, withToken());
    expect(response.status).toBe(400);
  });
});

describe('saving, deleting and undo', () => {
  it('converts an upload, saves it and updates the manifest', async () => {
    const response = await fetch(
      `${base}/api/clips/he/num-01`,
      withToken({ method: 'PUT', body: 'raw audio' }),
    );
    expect(response.status).toBe(200);
    expect(await readFile(clipFile('num-01'), 'utf8')).toBe('mp3:raw audio');
    expect(await manifest()).toEqual(['num-01']);
  });

  it('backs up the old clip when replacing, and undo brings it back', async () => {
    await fetch(`${base}/api/clips/he/num-01`, withToken({ method: 'PUT', body: 'first' }));
    await fetch(`${base}/api/clips/he/num-01`, withToken({ method: 'PUT', body: 'second' }));
    expect(await readFile(clipFile('num-01'), 'utf8')).toBe('mp3:second');
    const undo = await fetch(`${base}/api/clips/he/num-01/undo`, withToken({ method: 'POST' }));
    expect(undo.status).toBe(200);
    expect(await readFile(clipFile('num-01'), 'utf8')).toBe('mp3:first');
  });

  it('deletes into the backup folder and updates the manifest', async () => {
    await fetch(`${base}/api/clips/he/num-01`, withToken({ method: 'PUT', body: 'x' }));
    const response = await fetch(`${base}/api/clips/he/num-01`, withToken({ method: 'DELETE' }));
    expect(response.status).toBe(200);
    expect(existsSync(clipFile('num-01'))).toBe(false);
    expect(await manifest()).toEqual([]);
    await fetch(`${base}/api/clips/he/num-01/undo`, withToken({ method: 'POST' }));
    expect(existsSync(clipFile('num-01'))).toBe(true);
    expect(await manifest()).toEqual(['num-01']);
  });

  it('cuts the stop click off the end of a recording when asked', async () => {
    await fetch(`${base}/api/clips/he/num-01`, withToken({ method: 'PUT', body: 'upload' }));
    await fetch(
      `${base}/api/clips/he/num-02?cutEndMs=300`,
      withToken({ method: 'PUT', body: 'recording' }),
    );
    expect(ffmpegFilters[0]).not.toContain('atrim');
    expect(ffmpegFilters[1]).toContain('atrim=start=0.3');
  });

  it('rejects a bad or too long end cut', async () => {
    for (const bad of ['abc', '-5', '0.3', '5000']) {
      const response = await fetch(
        `${base}/api/clips/he/num-01?cutEndMs=${bad}`,
        withToken({ method: 'PUT', body: 'x' }),
      );
      expect(response.status, bad).toBe(400);
    }
  });

  it('says 404 when deleting a clip that is not recorded', async () => {
    const response = await fetch(`${base}/api/clips/he/num-01`, withToken({ method: 'DELETE' }));
    expect(response.status).toBe(404);
  });

  it('rejects an empty upload', async () => {
    const response = await fetch(
      `${base}/api/clips/he/num-01`,
      withToken({ method: 'PUT', body: '' }),
    );
    expect(response.status).toBe(400);
  });

  it('explains how to install ffmpeg when it is missing', async () => {
    await new Promise((resolve) => server.close(resolve));
    await start(null);
    const response = await fetch(
      `${base}/api/clips/he/num-01`,
      withToken({ method: 'PUT', body: 'x' }),
    );
    expect(response.status).toBe(503);
    expect(((await response.json()) as { error: string }).error).toContain('brew install ffmpeg');
  });
});

describe('publish', () => {
  it('shows what would be published', async () => {
    gitStatusOutput = '?? public/audio/he/num-01.mp3\n M public/audio/he/manifest.json\n';
    const response = await fetch(`${base}/api/publish`, withToken());
    const body = (await response.json()) as { branch: string; message: string; files: string[] };
    expect(body.branch).toBe('main');
    expect(body.message).toBe('Audio (he): add 1 clip');
    expect(body.files).toHaveLength(2);
  });

  it('needs an explicit confirm', async () => {
    gitStatusOutput = '?? public/audio/he/num-01.mp3\n';
    const response = await fetch(`${base}/api/publish`, withToken({ method: 'POST', body: '{}' }));
    expect(response.status).toBe(400);
    expect(gitCalls.some((call) => call[0] === 'commit')).toBe(false);
  });

  it('adds, commits and pushes only public/audio', async () => {
    gitStatusOutput = '?? public/audio/he/num-01.mp3\n';
    const response = await fetch(
      `${base}/api/publish`,
      withToken({ method: 'POST', body: JSON.stringify({ confirm: true }) }),
    );
    expect(((await response.json()) as { ok: boolean }).ok).toBe(true);
    const names = gitCalls.map((call) => call[0]);
    expect(names).toEqual(['status', 'add', 'commit', 'push']);
    expect(gitCalls[1]).toEqual(['add', '-A', '--', 'public/audio']);
    expect(gitCalls[2]).toEqual(['commit', '-m', 'Audio (he): add 1 clip', '--', 'public/audio']);
  });

  it('does nothing when there are no audio changes', async () => {
    const response = await fetch(
      `${base}/api/publish`,
      withToken({ method: 'POST', body: JSON.stringify({ confirm: true }) }),
    );
    expect(((await response.json()) as { committed: boolean }).committed).toBe(false);
    expect(gitCalls.map((call) => call[0])).toEqual(['status']);
  });
});
