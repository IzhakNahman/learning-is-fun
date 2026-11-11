// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AUDIO_FILTER, convertToClip, ffmpegArgs, findTool, type RunCommand } from './audio';

function fakeRun(handler: (program: string, args: readonly string[]) => string): {
  run: RunCommand;
  calls: string[][];
} {
  const calls: string[][] = [];
  const run: RunCommand = async (program, args) => {
    calls.push([program, ...args]);
    return { stdout: handler(program, args), stderr: '' };
  };
  return { run, calls };
}

describe('ffmpegArgs', () => {
  it('makes a mono 44.1 kHz mp3 with trimming and volume levelling', () => {
    const args = ffmpegArgs('in.webm', 'out.mp3');
    expect(args).toContain('in.webm');
    expect(args.at(-1)).toBe('out.mp3');
    expect(args.join(' ')).toContain('-ac 1');
    expect(args.join(' ')).toContain('-ar 44100');
    expect(AUDIO_FILTER).toContain('silenceremove');
    expect(AUDIO_FILTER).toContain('areverse');
    expect(AUDIO_FILTER).toContain('loudnorm');
  });
});

describe('findTool', () => {
  it('uses the name on PATH when it runs', async () => {
    const { run } = fakeRun(() => 'ffmpeg version 7');
    expect(await findTool('ffmpeg', run, () => false)).toBe('ffmpeg');
  });

  it('falls back to the Homebrew folder', async () => {
    const run: RunCommand = async (program) => {
      if (program === 'ffmpeg') throw new Error('not found');
      return { stdout: '', stderr: '' };
    };
    const found = await findTool('ffmpeg', run, (file) => file === '/opt/homebrew/bin/ffmpeg');
    expect(found).toBe('/opt/homebrew/bin/ffmpeg');
  });

  it('returns null when ffmpeg is nowhere', async () => {
    const run: RunCommand = async () => {
      throw new Error('not found');
    };
    expect(await findTool('ffmpeg', run, () => false)).toBeNull();
  });
});

describe('convertToClip', () => {
  it('runs ffmpeg, then checks the length with ffprobe', async () => {
    const { run, calls } = fakeRun((program) => (program === 'ffprobe' ? '0.9\n' : ''));
    await convertToClip({ ffmpeg: 'ffmpeg', ffprobe: 'ffprobe', run }, 'in.wav', 'out.mp3');
    expect(calls.map((call) => call[0])).toEqual(['ffmpeg', 'ffprobe']);
  });

  it('rejects a recording that was only silence', async () => {
    const { run } = fakeRun((program) => (program === 'ffprobe' ? '0.14\n' : ''));
    await expect(
      convertToClip({ ffmpeg: 'ffmpeg', ffprobe: 'ffprobe', run }, 'in.wav', 'out.mp3'),
    ).rejects.toThrow(/No sound/);
  });

  it('turns an ffmpeg failure into a readable error', async () => {
    const run: RunCommand = async () => {
      throw Object.assign(new Error('exit 1'), { stderr: 'Invalid data found' });
    };
    await expect(
      convertToClip({ ffmpeg: 'ffmpeg', ffprobe: 'ffprobe', run }, 'in.txt', 'out.mp3'),
    ).rejects.toThrow(/could not read this audio\. Invalid data found/);
  });
});
