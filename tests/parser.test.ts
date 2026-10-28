import { describe, expect, it } from 'vitest';
import { buildView } from '../src/build';
import { isVisSyntax, parse, readConfig } from '../src/parser';

describe('vis parser', () => {
  it('parses a line chart with groups and axis titles', () => {
    const config = parse(`vis line
title 销售额
axisYTitle 万元
data
  - time 2020
    value 100
    group 华东
  - time 2021
    value 120
    group 华东
`);
    expect(config.type).toBe('line');
    expect(config.title).toBe('销售额');
    expect(config.axisYTitle).toBe('万元');
    expect(config.data).toEqual([
      { time: 2020, value: 100, group: '华东' },
      { time: 2021, value: 120, group: '华东' },
    ]);
  });

  it('keeps quoted strings and accepts colon assignment', () => {
    const config = parse(`vis pie
data
  - category "Q1 Sales"
    value 30
  - category 分类二
    value 25
innerRadius: 0.6
theme academy
`);
    expect(config.innerRadius).toBe(0.6);
    expect(config.theme).toBe('academy');
    expect(config.data).toEqual([
      { category: 'Q1 Sales', value: 30 },
      { category: '分类二', value: 25 },
    ]);
  });

  it('parses style palettes and booleans', () => {
    const config = parse(`vis column
stack true
data
  - category A
    value 1
style
  lineWidth 3
  palette
    - #691eff
    - #8e5aff
  backgroundColor #111111
`);
    expect(config.stack).toBe(true);
    expect(config.style).toEqual({
      lineWidth: 3,
      palette: ['#691eff', '#8e5aff'],
      backgroundColor: '#111111',
    });
  });

  it('parses dual-axes categories and nested series data', () => {
    const config = parse(`vis dual-axes
categories
  - "North America"
  - 欧洲
series
  - type line
    axisYTitle Revenue
    data
      - 100
      - 90
  - type column
    data
      - 50
      - 45
`);
    expect(config.categories).toEqual(['North America', '欧洲']);
    expect(config.series).toEqual([
      { type: 'line', axisYTitle: 'Revenue', data: [100, 90] },
      { type: 'column', data: [50, 45] },
    ]);
  });

  it('parses a mind map and a bare tree root', () => {
    const mindmap = parse(`vis mindmap
data
  - name 销售额下滑
    children
      - name 量
        children
          - name 线索减少
      - name 价
`);
    expect(mindmap.data).toEqual([
      {
        name: '销售额下滑',
        children: [{ name: '量', children: [{ name: '线索减少' }] }, { name: '价' }],
      },
    ]);

    const tree = parse(`vis indented-tree
data
  name 公司
  children
    - name 设计
    - name 研发
`);
    expect(tree.data).toEqual({ name: '公司', children: [{ name: '设计' }, { name: '研发' }] });
  });

  it('parses network blocks and histogram scalars', () => {
    const network = parse(`vis network-graph
data
  nodes
    - name 下单
    - name 支付
  edges
    - source 下单
      target 支付
      name 下一步
`);
    expect(network.data).toEqual({
      nodes: [{ name: '下单' }, { name: '支付' }],
      edges: [{ source: '下单', target: '支付', name: '下一步' }],
    });

    const histogram = parse(`vis histogram
binNumber 4
data
  - 78
  - 88
  - 60
`);
    expect(histogram.data).toEqual([78, 88, 60]);
  });

  it('drops an unfinished trailing line while streaming', () => {
    const partial = parse(
      `vis line
data
  - time 2020
    value 100
  - time 2021
    val`,
      { streaming: true },
    );
    expect(partial.data).toEqual([{ time: 2020, value: 100 }, { time: 2021 }]);
    const drawn = buildView(
      `vis line
data
  - time 2020
    value 100
  - time 2021
    val`,
      { streaming: true },
    );
    expect(drawn.kind).toBe('echarts');
    if (drawn.kind === 'echarts') {
      const series = drawn.option.series as { data: unknown[] }[];
      expect(series[0].data).toEqual([100]);
    }
  });

  it('reads json, fenced vis, and plain summary text', () => {
    expect(isVisSyntax('  vis bar')).toBe(true);
    expect(readConfig({ type: 'line', data: [] }).type).toBe('line');
    expect(readConfig('{"type":"pie","innerRadius":0.5}').innerRadius).toBe(0.5);
    expect(readConfig('{"type":').type).toBe('');
    const fenced = readConfig('```vis\nvis bar\ntitle 渠道\n```');
    expect(fenced).toMatchObject({ type: 'bar', title: '渠道' });
    expect(readConfig('# 周报\n收入上升').type).toBe('summary');
  });
});
