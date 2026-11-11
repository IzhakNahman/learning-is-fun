/**
 * Drag-and-drop for touch and mouse, built on pointer events.
 * A dragged element follows the finger; dropped on a target it is offered to the game, and if
 * the game does not accept it, it slides back. A short press without moving counts as a tap.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Moving less than this many pixels is a tap, not a drag. */
const TAP_DISTANCE_PX = 8;
/** A drop this close to a target's edge still counts, so little fingers are forgiven. */
const DROP_SLACK_PX = 14;
const SLIDE_BACK_MS = 260;

/**
 * Which box the point is in (boxes grown by `slack`). When boxes overlap the one whose centre
 * is closest wins. Returns -1 when the point is in none.
 */
export function pickTarget(point: Point, boxes: readonly Box[], slack = 0): number {
  let best = -1;
  let bestDistance = Infinity;
  boxes.forEach((box, index) => {
    const inside =
      point.x >= box.left - slack &&
      point.x <= box.right + slack &&
      point.y >= box.top - slack &&
      point.y <= box.bottom + slack;
    if (!inside) return;
    const distance = Math.hypot(
      point.x - (box.left + box.right) / 2,
      point.y - (box.top + box.bottom) / 2,
    );
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

export interface DraggableOptions {
  /** The places the element can be dropped on, read at the moment of the drop. */
  targets: () => HTMLElement[];
  /** Return true when the game accepted the drop; the game then moves or hides the element. */
  onDrop: (target: HTMLElement) => boolean;
  /** Called when the drop was on nothing, or was not accepted. */
  onReject?: () => void;
  onTap?: () => void;
}

export function makeDraggable(element: HTMLElement, options: DraggableOptions): void {
  element.classList.add('draggable');
  let activePointer: number | null = null;
  let start: Point = { x: 0, y: 0 };
  let moved = false;

  const slideBack = (): void => {
    element.classList.remove('dragging');
    element.style.transition = `transform ${SLIDE_BACK_MS}ms ease`;
    element.style.transform = '';
    window.setTimeout(() => {
      element.style.transition = '';
    }, SLIDE_BACK_MS);
  };

  const finish = (event: PointerEvent, cancelled: boolean): void => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    if (element.hasPointerCapture?.(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    if (!moved) {
      element.classList.remove('dragging');
      if (!cancelled) options.onTap?.();
      return;
    }
    const targets = options.targets();
    const index = cancelled
      ? -1
      : pickTarget(
          { x: event.clientX, y: event.clientY },
          targets.map((target) => target.getBoundingClientRect()),
          DROP_SLACK_PX,
        );
    const target = targets[index];
    if (target && options.onDrop(target)) {
      element.classList.remove('dragging');
      element.style.transform = '';
      return;
    }
    options.onReject?.();
    slideBack();
  };

  element.addEventListener('pointerdown', (event) => {
    if (activePointer !== null || element.dataset.locked === '1') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    activePointer = event.pointerId;
    start = { x: event.clientX, y: event.clientY };
    moved = false;
    element.style.transition = '';
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  element.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointer) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < TAP_DISTANCE_PX) return;
    moved = true;
    element.classList.add('dragging');
    element.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  element.addEventListener('pointerup', (event) => finish(event, false));
  element.addEventListener('pointercancel', (event) => finish(event, true));
}
