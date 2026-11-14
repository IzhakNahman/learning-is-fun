import './styles.css';
import { LANGUAGE_ORDER } from './content';
import { initLanguage } from './core/i18n';
import { loadClipManifest } from './core/clipPlayer';
import { startAnimationLoop } from './core/loop';
import { beginPlayback } from './core/playback';
import { getCurrentScreen, navigateTo, registerScreen } from './core/router';
import { unlockAudio } from './core/sfx';
import { unlockSpeech } from './core/speech';
import { initAddGame } from './games/add';
import { initBallsGame } from './games/balls';
import { initColorsGame } from './games/colors';
import { initCountGame } from './games/count';
import { initLettersGame } from './games/letters';
import { initMixGame } from './games/mix';
import { initNiqqudGame } from './games/niqqud';
import { initNumbersGame } from './games/numbers';
import { initLookalikeGame } from './games/lookalike';
import { initShapesGame } from './games/shapes';
import { initStartsGame } from './games/starts';
import { initSkyGame, skyScreenHooks, updateSkyFrame } from './games/sky';
import { initTraceGame } from './games/trace';
import { initWordsGame } from './games/words';
import { initAbout } from './ui/about';
import { initHome } from './ui/home';

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
  // While developing, the offline cache would keep showing old versions of the page.
  if (import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('sw.js').catch(() => undefined);
    } catch {
      // Offline support is optional (it is blocked inside sandboxed previews).
    }
  });
}

function start(): void {
  initLanguage();
  initHome();
  initAbout();
  initBallsGame();
  initNumbersGame();
  initLettersGame();
  initTraceGame();
  initColorsGame();
  initWordsGame();
  initShapesGame();
  initLookalikeGame();
  initCountGame();
  initMixGame();
  initStartsGame();
  initAddGame();
  initNiqqudGame();
  initSkyGame();
  registerScreen('sky', skyScreenHooks);

  document.querySelectorAll('[data-home]').forEach((button) => {
    button.addEventListener('click', () => navigateTo('home'));
  });

  // Browsers only allow sound after a tap or key press.
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  // iOS counts a finished tap (not the first touch) as permission to speak.
  for (const type of ['click', 'touchend', 'keydown'] as const) {
    window.addEventListener(type, unlockSpeech);
  }
  // Stop talking when the app goes to the background (phone call, app switch).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) beginPlayback();
  });

  LANGUAGE_ORDER.forEach((code) => void loadClipManifest(code));
  startAnimationLoop((seconds) => {
    if (getCurrentScreen() === 'sky') updateSkyFrame(seconds);
  });
  registerServiceWorker();
}

start();
