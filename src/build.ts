import { SUPPORTED, chartLabel } from './catalog.js';
import {
  num,
  renderFishbone,
  renderLiquid,
  renderPending,
  renderSummaryView,
  renderTable,
  renderUnsupported,
  renderVenn,
  renderViolin,
  renderWordCloud,
  rowsOf,
  text,
  treeOf,
  type Row,
} from './markup.js';
import { readConfig } from './parser.js';
import { resolveTheme, safeColor, safePalette, type ThemeName, type ThemeTokens } from './theme.js';

export interface ViewContext {
  theme?: ThemeName;
  streaming?: boolean;
  width?: number;
  height?: number;
}

export type View =
  | { kind: 'echarts'; option: Record<string, unknown>; background: string; message: string }
  | { kind: 'html'; html: string; background: string; message: string }
  | { kind: 'pending'; html: string; background: string; message: string }
  | { kind: 'error'; html: string; background: string; message: string };

export function buildView(input: unknown, context: ViewContext = {}): View {
  const config = readConfig(input, { streaming: context.streaming });
  const theme = resolveTheme(config.theme, context.theme ?? 'default');
  const background = safeColor(styleOf(config).backgroundColor, theme.background) ?? theme.background;

  if (!config.type) {
    return pending(context.streaming ? '正在等待 vis 语法…' : '写一行 vis line、vis bar 或其他图表类型。', background);
  }
  if (!SUPPORTED.has(config.type)) {
    const stillTyping =
      context.streaming && typeof input === 'string' && !unwrapFirstLine(input).closed;
    if (stillTyping) return pending('正在识别图表类型…', background);
    return {
      kind: 'error',
      html: renderUnsupported(config.type),
      background,
      message: `不支持的类型 ${config.type}`,
    };
  }

  const html = markupFor(config, theme);
  if (html?.includes('data-gve="limited"')) {
    return { kind: 'error', html, background, message: '韦恩图只支持二到三个集合' };
  }
  if (html) {
    return { kind: 'html', html, background, message: `${chartLabel(config.type)} · 已渲染` };
  }
  if (MARKUP_TYPES.has(config.type)) {
    return pending(`${chartLabel(config.type)}还缺数据。`, background);
  }

  const option = optionFor(config, theme, context);
  if (!option) return pending(`${chartLabel(config.type)}还缺可绘制的数据。`, background);
  return { kind: 'echarts', option, background, message: `${chartLabel(config.type)} · 已渲染` };
}

const MARKUP_TYPES = new Set(['liquid', 'table', 'summary', 'word-cloud', 'venn', 'violin', 'fishbone-diagram']);

function pending(message: string, background: string): View {
  return { kind: 'pending', html: renderPending(message), background, message };
}

function unwrapFirstLine(input: string): { closed: boolean } {
  const body = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trimStart();
  const fenced = body.startsWith('```');
  const source = fenced ? body.slice(body.indexOf('\n') + 1) : body;
  const newline = source.indexOf('\n');
  return { closed: newline >= 0 };
}

function styleOf(config: Record<string, unknown>): Record<string, unknown> {
  return config.style && typeof config.style === 'object' ? (config.style as Record<string, unknown>) : {};
}

function paletteOf(config: Record<string, unknown>, theme: ThemeTokens): string[] {
  return safePalette(styleOf(config).palette, theme.palette);
}

function markupFor(config: Record<string, unknown>, theme: ThemeTokens): string | null {
  switch (config.type) {
    case 'liquid':
      return renderLiquid(config, theme);
    case 'table':
      return renderTable(config, theme);
    case 'summary':
      return renderSummaryView(config, theme);
    case 'word-cloud':
      return renderWordCloud(config, theme);
    case 'venn':
      return renderVenn(config, theme);
    case 'violin':
      return renderViolin(config, theme);
    case 'fishbone-diagram':
      return renderFishbone(config, theme);
    default:
      return null;
  }
}

