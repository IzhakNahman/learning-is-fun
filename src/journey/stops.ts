import type { GameId } from '../content';

/** One stop on the home-screen road. */
export interface StopDefinition {
  game: GameId;
  icon: string;
  /** Gradient and edge colours of the round stop button. */
  top: string;
  bottom: string;
  edge: string;
}

/**
 * The road, in order. To add a game: add its screen, then add one line here.
 * The road, its layout and its stops are all built from this list.
 */
export const STOPS: readonly StopDefinition[] = [
  { game: 'numbers', icon: '🔢', top: '#ff9a6b', bottom: '#ff5e62', edge: '#c63e45' },
  { game: 'colors', icon: '🎨', top: '#ffd45e', bottom: '#ff9f1c', edge: '#c47400' },
  { game: 'letters', icon: '🔤', top: '#a98bff', bottom: '#6c4df0', edge: '#4a31b8' },
  { game: 'words', icon: '🖼️', top: '#4fe3b0', bottom: '#12a97f', edge: '#0b7a5b' },
  { game: 'sky', icon: '🎁', top: '#5db4ff', bottom: '#2a6df0', edge: '#1b49b5' },
];
