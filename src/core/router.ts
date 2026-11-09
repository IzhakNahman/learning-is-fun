import { byId } from './dom';
import { beginPlayback } from './playback';

export type ScreenId = 'home' | 'numbers' | 'letters' | 'trace' | 'colors' | 'words' | 'sky';

export interface ScreenHooks {
  enter?: () => void;
  leave?: () => void;
}

const SCREEN_IDS: readonly ScreenId[] = [
  'home',
  'numbers',
  'letters',
  'trace',
  'colors',
  'words',
  'sky',
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