function optionFor(config: Record<string, unknown>, theme: ThemeTokens, context: ViewContext): Record<string, unknown> | null {
  const colors = paletteOf(config, theme);
  switch (config.type) {
    case 'line':
    case 'area':
      return cartesian(config, theme, colors, config.type === 'area' ? 'area' : 'line');
    case 'column':
    case 'bar':
      return cartesian(config, theme, colors, config.type);
    case 'pie':
      return pie(config, theme, colors);
    case 'scatter':
      return scatter(config, theme, colors);
    case 'radar':
      return radar(config, theme, colors);
    case 'funnel':
      return funnel(config, theme, colors);
    case 'waterfall':
      return waterfall(config, theme, colors);
    case 'dual-axes':
      return dualAxes(config, theme, colors);
    case 'histogram':
      return histogram(config, theme, colors);
    case 'boxplot':
      return boxplot(config, theme, colors);
    case 'sankey':
      return sankey(config, theme, colors);
    case 'treemap':
      return treemap(config, theme, colors);
    case 'network-graph':
      return graph(config, theme, colors, text(config.layout) || 'force', context);
    case 'flow-diagram':
      return graph(config, theme, colors, 'dagre', context);
    case 'mindmap':
      return config.direction === 'LR' || config.direction === 'RL'
        ? treeChart(config, theme, colors, config.direction)
        : mindmapChart(config, theme, colors, context);
    case 'indented-tree':
      return treeChart(config, theme, colors, config.direction === 'RL' ? 'RL' : 'LR');
    case 'organization-chart':
      return treeChart(config, theme, colors, 'TB');
    default:
      return null;
  }
}

function base(config: Record<string, unknown>, theme: ThemeTokens, colors: string[], legend: boolean): Record<string, unknown> {
  const title = text(config.title);
  return {
    color: colors,
    backgroundColor: 'transparent',
    animation: false,
    animationDuration: 0,
    animationDurationUpdate: 0,
    textStyle: { color: theme.text, fontFamily: 'IBM Plex Sans, Source Sans 3, sans-serif' },
    title: title
      ? { text: title, left: 8, top: 6, textStyle: { color: theme.text, fontSize: 16, fontWeight: 600 } }
      : undefined,
    legend: legend ? { top: title ? 34 : 8, type: 'scroll', textStyle: { color: theme.muted } } : undefined,
    tooltip: {
      backgroundColor: theme.tooltipBg,
      borderWidth: 0,
      textStyle: { color: theme.tooltipText },
    },
  };
}

function axisCommon(theme: ThemeTokens, name?: string): Record<string, unknown> {
  return {
    name,
    nameLocation: 'middle',
    nameGap: name ? 32 : 15,
    nameTextStyle: { color: theme.muted, padding: [8, 0, 0, 0] },
    axisLine: { lineStyle: { color: theme.grid } },
    axisTick: { show: false },
    axisLabel: { color: theme.muted, hideOverlap: true },
    splitLine: { lineStyle: { color: theme.grid } },
  };
}

function grouped(rows: Row[], xKey: string, yKey: string, allowGroup = true) {
  const categories: string[] = [];
  for (const row of rows) {
    const category = text(row[xKey]);
    if (!categories.includes(category)) categories.push(category);
  }
  const groups: string[] = [];
  for (const row of rows) {
    if (!allowGroup || row.group == null || row.group === '') continue;
    const group = text(row.group);
    if (!groups.includes(group)) groups.push(group);
  }
  const names = groups.length ? groups : [''];
  const series = names.map((group) => ({
    name: group || text(rows[0]?.[yKey] ? '' : '') || '数值',
    data: categories.map((category) => {
      const found = rows.find((row) => text(row[xKey]) === category && text(row.group ?? '') === group);
      return found ? num(found[yKey]) : null;
    }),
  }));
  if (!groups.length) series[0].name = '数值';
  return { categories, series, grouped: groups.length > 0 };
}

