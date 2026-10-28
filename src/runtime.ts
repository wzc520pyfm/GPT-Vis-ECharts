import * as echarts from 'echarts';
import { buildView, type ViewContext } from './build';
import type { ThemeName } from './theme';

export interface GPTVisOptions {
  container: string | HTMLElement;
  width?: number;
  height?: number;
  theme?: ThemeName;
  streaming?: boolean;
  onStatus?: (status: RenderStatus) => void;
}

export interface RenderStatus {
  state: 'pending' | 'ready' | 'unsupported' | 'error';
  message: string;
}

export class GPTVis {
  private root: HTMLElement;
  private chartHost: HTMLDivElement;
  private fallback: HTMLDivElement;
  private chart: echarts.ECharts | null = null;
  private observer: ResizeObserver | null = null;
  private options: GPTVisOptions;
  private lastInput: unknown;
  private lastOption: Record<string, unknown> | null = null;
  private lastSize = '';
  private layingOut = false;

  constructor(options: GPTVisOptions) {
    this.options = options;
    const container = resolveContainer(options.container);
    container.replaceChildren();
    this.root = document.createElement('div');
    this.root.className = 'gve-root';
    this.chartHost = document.createElement('div');
    this.chartHost.className = 'gve-chart';
    this.fallback = document.createElement('div');
    this.fallback.className = 'gve-fallback';
    this.fallback.hidden = true;
    this.root.append(this.chartHost, this.fallback);
    container.append(this.root);
    ensureStyles();
    this.observer = new ResizeObserver(() => {
      this.relayout();
    });
    this.observer.observe(this.root);
  }

