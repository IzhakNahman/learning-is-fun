import type { GameId, LanguagePack } from '../content';
import { createElement } from '../core/dom';
import { currentPlayback, isCurrentPlayback } from '../core/playback';
import { playCelebrationSound } from '../core/sfx';
import {
  loadProgress,
  recordFinish,
  recordPlayAgain,
  recordStar,
  starsOf,
  type FinishResult,
} from '../journey/progress';
import { sayWellDone } from './playScreen';

/** How long the "+3 🏆" pop-up stays on screen. */
const TOAST_MS = 2600;

/** A short pop-up on a finish: "+3 🏆", or a friendly note when today's trophies were given. */
export function showTrophyToast(result: FinishResult, pack: LanguagePack): void {
  if (result.trophies === 0 && !result.cappedToday) return;
  const text =
    result.trophies > 0 ? `+${result.trophies} 🏆` : `🏆 ${pack.ui.progress.trophiesDoneToday}`;
  const toast = createElement('div', { className: 'trophy-toast', text });
  toast.setAttribute('role', 'status');
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), TOAST_MS);
}

/** For the round games (count, mix ...): a finished set is a finished game. */
export function finishRoundGame(game: GameId, pack: LanguagePack, bonus = 0): FinishResult {
  const result = recordFinish(game, bonus);
  showTrophyToast(result, pack);
  return result;
}

export interface StarTracker {
  /**
   * Gives the item its ⭐ (once). Returns the finish when this star finished the game; the
   * celebration plays right away unless `celebrateLater` was set (then call `celebrateFinish`).
   */
  markDone: (itemId: string) => FinishResult | null;
  /** Puts the saved ⭐ back on the tiles after the screen was redrawn. */
  showSavedStars: () => void;
  /** Clears the stars so the game can be played again (the ✓ and trophies stay). */
  playAgain: () => void;
}

export interface StarTrackerOptions {
  game: GameId;
  pack: LanguagePack;
  /** The element the "⭐ 3/10 ↺" bar goes into (the game screen). */
  screen: HTMLElement;
  /** How many items finish the game. */
  goal: number;
  /** The tile of an item, to show its ⭐ (null when it is not on screen). */
  tileFor: (itemId: string) => HTMLElement | null;
  /** All item ids, in order; "play again" removes their stars. */
  itemIds: readonly string[];
  /** The game speaks after the last item, and celebrates when it has finished speaking. */
  celebrateLater?: boolean;
  /** Called after "play again" cleared the stars. */
  onPlayAgain?: () => void;
}

/** Cheer, "+3 🏆" and (unless something newer is being said) "well done" for a finished game. */
export function celebrateFinish(result: FinishResult, pack: LanguagePack, sayIt = true): void {
  playCelebrationSound();
  showTrophyToast(result, pack);
  if (sayIt) void sayWellDone(pack);
}

/**
 * Stars for the "item" games (numbers, colours, letters ...): a ⭐ on every tile that was done,
 * "⭐ 3/10" at the top, and ↺ to play again once the game is finished.
 */
export function createStarTracker(options: StarTrackerOptions): StarTracker {
  const {
    game,
    pack,
    screen,
    goal,
    tileFor,
    itemIds,
    celebrateLater = false,
    onPlayAgain,
  } = options;
  screen.querySelector('.progress-bar')?.remove();
  const count = createElement('span', { className: 'progress-count' });
  const again = createElement('button', {
    className: 'progress-again',
    text: '↺',
    title: pack.ui.progress.playAgain,
  });
  again.setAttribute('aria-label', pack.ui.progress.playAgain);
  const bar = createElement('div', { className: 'progress-bar' }, count, again);
  screen.append(bar);

  const refresh = (): void => {
    const stars = starsOf(loadProgress(), game);
    const done = itemIds.filter((id) => stars.has(id)).length;
    count.textContent = `⭐ ${Math.min(done, goal)}/${goal}`;
    // Only a finished game offers ↺, so half-earned stars cannot be wiped by accident.
    again.hidden = done < goal;
    for (const id of itemIds) tileFor(id)?.classList.toggle('starred', stars.has(id));
  };

  const playAgain = (): void => {
    recordPlayAgain(game);
    refresh();
    onPlayAgain?.();
  };
  again.addEventListener('click', playAgain);

  const markDone = (itemId: string): FinishResult | null => {
    const result = recordStar(game, itemId, goal);
    refresh();
    if (!result.isNew) return null;
    tileFor(itemId)?.classList.add('just-starred');
    if (!result.finished) return null;
    if (!celebrateLater) celebrateFinish(result.finished, pack);
    return result.finished;
  };

  refresh();
  return { markDone, showSavedStars: refresh, playAgain };
}

/**
 * Saves the item's ⭐ straight away, and celebrates a finish only after the item has been
 * spoken, so "well done" never cuts the last word off. (The tracker needs `celebrateLater`.)
 */
export async function markDoneAfterSpeech(
  tracker: StarTracker | null,
  itemId: string,
  pack: LanguagePack,
  speech: Promise<void>,
): Promise<void> {
  const finished = tracker?.markDone(itemId) ?? null;
  const playbackId = currentPlayback();
  await speech;
  // If the child already tapped something else, "well done" would talk over it: cheer silently.
  if (finished) celebrateFinish(finished, pack, isCurrentPlayback(playbackId));
}
