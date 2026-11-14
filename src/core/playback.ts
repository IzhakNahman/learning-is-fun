import { cancelSpeech } from './speech';

/**
 * Only the newest playback is allowed to continue. Every async voice sequence takes an id
 * from `beginPlayback` and stops as soon as `isCurrentPlayback(id)` turns false.
 */
let currentPlaybackId = 0;
let stopCurrentClip: (() => void) | null = null;

export function beginPlayback(): number {
  currentPlaybackId += 1;
  cancelSpeech();
  stopCurrentClip?.();
  stopCurrentClip = null;
  return currentPlaybackId;
}

/** The id of the playback going on now (taken right after a game started speaking). */
export function currentPlayback(): number {
  return currentPlaybackId;
}

export function isCurrentPlayback(playbackId: number): boolean {
  return playbackId === currentPlaybackId;
}

export function registerClipStopper(stop: (() => void) | null): void {
  stopCurrentClip = stop;
}
