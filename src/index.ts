import { GPTVis, type GPTVisOptions } from './runtime';

export { CHARTS, chartLabel } from './catalog';
export { buildView } from './build';
export { isVisSyntax, parse, readConfig } from './parser';
export type { ParsedConfig, ParseOptions } from './parser';
export { GPTVisChart } from './react';
export type { GPTVisChartProps } from './react';
export { GPTVis };
export type { GPTVisOptions, RenderStatus } from './runtime';
export {
  Area,
  Bar,
  Boxplot,
  Column,
  DualAxes,
  FishboneDiagram,
  FlowDiagram,
  Funnel,
  Histogram,
  IndentedTree,
  Line,
  Liquid,
  Mindmap,
  NetworkGraph,
  OrganizationChart,
  Pie,
  Radar,
  Sankey,
  Scatter,
  Summary,
  Table,
  Treemap,
  Venn,
  Violin,
  Waterfall,
  WordCloud,
} from './charts';
export type { ChartHandle } from './charts';
export { resolveTheme } from './theme';
export type { ThemeName } from './theme';

/**
 * Framework-agnostic handle for Vue, Svelte, or plain DOM.
 * Create it in onMounted, call update when the syntax changes, destroy in onUnmounted.
 */
export function bindGPTVis(container: string | HTMLElement, options?: Omit<GPTVisOptions, 'container'>) {
  const vis = new GPTVis({ container, ...options });
  return {
    update(content: unknown) {
      vis.render(content);
    },
    resize() {
      vis.resize();
    },
    destroy() {
      vis.destroy();
    },
  };
}
