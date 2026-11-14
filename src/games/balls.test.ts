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
const celebrated = vi.hoisted(() => vi.fn());
vi.mock('../core/sfx', () => ({
  playCountBlip: vi.fn(),
  playCelebrationSound: celebrated,
  playWinSound: vi.fn(),
}));
vi.mock('../core/speech', () => ({ cancelSpeech: vi.fn() }));

const { BALL_COUNT, initBallsGame } = await import('./balls');
const { setLanguage } = await import('../core/i18n');

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const balls = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('#bboard .big-ball')];

describe('count the balls', () => {
  beforeEach(() => {
    localStorage.clear();
    spoken.length = 0;
    celebrated.mockClear();
    document.body.innerHTML =
      '<div id="balls"><div id="bprompt"></div><div id="bcount"></div><div id="bboard"></div><button id="bagain" hidden></button></div>';
    setLanguage('he', { remember: false });
    initBallsGame();
  });

  it('shows ten balls', () => {
    expect(balls()).toHaveLength(BALL_COUNT);
  });

  it('counts how many balls are lit, whichever ball is tapped', async () => {
    balls()[7]!.click();
    await settle();
    balls()[2]!.click();
    await settle();
    expect(spoken.map((part) => part.clipId)).toEqual(['num-01', 'num-02']);
    expect(document.querySelector('#bcount')!.textContent).toBe('2');
  });

  it('does not count a lit ball again', async () => {
    balls()[0]!.click();
    await settle();
    balls()[0]!.click();
    await settle();
    expect(spoken).toHaveLength(1);
  });

  it('finishes with a celebration after the tenth ball is counted', async () => {
    for (const ball of balls()) {
      ball.click();
      await settle();
    }
    // "Well done" comes after "ten", so the counting is not cut off.
    expect(spoken.slice(-2).map((part) => part.clipId)).toEqual(['num-10', 'phrase-well-done']);
    expect(celebrated).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(localStorage.getItem('learning-is-fun:progress-v2')!);
    expect(saved.games.balls.finishes).toBe(1);
  });

  it('starts over with ↺ play again', async () => {
    for (const ball of balls()) {
      ball.click();
      await settle();
    }
    document.querySelector<HTMLElement>('.progress-again')!.click();
    expect(balls().some((ball) => ball.classList.contains('starred'))).toBe(false);
    expect(document.querySelector('#bcount')!.textContent).toBe('');
  });

  it('shows a big play-again button after the last ball, and it starts a new count', async () => {
    const again = document.querySelector<HTMLElement>('#bagain')!;
    expect(again.hidden).toBe(true);
    for (const ball of balls()) {
      ball.click();
      await settle();
    }
    expect(again.hidden).toBe(false);
    again.click();
    expect(again.hidden).toBe(true);
    expect(balls().some((ball) => ball.classList.contains('starred'))).toBe(false);
  });

  it('counts again from one when a ball is tapped after finishing', async () => {
    for (const ball of balls()) {
      ball.click();
      await settle();
    }
    spoken.length = 0;
    balls()[4]!.click();
    await settle();
    expect(spoken[0]?.clipId).toBe('num-01');
    expect(document.querySelector('#bcount')!.textContent).toBe('1');
  });
});
