/**
 * The audio admin page. Plain DOM, no framework. All text goes in with textContent.
 * Only type imports here: the server strips them when it turns this file into JavaScript.
 */
import type { ClipListResponse, ClipRow, PublishResponse, PublishStatusResponse } from '../api';

type Language = 'he' | 'en';

const TOKEN = document.querySelector<HTMLMetaElement>('meta[name="admin-token"]')?.content ?? '';
const DEVICE_VOICE_RATE = 0.8;
/** Peak level above this is shown red: too loud, it may crackle. */
const TOO_LOUD_PEAK = 0.97;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function button(label: string, title: string, onClick: () => void): HTMLButtonElement {
  const element = make('button', '', label);
  element.title = title;
  element.addEventListener('click', onClick);
  return element;
}

// ---------- server calls ----------

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'X-Admin-Token': TOKEN, ...(init.headers as Record<string, string> | undefined) },
  });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body ? String(body.error) : '';
    throw new Error(message || `Server said ${response.status}`);
  }
  return body as T;
}

const clipUrl = (language: Language, clipId: string): string =>
  `/api/clips/${language}/${encodeURIComponent(clipId)}`;

function uploadClip(language: Language, clipId: string, audio: Blob): Promise<unknown> {
  return api(clipUrl(language, clipId), { method: 'PUT', body: audio });
}

// ---------- page state ----------

const state = {
  language: 'he' as Language,
  data: null as ClipListResponse | null,
  search: '',
  missingOnly: false,
  busyClipIds: new Set<string>(),
};

const listElement = byId<HTMLElement>('list');
const progressElement = byId<HTMLElement>('progress');
const bannerElement = byId<HTMLElement>('banner');
const searchInput = byId<HTMLInputElement>('search');
const missingOnlyInput = byId<HTMLInputElement>('missing-only');

function findClip(clipId: string): ClipRow | undefined {
  return state.data?.clips.find((clip) => clip.clipId === clipId);
}

