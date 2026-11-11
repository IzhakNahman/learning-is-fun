import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FFMPEG_INSTALL_HELP, findTool, runCommand, type AudioTools } from './audio';
import { makeGitRunner } from './publish';
import { ADMIN_HOST, createAdminServer } from './server';

/** `npm run admin`: the local page for recording and replacing audio clips. */
const PORT = 5180;
const PAGE_URL = `http://localhost:${PORT}`;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function findAudioTools(): Promise<AudioTools | null> {
  const ffmpeg = await findTool('ffmpeg');
  const ffprobe = await findTool('ffprobe');
  if (!ffmpeg || !ffprobe) return null;
  return { ffmpeg, ffprobe, run: runCommand };
}

const tools = await findAudioTools();
if (!tools) {
  console.warn(`\n${FFMPEG_INSTALL_HELP}\n(The page opens anyway, but cannot save audio.)\n`);
}

const server = createAdminServer({
  repoRoot,
  token: randomBytes(24).toString('hex'),
  tools,
  git: makeGitRunner(repoRoot, runCommand),
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is busy. Is the admin page already running in another terminal?`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, ADMIN_HOST, () => {
  console.log(`Audio admin: ${PAGE_URL}  (only this Mac can reach it; Ctrl+C to stop)`);
  if (process.argv.includes('--no-open')) return;
  execFile('open', [PAGE_URL], () => undefined);
});