function cartesian(
  config: Record<string, unknown>,
  theme: ThemeTokens,
  colors: string[],
  kind: 'line' | 'area' | 'column' | 'bar',
): Record<string, unknown> | null {
  const xKey = kind === 'line' || kind === 'area' ? 'time' : 'category';
  const rows = rowsOf(config.data).filter((row) => row[xKey] != null && num(row.value) != null);
  if (!rows.length) return null;
  const split = grouped(rows, xKey, 'value', config.group !== false);
  const horizontal = kind === 'bar';
  const stacked = config.stack === true;
  const lineWidth = num(styleOf(config).lineWidth) ?? 2;
  const long = split.categories.length > 14;
  const series = split.series.map((entry) => {
    const type = kind === 'area' || kind === 'line' ? 'line' : 'bar';
    return {
      type,
      name: entry.name,
      data: entry.data,
      stack: stacked ? 'total' : undefined,
      smooth: false,
      showSymbol: kind !== 'column' && kind !== 'bar' && split.categories.length <= 24,
      symbolSize: 7,
      lineStyle: { width: lineWidth },
      areaStyle: kind === 'area' ? { opacity: stacked ? 0.72 : 0.18 } : undefined,
      barMaxWidth: 36,
    };
  });
  const categoryAxis = {
    type: 'category',
    data: split.categories,
    inverse: horizontal,
    ...axisCommon(theme, text(horizontal ? config.axisYTitle : config.axisXTitle) || undefined),
  };
  const valueAxis = {
    type: 'value',
    ...axisCommon(theme, text(horizontal ? config.axisXTitle : config.axisYTitle) || undefined),
  };
  return {
    ...base(config, theme, colors, split.grouped || series.length > 1),
    tooltip: { trigger: 'axis', backgroundColor: theme.tooltipBg, borderWidth: 0, textStyle: { color: theme.tooltipText } },
    grid: {
      left: 18,
      right: 22,
      top: text(config.title) ? 78 : 52,
      bottom: long ? 64 : text(config.axisXTitle) ? 42 : 28,
      containLabel: true,
    },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    dataZoom: long ? [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }] : undefined,
    series,
  };
}

function pie(config: Record<string, unknown>, theme: ThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data).filter((row) => num(row.value) != null);
  if (!rows.length) return null;
  const inner = num(config.innerRadius) ?? 0;
  const ratio = inner > 1 ? inner / 100 : inner;
  const innerRadius = `${Math.max(0, Math.min(0.85, ratio)) * 68}%`;
  return {
    ...base(config, theme, colors, true),
    tooltip: { trigger: 'item', backgroundColor: theme.tooltipBg, borderWidth: 0, textStyle: { color: theme.tooltipText } },
    series: [
      {
        type: 'pie',
        radius: [innerRadius, '68%'],
        center: ['50%', text(config.title) ? '56%' : '52%'],
        data: rows.map((row) => ({ name: text(row.category || row.name), value: num(row.value) })),
        label: { color: theme.text, formatter: '{b}\n{d}%' },
      },
    ],
  };
}

function scatter(config: Record<string, unknown>, theme: ThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data).filter((row) => num(row.x) != null && num(row.y) != null);
  if (!rows.length) return null;
  const groups = [...new Set(rows.map((row) => text(row.group)).filter(Boolean))];
  const buckets = groups.length ? groups : [''];
  return {
    ...base(config, theme, colors, groups.length > 0),
    grid: { left: 18, right: 24, top: text(config.title) ? 72 : 48, bottom: 28, containLabel: true },
    xAxis: { type: 'value', scale: true, ...axisCommon(theme, text(config.axisXTitle) || undefined) },
    yAxis: { type: 'value', scale: true, ...axisCommon(theme, text(config.axisYTitle) || undefined) },
    series: buckets.map((group) => ({
      type: 'scatter',
      name: group || '样本',
      symbolSize: 12,
      data: rows.filter((row) => text(row.group ?? '') === group).map((row) => [num(row.x), num(row.y)]),
    })),
  };
}

function radar(config: Record<string, unknown>, theme: ThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data).filter((row) => row.name != null && num(row.value) != null);
  if (!rows.length) return null;
  const indicators: string[] = [];
  for (const row of rows) {
    const name = text(row.name);
    if (!indicators.includes(name)) indicators.push(name);
  }
  const groups = [...new Set(rows.map((row) => text(row.group)))];
  const names = groups.some(Boolean) ? groups.filter(Boolean) : [''];
  const sharedMax = config.align === true;
  const maxOf = (name: string) => {
    const values = rows.filter((row) => text(row.name) === name).map((row) => num(row.value) ?? 0);
    return Math.max(1, ...values);
  };
  const globalMax = Math.max(...indicators.map(maxOf));
  return {
    ...base(config, theme, colors, names.length > 1),
    radar: {
      indicator: indicators.map((name) => ({ name, max: (sharedMax ? globalMax : maxOf(name)) * 1.15 })),
      axisName: { color: theme.muted },
      splitLine: { lineStyle: { color: theme.grid } },
      splitArea: { areaStyle: { color: ['transparent', 'transparent'] } },
      center: ['50%', text(config.title) ? '56%' : '52%'],
      radius: '62%',
    },
    series: [
      {
        type: 'radar',
        data: names.map((group) => ({
          name: group || text(config.title) || '数值',
          value: indicators.map((name) => {
            const found = rows.find((row) => text(row.name) === name && text(row.group ?? '') === group);
            return found ? num(found.value) : 0;
          }),
          areaStyle: { opacity: 0.12 },
          lineStyle: { width: num(styleOf(config).lineWidth) ?? 2 },
        })),
      },
    ],
  };
}

