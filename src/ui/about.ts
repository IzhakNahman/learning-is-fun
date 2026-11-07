import type { LanguagePack } from '../content';
import { byId, clearChildren, createElement, hide, show } from '../core/dom';
import { getPack, onLanguageChange } from '../core/i18n';

export function initAbout(): void {
  onLanguageChange(renderAbout);
  renderAbout(getPack());
}

export function openAbout(): void {
  show(byId('about'));
}

function closeAbout(): void {
  hide(byId('about'));
}

function renderAbout(pack: LanguagePack): void {
  const about = pack.ui.about;
  const container = byId('about');
  closeAbout();
  clearChildren(container);

  const box = createElement(
    'div',
    { className: 'box' },
    createElement('h3', { text: about.title }),
    createElement('p', { text: about.intro }),
  );
  for (const section of about.sections) {
    box.append(
      createElement('h4', { text: `${section.icon} ${pack.ui.gameNames[section.game]}` }),
      createElement('p', { text: section.body }),
    );
  }
  box.append(
    createElement('p', { text: about.skills }),
    createElement('h4', { text: about.tipsTitle }),
  );
  for (const tip of about.tips) box.append(createElement('p', { text: tip }));
  box.append(
    createElement('p', { text: about.voiceNote }),
    createElement(
      'div',
      { className: 'foot' },
      pack.ui.credit,
      createElement('br'),
      createElement('button', { className: 'btn', text: about.close, onClick: closeAbout }),
    ),
  );
  container.append(box);
}
