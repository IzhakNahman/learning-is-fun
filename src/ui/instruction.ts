import { instructionPart } from '../content';
import type { InstructionGame, LanguagePack } from '../content';
import { createElement } from '../core/dom';
import { speakInterrupting } from '../core/voice';

/**
 * Shows the "tap a ..." instruction with a 🔊 button next to it.
 * The button disappears by itself when the element's text is replaced.
 */
export function showInstruction(
  target: HTMLElement,
  pack: LanguagePack,
  game: InstructionGame,
): void {
  const label = pack.ui[game].placeholder;
  const speaker = createElement('button', { className: 'hint-speaker', text: '🔊', title: label });
  speaker.setAttribute('aria-label', label);
  speaker.addEventListener('click', () => void speakInterrupting(instructionPart(pack, game)));
  target.textContent = `${label} `;
  target.append(speaker);
}
