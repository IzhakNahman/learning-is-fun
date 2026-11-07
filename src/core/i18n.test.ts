import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPack, initLanguage, onLanguageChange, setLanguage } from './i18n';

describe('language switching', () => {
  beforeEach(() => {
    localStorage.clear();
    initLanguage();
    setLanguage('he', { remember: false });
  });

  it('starts in Hebrew by default', () => {
    expect(getPack().code).toBe('he');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('switches direction, language and title, and tells listeners', () => {
    const listener = vi.fn();
    onLanguageChange(listener);
    setLanguage('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe(getPack().ui.appName);
    expect(listener).toHaveBeenCalledWith(getPack());
    expect(localStorage.getItem('learning-is-fun:language')).toBe('en');
  });

  it('does nothing when the language is already active', () => {
    const listener = vi.fn();
    onLanguageChange(listener);
    setLanguage('he');
    expect(listener).not.toHaveBeenCalled();
  });

  it('restores the saved language on start', () => {
    localStorage.setItem('learning-is-fun:language', 'en');
    initLanguage();
    expect(getPack().code).toBe('en');
  });
});
