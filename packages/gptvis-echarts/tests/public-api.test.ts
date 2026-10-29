import { describe, expect, it } from 'vitest';
import * as api from '../src/index';

const CONSTRUCTORS = [
  'GPTVis',
  'bindGPTVis',
  'parse',
  'isVisSyntax',
  'Area',
  'Bar',
  'Boxplot',
  'Column',
  'DualAxes',
  'FishboneDiagram',
  'FlowDiagram',
  'Funnel',
  'Histogram',
  'IndentedTree',
  'Line',
  'Liquid',
  'Mindmap',
  'NetworkGraph',
  'OrganizationChart',
  'Pie',
  'Radar',
  'Sankey',
  'Scatter',
  'Summary',
  'Table',
  'Treemap',
  'Venn',
  'Violin',
  'Waterfall',
  'WordCloud',
];

describe('GPT-Vis entry', () => {
  it('keeps React out of the main entry and exports the same constructors', () => {
    const surface = api as unknown as Record<string, unknown>;
    for (const name of CONSTRUCTORS) expect(typeof surface[name]).toBe('function');
    expect(api.CHARTS).toHaveLength(26);
    expect('GPTVisChart' in surface).toBe(false);
  });
});
