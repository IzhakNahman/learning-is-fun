const MAX_FRAME_SECONDS = 0.05;

/**
 * One shared animation loop. Frames are skipped while the tab is hidden.
 * The next frame is always scheduled first, and an error in one frame is reported but never
 * stops the loop, so a single bad frame can not freeze the screen for good.
 */
export function startAnimationLoop(onFrame: (seconds: number) => void): void {
  let previousTime = performance.now();
  const tick = (now: number): void => {
    requestAnimationFrame(tick);
    const seconds = Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    if (document.hidden) return;
    try {
      onFrame(seconds);
    } catch (error) {
      console.error('Frame failed', error);
    }
  };
  requestAnimationFrame(tick);
}
