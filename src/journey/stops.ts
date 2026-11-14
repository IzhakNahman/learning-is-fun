import type { GameId } from '../content';
import type { RoadLevel } from './trophies';

/** One stop on the home-screen road. */
export interface StopDefinition {
  game: GameId;
  icon: string;
  /**
   * When set, the stop is drawn with this letter of the language (0 = the first letter) instead
   * of the emoji, so Hebrew shows א and English shows A. The emoji stays as a fallback.
   */
  letterIcon?: number;
  /** Step on the learning ladder; higher levels give more trophies. */
  level: RoadLevel;
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
  { game: 'balls', level: 1, icon: '🔵', top: '#8fd3ff', bottom: '#3a9be0', edge: '#22679e' },
  { game: 'numbers', level: 1, icon: '🔢', top: '#ff9a6b', bottom: '#ff5e62', edge: '#c63e45' },
  { game: 'colors', level: 1, icon: '🎨', top: '#ffd45e', bottom: '#ff9f1c', edge: '#c47400' },
  { game: 'shapes', level: 1, icon: '🔷', top: '#7fd8ff', bottom: '#2fa8e8', edge: '#1f78a8' },
  { game: 'lookalike', level: 2, icon: '🍕', top: '#ffc2a1', bottom: '#f2784b', edge: '#b04a26' },
  {
    game: 'letters',
    level: 3,
    icon: '🔤',
    letterIcon: 0,
    top: '#a98bff',
    bottom: '#6c4df0',
    edge: '#4a31b8',
  },
  { game: 'count', level: 2, icon: '🧺', top: '#ffb86b', bottom: '#f0762b', edge: '#b04f12' },
  { game: 'teens', level: 2, icon: '🧮', top: '#ffb3c7', bottom: '#e8507a', edge: '#a6304f' },
  { game: 'trace', level: 3, icon: '✏️', top: '#ff9ec7', bottom: '#e8457f', edge: '#a82c58' },
  { game: 'mix', level: 4, icon: '🌈', top: '#d9a6ff', bottom: '#a24ce0', edge: '#722f9f' },
  { game: 'words', level: 3, icon: '🖼️', top: '#4fe3b0', bottom: '#12a97f', edge: '#0b7a5b' },
  {
    game: 'starts',
    level: 3,
    icon: '🔠',
    letterIcon: 2,
    top: '#9be26b',
    bottom: '#4aa82b',
    edge: '#33781d',
  },
  { game: 'add', level: 4, icon: '➕', top: '#ff8f8f', bottom: '#e04646', edge: '#a42c2c' },
  { game: 'sky', level: 4, icon: '🎁', top: '#5db4ff', bottom: '#2a6df0', edge: '#1b49b5' },
  { game: 'niqqud', level: 5, icon: 'אָ', top: '#ffe07a', bottom: '#e0a91a', edge: '#9c7410' },
];

/** What a stop shows inside its round button: a letter of the language, or its emoji. */
export function stopIcon(
  stop: StopDefinition,
  pack: { letters: readonly { boxText: string }[] },
): string {
  if (stop.letterIcon === undefined) return stop.icon;
  return pack.letters[stop.letterIcon]?.boxText ?? stop.icon;
}

/** The stops a language offers, in road order (niqqud, for example, is Hebrew only). */
export function stopsFor(pack: { availableGames: readonly GameId[] }): StopDefinition[] {
  return STOPS.filter((stop) => pack.availableGames.includes(stop.game));
}
