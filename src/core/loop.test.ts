import { afterEach, describe, expect, it, vi } from 'vitest';
import { startAnimationLoop } from './loop';

describe('startAnimationLoop', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps running after a frame throws', () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      callbacks.push(callback),
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onFrame = vi.fn().mockImplementationOnce(() => {
      throw new Error('boom');
    });

    startAnimationLoop(onFrame);
    callbacks.shift()!(performance.now() + 16);
    expect(callbacks).toHaveLength(1);
    callbacks.shift()!(performance.now() + 32);
    expect(onFrame).toHaveBeenCalledTimes(2);
  });

  it('caps a long pause to a short step', () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      callbacks.push(callback),
    );
    const onFrame = vi.fn();
    startAnimationLoop(onFrame);
    callbacks.shift()!(performance.now() + 60_000);
    expect(onFrame).toHaveBeenCalledWith(0.05);
  });
});
