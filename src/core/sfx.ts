/** Short sound effects made with Web Audio (no files needed). */

let audioContext: AudioContext | null = null;

/** Browsers only allow audio after a tap or key press, so this runs on the first one. */
export function unlockAudio(): void {
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch {
      return;
    }
  }
  if (audioContext.state === 'suspended') void audioContext.resume();
}

function playTone(
  frequency: number,
  seconds: number,
  type: OscillatorType,
  volume: number,
  delaySeconds = 0,
): void {
  if (!audioContext) return;
  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + delaySeconds;
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  } catch {
    // A missed sound effect is harmless.
  }
}

export const playSwingSound = (): void => playTone(220, 0.06, 'triangle', 0.12);
export const playHitSound = (): void => playTone(120, 0.12, 'square', 0.2);
export const playBreakSound = (): void =>
  [523, 659, 784].forEach((frequency, index) =>
    playTone(frequency, 0.18, 'triangle', 0.18, index * 0.07),
  );
export const playWrongLetterSound = (): void => playTone(150, 0.3, 'sawtooth', 0.12);
export const playCelebrationSound = (): void =>
  [523, 659, 784, 1047].forEach((frequency, index) =>
    playTone(frequency, 0.25, 'triangle', 0.2, index * 0.1),
  );
/** How long the win sound lasts, so speech can wait for it to finish. */
export const WIN_SOUND_SECONDS = 0.75;
const WIN_NOTES_HZ = [523, 659, 784, 1047];
const WIN_NOTE_GAP_SECONDS = 0.1;
const WIN_SPARKLE_HZ = 1568;
const WIN_SPARKLE_DELAY_SECONDS = 0.4;
/** A happy rising fanfare with a little sparkle on top. `short` plays only the rising notes. */
export function playWinSound(short = false): void {
  WIN_NOTES_HZ.forEach((frequency, index) =>
    playTone(frequency, 0.22, 'triangle', 0.16, index * WIN_NOTE_GAP_SECONDS),
  );
  if (short) return;
  playTone(WIN_SPARKLE_HZ, 0.35, 'sine', 0.1, WIN_SPARKLE_DELAY_SECONDS);
}
/** A soft, friendly "try again" (not a harsh buzz): two gentle falling notes. */
export const playTryAgainSound = (): void => {
  playTone(392, 0.14, 'sine', 0.14);
  playTone(330, 0.2, 'sine', 0.14, 0.12);
};
/** A short bubble "pop". */
export const playPopSound = (): void => {
  playTone(760, 0.05, 'sine', 0.2);
  playTone(380, 0.1, 'triangle', 0.14, 0.015);
};
export const playCountBlip = (step: number): void =>
  playTone(400 + step * 25, 0.08, 'triangle', 0.12);
export const playTapBlip = (step: number): void => playTone(500 + step * 30, 0.1, 'triangle', 0.15);
