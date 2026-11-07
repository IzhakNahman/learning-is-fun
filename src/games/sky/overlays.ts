import type { LanguagePack, WordEntry } from '../../content';
import { byId, clearChildren, createElement, hide, show } from '../../core/dom';

function popContainer(): HTMLElement {
  return byId('pop');
}

function appendConfirmButton(
  container: HTMLElement,
  label: string,
  onConfirm: () => void,
): HTMLButtonElement {
  const button = createElement('button', { className: 'btn', id: 'okb', text: label });
  button.addEventListener('click', onConfirm);
  container.append(button);
  return button;
}

export interface LetterPauseView {
  boxText: string;
  matchesWord: boolean;
  name: string;
  sound: string;
}

export function showLetterPause(
  view: LetterPauseView,
  confirmLabel: string,
  onConfirm: () => void,
): HTMLButtonElement {
  const container = popContainer();
  clearChildren(container);
  container.append(
    createElement('div', { className: view.matchesWord ? 'L' : 'L no', text: view.boxText }),
    createElement('div', { className: 'N', text: `${view.name} · ${view.sound}` }),
  );
  const button = appendConfirmButton(container, confirmLabel, onConfirm);
  show(container);
  return button;
}

export function showWordPause(
  word: WordEntry,
  praise: string,
  confirmLabel: string,
  onConfirm: () => void,
): HTMLButtonElement {
  const container = popContainer();
  clearChildren(container);
  container.append(
    createElement('div', { className: 'P', text: `🎉 ${praise} 🎉` }),
    createElement('div', { className: 'E', text: word.emoji }),
    createElement('div', { className: 'W', text: word.shown }),
  );
  const button = appendConfirmButton(container, confirmLabel, onConfirm);
  show(container);
  return button;
}

export function hidePause(): void {
  hide(popContainer());
}

export interface EndScreenOptions {
  pack: LanguagePack;
  words: readonly WordEntry[];
  /** Called each time a word card is tapped; `countedSoFar` includes this tap. */
  onWordCounted(countedSoFar: number): void;
}

export interface EndScreen {
  showFinalMessage(text: string, onAgain: () => void, onHome: () => void): void;
}

/** Shows achieved words as cards. Each tap marks a card with its count number. */
export function showEndScreen(options: EndScreenOptions): EndScreen {
  const { pack, words, onWordCounted } = options;
  const container = byId('end');
  clearChildren(container);

  const cards = createElement('div', { className: 'ecards' });
  let counted = 0;
  for (const word of words) {
    const badge = createElement('span', { className: 'badge' });
    const card = createElement(
      'button',
      { className: 'ecard' },
      createElement('span', { className: 'em', text: word.emoji }),
      word.shown,
      badge,
    );
    card.addEventListener('click', () => {
      if (card.classList.contains('cnt')) return;
      counted += 1;
      card.classList.add('cnt');
      badge.textContent = String(counted);
      onWordCounted(counted);
    });
    cards.append(card);
  }

  const message = createElement('div', { id: 'emsg' });
  const buttons = createElement('div', { className: 'row2' });
  container.append(createElement('h1', { text: pack.ui.sky.endTitle }));
  if (words.length > 0) container.append(createElement('p', { text: pack.ui.sky.countHint }));
  container.append(cards, message, buttons);
  show(container);

  return {
    showFinalMessage(text, onAgain, onHome): void {
      message.textContent = text;
      clearChildren(buttons);
      buttons.append(
        createElement('button', { className: 'btn', text: pack.ui.sky.again, onClick: onAgain }),
        createElement('button', { className: 'btn', text: '🏠', onClick: onHome }),
      );
    },
  };
}

export function hideEndScreen(): void {
  hide(byId('end'));
}
