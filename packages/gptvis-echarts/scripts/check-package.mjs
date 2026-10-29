import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'dist/index.js');
const reactEntry = join(root, 'dist/react.js');

const seen = new Set();
function walk(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = match[1];
    if (spec === 'react' || spec.startsWith('react/')) {
      throw new Error(`${file} imports ${spec}. The main entry must load without React.`);
    }
    if (spec.startsWith('.')) walk(join(dirname(file), spec));
  }
}

walk(entry);
const reactText = readFileSync(reactEntry, 'utf8');
if (!reactText.includes("from 'react'") && !reactText.includes('from "react"')) {
  throw new Error('dist/react.js does not import react');
}

const api = await import(pathToFileURL(entry).href);
const functions = [
  'GPTVis',
  'bindGPTVis',
  'parse',
  'isVisSyntax',
  'readConfig',
  'buildView',
  'resolveTheme',
  'chartLabel',
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
const missing = functions.filter((name) => typeof api[name] !== 'function');
if (missing.length) throw new Error(`missing exports: ${missing.join(', ')}`);
if (!Array.isArray(api.CHARTS) || api.CHARTS.length !== 26) {
  throw new Error(`expected 26 charts, got ${api.CHARTS?.length}`);
}
if (!api.isVisSyntax('vis line\n')) throw new Error('isVisSyntax rejected a vis block');
const parsed = api.parse('vis pie\ndata\n  - category 甲\n    value 1\n');
if (parsed.type !== 'pie' || parsed.data?.[0]?.value !== 1) {
  throw new Error(`parse failed: ${JSON.stringify(parsed)}`);
}
if ('GPTVisChart' in api) throw new Error('GPTVisChart leaked into the main entry');

console.log(`package entry ok (${seen.size} modules, no react)`);