function funnel(config: Record<string, unknown>, theme: ThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data)
    .filter((row) => num(row.value) != null)
    .map((row) => ({ name: text(row.category || row.name), value: num(row.value) ?? 0 }))
    .sort((a, b) => b.value - a.value);
  if (!rows.length) return null;
  const rateLabel = text(config.conversionRateLabel) || '转化';
  return {
    ...base(config, theme, colors, false),
    series: [
      {
        type: 'funnel',
        left: '12%',
        top: text(config.title) ? 64 : 36,
        bottom: 16,
        width: '76%',
        sort: 'none',
        gap: 4,
        label: {
          color: theme.text,
          formatter: (item: { dataIndex?: number; name?: string; value?: number }) => {
            const index = item.dataIndex ?? 0;
            const previous = rows[index - 1]?.value;
            const rate = previous ? Math.round(((item.value ?? 0) / previous) * 1000) / 10 : null;
            const suffix = rate == null ? '' : `\n${rateLabel} ${rate}%`;
            return `${item.name}  ${formatNumber(item.value ?? 0)}${suffix}`;
          },
        },
        data: rows,
      },
    ],
  };
}

function waterfall(config: Record<string, unknown>, theme: ThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data).filter((row) => row.category != null || row.name != null);
  if (!rows.length) return null;
  const custom = Array.isArray(styleOf(config).palette);
  const positive = custom ? colors[0] ?? theme.positive : theme.positive;
  const negative = custom ? colors[1] ?? theme.negative : theme.negative;
  const totalColor = custom ? colors[2] ?? theme.total : theme.total;
  let cursor = 0;
  const helpers: number[] = [];
  const bars: number[] = [];
  const signed: number[] = [];
  const paints: string[] = [];
  const categories: string[] = [];
  for (const row of rows) {
    categories.push(text(row.category || row.name));
    const marked = row.isTotal === true || row.isIntermediateTotal === true;
    if (marked) {
      const height = num(row.value) ?? cursor;
      helpers.push(0);
      bars.push(Math.abs(height));
      signed.push(height);
      paints.push(totalColor);
      cursor = height;
      continue;
    }
    const value = num(row.value) ?? 0;
    signed.push(value);
    if (value >= 0) {
      helpers.push(cursor);
      bars.push(value);
      paints.push(positive);
      cursor += value;
    } else {
      cursor += value;
      helpers.push(cursor);
      bars.push(-value);
      paints.push(negative);
    }
  }
  return {
    ...base(config, theme, colors, false),
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.tooltipBg,
      borderWidth: 0,
      textStyle: { color: theme.tooltipText },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params];
        const index = (items[0] as { dataIndex?: number })?.dataIndex ?? 0;
        return `${categories[index]}<br/>${formatNumber(signed[index] ?? 0)}`;
      },
    },
    grid: { left: 18, right: 18, top: text(config.title) ? 64 : 36, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: categories, ...axisCommon(theme, text(config.axisXTitle) || undefined) },
    yAxis: { type: 'value', ...axisCommon(theme, text(config.axisYTitle) || undefined) },
    series: [
      { type: 'bar', stack: 'waterfall', data: helpers, itemStyle: { color: 'transparent' }, emphasis: { disabled: true }, tooltip: { show: false } },
      {
        type: 'bar',
        stack: 'waterfall',
        data: bars.map((value, index) => ({ value, itemStyle: { color: paints[index] } })),
        barMaxWidth: 42,
        label: {
          show: true,
          position: 'top',
          color: theme.muted,
          formatter: (item: { dataIndex: number }) => formatNumber(signed[item.dataIndex] ?? 0),
        },
      },
    ],
  };
}

