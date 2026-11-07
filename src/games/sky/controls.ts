import { byId } from '../../core/dom';
import type { Direction, SkyInput } from './types';

const KEY_TO_DIRECTION: Record<string, Direction> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};
const PUNCH_KEYS = new Set(['KeyK', 'KeyJ', 'KeyL', 'Enter']);
const CONFIRM_KEYS = new Set(['Enter', 'Space']);
const STICK_DEAD_ZONE = 0.18;
const STICK_TRAVEL = 0.34;

export interface SkyControlCallbacks {
  /** True while the sky screen is visible. */
  isScreenActive(): boolean;
  isAwaitingConfirm(): boolean;
  canPlay(): boolean;
  onPunch(): void;
  onConfirm(): void;
  onQuit(): void;
}

export interface SkyControls {
  input: SkyInput;
  /** Clears held keys and the joystick (used when the game pauses). */
  releaseAll(): void;
}

export function createSkyControls(callbacks: SkyControlCallbacks): SkyControls {
  const input: SkyInput = { heldDirections: new Set(), stick: { x: 0, y: 0 } };
  const stickBase = byId('joy');
  const stickKnob = byId('knob');
  const punchButton = byId('punch');
  let activePointerId: number | null = null;
  let stickRect = stickBase.getBoundingClientRect();

  function resetStick(): void {
    activePointerId = null;
    input.stick = { x: 0, y: 0 };
    stickKnob.style.transform = 'translate(0,0)';
  }

  function moveStick(event: PointerEvent): void {
    const box = stickRect;
    const reach = box.width * STICK_TRAVEL;
    let offsetX = event.clientX - (box.left + box.width / 2);
    let offsetY = event.clientY - (box.top + box.height / 2);
    const distance = Math.hypot(offsetX, offsetY);
    if (distance > reach) {
      offsetX *= reach / distance;
      offsetY *= reach / distance;
    }
    stickKnob.style.transform = `translate(${offsetX}px,${offsetY}px)`;
    const stickX = offsetX / reach;
    const stickY = -offsetY / reach;
    const insideDeadZone = Math.hypot(stickX, stickY) < STICK_DEAD_ZONE;
    input.stick = insideDeadZone ? { x: 0, y: 0 } : { x: stickX, y: stickY };
  }

  stickBase.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (activePointerId !== null) return;
    stickRect = stickBase.getBoundingClientRect();
    activePointerId = event.pointerId;
    try {
      stickBase.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional.
    }
    moveStick(event);
  });
  stickBase.addEventListener('pointermove', (event) => {
    if (event.pointerId === activePointerId) moveStick(event);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    stickBase.addEventListener(type, (event) => {
      if (event.pointerId === activePointerId) resetStick();
    });
  }

  punchButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    try {
      punchButton.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional.
    }
    punchButton.classList.add('pressed');
    callbacks.onPunch();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    punchButton.addEventListener(type, () => punchButton.classList.remove('pressed'));
  }

  window.addEventListener('keydown', (event) => {
    if (!callbacks.isScreenActive()) return;
    if (callbacks.isAwaitingConfirm()) {
      if (!CONFIRM_KEYS.has(event.code)) return;
      event.preventDefault();
      // A key still held down from punching must not skip the message by itself.
      if (event.repeat) return;
      callbacks.onConfirm();
      return;
    }
    if (!callbacks.canPlay()) return;
    const direction = KEY_TO_DIRECTION[event.code];
    if (direction) {
      event.preventDefault();
      input.heldDirections.add(direction);
      return;
    }
    if (PUNCH_KEYS.has(event.code) && !event.repeat) {
      event.preventDefault();
      punchButton.classList.add('pressed');
      callbacks.onPunch();
      return;
    }
    if (event.code === 'Escape') callbacks.onQuit();
  });

  window.addEventListener('keyup', (event) => {
    const direction = KEY_TO_DIRECTION[event.code];
    if (direction) input.heldDirections.delete(direction);
    if (PUNCH_KEYS.has(event.code)) punchButton.classList.remove('pressed');
  });

  // Never keep moving or "pressing" after the app loses focus or a context menu opens.
  const releaseEverything = (): void => {
    input.heldDirections.clear();
    resetStick();
    punchButton.classList.remove('pressed');
  };
  window.addEventListener('blur', releaseEverything);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseEverything();
  });
  window.addEventListener('contextmenu', (event) => {
    if (callbacks.isScreenActive()) event.preventDefault();
  });

  return {
    input,
    releaseAll(): void {
      input.heldDirections.clear();
      resetStick();
    },
  };
}
