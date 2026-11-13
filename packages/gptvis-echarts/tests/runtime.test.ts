import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeChart {
  width: number;
  height: number;
  setOption: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  getWidth: () => number;
  getHeight: () => number;
  getOption: () => Record<string, unknown>;
  dispose: ReturnType<typeof vi.fn>;
}

const { chartInstances } = vi.hoisted(() => ({ chartInstances: [] as FakeChart[] }));

vi.mock('echarts', () => ({
  init: vi.fn(() => {
    const chart: FakeChart = {
      width: 0,
      height: 0,
      setOption: vi.fn(),
      resize: vi.fn((size: { width: number; height: number }) => {
        chart.width = size.width;
        chart.height = size.height;
      }),
      getWidth: () => chart.width,
      getHeight: () => chart.height,
      getOption: () => ({}),
      dispose: vi.fn(),
    };
    chartInstances.push(chart);
    return chart;
  }),
}));

import { GPTVis } from '../src/runtime';

class FakeElement {
  children: FakeElement[] = [];
  style: Record<string, string> = {};
  className = '';
  id = '';
  hidden = false;
  textContent = '';
  private html = '';
  clientWidth = 0;
  clientHeight = 0;

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children = [...nodes];
  }

  remove(): void {}

  getBoundingClientRect(): DOMRect {
    return {
      width: this.clientWidth,
      height: this.clientHeight,
      top: 0,
      left: 0,
      right: this.clientWidth,
      bottom: this.clientHeight,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  }

  set innerHTML(value: string) {
    this.html = value;
  }

  get innerHTML(): string {
    return this.html;
  }
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  private callback: () => void;
  private observed: FakeElement[] = [];

  constructor(callback: () => void) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(target: FakeElement): void {
    this.observed.push(target);
  }

  unobserve(): void {}

  disconnect(): void {
    this.observed = [];
  }

  trigger(): void {
    this.callback();
  }
}

const documentMock = {
  head: new FakeElement(),
  createElement: (_tag: string) => new FakeElement(),
  getElementById: (id: string) => documentMock.head.children.find((element) => element.id === id) ?? null,
  querySelector: () => null,
};

const columnSyntax = `vis column
data
  - category 甲
    value 4
  - category 乙
    value 7
`;

const flowSyntax = `vis flow-diagram
data
  - source 甲
    target 乙
  - source 乙
    target 丙
`;

const mindmapSyntax = `vis mindmap
data
  - name 根
    children
      - name 甲
      - name 乙
`;

const lrMindmapSyntax = `vis mindmap
direction LR
data
  - name 根
    children
      - name 甲
      - name 乙
`;

const forceNetworkSyntax = `vis network-graph
data
  nodes
    - name 甲
    - name 乙
  edges
    - source 甲
      target 乙
`;

function setup(): { vis: GPTVis; root: FakeElement } {
  const container = new FakeElement();
  const vis = new GPTVis({ container: container as unknown as HTMLElement });
  const root = (vis as unknown as { root: FakeElement }).root;
  root.clientWidth = 640;
  root.clientHeight = 360;
  return { vis, root };
}

function optionCoordinates(chart: FakeChart): unknown {
  const option = chart.setOption.mock.calls.at(-1)?.[0] as { series?: { data?: { x?: number; y?: number }[] }[] };
  return option.series?.[0]?.data?.map((node) => [node.x, node.y]);
}

beforeEach(() => {
  vi.useFakeTimers();
  chartInstances.length = 0;
  FakeResizeObserver.instances = [];
  documentMock.head = new FakeElement();
  (globalThis as Record<string, unknown>).document = documentMock;
  (globalThis as Record<string, unknown>).HTMLElement = FakeElement;
  (globalThis as Record<string, unknown>).ResizeObserver = FakeResizeObserver;
});

describe('runtime relayout', () => {
  it('only resizes a column chart on container size changes', () => {
    const { vis, root } = setup();
    vis.render(columnSyntax);
    const chart = chartInstances[0];
    expect(chart.setOption).toHaveBeenCalledTimes(1);

    chart.setOption.mockClear();
    chart.resize.mockClear();
    root.clientWidth = 520;
    FakeResizeObserver.instances[0].trigger();
    root.clientWidth = 480;
    vis.resize();

    expect(chart.resize).toHaveBeenCalledTimes(2);
    expect(chart.setOption).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(chart.setOption).not.toHaveBeenCalled();
  });

  it('debounces one flow-diagram rebuild after the size settles', () => {
    const { vis, root } = setup();
    vis.render(flowSyntax);
    const chart = chartInstances[0];
    const before = optionCoordinates(chart);
    chart.setOption.mockClear();

    root.clientWidth = 560;
    vis.resize();
    vi.advanceTimersByTime(60);
    root.clientWidth = 520;
    vis.resize();
    vi.advanceTimersByTime(60);
    root.clientWidth = 480;
    vis.resize();

    expect(chart.setOption).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);

    expect(chart.setOption).toHaveBeenCalledTimes(1);
    expect(optionCoordinates(chart)).not.toEqual(before);
  });

  it('rebuilds a default mind map but only resizes an LR tree', () => {
    const mindmap = setup();
    mindmap.vis.render(mindmapSyntax);
    const mindmapChart = chartInstances[0];
    mindmapChart.setOption.mockClear();
    mindmap.root.clientWidth = 520;
    mindmap.vis.resize();
    vi.advanceTimersByTime(150);
    expect(mindmapChart.setOption).toHaveBeenCalledTimes(1);

    chartInstances.length = 0;
    FakeResizeObserver.instances = [];
    const tree = setup();
    tree.vis.render(lrMindmapSyntax);
    const treeChart = chartInstances[0];
    treeChart.setOption.mockClear();
    tree.root.clientWidth = 520;
    tree.vis.resize();
    vi.advanceTimersByTime(150);
    expect(treeChart.setOption).not.toHaveBeenCalled();
  });

  it('only resizes a force network graph', () => {
    const { vis, root } = setup();
    vis.render(forceNetworkSyntax);
    const chart = chartInstances[0];
    chart.setOption.mockClear();
    root.clientWidth = 520;
    vis.resize();
    vi.advanceTimersByTime(150);
    expect(chart.resize).toHaveBeenCalled();
    expect(chart.setOption).not.toHaveBeenCalled();
  });

  it('cancels a pending rebuild when render or destroy runs', () => {
    const { vis, root } = setup();
    vis.render(flowSyntax);
    const chart = chartInstances[0];

    chart.setOption.mockClear();
    root.clientWidth = 520;
    vis.resize();
    vis.render(flowSyntax);
    expect(chart.setOption).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(chart.setOption).toHaveBeenCalledTimes(1);

    chart.setOption.mockClear();
    root.clientWidth = 480;
    vis.resize();
    vis.destroy();
    vi.advanceTimersByTime(500);
    expect(chart.setOption).not.toHaveBeenCalled();
  });
});
