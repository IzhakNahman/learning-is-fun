import { LANGUAGE_ORDER, packs } from '../content';
import type { LanguagePack } from '../content';
import { byId, clearChildren, createElement } from '../core/dom';
import { getPack, onLanguageChange, setLanguage } from '../core/i18n';
import { navigateTo, registerScreen } from '../core/router';
import { findVoiceFor } from '../core/speech';
import type { RoadOrientation } from '../journey/layout';
import { isMarkedOnOpen, loadPlayedGames, markGamePlayed, nextGameToPlay } from '../journey/played';
import { STOPS, stopsFor } from '../journey/stops';
import type { GameId } from '../content';
import { openPolicy } from '../journey/unlock';
import { openAbout } from './about';
import { buildRoad } from './road';
import { setUpRoadScrolling } from './roadScroll';

const VOICE_CHECK_DELAY_MS = 900;
/** Swap this for `sequentialPolicy(...)` to make the games open one by one. */
const unlockPolicy = openPolicy;

export function initHome(): void {
  onLanguageChange(renderHome);
  window
    .matchMedia?.('(orientation: portrait)')
    .addEventListener('change', () => renderHome(getPack()));
  registerScreen('home', { enter: () => renderHome(getPack()) });
  renderHome(getPack());
}

/**
 * Opening a game without stars remembers it, so the road can show a ✓ and point at the next one.
 * A game with stars gets its ✓ only when the child finishes all the stars.
 */
function openGame(game: GameId): void {
  if (isMarkedOnOpen(game)) markGamePlayed(game, STOPS);
  navigateTo(game);
}

function currentOrientation(): RoadOrientation {
  const portrait =
    window.matchMedia?.('(orientation: portrait)').matches ??
    window.innerHeight > window.innerWidth;
  return portrait ? 'portrait' : 'landscape';
}

function renderHome(pack: LanguagePack): void {
  const home = byId('home');
  clearChildren(home);

  const orientation = currentOrientation();
  const playedGames = loadPlayedGames(STOPS);
  const road = buildRoad({
    pack,
    orientation,
    isUnlocked: unlockPolicy,
    playedGames,
    onOpen: openGame,
  });
  const voiceNote = createElement('div', { id: 'vnote' });

  home.append(
    createElement('button', { id: 'abtn', text: `ℹ️ ${pack.ui.aboutButton}`, onClick: openAbout }),
    buildSky(),
    buildLanguageSwitch(pack),
    createElement(
      'div',
      { className: 'home-head' },
      createElement('h1', { text: `☁️ ${pack.ui.appName} ☁️` }),
    ),
    road,
    createElement(
      'div',
      { className: 'home-foot' },
      voiceNote,
      createElement('div', { id: 'credit', text: pack.ui.credit }),
    ),
  );

  setUpRoadScrolling(road, orientation, nextGameToPlay(stopsFor(pack), playedGames), pack);
  updateVoiceNote(voiceNote, pack);
  setTimeout(() => updateVoiceNote(voiceNote, pack), VOICE_CHECK_DELAY_MS);
}

/** Sun and slowly drifting clouds behind the title. */
function buildSky(): HTMLElement {
  const sky = createElement('div', { className: 'home-sky' });
  sky.setAttribute('aria-hidden', 'true');
  sky.append(
    createElement('span', { className: 'sun' }),
    ...[0, 1, 2].map(() => createElement('span', { className: 'cloud' })),
  );
  return sky;
}

function buildLanguageSwitch(current: LanguagePack): HTMLElement {
  const switcher = createElement('div', { id: 'langSwitch' });
  for (const code of LANGUAGE_ORDER) {
    switcher.append(
      createElement('button', {
        className: code === current.code ? 'lang on' : 'lang',
        text: packs[code].nativeName,
        onClick: () => setLanguage(code),
      }),
    );
  }
  return switcher;
}

function updateVoiceNote(note: HTMLElement, pack: LanguagePack): void {
  if (!note.isConnected) return;
  note.textContent = findVoiceFor(pack.speechLang) ? pack.ui.voice.found : pack.ui.voice.missing;
}
