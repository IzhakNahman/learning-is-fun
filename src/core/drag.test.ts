import { describe, expect, it } from 'vitest';
import { chooseTarget, makeDraggable, pickTarget, toggleSelection } from './drag';

const box = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
});

describe('pickTarget', () => {
  const boxes = [box(0, 0, 100, 100), box(200, 0, 300, 100)];

  it('finds the box the point is in', () => {
    expect(pickTarget({ x: 50, y: 50 }, boxes)).toBe(0);
    expect(pickTarget({ x: 250, y: 50 }, boxes)).toBe(1);
  });

  it('returns -1 when the point is in none', () => {
    expect(pickTarget({ x: 150, y: 50 }, boxes)).toBe(-1);
  });

  it('forgives a drop just outside a box when there is slack', () => {
    expect(pickTarget({ x: 110, y: 50 }, boxes)).toBe(-1);
    expect(pickTarget({ x: 110, y: 50 }, boxes, 14)).toBe(0);
  });

  it('prefers the nearest centre when boxes overlap', () => {
    const overlapping = [box(0, 0, 100, 100), box(60, 0, 160, 100)];
    expect(pickTarget({ x: 70, y: 50 }, overlapping)).toBe(0);
    expect(pickTarget({ x: 90, y: 50 }, overlapping)).toBe(1);
  });
});

describe('tap, then tap', () => {
  const setup = (accept: boolean) => {
    const source = document.createElement('div');
    const target = document.createElement('div');
    document.body.append(source, target);
    const calls: string[] = [];
    const options = {
      targets: () => [target],
      onDrop: () => {
        calls.push('drop');
        return accept;
      },
      onReject: () => calls.push('reject'),
    };
    return { source, target, calls, options };
  };

  it('selects a thing, marks the places, and puts it down on the tapped place', () => {
    const { source, target, calls, options } = setup(true);
    toggleSelection(source, options);
    expect(source.classList.contains('selected')).toBe(true);
    expect(target.classList.contains('ready')).toBe(true);
    expect(chooseTarget(target)).toBe(true);
    expect(calls).toEqual(['drop']);
    expect(source.classList.contains('selected')).toBe(false);
    expect(target.classList.contains('ready')).toBe(false);
  });

  it('reports a wrong place as a rejection and clears the selection', () => {
    const { source, target, calls, options } = setup(false);
    toggleSelection(source, options);
    chooseTarget(target);
    expect(calls).toEqual(['drop', 'reject']);
    expect(chooseTarget(target)).toBe(false);
  });

  it('unselects when the same thing is tapped again, and does nothing without a selection', () => {
    const { source, target, calls, options } = setup(true);
    toggleSelection(source, options);
    toggleSelection(source, options);
    expect(source.classList.contains('selected')).toBe(false);
    expect(chooseTarget(target)).toBe(false);
    expect(calls).toEqual([]);
  });

  it('ignores a selection whose thing has left the screen', () => {
    const { source, target, calls, options } = setup(true);
    toggleSelection(source, options);
    source.remove();
    expect(chooseTarget(target)).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe('a tap that answers at once', () => {
  const tapOn = (element: HTMLElement): void => {
    element.setPointerCapture = () => undefined;
    element.hasPointerCapture = () => false;
    element.releasePointerCapture = () => undefined;
    const init = { pointerId: 1, clientX: 10, clientY: 10, button: 0, bubbles: true };
    element.dispatchEvent(new PointerEvent('pointerdown', init));
    element.dispatchEvent(new PointerEvent('pointerup', init));
  };

  const setup = (right: boolean) => {
    const source = document.createElement('div');
    const target = document.createElement('div');
    document.body.append(source, target);
    const calls: string[] = [];
    makeDraggable(source, {
      targets: () => [target],
      onDrop: () => true,
      onReject: () => calls.push('reject'),
      onTap: () => calls.push('tap'),
      onTapAnswer: () => {
        calls.push('answer');
        return right;
      },
    });
    return { source, target, calls };
  };

  it('accepts a right tap without selecting anything or asking for a second tap', () => {
    const { source, target, calls } = setup(true);
    tapOn(source);
    expect(calls).toEqual(['tap', 'answer']);
    expect(source.classList.contains('selected')).toBe(false);
    expect(target.classList.contains('ready')).toBe(false);
  });

  it('reports a wrong tap as a rejection, still without selecting', () => {
    const { source, calls } = setup(false);
    tapOn(source);
    expect(calls).toEqual(['tap', 'answer', 'reject']);
    expect(source.classList.contains('selected')).toBe(false);
  });
});

describe('a drag never gets stuck', () => {
  const setup = () => {
    const source = document.createElement('div');
    const target = document.createElement('div');
    document.body.append(source, target);
    let captured: number | null = null;
    source.setPointerCapture = (id: number) => {
      captured = id;
    };
    source.hasPointerCapture = (id: number) => captured === id;
    source.releasePointerCapture = () => {
      captured = null;
    };
    const calls: string[] = [];
    makeDraggable(source, {
      targets: () => [target],
      onDrop: () => {
        calls.push('drop');
        return true;
      },
      onReject: () => calls.push('reject'),
    });
    const fire = (type: string, init: PointerEventInit, on: EventTarget = source): void => {
      on.dispatchEvent(new PointerEvent(type, { pointerId: 1, bubbles: true, ...init }));
    };
    const loseCapture = (): void => {
      captured = null;
    };
    return { source, calls, fire, loseCapture };
  };
  const mouse = { pointerType: 'mouse', button: 0, buttons: 1 };

  it('slides back when the mouse button was released somewhere we did not hear about', () => {
    const { source, calls, fire } = setup();
    fire('pointerdown', { ...mouse, clientX: 0, clientY: 0 });
    fire('pointermove', { ...mouse, clientX: 50, clientY: 0 });
    expect(source.classList.contains('dragging')).toBe(true);
    fire('pointermove', { ...mouse, buttons: 0, clientX: 60, clientY: 0 });
    expect(source.classList.contains('dragging')).toBe(false);
    expect(calls).toEqual([]);
  });

  it('finishes on a release heard by the window, outside the element', () => {
    const { source, fire } = setup();
    fire('pointerdown', { ...mouse, clientX: 0, clientY: 0 });
    fire('pointermove', { ...mouse, clientX: 50, clientY: 0 });
    fire('pointerup', { ...mouse, clientX: 5000, clientY: 5000 }, window);
    expect(source.classList.contains('dragging')).toBe(false);
  });

  it('lets go when the window loses focus', () => {
    const { source, fire } = setup();
    fire('pointerdown', { ...mouse, clientX: 0, clientY: 0 });
    fire('pointermove', { ...mouse, clientX: 50, clientY: 0 });
    window.dispatchEvent(new Event('blur'));
    expect(source.classList.contains('dragging')).toBe(false);
  });

  it('starts a new drag when the old one was left hanging', () => {
    const { source, fire, loseCapture } = setup();
    fire('pointerdown', { ...mouse, clientX: 0, clientY: 0 });
    loseCapture();
    fire('pointerdown', { ...mouse, pointerId: 2, clientX: 0, clientY: 0 });
    fire('pointermove', { ...mouse, pointerId: 2, clientX: 50, clientY: 0 });
    expect(source.classList.contains('dragging')).toBe(true);
  });
});
