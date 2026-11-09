import { beforeEach, describe, expect, it, vi } from 'vitest';

const oscillators: { frequency: { value: number }; start: ReturnType<typeof vi.fn> }[] = [];

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn();
  createOscillator() {
    const oscillator = {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    oscillators.push(oscillator);
    return oscillator;
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

vi.stubGlobal('AudioContext', FakeAudioContext);
const { WIN_SOUND_SECONDS, playWinSound, unlockAudio } = await import('./sfx');

describe('playWinSound', () => {
  beforeEach(() => {
    oscillators.length = 0;
    unlockAudio();
  });

  it('plays four rising notes and a sparkle', () => {
    playWinSound();
    const notes = oscillators.map((oscillator) => oscillator.frequency.value);
    expect(notes).toHaveLength(5);
    expect(notes.slice(0, 4)).toEqual([...notes.slice(0, 4)].sort((a, b) => a - b));
  });

  it('plays only the rising notes when short', () => {
    playWinSound(true);
    expect(oscillators).toHaveLength(4);
  });

  it('lasts long enough for speech to wait for it', () => {
    expect(WIN_SOUND_SECONDS).toBeGreaterThan(0.5);
  });
});
