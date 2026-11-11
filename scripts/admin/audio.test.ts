// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  AUDIO_FILTER,
  audioFilter,
  convertToClip,
  ffmpegArgs,
  findTool,
  type RunCommand,
} from './audio';

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

describe('audioFilter', () => {
  it('is the normal clean-up when nothing extra is asked', () => {
    expect(audioFilter()).toBe(AUDIO_FILTER);
    expect(audioFilter({ cutEndSeconds: 0, cleanVoice: false })).toBe(AUDIO_FILTER);
  });

  it('cuts the end first (the stop click), then cleans up', () => {
    const filter = audioFilter({ cutEndSeconds: 0.3 });
    expect(filter.startsWith('areverse,atrim=start=0.3,')).toBe(true);
    expect(filter.endsWith(AUDIO_FILTER)).toBe(true);
    expect(ffmpegArgs('in', 'out', { cutEndSeconds: 0.3 })).toContain(filter);
  });

  it('removes rumble and noise before trimming, and softens "s" after', () => {
    const steps = audioFilter({ cleanVoice: true }).split(',');
    const noise = steps.findIndex((step) => step.startsWith('afftdn'));
    const trim = steps.findIndex((step) => step.startsWith('silenceremove'));
    const deesser = steps.findIndex((step) => step.startsWith('deesser'));
    const volume = steps.findIndex((step) => step.startsWith('loudnorm'));
    expect(steps[0]).toBe('highpass=f=80');
    expect(noise).toBeLessThan(trim);
    expect(trim).toBeLessThan(deesser);
    expect(deesser).toBeLessThan(volume);
    expect(steps.some((step) => step.startsWith('acompressor'))).toBe(false);
  });

  it('cuts the click before anything else', () => {
    const steps = audioFilter({ cutEndSeconds: 0.3, cleanVoice: true }).split(',');
    expect(steps.slice(0, 4)).toEqual([
      'areverse',
      'atrim=start=0.3',
      'asetpts=N/SR/TB',
      'areverse',
    ]);
    expect(steps[4]).toBe('highpass=f=80');
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
