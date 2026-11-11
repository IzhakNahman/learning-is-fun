// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { commitMessage, parsePorcelain, publishAudio, type GitRunner } from './publish';

describe('parsePorcelain', () => {
  it('reads status codes and paths', () => {
    expect(parsePorcelain('?? public/audio/he/a.mp3\n M public/audio/he/manifest.json\n')).toEqual([
      { code: '??', file: 'public/audio/he/a.mp3' },
      { code: 'M', file: 'public/audio/he/manifest.json' },
    ]);
  });
});

describe('commitMessage', () => {
  it('counts added, replaced and deleted clips per language', () => {
    const changes = parsePorcelain(
      [
        '?? public/audio/he/a.mp3',
        '?? public/audio/he/b.mp3',
        ' M public/audio/en/c.mp3',
        ' D public/audio/he/d.mp3',
        ' M public/audio/he/manifest.json',
      ].join('\n'),
    );
    expect(commitMessage(changes)).toBe('Audio (en, he): add 2, replace 1, delete 1 clips');
  });

  it('falls back when only the manifest changed', () => {
    expect(commitMessage(parsePorcelain(' M public/audio/he/manifest.json'))).toBe(
      'Audio: update manifest',
    );
  });
});

describe('publishAudio', () => {
  it('keeps the commit and reports when push fails', async () => {
    const git: GitRunner = async (args) => {
      if (args[0] === 'status') return { stdout: '?? public/audio/he/a.mp3\n', stderr: '' };
      if (args[0] === 'push') {
        throw Object.assign(new Error('exit 128'), { stderr: 'Authentication failed' });
      }
      return { stdout: 'ok', stderr: '' };
    };
    const result = await publishAudio(git);
    expect(result).toMatchObject({ ok: false, committed: true });
    expect(result.output).toContain('Authentication failed');
  });

  it('stops before push when the commit fails', async () => {
    const calls: string[] = [];
    const git: GitRunner = async (args) => {
      calls.push(args[0]);
      if (args[0] === 'status') return { stdout: '?? public/audio/he/a.mp3\n', stderr: '' };
      if (args[0] === 'commit') {
        throw Object.assign(new Error('exit 128'), { stderr: 'Please tell me who you are.' });
      }
      return { stdout: '', stderr: '' };
    };
    const result = await publishAudio(git);
    expect(result).toMatchObject({ ok: false, committed: false });
    expect(calls).not.toContain('push');
  });
});
