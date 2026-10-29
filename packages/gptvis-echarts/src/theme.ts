export type ThemeName = 'default' | 'light' | 'dark' | 'academy';

export interface ThemeTokens {
  name: Exclude<ThemeName, 'light'>;
  background: string;
  text: string;
  muted: string;
  grid: string;
  tooltipBg: string;
  tooltipText: string;
  palette: string[];
  positive: string;
  negative: string;
  total: string;
}

const DEFAULT_PALETTE = ['#0f6e6b', '#d4652f', '#2f5d9f', '#c4a15a', '#6d4c7d', '#3d8b6e', '#b44848', '#4c6b7a'];
const DARK_PALETTE = ['#7dcec6', '#f0a36a', '#8eb4e8', '#e4c98a', '#c9a4d6', '#8dceb0', '#f0a0a0', '#b7c7d1'];
const ACADEMY_PALETTE = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#9c755f'];

export function resolveTheme(theme: unknown, fallback: ThemeName = 'default'): ThemeTokens {
  const name = theme === 'light' || theme === 'default' || theme === 'dark' || theme === 'academy' ? theme : fallback;
  if (name === 'dark') {
    return {
      name: 'dark',
      background: '#14191a',
      text: '#f3efe6',
      muted: '#b7b1a6',
      grid: '#2c3436',
      tooltipBg: '#243031',
      tooltipText: '#f6f3ec',
      palette: DARK_PALETTE,
      positive: '#7dce9a',
      negative: '#f0a0a0',
      total: '#8eb4e8',
    };
  }
  if (name === 'academy') {
    return {
      name: 'academy',
      background: '#f6f3ec',
      text: '#1d2a33',
      muted: '#5d6c75',
      grid: '#e3dccc',
      tooltipBg: '#1d2a33',
      tooltipText: '#f6f3ec',
      palette: ACADEMY_PALETTE,
      positive: '#59a14f',
      negative: '#e15759',
      total: '#4e79a7',
    };
  }
  return {
    name: 'default',
    background: '#fbf9f6',
    text: '#1c1916',
    muted: '#6e675f',
    grid: '#e6e0d6',
    tooltipBg: '#1c1916',
    tooltipText: '#fbf9f6',
    palette: DEFAULT_PALETTE,
    positive: '#2f7d4a',
    negative: '#b44848',
    total: '#2f5d9f',
  };
}

const NAMED = /^(?:#[0-9a-f]{3,8}|rgba?\([\d.%\s,/+-]+\)|hsla?\([\d.%\s,/+-]+\)|[a-z]{3,20})$/i;

/** Keep model-supplied colors inside CSS color syntax. Never accept urls or expressions. */
export function safeColor(value: unknown, fallback?: string): string | undefined {
  if (typeof value !== 'string') return fallback;
  const color = value.trim();
  if (!NAMED.test(color)) return fallback;
  return color;
}

export function safePalette(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const colors = value.map((item) => safeColor(item)).filter((item): item is string => Boolean(item));
  return colors.length ? colors : fallback;
}
