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
  /**
   * When set, a tap is the answer itself: nothing is selected, and the game says at once whether
   * the tap was right. A wrong tap calls `onReject`. Dragging onto a target still works.
   */
  onTapAnswer?: () => boolean;
}

/**
 * "Tap, then tap": the child taps the thing to move (it lights up) and then taps the place it
 * belongs. Every draggable also works this way, so no game needs dragging to be played.
 */
interface Selection {
  element: HTMLElement;
  options: DraggableOptions;
}

let selection: Selection | null = null;
const liveSources = new Set<HTMLElement>();
const wiredTargets = new WeakSet<HTMLElement>();
const NUDGE_MS = 600;

function setReadyTargets(on: boolean): void {
  if (!selection) return;
  selection.options.targets().forEach((target) => target.classList.toggle('ready', on));
}

export function clearSelection(): void {
  if (!selection) return;
  setReadyTargets(false);
  selection.element.classList.remove('selected');
  selection = null;
}

/** Tapping the selected thing again puts it down; tapping another one switches to it. */
export function toggleSelection(element: HTMLElement, options: DraggableOptions): void {
  const wasSelected = selection?.element === element;
  clearSelection();
  if (wasSelected || element.dataset.locked === '1') return;
  selection = { element, options };
  element.classList.add('selected');
  setReadyTargets(true);
}

/** The child tapped a place: put the selected thing there if the game accepts it. */
export function chooseTarget(target: HTMLElement): boolean {
  if (!selection) return false;
  if (!selection.element.isConnected) {
    selection = null;
    return false;
  }
  const { options } = selection;
  clearSelection();
  if (options.onDrop(target)) return true;
  options.onReject?.();
  return true;
}

/** A place was tapped with nothing selected: gently point at the things that can be picked. */
function nudgeSources(): void {
  for (const source of liveSources) {
    if (!source.isConnected) {
      liveSources.delete(source);
      continue;
    }
    source.classList.add('nudge');
    window.setTimeout(() => source.classList.remove('nudge'), NUDGE_MS);
  }
}

function wireTarget(target: HTMLElement): void {
  if (wiredTargets.has(target)) return;
  wiredTargets.add(target);
  target.addEventListener('click', (event) => {
    // Taps on parts inside a target (like the objects being counted) keep their own meaning.
    if ((event.target as HTMLElement).closest?.('[data-keep-tap]')) return;
    if (!chooseTarget(target)) {
      nudgeSources();
      return;
    }
    event.stopPropagation();
  });
}

export function makeDraggable(element: HTMLElement, options: DraggableOptions): void {
  element.classList.add('draggable');
  liveSources.add(element);
  // The game fills in its targets right after this call, so wire them a moment later.
  queueMicrotask(() => options.targets().forEach(wireTarget));
  const tapOptions = options;
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

  // Window-level listeners catch a release that happens outside the element (or after the
  // browser dropped pointer capture), so a drag can never get stuck to the finger or mouse.
  const onWindowRelease = (event: PointerEvent): void =>
    finish(event, event.type === 'pointercancel');
  const onWindowBlur = (): void => abort();
  const onVisibilityChange = (): void => {
    if (document.hidden) abort();
  };
  const listenOnWindow = (): void => {
    window.addEventListener('pointerup', onWindowRelease, true);
    window.addEventListener('pointercancel', onWindowRelease, true);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
  };
  const stopListeningOnWindow = (): void => {
    window.removeEventListener('pointerup', onWindowRelease, true);
    window.removeEventListener('pointercancel', onWindowRelease, true);
    window.removeEventListener('blur', onWindowBlur);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };

  /** Lets go without choosing anything: a dragged element slides back home. */
  const abort = (): void => {
    if (activePointer === null) return;
    const pointer = activePointer;
    activePointer = null;
    stopListeningOnWindow();
    if (element.hasPointerCapture?.(pointer)) element.releasePointerCapture(pointer);
    if (moved) {
      slideBack();
      return;
    }
    element.classList.remove('dragging');
  };

  const finish = (event: PointerEvent, cancelled: boolean): void => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    stopListeningOnWindow();
    if (element.hasPointerCapture?.(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    if (!moved) {
      element.classList.remove('dragging');
      if (cancelled) return;
      if (options.onTapAnswer) {
        options.onTap?.();
        if (!options.onTapAnswer()) options.onReject?.();
        return;
      }
      toggleSelection(element, tapOptions);
      options.onTap?.();
      return;
    }
    if (cancelled) {
      slideBack();
      return;
    }
    const targets = options.targets();
    const index = pickTarget(
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
    if (element.dataset.locked === '1') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (activePointer !== null) {
      // Still holding the old pointer for real: ignore a second finger.
      if (element.hasPointerCapture?.(activePointer)) return;
      // The old drag was left hanging (its release was lost): drop it and start fresh.
      abort();
    }
    activePointer = event.pointerId;
    listenOnWindow();
    start = { x: event.clientX, y: event.clientY };
    moved = false;
    element.style.transition = '';
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  element.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointer) return;
    // The mouse button was released somewhere we did not hear about.
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      abort();
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < TAP_DISTANCE_PX) return;
    moved = true;
    element.classList.add('dragging');
    element.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  element.addEventListener('pointerup', (event) => finish(event, false));
  element.addEventListener('pointercancel', (event) => finish(event, true));
  element.addEventListener('lostpointercapture', (event) => {
    if (event.pointerId === activePointer) abort();
  });
}