  render(input: unknown): void {
    this.lastInput = input;
    const box = this.root.getBoundingClientRect();
    const context: ViewContext = {
      theme: this.options.theme,
      streaming: this.options.streaming,
      width: this.options.width || box.width || undefined,
      height: this.options.height || box.height || undefined,
    };
    let view;
    try {
      view = buildView(input, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : '图表渲染失败';
      this.showFallback(`<div class="gve-status"><p>${escape(message)}</p></div>`, 'transparent');
      this.options.onStatus?.({ state: 'error', message });
      return;
    }

    this.root.style.background = view.background;
    if (view.kind === 'echarts') {
      this.fallback.hidden = true;
      this.fallback.innerHTML = '';
      this.chartHost.hidden = false;
      if (!this.chart) this.chart = echarts.init(this.chartHost, undefined, { renderer: 'canvas' });
      this.lastOption = view.option;
      this.fitChart();
      this.chart.setOption(view.option, { notMerge: true, lazyUpdate: false });
      this.relayout();
      this.options.onStatus?.({ state: 'ready', message: view.message });
      return;
    }

    this.chart?.dispose();
    this.chart = null;
    this.lastOption = null;
    this.showFallback(view.html, view.background);
    const state = view.kind === 'pending' ? 'pending' : view.kind === 'error' ? 'unsupported' : 'ready';
    this.options.onStatus?.({ state, message: view.message });
  }

  resize(): void {
    this.relayout();
  }

  private fitChart(): void {
    if (!this.chart) return;
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    if (width < 2 || height < 2) return;
    if (this.chart.getWidth() === width && this.chart.getHeight() === height) return;
    this.chart.resize({ width, height });
  }

  private relayout(): void {
    if (this.layingOut || !this.chart || !this.lastOption) return;
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    if (width < 2 || height < 2) return;
    const size = `${width}x${height}`;
    const mismatched = this.chart.getWidth() !== width || this.chart.getHeight() !== height;
    this.layingOut = true;
    try {
      if (mismatched) this.chart.resize({ width, height });
      if (size === this.lastSize && !mismatched) return;
      this.lastSize = size;
      const option = this.lastOption;
      requestAnimationFrame(() => {
        if (!this.chart || this.lastOption !== option) return;
        const nextWidth = this.root.clientWidth;
        const nextHeight = this.root.clientHeight;
        if (nextWidth < 2 || nextHeight < 2) return;
        this.chart.resize({ width: nextWidth, height: nextHeight });
        this.chart.setOption(option, { notMerge: true, lazyUpdate: false });
      });
    } finally {
      this.layingOut = false;
    }
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.chart?.dispose();
    this.chart = null;
    this.root.remove();
  }

  private showFallback(html: string, background: string): void {
    this.chartHost.hidden = true;
    this.fallback.hidden = false;
    this.fallback.style.background = background;
    this.fallback.innerHTML = html;
  }
}

function resolveContainer(container: string | HTMLElement): HTMLElement {
  if (typeof container !== 'string') return container;
  const element = document.querySelector(container);
  if (!(element instanceof HTMLElement)) throw new Error(`找不到容器：${container}`);
  return element;
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

const STYLE_ID = 'gve-styles';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.append(style);
}

const STYLES = `
.gve-root, .gve-chart, .gve-fallback { width: 100%; height: 100%; min-height: 280px; }
.gve-root { position: relative; overflow: hidden; }
.gve-fallback { overflow: auto; }
.gve-fallback h3, .gve-summary h3, .gve-table h3, .gve-cloud h3, .gve-venn h3, .gve-svgchart h3, .gve-liquid h3 {
  margin: 0; padding: 16px 18px 0; font-size: 16px; font-weight: 600; letter-spacing: 0;
}
.gve-status { min-height: 280px; display: grid; place-items: center; align-content: center; gap: 6px; padding: 28px; text-align: center; }
.gve-status p { margin: 0; font-size: 16px; }
.gve-status span { color: inherit; opacity: 0.72; font-size: 13px; }
.gve-table, .gve-summary, .gve-cloud, .gve-venn, .gve-svgchart, .gve-liquid { color: var(--ink); min-height: 100%; }
.gve-table-scroll { overflow: auto; padding: 12px 16px 18px; }
.gve-table table { width: 100%; border-collapse: collapse; font-size: 14px; }
.gve-table th, .gve-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.gve-table th { color: var(--muted); font-weight: 600; font-size: 12px; letter-spacing: 0.04em; }
.gve-table tbody tr:hover td { background: color-mix(in srgb, var(--line) 55%, transparent); }
.gve-summary { padding: 8px 20px 22px; line-height: 1.65; }
.gve-summary p, .gve-summary ul { margin: 10px 0; }
.gve-summary h3, .gve-summary h4, .gve-summary h5 { padding-left: 0; padding-right: 0; }
.gve-summary code { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 0.92em; }
.gve-chip { display: inline-block; margin: 0 2px; padding: 0 6px; border-radius: 999px; background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); font-weight: 600; }
.gve-chip.delta { background: color-mix(in srgb, #2f7d4a 16%, transparent); color: #2f7d4a; }
.gve-cloud-words { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px 16px; padding: 28px 22px 36px; }
.gve-cloud-words span { line-height: 1; font-weight: 600; }
.gve-liquid { display: grid; justify-items: center; align-content: center; gap: 18px; min-height: 100%; padding: 24px; }
.gve-liquid h3 { padding: 0; }
.gve-liquid-disc {
  width: min(220px, 70%); aspect-ratio: 1; border-radius: 50%; position: relative; overflow: hidden;
  background: var(--track); box-shadow: inset 0 0 0 1px var(--track);
}
.gve-liquid-level { position: absolute; left: 0; right: 0; bottom: 0; background: var(--fill); opacity: 0.9; }
.gve-liquid-disc strong {
  position: absolute; inset: 0; display: grid; place-items: center; font-size: 42px; color: var(--ink); font-weight: 600;
}
.gve-venn svg, .gve-svgchart svg { width: 100%; height: auto; display: block; }
.gve-venn text, .gve-svgchart text { fill: var(--ink); font-size: 13px; font-family: "IBM Plex Sans", sans-serif; }
.gve-venn-name, .gve-bone { font-weight: 600; }
.gve-head { font-size: 13px; font-weight: 600; }
`;