function dualAxes(config: Record<string, unknown>, theme: ThemeTokens, colors: string[]): Record<string, unknown> | null {
  const categories = Array.isArray(config.categories) ? config.categories.map((item) => text(item)) : [];
  const series = rowsOf(config.series).filter((item) => Array.isArray(item.data));
  if (!categories.length || !series.length) return null;
  const startAtZero = styleOf(config).startAtZero !== false;
  return {
    ...base(config, theme, colors, true),
    tooltip: { trigger: 'axis', backgroundColor: theme.tooltipBg, borderWidth: 0, textStyle: { color: theme.tooltipText } },
    grid: { left: 18, right: 18, top: text(config.title) ? 78 : 52, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: categories, ...axisCommon(theme, text(config.axisXTitle) || undefined) },
    yAxis: [0, 1].map((index) => ({
      type: 'value',
      alignTicks: true,
      scale: !startAtZero,
      min: startAtZero ? 0 : undefined,
      ...axisCommon(theme, text(series[index]?.axisYTitle) || undefined),
    })),
    series: series.map((item, index) => ({
      type: item.type === 'line' ? 'line' : 'bar',
      name: text(item.name || item.axisYTitle) || `系列 ${index + 1}`,
      yAxisIndex: Math.min(index, 1),
      data: (item.data as unknown[]).map((value) => num(value)),
      barMaxWidth: 28,
      smooth: false,
      symbolSize: 7,
    })),
  };
}

function histogram(config: Record<string, unknown>, theme: ThemeTokens, colors: string[]): Record<string, unknown> | null {
  const values = Array.isArray(config.data) ? config.data.map((item) => num(item)).filter((item): item is number => item != null) : [];
  if (!values.length) return null;
  const bins = Math.max(1, Math.round(num(config.binNumber) ?? 8));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min || 1) / bins;
  const counts = Array.from({ length: bins }, () => 0);
  for (const value of values) {
    const index = Math.min(bins - 1, Math.max(0, Math.floor((value - min) / step)));
    counts[index] += 1;
  }
  const labels = counts.map((_, index) => {
    const start = min + index * step;
    return `${formatNumber(start)}–${formatNumber(start + step)}`;
  });
  return {
    ...base(config, theme, colors, false),
    grid: { left: 18, right: 16, top: text(config.title) ? 64 : 32, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: labels, ...axisCommon(theme, text(config.axisXTitle) || undefined) },
    yAxis: { type: 'value', ...axisCommon(theme, text(config.axisYTitle) || '频数') },
    series: [{ type: 'bar', data: counts, barMaxWidth: 48, itemStyle: { color: colors[0] } }],
  };
}

function quartiles(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => {
    const position = (sorted.length - 1) * p;
    const low = Math.floor(position);
    const high = Math.ceil(position);
    if (low === high) return sorted[low];
    return sorted[low] * (high - position) + sorted[high] * (position - low);
  };
  return [sorted[0], at(0.25), at(0.5), at(0.75), sorted[sorted.length - 1]];
}

function boxplot(config: Record<string, unknown>, theme: ThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data).filter((row) => num(row.value) != null);
  if (!rows.length) return null;
  const categories: string[] = [];
  for (const row of rows) {
    const category = text(row.category || row.name || '全部');
    if (!categories.includes(category)) categories.push(category);
  }
  const groups = [...new Set(rows.map((row) => text(row.group)).filter(Boolean))];
  const names = groups.length ? groups : [''];
  const startAtZero = styleOf(config).startAtZero === true;
  return {
    ...base(config, theme, colors, groups.length > 0),
    grid: { left: 18, right: 16, top: text(config.title) ? 72 : 40, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: categories, ...axisCommon(theme, text(config.axisXTitle) || undefined) },
    yAxis: { type: 'value', scale: !startAtZero, min: startAtZero ? 0 : undefined, ...axisCommon(theme, text(config.axisYTitle) || undefined) },
    series: names.map((group) => ({
      type: 'boxplot',
      name: group || '分布',
      data: categories.map((category) => {
        const values = rows
          .filter((row) => text(row.category || row.name || '全部') === category && text(row.group ?? '') === group)
          .map((row) => num(row.value))
          .filter((value): value is number => value != null);
        return values.length ? quartiles(values) : '-';
      }),
    })),
  };
}

