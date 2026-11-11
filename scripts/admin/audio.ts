import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';

/** Runs a program without a shell (arguments are never parsed as shell text). */
export type RunCommand = (
  program: string,
  args: readonly string[],
) => Promise<{ stdout: string; stderr: string }>;

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 60_000;

export const runCommand: RunCommand = async (program, args) => {
  const result = await execFileAsync(program, [...args], {
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024,
  });
  return { stdout: String(result.stdout), stderr: String(result.stderr) };
};

export const FFMPEG_INSTALL_HELP = [
  'ffmpeg is not installed. On a Mac:',
  '  1. Install Homebrew (if `brew` is missing): see https://brew.sh',
  '  2. brew install ffmpeg',
  'Then run `npm run admin` again.',
].join('\n');

/** Homebrew puts tools here; npm scripts do not always have it on PATH. */
const EXTRA_TOOL_DIRS = ['/opt/homebrew/bin', '/usr/local/bin'];

/** The path to call a tool by: its name if it runs from PATH, else a Homebrew location, else null. */
export async function findTool(
  name: 'ffmpeg' | 'ffprobe',
  run: RunCommand = runCommand,
  fileExists: (file: string) => boolean = existsSync,
): Promise<string | null> {
  const candidates = [name, ...EXTRA_TOOL_DIRS.map((dir) => `${dir}/${name}`)];
  for (const candidate of candidates) {
    if (candidate !== name && !fileExists(candidate)) continue;
    const works = await run(candidate, ['-version']).then(
      () => true,
      () => false,
    );
    if (works) return candidate;
  }
  return null;
}

/** Quieter than this counts as silence when trimming the start and end. */
const SILENCE_THRESHOLD = '-45dB';
/** A tiny bit of quiet before and after, so the first sound is not clipped on phones. */
const LEAD_IN_MS = 60;
const TAIL_SECONDS = 0.08;
/** Recordings shorter than this after trimming were probably only silence. */
const MIN_CLIP_SECONDS = 0.05;

const TRIM_START = `silenceremove=start_periods=1:start_threshold=${SILENCE_THRESHOLD}:detection=peak`;

const TRIM_BOTH_ENDS = [TRIM_START, 'areverse', TRIM_START, 'areverse'];
const EVEN_VOLUME = 'loudnorm=I=-16:TP=-1.5:LRA=11';
const PAD_BOTH_ENDS = [`adelay=${LEAD_IN_MS}`, `apad=pad_dur=${TAIL_SECONDS}`];

/** Trim silence at both ends (trim, reverse, trim, reverse), even out the volume, add a short pad. */
export const AUDIO_FILTER = [...TRIM_BOTH_ENDS, EVEN_VOLUME, ...PAD_BOTH_ENDS].join(',');

/** Before trimming: drop low rumble (desk bumps, traffic) and steady background noise (fan, hum). */
export const VOICE_CLEAN_BEFORE = [
  'highpass=f=80',
  // tn=1 learns the noise from the recording itself.
  'afftdn=nf=-25:tn=1',
];
/**
 * After trimming: soften sharp "s/sh" sounds. (No compressor: in tests it raised the background
 * noise back up, and the volume is evened out at the end anyway.)
 */
export const VOICE_CLEAN_AFTER = ['deesser=i=0.4'];

/** Longest end cut allowed, so a mistake can never throw the whole word away. */
export const MAX_CUT_END_MS = 1000;

export interface ConvertOptions {
  /** Drop this much from the end first (the click of the key or mouse that stopped it). */
  cutEndSeconds?: number;
  /** Add rumble cut, noise removal and de-essing to the normal clean-up. */
  cleanVoice?: boolean;
}

export function audioFilter(options: ConvertOptions = {}): string {
  const { cutEndSeconds = 0, cleanVoice = false } = options;
  const cutEnd =
    cutEndSeconds > 0
      ? ['areverse', `atrim=start=${cutEndSeconds}`, 'asetpts=N/SR/TB', 'areverse']
      : [];
  const before = cleanVoice ? VOICE_CLEAN_BEFORE : [];
  const after = cleanVoice ? VOICE_CLEAN_AFTER : [];
  return [...cutEnd, ...before, ...TRIM_BOTH_ENDS, ...after, EVEN_VOLUME, ...PAD_BOTH_ENDS].join(
    ',',
  );
}

export function ffmpegArgs(
  inputPath: string,
  outputPath: string,
  options: ConvertOptions = {},
): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    inputPath,
    '-vn',
    '-af',
    audioFilter(options),
    '-ac',
    '1',
    '-ar',
    '44100',
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '96k',
    outputPath,
  ];
}

export interface AudioTools {
  ffmpeg: string;
  ffprobe: string;
  run: RunCommand;
}

async function clipSeconds(tools: AudioTools, filePath: string): Promise<number> {
  const { stdout } = await tools.run(tools.ffprobe, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    filePath,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  return Number.isFinite(seconds) ? seconds : 0;
}

/**
 * Converts any audio file (m4a, wav, mp3, webm from the browser) to a clean mono mp3.
 * Throws an Error with a readable message when the input cannot be used.
 */
export async function convertToClip(
  tools: AudioTools,
  inputPath: string,
  outputPath: string,
  options: ConvertOptions = {},
): Promise<void> {
  try {
    await tools.run(tools.ffmpeg, ffmpegArgs(inputPath, outputPath, options));
  } catch (error) {
    const details = error instanceof Error && 'stderr' in error ? String(error.stderr) : '';
    throw new Error(`ffmpeg could not read this audio. ${details}`.trim());
  }
  const seconds = await clipSeconds(tools, outputPath);
  const soundSeconds = seconds - LEAD_IN_MS / 1000 - TAIL_SECONDS;
  if (soundSeconds < MIN_CLIP_SECONDS) {
    throw new Error('No sound found in the recording (only silence?).');
  }
}
