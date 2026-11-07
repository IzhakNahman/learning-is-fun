import type { LanguageCode } from '../content';
import { registerClipStopper } from './playback';

/**
 * Recorded audio. Drop mp3 files in public/audio/<language>/<clipId>.mp3 and list their ids
 * in public/audio/<language>/manifest.json (a JSON array of clip ids).
 */
const availableClips: Record<LanguageCode, Set<string>> = { he: new Set(), en: new Set() };

const CLIP_SAFETY_TIMEOUT_MS = 15000;

export async function loadClipManifest(language: LanguageCode): Promise<void> {
  // Opening index.html straight from disk cannot fetch files; recordings need a web server.
  if (window.location.protocol === 'file:') return;
  try {
    const response = await fetch(`audio/${language}/manifest.json`);
    if (!response.ok) return;
    const clipIds: unknown = await response.json();
    if (!Array.isArray(clipIds)) return;
    availableClips[language] = new Set(
      clipIds.filter((id): id is string => typeof id === 'string'),
    );
  } catch {
    // No recordings installed: the device voice is used instead.
  }
}

export function hasClip(language: LanguageCode, clipId: string): boolean {
  return availableClips[language].has(clipId);
}

export function playClip(language: LanguageCode, clipId: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(`audio/${language}/${clipId}.mp3`);
    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      clearTimeout(safetyTimer);
      registerClipStopper(null);
      resolve();
    };
    const safetyTimer = setTimeout(finish, CLIP_SAFETY_TIMEOUT_MS);
    audio.onended = finish;
    audio.onerror = finish;
    registerClipStopper(() => {
      audio.pause();
      finish();
    });
    audio.play().catch(finish);
  });
}
