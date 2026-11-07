import type { SpokenPart } from '../content';
import { getPack } from './i18n';
import { hasClip, playClip } from './clipPlayer';
import { beginPlayback, isCurrentPlayback } from './playback';
import { speakText } from './speech';

/** Speaking speeds (1 = normal). Slower for sounds the child has to learn. */
export const SPEECH_RATE = {
  DEFAULT: 0.8,
  LETTER_NAME: 0.75,
  LETTER_SOUND: 0.7,
  WORD: 0.7,
  END_COUNT: 0.85,
  COUNTING: 1,
} as const;

/** Browsers sometimes drop a line that starts right after a cancel; a short pause avoids it. */
const AFTER_CANCEL_DELAY_MS = 70;

/** Plays the recording if there is one, otherwise reads the text with the device voice. */
export function speakPart(part: SpokenPart, rate: number = SPEECH_RATE.DEFAULT): Promise<void> {
  const pack = getPack();
  if (hasClip(pack.code, part.clipId)) return playClip(pack.code, part.clipId);
  return speakText(part.speech, pack.speechLang, rate);
}

export async function speakPartsInOrder(
  parts: readonly SpokenPart[],
  playbackId: number,
  rate: number = SPEECH_RATE.DEFAULT,
): Promise<void> {
  for (const part of parts) {
    if (!isCurrentPlayback(playbackId)) return;
    await speakPart(part, rate);
  }
}

/** Interrupts whatever is playing; if something newer starts meanwhile, this one is skipped. */
export function speakInterrupting(
  part: SpokenPart,
  rate: number = SPEECH_RATE.DEFAULT,
): Promise<void> {
  const playbackId = beginPlayback();
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!isCurrentPlayback(playbackId)) {
        resolve();
        return;
      }
      void speakPart(part, rate).then(resolve);
    }, AFTER_CANCEL_DELAY_MS);
  });
}
