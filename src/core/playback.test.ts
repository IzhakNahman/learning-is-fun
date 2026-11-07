import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./speech', () => ({ cancelSpeech: vi.fn() }));

const { beginPlayback, isCurrentPlayback, registerClipStopper } = await import('./playback');
const { cancelSpeech } = await import('./speech');

describe('playback tokens', () => {
  beforeEach(() => {
    vi.mocked(cancelSpeech).mockClear();
  });

  it('only the newest playback stays current', () => {
    const first = beginPlayback();
    const second = beginPlayback();
    expect(isCurrentPlayback(first)).toBe(false);
    expect(isCurrentPlayback(second)).toBe(true);
  });

  it('cancels speech and stops the playing clip when a new playback begins', () => {
    const stopClip = vi.fn();
    registerClipStopper(stopClip);
    beginPlayback();
    expect(cancelSpeech).toHaveBeenCalledTimes(1);
    expect(stopClip).toHaveBeenCalledTimes(1);
    beginPlayback();
    expect(stopClip).toHaveBeenCalledTimes(1);
  });
});
