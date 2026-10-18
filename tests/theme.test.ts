import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_COLORS } from '../src/ui/theme.ts';

/**
 * The browser UI colour (address bar, task switcher) is written by `applyTheme`
 * from a hardcoded map. It has to agree with the static markup and with the
 * `--bg` token of the stylesheet, or the browser chrome shows a colour that is
 * not part of the design.
 */
describe('THEME_COLORS', () => {
  it('matches the theme-color meta tags of index.html', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain(`content="${THEME_COLORS.light}"`);
    expect(html).toContain(`content="${THEME_COLORS.dark}"`);
  });

  it('matches the --bg token of the stylesheet', () => {
    const css = readFileSync(new URL('../src/styles/main.css', import.meta.url), 'utf8');
    expect(css).toContain(`--bg: ${THEME_COLORS.light};`);
    expect(css).toContain(`--bg: ${THEME_COLORS.dark};`);
  });

  it('uses the paper colour in the web manifest', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../public/site.webmanifest', import.meta.url), 'utf8'),
    ) as { theme_color?: string; background_color?: string };
    expect(manifest.theme_color).toBe(THEME_COLORS.light);
    expect(manifest.background_color).toBe(THEME_COLORS.light);
  });
});
