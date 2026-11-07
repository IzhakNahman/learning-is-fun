import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSkyControls } from './controls';

function setup(awaitingConfirm: boolean) {
  document.body.innerHTML = '<div id="joy"></div><div id="knob"></div><button id="punch"></button>';
  const callbacks = {
    isScreenActive: () => true,
    isAwaitingConfirm: () => awaitingConfirm,
    canPlay: () => !awaitingConfirm,
    onPunch: vi.fn(),
    onConfirm: vi.fn(),
    onQuit: vi.fn(),
  };
  const controls = createSkyControls(callbacks);
  return { callbacks, controls };
}

const press = (code: string, repeat = false): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, repeat, cancelable: true }));
};

describe('sky controls', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('confirms a message with Enter once, not by key repeat', () => {
    const { callbacks } = setup(true);
    press('Enter', true);
    expect(callbacks.onConfirm).not.toHaveBeenCalled();
    press('Enter');
    expect(callbacks.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps a held direction until its key is released', () => {
    const { controls } = setup(false);
    press('ArrowLeft');
    expect(controls.input.heldDirections.has('left')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
    expect(controls.input.heldDirections.size).toBe(0);
  });

  it('punches with a key and ignores key repeat', () => {
    const { callbacks } = setup(false);
    press('KeyK');
    press('KeyK', true);
    expect(callbacks.onPunch).toHaveBeenCalledTimes(1);
  });
});
