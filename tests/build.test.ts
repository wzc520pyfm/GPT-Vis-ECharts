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

  it('marks summary entities and draws a sparkline for ranked detail', () => {
    const view = buildView(
      '在 [2024年Q4](time_desc)，[总收入](metric_name) 达到 [¥520万](metric_value)，[下降](delta_value, assessment="negative")，[排名第一](rank, detail=[320, 180, 90])。',
    );
    expect(view.kind).toBe('html');
    if (view.kind !== 'html') return;
    expect(view.html).toContain('data-entity="metric_name"');
    expect(view.html).toContain('data-entity="time_desc"');
    expect(view.html).toContain('class="gve-chip neg"');
    expect(view.html).toContain('gve-spark');
  });

  it('places a mind map on both sides of the root', () => {
    const view = buildView(
      `vis mindmap
data
  - name 根
    children
      - name 甲
      - name 乙
`,
      { width: 800, height: 480 },
    );
    expect(view.kind).toBe('echarts');
    if (view.kind !== 'echarts') return;
    const series = view.option.series as { type: string; data: { value: string; x: number }[] }[];
    expect(series[0].type).toBe('graph');
    const root = series[0].data.find((node) => node.value === '根');
    const left = series[0].data.find((node) => node.value === '乙');
    const right = series[0].data.find((node) => node.value === '甲');
    expect(left && right && root).toBeTruthy();
    expect(right!.x).toBeGreaterThan(root!.x);
    expect(left!.x).toBeLessThan(root!.x);
  });

  it('keeps an explicit left-to-right mind map as a tree', () => {
    const view = buildView(`vis mindmap
direction LR
data
  - name 根
    children
      - name 甲
`);
    expect(view.kind).toBe('echarts');
    if (view.kind !== 'echarts') return;
    const series = view.option.series as { type: string; orient: string }[];
    expect(series[0]).toMatchObject({ type: 'tree', orient: 'LR' });
  });

  it('labels funnel stages with the conversion from the previous stage', () => {
    const view = buildView(`vis funnel
conversionRateLabel 转化率
data
  - category 访问
    value 200
  - category 下单
    value 50
`);
    expect(view.kind).toBe('echarts');
    if (view.kind !== 'echarts') return;
    const series = view.option.series as { label: { formatter: (item: { dataIndex: number; name: string; value: number }) => string } }[];
    expect(series[0].label.formatter({ dataIndex: 1, name: '下单', value: 50 })).toContain('转化率 25%');
  });

  it('uses the requested network layout', () => {
    const view = buildView(`vis network-graph
layout circular
data
  nodes
    - name 甲
    - name 乙
  edges
    - source 甲
      target 乙
`);
    expect(view.kind).toBe('echarts');
    if (view.kind !== 'echarts') return;
    const series = view.option.series as { layout: string }[];
    expect(series[0].layout).toBe('circular');
  });

  it('draws a liquid triangle and a packed word', () => {
    const liquid = buildView('vis liquid\nshape triangle\npercent 0.4');
    expect(liquid.kind).toBe('html');
    if (liquid.kind === 'html') expect(liquid.html).toContain('<polygon');

    const cloud = buildView(`vis word-cloud
data
  - text 销售
    value 40
  - text 成本
    value 12
`);
    expect(cloud.kind).toBe('html');
    if (cloud.kind === 'html') expect(cloud.html).toContain('left:');
  });

  it('explains that a venn diagram stops at three sets', () => {
    const view = buildView(`vis venn
data
  - sets [甲, 乙]
    value 1
  - sets [丙, 丁]
    value 1
`);
    expect(view.kind).toBe('error');
    expect(view.message).toContain('三个集合');
  });

  it('does not split series when group is turned off', () => {
    const view = buildView(`vis column
group false
data
  - category 甲
    value 1
    group 东
  - category 乙
    value 2
    group 西
`);
    expect(view.kind).toBe('echarts');
    if (view.kind !== 'echarts') return;
    const series = view.option.series as { name: string }[];
    expect(series).toHaveLength(1);
  });
});
