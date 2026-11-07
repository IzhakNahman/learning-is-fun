import { beforeEach, describe, expect, it, vi } from 'vitest';
import { packs } from '../content';

const speakInterrupting = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('../core/voice', () => ({ speakInterrupting }));

import { showInstruction } from './instruction';

describe('showInstruction', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="t"></div>';
    speakInterrupting.mockClear();
  });

  it('shows the text with a speaker that says the instruction', () => {
    const target = document.getElementById('t')!;
    showInstruction(target, packs.he, 'colors');
    expect(target.textContent).toContain(packs.he.ui.colors.placeholder);
    target.querySelector<HTMLButtonElement>('.hint-speaker')!.click();
    expect(speakInterrupting).toHaveBeenCalledWith(
      expect.objectContaining({
        clipId: 'phrase-tap-colors',
        speech: packs.he.ui.colors.placeholderSpeech,
      }),
    );
  });

  it('removes the speaker when the text is replaced', () => {
    const target = document.getElementById('t')!;
    showInstruction(target, packs.en, 'numbers');
    target.textContent = 'Seven';
    expect(target.querySelector('.hint-speaker')).toBeNull();
  });
});
