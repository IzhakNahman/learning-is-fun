import type { GameId, LanguagePack } from '../content';
import { createElement } from '../core/dom';
import type { RoadOrientation } from '../journey/layout';

/** A scroll position that puts `center` in the middle of the view, kept inside the content. */
export function scrollTargetFor(center: number, viewSize: number, contentSize: number): number {
  const maxScroll = Math.max(0, contentSize - viewSize);
  return Math.min(maxScroll, Math.max(0, center - viewSize / 2));
}

/** Which ends of the road still have more to scroll to. */
export function scrollEdges(
  position: number,
  viewSize: number,
  contentSize: number,
  tolerance = 2,
): { before: boolean; after: boolean } {
  return {
    before: position > tolerance,
    after: position < contentSize - viewSize - tolerance,
  };
}

/** True when the box is completely inside the view (along the scrolling axis). */
export function isInView(start: number, end: number, viewStart: number, viewEnd: number): boolean {
  return start >= viewStart && end <= viewEnd;
}

const PAGE_SCROLL_FRACTION = 0.8;

/**
 * Makes the road comfortable to move along on every device: it opens on the next game to play,
 * the mouse wheel scrolls a sideways road, mouse users get arrow buttons, the ends fade where
 * there is more road, and an owl button jumps back to the next game when it is out of sight.
 */
export function setUpRoadScrolling(
  wrap: HTMLElement,
  orientation: RoadOrientation,
  nextGame: GameId | null,
  pack: LanguagePack,
): void {
  const scroller = wrap.querySelector<HTMLElement>('.road-scroll');
  if (!scroller) return;
  const horizontal = orientation === 'landscape';

  const nextStop = (): HTMLElement | null =>
    nextGame ? wrap.querySelector<HTMLElement>(`.stop-button[data-game="${nextGame}"]`) : null;

  /** The next game's box measured inside the scrolled content, along the scrolling axis. */
  const nextBox = (): { start: number; end: number } | null => {
    const stop = nextStop();
    if (!stop) return null;
    const box = stop.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    const offset = horizontal ? scroller.scrollLeft - view.left : scroller.scrollTop - view.top;
    return horizontal
      ? { start: box.left + offset, end: box.right + offset }
      : { start: box.top + offset, end: box.bottom + offset };
  };

  const scrollTo = (position: number, smooth: boolean): void => {
    const behavior = smooth ? 'smooth' : 'instant';
    scroller.scrollTo(horizontal ? { left: position, behavior } : { top: position, behavior });
  };

  const goToNextGame = (smooth: boolean): void => {
    const box = nextBox();
    if (!box) return;
    const view = horizontal ? scroller.clientWidth : scroller.clientHeight;
    const content = horizontal ? scroller.scrollWidth : scroller.scrollHeight;
    scrollTo(scrollTargetFor((box.start + box.end) / 2, view, content), smooth);
  };

  const jump = createElement('button', { className: 'road-jump', text: '🦉' });
  jump.setAttribute('aria-label', pack.ui.nextGame);
  jump.title = pack.ui.nextGame;
  jump.addEventListener('click', () => goToNextGame(true));

  const makeArrow = (direction: -1 | 1): HTMLElement => {
    const arrow = createElement('button', {
      className: `road-arrow ${direction < 0 ? 'back' : 'forward'}`,
      text: direction < 0 ? '◀' : '▶',
    });
    arrow.setAttribute('aria-hidden', 'true');
    arrow.tabIndex = -1;
    arrow.addEventListener('click', () => {
      const step = PAGE_SCROLL_FRACTION * scroller.clientWidth * direction;
      scroller.scrollBy({ left: step, behavior: 'smooth' });
    });
    return arrow;
  };
  wrap.append(jump);
  if (horizontal) wrap.append(makeArrow(-1), makeArrow(1));

  const update = (): void => {
    const position = horizontal ? scroller.scrollLeft : scroller.scrollTop;
    const view = horizontal ? scroller.clientWidth : scroller.clientHeight;
    const content = horizontal ? scroller.scrollWidth : scroller.scrollHeight;
    const edges = scrollEdges(position, view, content);
    wrap.classList.toggle('more-before', edges.before);
    wrap.classList.toggle('more-after', edges.after);
    const box = nextBox();
    const visible = !box || isInView(box.start - position, box.end - position, 0, view);
    wrap.classList.toggle('next-hidden', !visible);
  };

  // A sideways road: the mouse wheel (which only goes up and down) moves it sideways.
  if (horizontal) {
    scroller.addEventListener(
      'wheel',
      (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        event.preventDefault();
        scroller.scrollLeft += event.deltaY;
      },
      { passive: false },
    );
  }
  scroller.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  goToNextGame(false);
  update();
}
