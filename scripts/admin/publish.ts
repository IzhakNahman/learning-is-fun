import type { RunCommand } from './audio';
import type { PublishResponse, PublishStatusResponse } from './api';

/** Everything Publish touches. Nothing outside this folder is ever added or committed. */
export const AUDIO_PATHSPEC = 'public/audio';

export type GitRunner = (args: readonly string[]) => Promise<{ stdout: string; stderr: string }>;

export function makeGitRunner(repoRoot: string, run: RunCommand): GitRunner {
  return (args) => run('git', ['-C', repoRoot, ...args]);
}

interface ChangedFile {
  code: string;
  file: string;
}

/** Parses `git status --porcelain=v1` lines like "?? public/audio/he/num-01.mp3". */
export function parsePorcelain(output: string): ChangedFile[] {
  return output
    .split('\n')
    .filter((line) => line.length > 3)
    .map((line) => ({ code: line.slice(0, 2).trim(), file: line.slice(3) }));
}

/** A short commit message like "Audio (he): add 3, replace 1 clips". */
export function commitMessage(changes: readonly ChangedFile[]): string {
  const clips = changes.filter((change) => change.file.endsWith('.mp3'));
  const languages = [...new Set(clips.map((change) => change.file.split('/')[2]))].sort();
  const added = clips.filter((change) => change.code === '??' || change.code === 'A').length;
  const deleted = clips.filter((change) => change.code === 'D').length;
  const replaced = clips.length - added - deleted;
  const parts = [
    added > 0 ? `add ${added}` : '',
    replaced > 0 ? `replace ${replaced}` : '',
    deleted > 0 ? `delete ${deleted}` : '',
  ].filter((part) => part !== '');
  if (parts.length === 0) return 'Audio: update manifest';
  const total = clips.length === 1 ? 'clip' : 'clips';
  return `Audio (${languages.join(', ')}): ${parts.join(', ')} ${total}`;
}

async function audioChanges(git: GitRunner): Promise<ChangedFile[]> {
  const { stdout } = await git(['status', '--porcelain=v1', '-uall', '--', AUDIO_PATHSPEC]);
  return parsePorcelain(stdout);
}

export async function publishStatus(git: GitRunner): Promise<PublishStatusResponse> {
  const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim();
  const changes = await audioChanges(git);
  return {
    branch,
    files: changes.map((change) => `${change.code} ${change.file}`),
    message: commitMessage(changes),
  };
}

function commandOutput(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const stderr = 'stderr' in error ? String(error.stderr) : '';
  return stderr.trim() || error.message;
}

/** git add + commit (only public/audio) + push. Stops at the first step that fails. */
export async function publishAudio(git: GitRunner): Promise<PublishResponse> {
  const changes = await audioChanges(git);
  if (changes.length === 0) {
    return { ok: true, committed: false, output: 'Nothing to publish: no audio changes.' };
  }
  const message = commitMessage(changes);
  const log: string[] = [];
  try {
    await git(['add', '-A', '--', AUDIO_PATHSPEC]);
    // A pathspec on commit means only these paths are committed, even if other files are staged.
    const commit = await git(['commit', '-m', message, '--', AUDIO_PATHSPEC]);
    log.push(commit.stdout.trim());
  } catch (error) {
    return { ok: false, committed: false, output: `Commit failed:\n${commandOutput(error)}` };
  }
  try {
    const push = await git(['push']);
    log.push((push.stderr || push.stdout).trim());
  } catch (error) {
    log.push(`Push failed (the commit is saved locally):\n${commandOutput(error)}`);
    return { ok: false, committed: true, output: log.join('\n\n') };
  }
  return { ok: true, committed: true, output: log.join('\n\n') };
}
