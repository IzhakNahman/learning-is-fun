import { describe, expect, it, vi } from 'vitest';

const speakInterrupting = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('../core/voice', () => ({ speakInterrupting }));

import { packs } from '../content';
import { buildBalloonLayer, laneCount, pickKind, pickSymbol, planBalloon } from './balloons';

/** Always returns the same number, so the plans are predictable. */
const fixed = (value: number) => () => value;

describe('pickKind', () => {
  it('never lets numbers take more than half the lanes', () => {
    expect(pickKind(2, 4, true, fixed(0))).toBe('letter');
    expect(pickKind(1, 3, true, fixed(0))).toBe('letter');
  });

  it('shows a number when one is needed and there is room', () => {
    expect(pickKind(0, 4, true, fixed(0.99))).toBe('number');
  });

  it('is mostly letters otherwise', () => {
    expect(pickKind(0, 4, false, fixed(0.99))).toBe('letter');
    expect(pickKind(0, 4, false, fixed(0))).toBe('number');
  });
});

describe('pickSymbol', () => {
  it('picks numbers 1 to 10', () => {
    expect(pickSymbol(packs.he, 'number', new Set(), fixed(0))).toEqual({ symbol: '1', text: '1' });
    expect(pickSymbol(packs.he, 'number', new Set(), fixed(0.999))?.symbol).toBe('10');
  });

  it('avoids letters already showing', () => {
    const first = packs.he.letters[0]!.key;
    expect(pickSymbol(packs.he, 'letter', new Set([first]), fixed(0))?.symbol).not.toBe(first);
  });
});

describe('planBalloon', () => {
  it('keeps each bubble inside its own lane', () => {
    for (const value of [0, 0.5, 0.999]) {
      const plan = planBalloon(
        packs.en,
        2,
        4,
        new Set(),
        { kind: 'letter', startsPartWay: false },
        fixed(value),
      );
      expect(plan!.leftPercent).toBeGreaterThanOrEqual(50);
      expect(plan!.leftPercent).toBeLessThan(75);
    }
  });

  it('starts part of the way up only when the page first opens', () => {
    const options = { kind: 'letter' as const, startsPartWay: true };
    expect(planBalloon(packs.en, 0, 3, new Set(), options, fixed(0.5))!.delaySeconds).toBeLessThan(
      0,
    );
    const later = { kind: 'letter' as const, startsPartWay: false };
    expect(planBalloon(packs.en, 0, 3, new Set(), later, fixed(0.5))!.delaySeconds).toBeGreaterThan(
      0,
    );
  });
});

describe('buildBalloonLayer', () => {
  it('fills every lane, with at least one number', () => {
    const layer = buildBalloonLayer(packs.he, 'landscape', fixed(0.9));
    const balloons = layer.querySelectorAll<HTMLElement>('.balloon');
    expect(balloons).toHaveLength(laneCount('landscape'));
    expect([...balloons].some((balloon) => balloon.dataset.kind === 'number')).toBe(true);
  });

  it('pops a tapped bubble and says what is on it', () => {
    const layer = buildBalloonLayer(packs.he, 'portrait', fixed(0.9));
    document.body.append(layer);
    const balloon = layer.querySelector<HTMLElement>('.balloon')!;
    balloon.click();
    expect(balloon.classList.contains('popped')).toBe(true);
    expect(balloon.querySelectorAll('.balloon-dot').length).toBeGreaterThan(0);
    expect(speakInterrupting).toHaveBeenCalled();
    layer.remove();
  });
});
