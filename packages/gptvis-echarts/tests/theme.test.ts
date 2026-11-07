import { describe, expect, it } from 'vitest';
import { buildView } from '../src/build';
import { resolveTheme, safeColor, type ThemeSpec } from '../src/theme';

describe('theme resolution', () => {
  it('keeps the built-in string themes', () => {
    const defaults = resolveTheme('default');
    expect(defaults).toMatchObject({ name: 'default', background: '#fbf9f6' });

    const light = resolveTheme('light');
    expect(light).toMatchObject({ name: 'default', background: '#fbf9f6' });

    const dark = resolveTheme('dark');
    expect(dark).toMatchObject({ name: 'dark', background: '#14191a', tooltipBg: '#243031' });
    expect(dark.palette).toHaveLength(8);

    const academy = resolveTheme('academy');
    expect(academy).toMatchObject({ name: 'academy', background: '#f6f3ec' });
    expect(academy.palette[0]).toBe('#4e79a7');
  });

  it('maps ThemeSpec tokens onto the existing resolved tokens', () => {
    const spec: ThemeSpec = {
      id: 'brand',
      label: 'Brand',
      baseTheme: 'dark',
      tokens: {
        colorBackground: '#010203',
        colorText: '#111111',
        colorTextSecondary: '#222222',
        colorStroke: '#333333',
        category10: ['#aa0000', '#00aa00'],
        colorPositive: '#00ff00',
        colorNegative: '#ff0000',
        colorSurface: '#444444',
        colorTextInverse: '#eeeeee',
        colorDefault: '#123456',
      },
    };
    const theme = resolveTheme(spec);
    expect(theme).toEqual({
      name: 'dark',
      background: '#010203',
      text: '#111111',
      muted: '#222222',
      grid: '#333333',
      tooltipBg: '#444444',
      tooltipText: '#eeeeee',
      palette: ['#aa0000', '#00aa00'],
      positive: '#00ff00',
      negative: '#ff0000',
      total: '#123456',
    });
  });

  it('falls back to category20 and shared style overrides', () => {
    const theme = resolveTheme({
      id: 'paper',
      label: 'Paper',
      tokens: {
        colorNeutral: '#777777',
        category20: ['#112233', '#445566'],
      },
      style: {
        backgroundColor: '#ffffff',
        palette: ['#abcdef'],
      },
    });
    expect(theme.muted).toBe('#777777');
    expect(theme.background).toBe('#ffffff');
    expect(theme.palette).toEqual(['#abcdef']);
  });

  it('rejects unsafe ThemeSpec colors and keeps the base value', () => {
    const theme = resolveTheme({
      id: 'unsafe',
      label: 'Unsafe',
      tokens: {
        colorText: 'url(javascript:alert(1))',
        colorBackground: 'expression(alert(1))',
      },
    });
    expect(theme.text).toBe('#1c1916');
    expect(theme.background).toBe('#fbf9f6');
  });

  it('uses a ThemeSpec through buildView', () => {
    const view = buildView(
      `vis column
data
  - category 甲
    value 1
`,
      { theme: { id: 'dark-spec', label: 'Dark spec', baseTheme: 'dark' } },
    );
    expect(view.kind).toBe('echarts');
    expect(view.background).toBe('#14191a');
  });

  it('uses safeColor for direct color checks', () => {
    expect(safeColor('#123456')).toBe('#123456');
    expect(safeColor('rgba(1, 2, 3, 0.5)')).toBe('rgba(1, 2, 3, 0.5)');
    expect(safeColor('url(javascript:alert(1))')).toBeUndefined();
    expect(safeColor('expression(alert(1))')).toBeUndefined();
  });
});