function sankey(config: Record<string, unknown>, theme: ThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data).filter((row) => row.source != null && row.target != null && num(row.value) != null);
  if (!rows.length) return null;
  const names: string[] = [];
  for (const row of rows) {
    for (const key of [text(row.source), text(row.target)]) if (!names.includes(key)) names.push(key);
  }
  const requested = config.nodeAlign === 'center' ? 'justify' : config.nodeAlign;
  const align = requested === 'right' || requested === 'left' || requested === 'justify' ? requested : 'justify';
  return {
    ...base(config, theme, colors, false),
    series: [
      {
        type: 'sankey',
        top: text(config.title) ? 48 : 16,
        bottom: 8,
        left: '2%',
        right: '18%',
        nodeAlign: align,
        nodeWidth: 12,
        nodeGap: 14,
        layoutIterations: 32,
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.45 },
        label: { color: theme.text, fontSize: 12 },
        data: names.map((name, index) => ({ name, itemStyle: { color: colors[index % colors.length] } })),
        links: rows.map((row) => ({ source: text(row.source), target: text(row.target), value: num(row.value) })),
      },
    ],
  };
}

function treemapNodes(data: unknown): Row[] {
  return rowsOf(data).map((row) => ({
    name: text(row.name || row.category),
    value: num(row.value) ?? undefined,
    children: row.children ? treemapNodes(row.children) : undefined,
  }));
}

function treemap(config: Record<string, unknown>, theme: ThemeTokens, colors: string[]): Record<string, unknown> | null {
  const data = treemapNodes(config.data);
  if (!data.length) return null;
  return {
    ...base(config, theme, colors, false),
    series: [
      {
        type: 'treemap',
        top: text(config.title) ? 48 : 16,
        bottom: 8,
        left: 8,
        right: 8,
        roam: false,
        breadcrumb: { show: true, itemStyle: { color: theme.grid, textStyle: { color: theme.text } } },
        label: { color: '#fbf9f6' },
        data,
      },
    ],
  };
}

function graphNodes(data: unknown): { nodes: Row[]; edges: Row[] } {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Row;
    return { nodes: rowsOf(record.nodes), edges: rowsOf(record.edges) };
  }
  const rows = rowsOf(data);
  if (rows.some((row) => row.source && row.target)) {
    const names = new Set<string>();
    for (const row of rows) {
      names.add(text(row.source));
      names.add(text(row.target));
    }
    return { nodes: [...names].map((name) => ({ name })), edges: rows };
  }
  return { nodes: [], edges: [] };
}

function graph(
  config: Record<string, unknown>,
  theme: ThemeTokens,
  colors: string[],
  mode: string,
  context: ViewContext,
): Record<string, unknown> | null {
  const { nodes, edges } = graphNodes(config.data);
  if (!nodes.length) return null;
  const width = context.width || 720;
  const height = context.height || 420;
  const layout = mode === 'force' ? 'force' : mode === 'circular' ? 'circular' : 'none';
  const positions = layout === 'none' ? graphPositions(nodes, edges, mode, width, height) : null;
  return {
    ...base(config, theme, colors, false),
    series: [
      {
        type: 'graph',
        layout,
        roam: true,
        draggable: true,
        zoom: 1,
        force: layout === 'force' ? { repulsion: 220, edgeLength: 110, gravity: 0.08 } : undefined,
        circular: layout === 'circular' ? { rotateLabel: false } : undefined,
        label: { show: true, color: theme.text, fontSize: 12 },
        lineStyle: { color: theme.muted, opacity: 0.55, width: 1.4 },
        edgeLabel: {
          show: edges.some((edge) => edge.name),
          color: theme.muted,
          fontSize: 11,
          formatter: '{c}',
        },
        data: nodes.map((node, index) => {
          const place = positions?.get(text(node.name));
          return {
            name: text(node.name),
            x: place?.x,
            y: place?.y,
            symbolSize: 42,
            itemStyle: { color: colors[index % colors.length] },
          };
        }),
        links: edges.map((edge) => ({
          source: text(edge.source),
          target: text(edge.target),
          value: text(edge.name),
        })),
      },
    ],
  };
}

function graphPositions(
  nodes: Row[],
  edges: Row[],
  mode: string,
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const names = nodes.map((node) => text(node.name));
  if (mode === 'grid') return gridPositions(names, width, height);
  if (mode === 'radial' || mode === 'concentric') return ringPositions(names, edges, mode, width, height);
  const layered = flowPositions(nodes, edges);
  const positions = new Map<string, { x: number; y: number }>();
  for (const [name, place] of layered) {
    positions.set(name, { x: (place.x / 100) * width, y: (place.y / 100) * height });
  }
  return positions;
}

