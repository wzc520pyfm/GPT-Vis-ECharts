import * as echarts from 'echarts';
import { describe, expect, it } from 'vitest';
import { buildView } from '../src/build';
import { resolveTheme } from '../src/theme';

describe('installed ECharts', () => {
  it('accepts a built option and resolved theme through setOption', () => {
    const spec = {
      id: 'smoke',
      label: 'Smoke',
      tokens: {
        colorBackground: '#ffffff',
        colorText: '#111111',
        category10: ['#123456', '#654321'],
      },
    };
    const theme = resolveTheme(spec);
    const view = buildView(
      `vis column
title Smoke
data
  - category 甲
    value 4
  - category 乙
    value 7
`,
      { theme: spec },
    );
    expect(view.kind).toBe('echarts');
    if (view.kind !== 'echarts') return;

    echarts.registerTheme('gptvis-echarts-smoke', {
      backgroundColor: theme.background,
      color: theme.palette,
      textStyle: { color: theme.text },
    });
    const chart = echarts.init(null, 'gptvis-echarts-smoke', {
      renderer: 'svg',
      ssr: true,
      width: 640,
      height: 360,
    });
    try {
      chart.setOption(view.option, { notMerge: true });
      expect(chart.renderToSVGString()).toContain('<svg');
    } finally {
      chart.dispose();
    }
  });
});
