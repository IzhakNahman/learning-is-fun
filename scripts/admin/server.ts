import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { packs, type LanguageCode } from '../../src/content';
import type { ClipListResponse, ClipRow } from './api';
import {
  FFMPEG_INSTALL_HELP,
  MAX_CUT_END_MS,
  convertToClip,
  type AudioTools,
  type ConvertOptions,
} from './audio';
import { backupClip, listBackedUpClipIds, restoreLatestBackup } from './backup';
import { clipFilePath, languageAudioDir, listClips, parseLanguage } from './clips';
import { listRecordedClipIds, syncManifest } from './manifest';
import { publishAudio, publishStatus, type GitRunner } from './publish';

export const ADMIN_HOST = '127.0.0.1';
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const TOKEN_HEADER = 'x-admin-token';
const PAGE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'page');

export interface AdminOptions {
  repoRoot: string;
  /** Secret placed in the page; every request that changes something must send it back. */
  token: string;
  /** null when ffmpeg is missing: the page still works, but cannot save new audio. */
  tools: AudioTools | null;
  git: GitRunner;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function sendText(res: http.ServerResponse, contentType: string, body: string | Buffer): void {
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function allowedHosts(port: number): string[] {
  return [`localhost:${port}`, `127.0.0.1:${port}`];
}

/**
 * Blocks requests that did not come from our own page:
 * - Host must be localhost / 127.0.0.1 (stops "DNS rebinding" from a website),
 * - Origin, when sent, must be our own address,
 * - anything that changes files must carry the page token.
 */
export function checkRequest(
  req: http.IncomingMessage,
  port: number,
  token: string,
  needsToken: boolean,
): void {
  const hosts = allowedHosts(port);
  if (!hosts.includes(req.headers.host ?? '')) throw new HttpError(403, 'Wrong host');
  const origin = req.headers.origin;
  if (origin !== undefined && !hosts.some((host) => origin === `http://${host}`)) {
    throw new HttpError(403, 'Wrong origin');
  }
  if (!needsToken) return;
  const given = req.headers[TOKEN_HEADER];
  if (typeof given !== 'string' || !sameSecret(given, token)) {
    throw new HttpError(403, 'Missing or wrong admin token');
  }
}

async function readBody(req: http.IncomingMessage, limit: number): Promise<Buffer> {
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > limit) throw new HttpError(413, 'File is too big (max 20 MB)');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > limit) throw new HttpError(413, 'File is too big (max 20 MB)');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function clipList(options: AdminOptions, language: LanguageCode): Promise<ClipListResponse> {
  const pack = packs[language];
  const recorded = new Set(await listRecordedClipIds(options.repoRoot, language));
  const backedUp = await listBackedUpClipIds(options.repoRoot, language);
  const clips: ClipRow[] = listClips(language).map((item) => ({
    clipId: item.clipId,
    speech: item.speech,
    ...(item.display ? { display: item.display } : {}),
    group: item.group,
    recorded: recorded.has(item.clipId),
    hasBackup: backedUp.has(item.clipId),
  }));
  return {
    language,
    languageName: pack.nativeName,
    speechLang: pack.speechLang,
    direction: language === 'he' ? 'rtl' : 'ltr',
    ffmpegReady: options.tools !== null,
    ffmpegHelp: FFMPEG_INSTALL_HELP,
    clips,
  };
}

/** Converts uploaded audio in a temp folder and returns the mp3. Nothing is saved. */
async function convertUpload(
  options: AdminOptions,
  audio: Buffer,
  convert: ConvertOptions,
): Promise<Buffer> {
  if (!options.tools) throw new HttpError(503, FFMPEG_INSTALL_HELP);
  if (audio.length === 0) throw new HttpError(400, 'The upload was empty');
  const tools = options.tools;
  const workDir = await mkdtemp(path.join(os.tmpdir(), 'audio-admin-'));
  try {
    const input = path.join(workDir, 'input');
    const output = path.join(workDir, 'output.mp3');
    await writeFile(input, audio);
    await convertToClip(tools, input, output, convert).catch((error: unknown) => {
      throw new HttpError(422, error instanceof Error ? error.message : String(error));
    });
    return await readFile(output);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** Converts the upload, backs up the old clip, then puts the new one in. */
async function saveClip(
  options: AdminOptions,
  language: LanguageCode,
  clipId: string,
  target: string,
  audio: Buffer,
  convert: ConvertOptions,
): Promise<void> {
  const mp3 = await convertUpload(options, audio, convert);
  await backupClip(options.repoRoot, language, clipId);
  await mkdir(languageAudioDir(options.repoRoot, language), { recursive: true });
  await writeFile(target, mp3);
  await syncManifest(options.repoRoot, language);
}

async function deleteClip(
  options: AdminOptions,
  language: LanguageCode,
  clipId: string,
  target: string,
): Promise<void> {
  if (!existsSync(target)) throw new HttpError(404, 'This clip is not recorded');
  await backupClip(options.repoRoot, language, clipId);
  await rm(target);
  await syncManifest(options.repoRoot, language);
}

async function undoClip(
  options: AdminOptions,
  language: LanguageCode,
  clipId: string,
): Promise<void> {
  const restored = await restoreLatestBackup(options.repoRoot, language, clipId);
  if (!restored) throw new HttpError(404, 'No backup to restore');
  await syncManifest(options.repoRoot, language);
}

let pageScriptCache: string | null = null;

/** The page is written in TypeScript; the TypeScript package (already installed) turns it into JS. */
async function pageScript(): Promise<string> {
  if (pageScriptCache !== null) return pageScriptCache;
  const source = await readFile(path.join(PAGE_DIR, 'admin.ts'), 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  pageScriptCache = result.outputText;
  return pageScriptCache;
}

/** The token is plain hex, so it can be placed in the page without any escaping worries. */
async function pageHtml(token: string): Promise<string> {
  const html = await readFile(path.join(PAGE_DIR, 'index.html'), 'utf8');
  return html.replace('__ADMIN_TOKEN__', token);
}

/** How much to cut off the end of a recording (the stop click). Missing means nothing. */
function parseCutEndMs(value: string | null): number {
  if (value === null) return 0;
  if (!/^\d{1,4}$/.test(value)) throw new HttpError(400, 'cutEndMs must be a whole number');
  const cutEndMs = Number(value);
  if (cutEndMs > MAX_CUT_END_MS) {
    throw new HttpError(400, `cutEndMs must be at most ${MAX_CUT_END_MS}`);
  }
  return cutEndMs;
}

/** `cutEndMs` (whole milliseconds) and `clean` (1 or 0) from the query string. */
function parseConvertOptions(params: URLSearchParams): ConvertOptions {
  const clean = params.get('clean');
  if (clean !== null && clean !== '0' && clean !== '1') {
    throw new HttpError(400, 'clean must be 1 or 0');
  }
  return {
    cutEndSeconds: parseCutEndMs(params.get('cutEndMs')) / 1000,
    cleanVoice: clean === '1',
  };
}

function isConfirmed(body: string): boolean {
  try {
    const parsed: unknown = JSON.parse(body);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      'confirm' in parsed &&
      parsed.confirm === true
    );
  } catch {
    return false;
  }
}

const CLIP_ROUTE = /^\/api\/clips\/([^/]+)\/([^/]+)(\/undo)?$/;
const AUDIO_ROUTE = /^\/audio\/([^/]+)\/([^/]+)\.mp3$/;

function parseClipRoute(
  options: AdminOptions,
  language: string,
  clipId: string,
): { language: LanguageCode; clipId: string; target: string } {
  const code = parseLanguage(language);
  if (!code) throw new HttpError(404, 'Unknown language');
  const target = clipFilePath(options.repoRoot, code, clipId);
  if (!target) throw new HttpError(404, 'Unknown clip id');
  return { language: code, clipId, target };
}

/** Runs file-changing work one at a time, so two quick clicks cannot mix up files. */
function makeQueue(): <T>(task: () => Promise<T>) => Promise<T> {
  let last: Promise<unknown> = Promise.resolve();
  return (task) => {
    const next = last.then(task, task);
    last = next.catch(() => undefined);
    return next;
  };
}

async function route(
  options: AdminOptions,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  port: number,
  inQueue: <T>(task: () => Promise<T>) => Promise<T>,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const method = req.method ?? 'GET';
  const isApi = url.pathname.startsWith('/api/');
  checkRequest(req, port, options.token, isApi);

  if (method === 'GET' && url.pathname === '/') {
    sendText(res, 'text/html; charset=utf-8', await pageHtml(options.token));
    return;
  }
  if (method === 'GET' && url.pathname === '/admin.js') {
    sendText(res, 'text/javascript; charset=utf-8', await pageScript());
    return;
  }

  const audioMatch = AUDIO_ROUTE.exec(url.pathname);
  if (method === 'GET' && audioMatch) {
    const clip = parseClipRoute(options, audioMatch[1], audioMatch[2]);
    if (!existsSync(clip.target)) throw new HttpError(404, 'Not recorded');
    sendText(res, 'audio/mpeg', await readFile(clip.target));
    return;
  }

  if (method === 'GET' && url.pathname === '/api/clips') {
    const language = parseLanguage(url.searchParams.get('lang'));
    if (!language) throw new HttpError(400, 'lang must be he or en');
    sendJson(res, 200, await clipList(options, language));
    return;
  }

  const clipMatch = CLIP_ROUTE.exec(url.pathname);
  if (clipMatch) {
    const clip = parseClipRoute(options, clipMatch[1], clipMatch[2]);
    const isUndo = clipMatch[3] !== undefined;
    if (method === 'PUT' && !isUndo) {
      const convert = parseConvertOptions(url.searchParams);
      const audio = await readBody(req, MAX_UPLOAD_BYTES);
      await inQueue(() =>
        saveClip(options, clip.language, clip.clipId, clip.target, audio, convert),
      );
      sendJson(res, 200, { ok: true });
      return;
    }
    if (method === 'DELETE' && !isUndo) {
      await inQueue(() => deleteClip(options, clip.language, clip.clipId, clip.target));
      sendJson(res, 200, { ok: true });
      return;
    }
    if (method === 'POST' && isUndo) {
      await inQueue(() => undoClip(options, clip.language, clip.clipId));
      sendJson(res, 200, { ok: true });
      return;
    }
    throw new HttpError(405, 'Method not allowed');
  }

  if (method === 'POST' && url.pathname === '/api/preview') {
    const convert = parseConvertOptions(url.searchParams);
    const audio = await readBody(req, MAX_UPLOAD_BYTES);
    sendText(res, 'audio/mpeg', await convertUpload(options, audio, convert));
    return;
  }

  if (method === 'GET' && url.pathname === '/api/publish') {
    sendJson(res, 200, await publishStatus(options.git));
    return;
  }
  if (method === 'POST' && url.pathname === '/api/publish') {
    const body = (await readBody(req, 1024)).toString('utf8');
    if (!isConfirmed(body)) throw new HttpError(400, 'Publish needs { "confirm": true }');
    sendJson(res, 200, await inQueue(() => publishAudio(options.git)));
    return;
  }

  throw new HttpError(404, 'Not found');
}

export function createAdminServer(options: AdminOptions): http.Server {
  const inQueue = makeQueue();
  const server = http.createServer((req, res) => {
    const port = (server.address() as AddressInfo).port;
    route(options, req, res, port, inQueue).catch((error: unknown) => {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : String(error);
      if (status === 500) console.error(error);
      if (res.headersSent) {
        res.end();
        return;
      }
      sendJson(res, status, { error: message });
    });
  });
  return server;
}
