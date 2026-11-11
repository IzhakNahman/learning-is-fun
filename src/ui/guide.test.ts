import { describe, expect, it, vi } from 'vitest';

const speakInterrupting = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('../core/voice', () => ({ speakInterrupting }));

import { packs } from '../content';
import { buildGuide, buildOwl } from './guide';

describe('the owl guide', () => {
  it('draws the brown baby owl from the app icon', () => {
    const owl = buildOwl();
    expect(owl.getAttribute('viewBox')).toBe('0 0 100 100');
    const fills = [...owl.querySelectorAll('[fill]')].map((part) => part.getAttribute('fill'));
    expect(fills).toContain('#a8693a');
    expect(fills).not.toContain('#ffd23f');
  });

  it('says "let\'s play" when tapped', () => {
    const guide = buildGuide(packs.he);
    expect(guide.getAttribute('aria-label')).toBe(packs.he.ui.guide.label);
    guide.click();
    expect(speakInterrupting).toHaveBeenCalled();
  });
});
