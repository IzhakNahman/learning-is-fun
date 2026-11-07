import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeUtterance {
  volume = 1;
  constructor(public text: string) {}
}

function installSpeech(speakImpl: (u: FakeUtterance) => void, speaking: () => boolean) {
  const speechSynthesis = {
    speak: vi.fn(speakImpl),
    cancel: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [],
    get speaking() {
      return speaking();
    },
    pending: false,
  };
  vi.stubGlobal('speechSynthesis', speechSynthesis);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  Object.defineProperty(window, 'speechSynthesis', { value: speechSynthesis, configurable: true });
  return speechSynthesis;
}

describe('device speech', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('unlocks the voice once with a silent line', async () => {
    const synth = installSpeech(
      () => undefined,
      () => false,
    );
    const { unlockSpeech } = await import('./speech');
    unlockSpeech();
    unlockSpeech();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls[0]![0].volume).toBe(0);
  });

  it('finishes soon when the device drops the line and never says it is done', async () => {
    installSpeech(
      () => undefined,
      () => false,
    );
    const { speakText } = await import('./speech');
    let done = false;
    void speakText('אלף בית גימל דלת', 'he-IL', 0.8).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(1200);
    expect(done).toBe(true);
  });

  it('keeps waiting while the device is still speaking', async () => {
    installSpeech(
      () => undefined,
      () => true,
    );
    const { speakText } = await import('./speech');
    let done = false;
    void speakText('א', 'he-IL', 0.8).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(1200);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toBe(true);
  });
});
