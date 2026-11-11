import type { GameId } from '../content';
import { byId } from './dom';
import { beginPlayback } from './playback';

export type ScreenId = 'home' | GameId;

export interface ScreenHooks {
  enter?: () => void;
  leave?: () => void;
}

const SCREEN_IDS: readonly ScreenId[] = [
  'home',
  'numbers',
  'colors',
  'shapes',
  'lookalike',
  'letters',
  'count',
  'trace',
  'mix',
  'words',
  'starts',
  'add',
  'sky',
  'niqqud',
];
const hooks = new Map<ScreenId, ScreenHooks>();
let currentScreen: ScreenId = 'home';

export function registerScreen(id: ScreenId, screenHooks: ScreenHooks): void {
  hooks.set(id, screenHooks);
}

export function getCurrentScreen(): ScreenId {
  return currentScreen;
}

export function navigateTo(next: ScreenId): void {
  beginPlayback();
  hooks.get(currentScreen)?.leave?.();
  for (const id of SCREEN_IDS) byId(id).classList.toggle('hidden', id !== next);
  currentScreen = next;
  hooks.get(next)?.enter?.();
}
