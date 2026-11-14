import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STOPS } from '../journey/stops';

const navigateTo = vi.hoisted(() => vi.fn());
vi.mock('../core/router', () => ({ navigateTo, registerScreen: vi.fn() }));
vi.mock('../core/voice', () => ({ speakInterrupting: vi.fn(() => Promise.resolve()) }));

import { setLanguage } from '../core/i18n';
import { initHome } from './home';

describe('home road', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="home" class="screen"></div>';
    navigateTo.mockClear();
    initHome();
  });

  it('shows one open stop per game, in road order', () => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.stop-button')];
    expect(buttons.map((button) => button.dataset.game)).toEqual(STOPS.map((stop) => stop.game));
    expect(buttons.every((button) => !button.disabled)).toBe(true);
    expect(document.querySelector('.stop.locked')).toBeNull();
  });

  it('opens the game when its stop is tapped', () => {
    document.querySelector<HTMLButtonElement>('.stop-button[data-game="colors"]')!.click();
    expect(navigateTo).toHaveBeenCalledWith('colors');
  });

  it('does not open the game when the speaker is tapped', () => {
    document.querySelector<HTMLButtonElement>('.stop-speaker')!.click();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('redraws the road in the other language', () => {
    const before = document.querySelector('.stop-button .gname')!.textContent;
    setLanguage('en');
    expect(document.querySelectorAll('.stop-button')).toHaveLength(STOPS.length - 1);
    expect(document.querySelector('.stop-button .gname')!.textContent).not.toBe(before);
    setLanguage('he');
  });

  it('draws the sky world with a ladder, bubbles and the owl beside the next game', () => {
    expect(document.querySelector('.road-world .world-sun')).not.toBeNull();
    expect(document.querySelectorAll('.road-world .world-cloud').length).toBeGreaterThan(0);
    expect(document.querySelector('.ladder-svg')).not.toBeNull();
    expect(document.querySelectorAll('#home .balloon').length).toBeGreaterThan(0);
    expect(document.querySelector('.stop.has-guide .guide')).not.toBeNull();
  });

  it('uses the drawn baby owl on the "back to the next game" button, not an emoji', () => {
    const jump = document.querySelector('.road-jump')!;
    expect(jump.querySelector('svg')).not.toBeNull();
    expect(jump.textContent).toBe('');
  });

  it('shows the app name as the title, without emoji', () => {
    expect(document.querySelector('#home h1')!.textContent).toBe('הַצַּעַד הָרִאשׁוֹן שֶׁלִּי');
    setLanguage('en');
    expect(document.querySelector('#home h1')!.textContent).toBe('My First Step');
    setLanguage('he');
  });

  it('offers niqqud in Hebrew only', () => {
    expect(document.querySelector('.stop-button[data-game="niqqud"]')).not.toBeNull();
    setLanguage('en');
    expect(document.querySelector('.stop-button[data-game="niqqud"]')).toBeNull();
    setLanguage('he');
  });

  it('does not mark a game as done just because it was opened', () => {
    document.querySelector<HTMLButtonElement>('.stop-button[data-game="balls"]')!.click();
    initHome();
    expect(document.querySelector('.stop-button[data-game="balls"] .stop-check')).toBeNull();
    expect(document.querySelector('.stop.has-guide .stop-button')!.getAttribute('data-game')).toBe(
      'balls',
    );
  });

  it('shows ✓ on finished games, moves the owl on, and counts the trophies', () => {
    localStorage.setItem(
      'learning-is-fun:progress-v2',
      JSON.stringify({
        trophies: 4,
        games: { balls: { stars: [], finishes: 1, replayDay: '', replayRewards: 0 } },
      }),
    );
    initHome();
    expect(document.querySelector('.stop-button[data-game="balls"] .stop-check')).not.toBeNull();
    expect(document.querySelector('.stop.has-guide .stop-button')!.getAttribute('data-game')).toBe(
      'numbers',
    );
    expect(document.querySelector('.trophy-count')!.textContent).toBe('🏆 4');
  });
});
