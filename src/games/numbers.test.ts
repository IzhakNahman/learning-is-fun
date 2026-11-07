import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpokenPart } from '../content';

const spoken: SpokenPart[] = [];
vi.mock('../core/voice', () => ({
  SPEECH_RATE: { DEFAULT: 0.8, COUNTING: 1 },
  speakPart: vi.fn((part: SpokenPart) => {
    spoken.push(part);
    return Promise.resolve();
  }),
}));
vi.mock('../core/sfx', () => ({ playCountBlip: vi.fn() }));
vi.mock('../core/speech', () => ({ cancelSpeech: vi.fn() }));

const { initNumbersGame } = await import('./numbers');
const { setLanguage } = await import('../core/i18n');

function ballButtons(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('#nballs .ball')];
}

describe('numbers game: tappable balls', () => {
  beforeEach(() => {
    spoken.length = 0;
    document.body.innerHTML =
      '<div id="ngrid"></div><div id="nbig"></div><div id="nname"></div><div id="nballs"></div>';
    setLanguage('he', { remember: false });
    initNumbersGame();
  });

  it('shows twenty balls', () => {
    expect(ballButtons()).toHaveLength(20);
  });

  it('lights the balls up to the tapped one and says its number', async () => {
    ballButtons()[4]?.click();
    await Promise.resolve();
    const lit = ballButtons().filter((ball) => ball.classList.contains('on'));
    expect(lit).toHaveLength(5);
    expect(spoken.map((part) => part.clipId)).toEqual(['num-05']);
  });

  it('tapping an earlier ball turns the later ones off', () => {
    ballButtons()[6]?.click();
    ballButtons()[2]?.click();
    expect(ballButtons().filter((ball) => ball.classList.contains('on'))).toHaveLength(3);
  });
});
