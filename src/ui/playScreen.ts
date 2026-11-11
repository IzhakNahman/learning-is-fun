import type { InstructionGame, LanguagePack } from '../content';
import { wellDonePart } from '../content';
import { createElement } from '../core/dom';
import { playCelebrationSound, playWinSound } from '../core/sfx';
import { SPEECH_RATE, speakPart } from '../core/voice';
import { starsLit } from '../games/rounds';
import { showInstruction } from './instruction';

/** The instruction line (with its 🔊 button) at the top of a drag game. */
export function buildPrompt(pack: LanguagePack, game: InstructionGame): HTMLElement {
  const prompt = createElement('div', { className: 'play-prompt' });
  showInstruction(prompt, pack, game);
  return prompt;
}

/** A row of stars showing progress through the current set of rounds. */
export function buildStars(solvedRounds: number, setSize: number): HTMLElement {
  const lit = starsLit(solvedRounds, setSize);
  const row = createElement('div', { className: 'play-stars' });
  for (let index = 0; index < setSize; index++) {
    row.append(createElement('span', { className: index < lit ? 'star on' : 'star', text: '⭐' }));
  }
  return row;
}

/** How long the cheer sound lasts, so speech can wait for it. */
export const CHEER_MS = 650;

/** The sound of a solved round; a finished set gets the bigger celebration. */
export function cheer(setFinished: boolean): void {
  if (setFinished) playCelebrationSound();
  else playWinSound(true);
}

export async function sayWellDone(pack: LanguagePack): Promise<void> {
  await speakPart(wellDonePart(pack), SPEECH_RATE.DEFAULT);
}
