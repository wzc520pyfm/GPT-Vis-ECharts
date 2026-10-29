import { GPTVis, type GPTVisOptions } from './runtime.js';

export { CHARTS, chartLabel } from './catalog.js';
export { buildView } from './build.js';
export { isVisSyntax, parse, readConfig } from './parser.js';
export type { ParsedConfig, ParseOptions } from './parser.js';
export { GPTVis };
export type { GPTVisOptions, RenderStatus } from './runtime.js';
export type { GPTVisOptions as VisualizationOptions } from './runtime.js';
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
} from './charts.js';
export type { ChartHandle } from './charts.js';
export { resolveTheme } from './theme.js';
export type { ThemeName, ThemeName as VisualizationTheme } from './theme.js';

/**
 * Framework-agnostic handle for Vue, Svelte, or plain DOM.
 * Create it in onMounted, call update when the syntax changes, destroy in onUnmounted.
 */
export function bindGPTVis(container: string | HTMLElement, options?: Omit<GPTVisOptions, 'container'>) {
  const vis = new GPTVis({ container, ...options });
  return {
    update(content: string | Record<string, unknown>) {
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