function gridPositions(names: string[], width: number, height: number): Map<string, { x: number; y: number }> {
  const columns = Math.max(1, Math.ceil(Math.sqrt(names.length)));
  const rows = Math.ceil(names.length / columns);
  const positions = new Map<string, { x: number; y: number }>();
  names.forEach((name, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    positions.set(name, {
      x: ((column + 1) / (columns + 1)) * width,
      y: ((row + 1) / (rows + 1)) * height,
    });
  });
  return positions;
}

function ringPositions(
  names: string[],
  edges: Row[],
  mode: string,
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const degree = new Map(names.map((name) => [name, 0]));
  for (const edge of edges) {
    for (const key of [text(edge.source), text(edge.target)]) {
      if (degree.has(key)) degree.set(key, (degree.get(key) ?? 0) + 1);
    }
  }
  const ordered =
    mode === 'concentric'
      ? [...names].sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0))
      : names;
  const center = mode === 'radial' ? ordered[0] : ordered[0];
  const layers = new Map<string, number>([[center, 0]]);
  if (mode === 'radial') {
    for (let pass = 0; pass < names.length; pass += 1) {
      for (const edge of edges) {
        const source = layers.get(text(edge.source));
        const target = layers.get(text(edge.target));
        if (source != null && target == null) layers.set(text(edge.target), source + 1);
        if (target != null && source == null) layers.set(text(edge.source), target + 1);
      }
    }
  } else {
    ordered.forEach((name, index) => layers.set(name, Math.floor(index / Math.max(4, Math.ceil(ordered.length / 4)))));
  }
  const groups = new Map<number, string[]>();
  for (const name of names) {
    const layer = layers.get(name) ?? 1;
    groups.set(layer, [...(groups.get(layer) ?? []), name]);
  }
  const positions = new Map<string, { x: number; y: number }>();
  const maxLayer = Math.max(...groups.keys(), 1);
  for (const [layer, group] of groups) {
    const radius = layer === 0 ? 0 : (Math.min(width, height) / 2) * (0.28 + (0.62 * layer) / maxLayer);
    group.forEach((name, index) => {
      const angle = (index / group.length) * Math.PI * 2 - Math.PI / 2;
      positions.set(name, { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius });
    });
  }
  return positions;
}