function visibleClips(): ClipRow[] {
  const clips = state.data?.clips ?? [];
  const query = state.search.trim().toLowerCase();
  return clips.filter((clip) => {
    if (state.missingOnly && clip.recorded) return false;
    if (!query) return true;
    const haystack = `${clip.clipId} ${clip.speech} ${clip.display ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });
}

function showBanner(text: string): void {
  bannerElement.textContent = text;
  bannerElement.hidden = text === '';
}

async function loadClips(): Promise<void> {
  const language = state.language;
  let data: ClipListResponse;
  try {
    data = await api<ClipListResponse>(`/api/clips?lang=${language}`);
  } catch (error) {
    showBanner(`Could not load clips: ${errorText(error)}`);
    return;
  }
  // The tab may have changed while waiting; a late answer for the other language is dropped.
  if (language !== state.language) return;
  state.data = data;
  byId<HTMLButtonElement>('next-missing').disabled = false;
  showBanner(data.ffmpegReady ? '' : data.ffmpegHelp);
  renderList();
  recorder.refresh();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---------- playback ----------

let currentAudio: HTMLAudioElement | null = null;

function stopAllSound(): void {
  currentAudio?.pause();
  currentAudio = null;
  speechSynthesis.cancel();
}

function playUrl(url: string): void {
  stopAllSound();
  currentAudio = new Audio(url);
  void currentAudio.play().catch(() => undefined);
}

function playRecording(clipId: string): void {
  // The time stamp stops the browser from playing an old copy after a replace.
  playUrl(`/audio/${state.language}/${clipId}.mp3?t=${Date.now()}`);
}

function bestVoice(speechLang: string): SpeechSynthesisVoice | null {
  const prefix = speechLang.slice(0, 2).toLowerCase();
  const voices = speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
  return voices.find((voice) => voice.lang === speechLang) ?? voices[0] ?? null;
}

function playDeviceVoice(clip: ClipRow): void {
  if (!state.data) return;
  stopAllSound();
  const utterance = new SpeechSynthesisUtterance(clip.speech);
  utterance.lang = state.data.speechLang;
  utterance.rate = DEVICE_VOICE_RATE;
  const voice = bestVoice(state.data.speechLang);
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

// ---------- list ----------

function sayCell(clip: ClipRow): HTMLElement {
  const cell = make('div', 'say');
  cell.dir = state.data?.direction ?? 'ltr';
  cell.lang = state.language;
  cell.append(document.createTextNode(clip.display ?? clip.speech));
  if (clip.display) cell.append(make('small', '', `voice text: ${clip.speech}`));
  return cell;
}

function rowActions(clip: ClipRow): HTMLElement {
  const actions = make('div', 'actions');
  const busy = state.busyClipIds.has(clip.clipId);
  const play = button('▶ Mine', 'Play my recording', () => playRecording(clip.clipId));
  play.disabled = !clip.recorded;
  const voice = button('🔊 Voice', 'Hear the device voice', () => playDeviceVoice(clip));
  const record = button('● Record', 'Record this clip', () =>
    recorder.open([clip.clipId], 0, false),
  );
  const remove = button('🗑', 'Delete (goes to the backup folder)', () => void deleteClip(clip));
  remove.disabled = !clip.recorded || busy;
  const undo = button('↶ Undo', 'Swap back the last backup', () => void undoClip(clip));
  undo.disabled = !clip.hasBackup || busy;
  record.disabled = busy;
  actions.append(play, voice, record, remove, undo);
  return actions;
}

function clipRow(clip: ClipRow): HTMLElement {
  const row = make('div', 'row');
  row.dataset.clipId = clip.clipId;
  if (state.busyClipIds.has(clip.clipId)) row.classList.add('busy');
  const status = make(
    'div',
    `status ${clip.recorded ? 'recorded' : 'missing'}`,
    clip.recorded ? '✓ recorded' : 'missing',
  );
  row.append(make('div', 'clip-id', clip.clipId), sayCell(clip), status, rowActions(clip));
  addDropUpload(row, clip.clipId);
  return row;
}

function renderList(): void {
  const clips = visibleClips();
  const all = state.data?.clips ?? [];
  const recordedCount = all.filter((clip) => clip.recorded).length;
  progressElement.textContent = `${recordedCount}/${all.length} recorded`;
  const groups = new Map<string, ClipRow[]>();
  for (const clip of clips) groups.set(clip.group, [...(groups.get(clip.group) ?? []), clip]);
  const fragment = document.createDocumentFragment();
  for (const [group, groupClips] of groups) {
    fragment.append(make('h2', '', `${group} (${groupClips.length})`));
    for (const clip of groupClips) fragment.append(clipRow(clip));
  }
  if (!state.data) fragment.append(make('p', '', 'Loading…'));
  if (state.data && clips.length === 0) fragment.append(make('p', '', 'Nothing matches.'));
  listElement.replaceChildren(fragment);
}

async function runOnClip(clipId: string, task: () => Promise<unknown>): Promise<void> {
  state.busyClipIds.add(clipId);
  renderList();
  try {
    await task();
  } catch (error) {
    alert(`${clipId}: ${errorText(error)}`);
  } finally {
    state.busyClipIds.delete(clipId);
    await loadClips();
  }
}

async function deleteClip(clip: ClipRow): Promise<void> {
  if (!confirm(`Delete ${clip.clipId}? (A copy goes to .audio-backup, so you can undo.)`)) return;
  await runOnClip(clip.clipId, () =>
    api(clipUrl(state.language, clip.clipId), { method: 'DELETE' }),
  );
}

async function undoClip(clip: ClipRow): Promise<void> {
  await runOnClip(clip.clipId, () =>
    api(`${clipUrl(state.language, clip.clipId)}/undo`, { method: 'POST' }),
  );
}

const ACCEPTED_UPLOAD = /\.(m4a|wav|mp3|aac|caf|webm|ogg)$/i;

function addDropUpload(row: HTMLElement, clipId: string): void {
  row.addEventListener('dragover', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    row.classList.add('drop-target');
  });
  row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
  row.addEventListener('drop', (event) => {
    event.preventDefault();
    row.classList.remove('drop-target');
    const file = event.dataTransfer?.files[0];
    if (!file) return;
    if (!ACCEPTED_UPLOAD.test(file.name)) {
      alert(`${file.name}: please drop an m4a, wav or mp3 file.`);
      return;
    }
    void runOnClip(clipId, () => uploadClip(state.language, clipId, file));
  });
}

// Dropping a file anywhere else must not make the browser open it and leave the page.
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());

// ---------- recorder ----------

type RecorderPhase = 'idle' | 'recording' | 'review' | 'saving';

const recorder = (() => {
  const panel = byId<HTMLElement>('recorder');
  const textElement = byId<HTMLElement>('rec-text');
  const idElement = byId<HTMLElement>('rec-id');
  const positionElement = byId<HTMLElement>('rec-position');
  const meter = byId<HTMLElement>('rec-meter');
  const meterBar = meter.firstElementChild as HTMLElement;
  const messageElement = byId<HTMLElement>('rec-message');
  const recordButton = byId<HTMLButtonElement>('rec-record');
  const playButton = byId<HTMLButtonElement>('rec-play');
  const keepButton = byId<HTMLButtonElement>('rec-keep');
  const retryButton = byId<HTMLButtonElement>('rec-retry');
  const prevButton = byId<HTMLButtonElement>('rec-prev');
  const nextButton = byId<HTMLButtonElement>('rec-next');

  let queue: string[] = [];
  let index = 0;
  /** In "next missing" mode, keeping a take moves on to the next missing clip by itself. */
  let missingMode = false;
  let phase: RecorderPhase = 'idle';
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let take: Blob | null = null;
  let takeUrl = '';
  let meterFrame = 0;

  const currentId = (): string | undefined => queue[index];

  function setMessage(text: string, isError = false): void {
    messageElement.textContent = text;
    messageElement.classList.toggle('error', isError);
  }

  function clearTake(): void {
    if (takeUrl) URL.revokeObjectURL(takeUrl);
    take = null;
    takeUrl = '';
  }

  function refresh(): void {
    if (panel.hidden) return;
    const clip = findClip(currentId() ?? '');
    textElement.dir = state.data?.direction ?? 'ltr';
    textElement.lang = state.language;
    textElement.textContent = clip ? (clip.display ?? clip.speech) : 'All done 🎉';
    idElement.textContent = clip
      ? `${clip.clipId} · ${clip.recorded ? 'recorded' : 'missing'}`
      : '';
    positionElement.textContent =
      queue.length > 0 ? `${Math.min(index + 1, queue.length)} of ${queue.length}` : '';
    recordButton.textContent = phase === 'recording' ? '■ Stop' : '● Record';
    recordButton.classList.toggle('recording', phase === 'recording');
    recordButton.disabled = !clip || phase === 'saving' || !state.data?.ffmpegReady;
    playButton.disabled = phase !== 'review';
    keepButton.disabled = phase !== 'review';
    retryButton.disabled = phase !== 'review';
    prevButton.disabled = index <= 0 || phase === 'recording' || phase === 'saving';
    nextButton.disabled = index >= queue.length - 1 || phase === 'recording' || phase === 'saving';
  }

  async function ensureMicrophone(): Promise<MediaStream> {
    if (stream) return stream;
    // Turn off the browser's voice "improvements": they pump the volume and smear short sounds.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    drawMeter();
    return stream;
  }

  function drawMeter(): void {
    if (!analyser) return;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    let peak = 0;
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    meterBar.style.width = `${Math.min(100, peak * 100)}%`;
    meter.classList.toggle('loud', peak >= TOO_LOUD_PEAK);
    meterFrame = requestAnimationFrame(drawMeter);
  }

  function pickMimeType(): string {
    const options = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
    return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
  }

  async function startRecording(): Promise<void> {
    if (phase === 'recording' || phase === 'saving' || !currentId()) return;
    stopAllSound();
    let microphone: MediaStream;
    try {
      microphone = await ensureMicrophone();
    } catch (error) {
      setMessage(`No microphone: ${errorText(error)}. Allow the microphone for this page.`, true);
      return;
    }
    clearTake();
    chunks = [];
    const mimeType = pickMimeType();
    mediaRecorder = new MediaRecorder(microphone, mimeType ? { mimeType } : {});
    mediaRecorder.addEventListener('dataavailable', (event) => chunks.push(event.data));
    mediaRecorder.addEventListener('stop', () => {
      take = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
      takeUrl = URL.createObjectURL(take);
      phase = 'review';
      setMessage('Listen with ▶ Play take, then ✓ Keep (Enter) or ↺ Retry (Space).');
      refresh();
      playUrl(takeUrl);
    });
    mediaRecorder.start();
    phase = 'recording';
    setMessage('Recording… press Space to stop.');
    refresh();
  }

  function stopRecording(): void {
    if (phase !== 'recording') return;
    mediaRecorder?.stop();
  }

  function toggleRecording(): void {
    if (phase === 'recording') {
      stopRecording();
      return;
    }
    void startRecording();
  }

  async function keepTake(): Promise<void> {
    const clipId = currentId();
    if (phase !== 'review' || !take || !clipId) return;
    phase = 'saving';
    setMessage('Saving (converting with ffmpeg)…');
    refresh();
    try {
      await uploadClip(state.language, clipId, take);
    } catch (error) {
      phase = 'review';
      setMessage(`Not saved: ${errorText(error)}`, true);
      refresh();
      return;
    }
    clearTake();
    phase = 'idle';
    await loadClips();
    setMessage(`Saved ${clipId}.`);
    if (missingMode) {
      queue = queue.filter((id) => id !== clipId);
      index = Math.min(index, queue.length - 1);
    }
    refresh();
  }

  function retryTake(): void {
    if (phase !== 'review') return;
    clearTake();
    phase = 'idle';
    void startRecording();
  }

  function move(step: number): void {
    if (phase === 'recording' || phase === 'saving') return;
    const nextIndex = index + step;
    if (nextIndex < 0 || nextIndex >= queue.length) return;
    clearTake();
    stopAllSound();
    index = nextIndex;
    phase = 'idle';
    setMessage('');
    refresh();
  }

  function open(clipIds: string[], startIndex: number, inMissingMode: boolean): void {
    queue = clipIds;
    index = startIndex;
    missingMode = inMissingMode;
    phase = 'idle';
    clearTake();
    panel.hidden = false;
    setMessage(
      queue.length === 0 ? 'Nothing missing. Everything is recorded!' : 'Press Space to record.',
    );
    refresh();
  }

  function close(): void {
    if (phase === 'recording') mediaRecorder?.stop();
    phase = 'idle';
    clearTake();
    panel.hidden = true;
    cancelAnimationFrame(meterFrame);
    stream?.getTracks().forEach((track) => track.stop());
    void audioContext?.close();
    stream = null;
    audioContext = null;
    analyser = null;
  }

  function handleKey(event: KeyboardEvent): void {
    if (panel.hidden) return;
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    const actions: Record<string, () => void> = {
      ' ': () => (phase === 'review' ? retryTake() : toggleRecording()),
      Enter: () => void keepTake(),
      ArrowDown: () => move(1),
      ArrowRight: () => move(1),
      ArrowUp: () => move(-1),
      ArrowLeft: () => move(-1),
      Escape: close,
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  recordButton.addEventListener('click', toggleRecording);
  playButton.addEventListener('click', () => takeUrl && playUrl(takeUrl));
  keepButton.addEventListener('click', () => void keepTake());
  retryButton.addEventListener('click', retryTake);
  prevButton.addEventListener('click', () => move(-1));
  nextButton.addEventListener('click', () => move(1));
  byId('rec-voice').addEventListener('click', () => {
    const clip = findClip(currentId() ?? '');
    if (clip) playDeviceVoice(clip);
  });
  byId('rec-close').addEventListener('click', close);
  // Buttons keep focus after a click; Space would then click them again instead of our shortcut.
  panel.addEventListener('mouseup', () => (document.activeElement as HTMLElement | null)?.blur());
  document.addEventListener('keydown', handleKey);

  return { open, close, refresh };
})();

function openNextMissing(): void {
  if (!state.data) return;
  const missing = (state.data?.clips ?? [])
    .filter((clip) => !clip.recorded)
    .map((clip) => clip.clipId);
  recorder.open(missing, 0, true);
}

// ---------- publish ----------

const publishDialog = byId<HTMLDialogElement>('publish-dialog');
const publishConfirm = byId<HTMLButtonElement>('publish-confirm');
const publishMessage = byId<HTMLElement>('publish-message');

async function openPublish(): Promise<void> {
  let status: PublishStatusResponse;
  try {
    status = await api<PublishStatusResponse>('/api/publish');
  } catch (error) {
    alert(`Could not read git status: ${errorText(error)}`);
    return;
  }
  const nothing = status.files.length === 0;
  byId('publish-summary').textContent = nothing
    ? 'There are no audio changes to publish.'
    : `Branch "${status.branch}". Commit message: "${status.message}". Then git push (this updates the live game).`;
  byId('publish-files').textContent = nothing ? '' : status.files.join('\n');
  publishMessage.textContent = '';
  publishConfirm.disabled = nothing;
  publishDialog.showModal();
}

async function runPublish(): Promise<void> {
  publishConfirm.disabled = true;
  publishMessage.textContent = 'Publishing…';
  publishDialog.showModal();
  try {
    const result = await api<PublishResponse>('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    publishMessage.textContent = result.ok ? 'Done.' : 'Something went wrong:';
    byId('publish-files').textContent = result.output;
  } catch (error) {
    publishMessage.textContent = `Failed: ${errorText(error)}`;
  }
}

publishDialog.addEventListener('close', () => {
  if (publishDialog.returnValue !== 'confirm') return;
  publishDialog.returnValue = '';
  void runPublish();
});

// ---------- header ----------

function selectLanguage(language: Language): void {
  state.language = language;
  state.data = null;
  byId<HTMLButtonElement>('next-missing').disabled = true;
  renderList();
  byId('tab-he').setAttribute('aria-selected', String(language === 'he'));
  byId('tab-en').setAttribute('aria-selected', String(language === 'en'));
  recorder.close();
  void loadClips();
}

byId('tab-he').addEventListener('click', () => selectLanguage('he'));
byId('tab-en').addEventListener('click', () => selectLanguage('en'));
searchInput.addEventListener('input', () => {
  state.search = searchInput.value;
  renderList();
});
missingOnlyInput.addEventListener('change', () => {
  state.missingOnly = missingOnlyInput.checked;
  renderList();
});
byId('next-missing').addEventListener('click', openNextMissing);
byId('publish').addEventListener('click', () => void openPublish());

void loadClips();
