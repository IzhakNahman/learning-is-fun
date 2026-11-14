import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./speech', () => ({ cancelSpeech: vi.fn() }));

const { getCurrentScreen, navigateTo, registerScreen } = await import('./router');

const SCREENS = [
  'home',
  'balls',
  'numbers',
  'teens',
  'colors',
  'shapes',
  'lookalike',
  'letters',
  'count',
  'trace',
  'mix',
  'words',
  'starts',
  'add',
  'sky',
  'niqqud',
];

describe('router', () => {
  beforeEach(() => {
    document.body.innerHTML = SCREENS.map(
      (id) => `<div id="${id}" class="screen${id === 'home' ? '' : ' hidden'}"></div>`,
    ).join('');
    navigateTo('home');
  });

  it('shows only the chosen screen', () => {
    navigateTo('colors');
    expect(getCurrentScreen()).toBe('colors');
    for (const id of SCREENS) {
      expect(document.getElementById(id)?.classList.contains('hidden')).toBe(id !== 'colors');
    }
  });

  it('runs leave then enter hooks', () => {
    const calls: string[] = [];
    registerScreen('sky', { enter: () => calls.push('enter'), leave: () => calls.push('leave') });
    navigateTo('sky');
    navigateTo('home');
    expect(calls).toEqual(['enter', 'leave']);
  });
});