function flowPositions(nodes: Row[], edges: Row[]): Map<string, { x: number; y: number }> {
  const names = nodes.map((node) => text(node.name));
  const layer = new Map<string, number>(names.map((name) => [name, 0]));
  for (let pass = 0; pass < names.length; pass += 1) {
    let changed = false;
    for (const edge of edges) {
      const source = layer.get(text(edge.source));
      if (source == null || !layer.has(text(edge.target))) continue;
      const next = source + 1;
      if ((layer.get(text(edge.target)) ?? 0) < next) {
        layer.set(text(edge.target), next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const columns = new Map<number, string[]>();
  for (const name of names) {
    const index = layer.get(name) ?? 0;
    columns.set(index, [...(columns.get(index) ?? []), name]);
  }
  const max = Math.max(...columns.keys(), 0);
  const positions = new Map<string, { x: number; y: number }>();
  for (const [index, column] of columns) {
    column.forEach((name, row) => {
      positions.set(name, {
        x: max === 0 ? 50 : 10 + (index / max) * 80,
        y: ((row + 1) / (column.length + 1)) * 100,
      });
    });
  }
  return positions;
}

function mindmapChart(
  config: Record<string, unknown>,
  theme: ThemeTokens,
  colors: string[],
  context: ViewContext,
): Record<string, unknown> | null {
  const root = treeOf(config.data);
  if (!root || !text(root.name)) return null;
  const width = context.width || 720;
  const height = context.height || 420;
  const nodes: { id: string; name: string; x: number; y: number; color: string; side: number }[] = [];
  const links: { source: string; target: string }[] = [];
  let seq = 0;
  const nextId = () => `m${seq++}`;

  const children = rowsOf(root.children);
  const right = children.filter((_, index) => index % 2 === 0);
  const left = children.filter((_, index) => index % 2 === 1);
  const rootId = nextId();
  const rightBlock = layoutMindmapForest(right, 168, 1, colors, nodes, links, nextId);
  const leftBlock = layoutMindmapForest(left, -168, -1, colors, nodes, links, nextId);
  nodes.unshift({ id: rootId, name: text(root.name), x: 0, y: 0, color: colors[0], side: 0 });
  for (const child of [...rightBlock, ...leftBlock]) links.push({ source: rootId, target: child });

  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((width - 160) / spanX, (height - 80) / spanY);
  return {
    ...base(config, theme, colors, false),
    series: [
      {
        type: 'graph',
        layout: 'none',
        roam: true,
        zoom: 1,
        label: { color: theme.text, fontSize: 12 },
        lineStyle: { color: theme.muted, width: 1.2 },
        data: nodes.map((node) => ({
          name: node.id,
          value: node.name,
          x: width / 2 + (node.x - (minX + maxX) / 2) * scale,
          y: height / 2 + (node.y - (minY + maxY) / 2) * scale,
          symbol: 'circle',
          symbolSize: node.side === 0 ? 14 : 9,
          itemStyle: { color: node.color },
          label: {
            show: true,
            position: node.side < 0 ? 'left' : 'right',
            formatter: node.name,
            color: theme.text,
          },
        })),
        links,
      },
    ],
  };
}

function layoutMindmapForest(
  rows: Row[],
  x: number,
  side: 1 | -1,
  colors: string[],
  nodes: { id: string; name: string; x: number; y: number; color: string; side: number }[],
  links: { source: string; target: string }[],
  nextId: () => string,
): string[] {
  let cursor = 0;
  const ids: string[] = [];
  rows.forEach((row, index) => {
    const color = colors[index % colors.length];
    const id = layoutMindmapNode(row, x, cursor, side, color, nodes, links, nextId);
    ids.push(id);
    cursor += mindmapHeight(row);
  });
  const block = mindmapHeightOfRows(rows);
  const shift = block / 2;
  for (const node of nodes) {
    if (Math.sign(node.x) === side) node.y -= shift;
  }
  return ids;
}

function layoutMindmapNode(
  row: Row,
  x: number,
  yTop: number,
  side: 1 | -1,
  color: string,
  nodes: { id: string; name: string; x: number; y: number; color: string; side: number }[],
  links: { source: string; target: string }[],
  nextId: () => string,
): string {
  const id = nextId();
  const children = rowsOf(row.children);
  const height = mindmapHeight(row);
  nodes.push({ id, name: text(row.name || row.category || '未命名'), x, y: yTop + height / 2, color, side });
  let cursor = yTop;
  for (const child of children) {
    const childId = layoutMindmapNode(child, x + side * 148, cursor, side, color, nodes, links, nextId);
    links.push({ source: id, target: childId });
    cursor += mindmapHeight(child);
  }
  return id;
}

function mindmapHeight(row: Row): number {
  const children = rowsOf(row.children);
  if (!children.length) return 42;
  return children.reduce((sum, child) => sum + mindmapHeight(child), 0);
}

function mindmapHeightOfRows(rows: Row[]): number {
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => sum + mindmapHeight(row), 0);
}

function toEchartsTree(node: Row): Record<string, unknown> {
  const children = rowsOf(node.children).map(toEchartsTree);
  return { name: text(node.name || node.category || '未命名'), children: children.length ? children : undefined };
}

function treeChart(
  config: Record<string, unknown>,
  theme: ThemeTokens,
  colors: string[],
  orient: 'LR' | 'RL' | 'TB',
): Record<string, unknown> | null {
  const root = treeOf(config.data);
  if (!root || !text(root.name)) return null;
  const direction = orient;
  return {
    ...base(config, theme, colors, false),
    series: [
      {
        type: 'tree',
        data: [toEchartsTree(root)],
        top: text(config.title) ? 56 : 24,
        left: direction === 'TB' ? 40 : 90,
        bottom: direction === 'TB' ? 48 : 24,
        right: direction === 'TB' ? 40 : 120,
        orient: direction,
        roam: true,
        symbol: 'emptyCircle',
        symbolSize: 8,
        initialTreeDepth: 8,
        expandAndCollapse: true,
        itemStyle: { color: colors[0], borderColor: colors[0] },
        lineStyle: { color: theme.muted, width: 1.2 },
        label: {
          position: direction === 'TB' ? 'bottom' : direction === 'RL' ? 'left' : 'right',
          color: theme.text,
          fontSize: 12,
        },
        leaves: {
          label: { position: direction === 'TB' ? 'bottom' : direction === 'RL' ? 'left' : 'right' },
        },
      },
    ],
  };
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 100) / 100;
  return Math.abs(rounded) >= 1000 ? rounded.toLocaleString('zh-CN') : String(rounded);
}
