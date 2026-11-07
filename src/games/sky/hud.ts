import type { LanguagePack, WordEntry } from '../../content';
import { byId, clearChildren, createElement } from '../../core/dom';
import type { Slot } from './types';

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function setClock(secondsLeft: number): void {
  byId('timer').textContent = formatClock(secondsLeft);
}

export function setScore(count: number): void {
  byId('score').textContent = `⭐ ${count}`;
}

export function resetHud(pack: LanguagePack, secondsLeft: number): void {
  setClock(secondsLeft);
  setScore(0);
  clearChildren(byId('side'));
  byId('quit').textContent = pack.ui.sky.quit;
  byId('rotateText').textContent = pack.ui.sky.rotatePhone;
}

/** The target word as empty (ghost letters) and filled slots, plus its picture. */
export function renderWordBar(word: WordEntry, slots: readonly Slot[]): void {
  const bar = byId('word');
  clearChildren(bar);
  for (const slot of slots) {
    bar.append(
      createElement('span', { className: slot.filled ? 'slot f' : 'slot', text: slot.spec.text }),
    );
  }
  bar.append(createElement('span', { className: 'emo', text: word.emoji }));
}

export function addAchievedWordChip(word: WordEntry): void {
  byId('side').append(
    createElement(
      'div',
      { className: 'chip' },
      createElement('span', { text: word.emoji }),
      word.shown,
    ),
  );
}
