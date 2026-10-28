const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** A small markdown subset for summary blocks. Raw HTML from the model is escaped. */
export function renderSummary(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let list: string[] | null = null;

  const flushList = () => {
    if (!list) return;
    html.push(`<ul>${list.join('')}</ul>`);
    list = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    const item = trimmed.match(/^[-*]\s+(.*)$/);
    if (item) {
      list ??= [];
      list.push(`<li>${inline(item[1])}</li>`);
      continue;
    }
    flushList();
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length + 2;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    html.push(`<p>${inline(trimmed)}</p>`);
  }
  flushList();
  return html.join('');
}

const ENTITIES = new Set([
  'metric_name',
  'metric_value',
  'other_metric_value',
  'delta_value',
  'ratio_value',
  'contribute_ratio',
  'proportion',
  'trend_desc',
  'dim_value',
  'time_desc',
  'rank',
  'difference',
  'anomaly',
  'association',
  'distribution',
  'seasonality',
]);

function inline(source: string): string {
  const pieces: string[] = [];
  const pattern = /\[([^\]\n]+)\]\(([a-z_]+)((?:\s*,\s*[^)]*)?)\)/g;
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    pieces.push(formatInline(source.slice(cursor, index)));
    pieces.push(ENTITIES.has(match[2]) ? entityChip(match[1], match[2], match[3] ?? '') : formatInline(match[0]));
    cursor = index + match[0].length;
  }
  pieces.push(formatInline(source.slice(cursor)));
  return pieces.join('');
}

function formatInline(source: string): string {
  return escapeHtml(source)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function entityChip(label: string, type: string, rawAttrs: string): string {
  const attrs = readAttrs(rawAttrs);
  const assessment = attrs.assessment || attrs.status || '';
  const tone = chipTone(type, assessment, label);
  const spark = sparkline(attrs.detail);
  return `<span class="gve-chip ${tone}" data-entity="${type}">${escapeHtml(label)}${spark}</span>`;
}

function readAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([A-Za-z_]+)\s*=\s*("([^"]*)"|'([^']*)'|(\[[^\]]*\]|\{[^}]*\}|[^\s,]+))/g;
  for (const match of source.matchAll(pattern)) {
    attrs[match[1]] = match[3] ?? match[4] ?? match[5] ?? '';
  }
  return attrs;
}

function chipTone(type: string, assessment: string, label: string): string {
  const value = assessment.toLowerCase();
  if (value === 'positive' || value === 'increase' || value === 'up') return 'pos';
  if (value === 'negative' || value === 'decrease' || value === 'down') return 'neg';
  if (value === 'equal' || value === 'flat') return 'eq';
  if (type === 'delta_value' || type === 'ratio_value' || type === 'contribute_ratio') {
    if (label.trim().startsWith('-')) return 'neg';
    if (label.trim().startsWith('+')) return 'pos';
  }
  if (type === 'metric_name' || type === 'dim_value' || type === 'time_desc' || type === 'other_metric_value') return 'meta';
  return 'value';
}

function sparkline(detail: string | undefined): string {
  if (!detail) return '';
  const values = [...detail.matchAll(/-?\d+(?:\.\d+)?/g)].map((item) => Number(item[0])).filter((item) => Number.isFinite(item));
  if (values.length < 2 || values.length > 48) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 52;
  const height = 16;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * (width - 2) + 1;
      const y = height - 2 - ((value - min) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return `<svg class="gve-spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
