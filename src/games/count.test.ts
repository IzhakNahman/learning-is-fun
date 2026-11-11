import { describe, expect, it } from 'vitest';
import { initCountGame, makeCountRound } from './count';

const fixed = (value: number) => () => value;

describe('makeCountRound', () => {
  it('counts 1-5 objects on the easy level and offers three different numbers', () => {
    for (const value of [0, 0.3, 0.6, 0.99]) {
      const round = makeCountRound('easy', fixed(value));
      expect(round.count).toBeGreaterThanOrEqual(1);
      expect(round.count).toBeLessThanOrEqual(5);
      expect(round.choices).toHaveLength(3);
      expect(new Set(round.choices).size).toBe(3);
      expect(round.choices).toContain(round.count);
    }
  });

  it('goes up to 10 objects on the hard level', () => {
    const round = makeCountRound('hard', fixed(0.99));
    expect(round.count).toBe(10);
    expect(round.choices).toContain(10);
  });

  it('never offers zero or a negative number', () => {
    for (let step = 0; step < 20; step++) {
      const round = makeCountRound('hard', () => (step * 0.173) % 1);
      expect(Math.min(...round.choices)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('the count game screen', () => {
  const tapTile = (tile: Element): void => {
    const element = tile as HTMLElement;
    element.setPointerCapture = () => undefined;
    element.hasPointerCapture = () => false;
    element.releasePointerCapture = () => undefined;
    const init = { pointerId: 1, clientX: 10, clientY: 10, button: 0, bubbles: true };
    element.dispatchEvent(new PointerEvent('pointerdown', init));
    element.dispatchEvent(new PointerEvent('pointerup', init));
  };

  const open = () => {
    document.body.innerHTML = '<div id="countplay"></div>';
    initCountGame();
    const root = document.getElementById('countplay') as HTMLElement;
    const box = root.querySelector('#countbox') as HTMLElement;
    const count = box.querySelectorAll('.count-item').length;
    const tiles = [...root.querySelectorAll('.tile.choice')];
    const right = tiles.find((tile) => (tile as HTMLElement).dataset.number === String(count));
    const wrong = tiles.find((tile) => (tile as HTMLElement).dataset.number !== String(count));
    return { root, box, count, right: right as Element, wrong: wrong as Element };
  };

  it('has no "?" box to tap', () => {
    const { root } = open();
    expect(root.textContent).not.toContain('?');
    expect(root.querySelector('.count-slot')).toBeNull();
  });

  it('passes at once when the right number is tapped', () => {
    const { box, count, right } = open();
    tapTile(right);
    expect(box.classList.contains('done')).toBe(true);
    expect(box.dataset.answer).toBe(String(count));
    expect(box.querySelector('.count-answer')?.textContent).toBe(String(count));
  });

  it('does not pass on a wrong number, and nothing waits for a second tap', () => {
    const { box, root, wrong } = open();
    tapTile(wrong);
    expect(box.classList.contains('done')).toBe(false);
    expect(root.querySelector('.selected')).toBeNull();
  });
});
