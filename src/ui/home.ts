import { LANGUAGE_ORDER, packs } from '../content';
import type { LanguagePack } from '../content';
import { byId, clearChildren, createElement } from '../core/dom';
import { getPack, onLanguageChange, setLanguage } from '../core/i18n';
import { navigateTo, registerScreen } from '../core/router';
import { findVoiceFor } from '../core/speech';
import type { RoadOrientation } from '../journey/layout';
import { isFinished, loadProgress, nextGameToPlay } from '../journey/progress';
import { STOPS, stopsFor } from '../journey/stops';
import type { GameId } from '../content';
import { openPolicy } from '../journey/unlock';
import { openAbout } from './about';
import { buildBalloonLayer } from './balloons';
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

/** Opening a game does not mark it: it gets its ✓ only when the child finishes it. */
function openGame(game: GameId): void {
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
  const progress = loadProgress();
  const finishedGames = new Set(
    STOPS.filter((stop) => isFinished(progress, stop.game)).map((stop) => stop.game),
  );
  const nextGame = nextGameToPlay(stopsFor(pack), progress);
  const road = buildRoad({
    pack,
    orientation,
    isUnlocked: unlockPolicy,
    finishedGames,
    nextGame,
    onOpen: openGame,
  });
  const voiceNote = createElement('div', { id: 'vnote' });

  home.append(
    createElement('button', { id: 'abtn', text: `ℹ️ ${pack.ui.aboutButton}`, onClick: openAbout }),
    buildLanguageSwitch(pack),
    createElement(
      'div',
      { className: 'home-head' },
      createElement('h1', { text: pack.ui.appName }),
      buildTrophyCount(pack, progress.trophies),
    ),
    road,
    buildBalloonLayer(pack, orientation),
    createElement(
      'div',
      { className: 'home-foot' },
      voiceNote,
      createElement('div', { id: 'credit', text: pack.ui.credit }),
    ),
  );

  setUpRoadScrolling(road, orientation, nextGame, pack);
  updateVoiceNote(voiceNote, pack);
  setTimeout(() => updateVoiceNote(voiceNote, pack), VOICE_CHECK_DELAY_MS);
}

/** 🏆 and the number of trophies collected (they can be spent in a shop later). */
function buildTrophyCount(pack: LanguagePack, trophies: number): HTMLElement {
  const count = createElement('div', { className: 'trophy-count', text: `🏆 ${trophies}` });
  count.title = pack.ui.progress.trophies;
  count.setAttribute('aria-label', `${pack.ui.progress.trophies}: ${trophies}`);
  return count;
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
