/** Device text-to-speech. Used whenever no recorded clip exists for a part. */

const SPEECH_TIMEOUT_BASE_MS = 1500;
const SPEECH_TIMEOUT_PER_CHAR_MS = 260;
const SPEECH_UNAVAILABLE_BASE_MS = 400;
const SPEECH_UNAVAILABLE_PER_CHAR_MS = 70;

/** Browsers can silently drop a line that starts right after a cancel, so we leave a short gap. */
const AFTER_CANCEL_WINDOW_MS = 250;
const AFTER_CANCEL_GAP_MS = 80;
let lastCancelAt = -Infinity;

/** After this long, check whether the device is really still speaking (some never say "done"). */
const SPEAKING_POLL_START_MS = 700;
const SPEAKING_POLL_EVERY_MS = 150;
let speechUnlocked = false;

const isSpeechSupported = (): boolean => 'speechSynthesis' in window;

/** Words in a voice name that usually mean a clearer, more natural voice. */
const BETTER_VOICE_HINTS = ['enhanced', 'premium', 'neural', 'natural', 'google'];
/** Hebrew voices known to read niqqud well (iPhone "Carmit", Android "Google עברית"). */
const KNOWN_GOOD_HEBREW = ['carmit', 'עברית'];

function voiceScore(voice: SpeechSynthesisVoice, speechLang: string): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (voice.lang.toLowerCase().replace('_', '-') === speechLang.toLowerCase()) score += 4;
  if (BETTER_VOICE_HINTS.some((hint) => name.includes(hint))) score += 2;
  if (KNOWN_GOOD_HEBREW.some((hint) => name.includes(hint))) score += 2;
  if (name.includes('compact')) score -= 1;
  if (voice.localService) score += 1;
  return score;
}

export function findVoiceFor(speechLang: string): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const languagePrefix = speechLang.slice(0, 2).toLowerCase();
  const matching = speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith(languagePrefix));
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const voice of matching) {
    const score = voiceScore(voice, speechLang);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

/**
 * iPhones and iPads only allow the device voice after it was started once by a real tap.
 * A silent line spoken on the first tap or key press unlocks it for the rest of the session.
 */
export function unlockSpeech(): void {
  if (speechUnlocked || !isSpeechSupported()) return;
  speechUnlocked = true;
  try {
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    speechSynthesis.speak(silent);
  } catch {
    // The voice will simply start later.
  }
}

export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  try {
    speechSynthesis.cancel();
    lastCancelAt = performance.now();
  } catch {
    // Nothing to cancel.
  }
}

/** Resolves when the utterance ends. Always resolves, even if the device never reports back. */
export function speakText(text: string, speechLang: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      setTimeout(
        resolve,
        SPEECH_UNAVAILABLE_BASE_MS + text.length * SPEECH_UNAVAILABLE_PER_CHAR_MS,
      );
      return;
    }
    const gapMs =
      performance.now() - lastCancelAt < AFTER_CANCEL_WINDOW_MS ? AFTER_CANCEL_GAP_MS : 0;
    setTimeout(() => startUtterance(text, speechLang, rate, resolve), gapMs);
  });
}

function startUtterance(text: string, speechLang: string, rate: number, resolve: () => void): void {
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLang;
    const voice = findVoiceFor(speechLang);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = 1.1;

    let finished = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      clearTimeout(safetyTimer);
      clearTimeout(pollStartTimer);
      clearInterval(pollTimer);
      resolve();
    };
    // Devices that never report "done" (or drop the line) are noticed by asking if it still speaks.
    const pollStartTimer = setTimeout(() => {
      pollTimer = setInterval(() => {
        if (!speechSynthesis.speaking && !speechSynthesis.pending) finish();
      }, SPEAKING_POLL_EVERY_MS);
    }, SPEAKING_POLL_START_MS);
    const safetyTimer = setTimeout(
      finish,
      SPEECH_TIMEOUT_BASE_MS + text.length * SPEECH_TIMEOUT_PER_CHAR_MS,
    );
    utterance.onend = finish;
    utterance.onerror = finish;

    speechSynthesis.resume();
    speechSynthesis.speak(utterance);
  } catch {
    resolve();
  }
}
