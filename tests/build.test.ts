import { describe, expect, it } from 'vitest';
import { buildView } from '../src/build';

describe('chart build', () => {
  it('turns a grouped line into one series per group', () => {
    const view = buildView(`vis line
title 销售
data
  - time 1月
    value 10
    group 华东
  - time 2月
    value 12
    group 华东
  - time 1月
    value 8
    group 华南
  - time 2月
    value 9
    group 华南
`);
    expect(view.kind).toBe('echarts');
    if (view.kind !== 'echarts') return;
    const series = view.option.series as { name: string; data: number[] }[];
    expect(series.map((item) => item.name)).toEqual(['华东', '华南']);
    expect(series[0].data).toEqual([10, 12]);
    expect(series[1].data).toEqual([8, 9]);
  });

  it('builds a waterfall with a total reset', () => {
    const view = buildView(`vis waterfall
data
  - category 收入
    value 100
    isTotal true
  - category 成本
    value -30
  - category 利润
    isTotal true
`);
    expect(view.kind).toBe('echarts');
    if (view.kind !== 'echarts') return;
    const series = view.option.series as { data: unknown[] }[];
    expect(series).toHaveLength(2);
    expect(series[1].data).toEqual([
      { value: 100, itemStyle: { color: expect.any(String) } },
      { value: 30, itemStyle: { color: expect.any(String) } },
      { value: 70, itemStyle: { color: expect.any(String) } },
    ]);
  });

  it('waits for data and rejects unknown types without throwing', () => {
    expect(buildView('vis line\ntitle 还没有数据').kind).toBe('pending');
    expect(buildView('vis', { streaming: true }).kind).toBe('pending');
    expect(buildView('vis heat', { streaming: true }).kind).toBe('pending');
    const unknown = buildView('vis heatmap\ndata\n  - x 1\n    y 2');
    expect(unknown.kind).toBe('error');
    expect(unknown.message).toContain('heatmap');
  });

  it('renders table, summary, and liquid without echarts', () => {
    const table = buildView(`vis table
data
  - 区域 华东
    收入 10
`);
    expect(table.kind).toBe('html');
    if (table.kind === 'html') {
      expect(table.html).toContain('华东');
      expect(table.html).not.toContain('<script');
    }

    const summary = buildView('收入达到 [174 万](metric_value)。');
    expect(summary.kind).toBe('html');
    if (summary.kind === 'html') expect(summary.html).toContain('gve-chip');

    const liquid = buildView('vis liquid\npercent 0.75\ntitle 目标');
    expect(liquid.kind).toBe('html');
    if (liquid.kind === 'html') expect(liquid.html).toContain('75%');
  });

  it('escapes html that a model might put in a table cell', () => {
    const view = buildView(`vis table
data
  - 名称 <img src=x onerror=alert(1)>
    值 1
`);
    expect(view.kind).toBe('html');
    if (view.kind !== 'html') return;
    expect(view.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(view.html).not.toContain('<img');
  });
});
