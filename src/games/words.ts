import { letterNamePart, letterSoundPart, wordPart } from '../content';
import type { LanguagePack, WordEntry } from '../content';
import { byId, clearChildren, createElement, hide, show, wait } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';
import { beginPlayback, isCurrentPlayback } from '../core/playback';
import { SPEECH_RATE, speakPartsInOrder } from '../core/voice';
import { createStarTracker, markDoneAfterSpeech, type StarTracker } from '../ui/progressUi';

const STEP_IDS = ['st1', 'st2', 'st3', 'st4'] as const;
const PAUSE_BEFORE_NAME_MS = 250;
const PAUSE_BEFORE_SOUND_MS = 150;
const PAUSE_BEFORE_WORD_MS = 200;

let selectedWord: WordEntry | null = null;
let tracker: StarTracker | null = null;

export function initWordsGame(): void {
  onLanguageChange(renderWordsGame);
  byId('wreplay').addEventListener('click', () => {
    if (selectedWord) void playWordSequence(selectedWord);
  });
  byId('wclose').addEventListener('click', closeWordDetail);
  renderWordsGame(getPack());
}

function closeWordDetail(): void {
  beginPlayback();
  hide(byId('wdetail'));
}

function renderWordsGame(pack: LanguagePack): void {
  closeWordDetail();
  const grid = byId('wgrid');
  clearChildren(grid);
  const cards = new Map<string, HTMLElement>();
  for (const entry of pack.words) {
    const card = createElement(
      'button',
      { className: 'wcard' },
      createElement('span', { className: 'em', text: entry.emoji }),
      createElement('span', { text: entry.shown }),
    );
    card.addEventListener(
      'click',
      () => void markDoneAfterSpeech(tracker, entry.id, pack, playWordSequence(entry)),
    );
    cards.set(entry.id, card);
    grid.append(card);
  }
  tracker = createStarTracker({
    game: 'words',
    pack,
    screen: byId('words'),
    goal: cards.size,
    tileFor: (id) => cards.get(id) ?? null,
    itemIds: [...cards.keys()],
    celebrateLater: true,
  });
  const captions = [
    pack.ui.words.stepLetterName,
    pack.ui.words.stepLetter,
    pack.ui.words.stepSound,
    pack.ui.words.stepWord,
  ];
  STEP_IDS.forEach((id, index) => {
    findRequired(byId(id), 'small').textContent = captions[index] ?? '';
  });
}

function findRequired(parent: HTMLElement, selector: string): HTMLElement {
  const found = parent.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`Missing ${selector} inside #${parent.id}`);
  return found;
}

function setStepContent(id: (typeof STEP_IDS)[number], build: (target: HTMLElement) => void): void {
  const target = findRequired(byId(id), 'span');
  clearChildren(target);
  build(target);
}

/** Letter name, letter, sound, then the word — revealing each step as it is spoken. */
async function playWordSequence(entry: WordEntry): Promise<void> {
  const pack = getPack();
  const letterEntry = pack.letters.find((item) => item.key === entry.startKey);
  const namePart = letterNamePart(pack, entry.startKey);
  const soundPart = letterSoundPart(pack, entry.startKey);
  const fullWordPart = wordPart(pack, entry.id);
  if (!letterEntry || !namePart || !soundPart || !fullWordPart) return;

  selectedWord = entry;
  const playbackId = beginPlayback();
  show(byId('wdetail'));
  byId('wemo').textContent = entry.emoji;
  STEP_IDS.forEach((id) => byId(id).classList.remove('on'));

  const [firstLetter, restOfWord] = pack.splitFirstLetter(entry.shown);
  setStepContent('st1', (target) => (target.textContent = letterEntry.name));
  setStepContent('st2', (target) => (target.textContent = letterEntry.boxText));
  setStepContent('st3', (target) => (target.textContent = letterEntry.soundText));
  setStepContent('st4', (target) =>
    target.append(createElement('span', { className: 'hl', text: firstLetter }), restOfWord),
  );

  await wait(PAUSE_BEFORE_NAME_MS);
  if (!isCurrentPlayback(playbackId)) return;
  byId('st1').classList.add('on');
  await speakPartsInOrder([namePart], playbackId, SPEECH_RATE.LETTER_NAME);
  if (!isCurrentPlayback(playbackId)) return;

  await wait(PAUSE_BEFORE_SOUND_MS);
  byId('st2').classList.add('on');
  byId('st3').classList.add('on');
  await speakPartsInOrder([soundPart], playbackId, SPEECH_RATE.LETTER_SOUND);
  if (!isCurrentPlayback(playbackId)) return;

  await wait(PAUSE_BEFORE_WORD_MS);
  byId('st4').classList.add('on');
  await speakPartsInOrder([fullWordPart], playbackId, SPEECH_RATE.WORD);
}
