import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('number layout', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  it('forces left-to-right on everything made of numbers', () => {
    const rule = css.match(/#countplay \.count-box,([^{]*)\{([^}]*)\}/);
    expect(rule?.[2]).toContain('direction: ltr');
    expect(rule?.[0]).toContain('#countplay .play-choices');
    expect(rule?.[0]).toContain('.play-stars');
    expect(css).toMatch(/\.balls\s*\{[^}]*direction: ltr/);
  });
});
