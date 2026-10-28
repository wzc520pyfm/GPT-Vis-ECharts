import { chartLabel } from './catalog';
import type { ThemeTokens } from './theme';
import { escapeHtml, renderSummary } from './text';

export interface Row {
  [key: string]: unknown;
}

export function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function text(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

export function rowsOf(data: unknown): Row[] {
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
}

export function treeOf(data: unknown): Row | null {
  if (Array.isArray(data)) {
    const nodes = rowsOf(data);
    if (nodes.length === 1) return nodes[0];
    if (nodes.length > 1) return { name: '全部', children: nodes };
    return null;
  }
  if (data && typeof data === 'object') {
    const node = data as Row;
    if (node.name != null || node.children != null) return node;
  }
  return null;
}

export function setsOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item).trim()).filter(Boolean);
  return text(value)
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPercent(value: number): string {
  const percent = value > 1 && value <= 100 ? value / 100 : value;
  const clamped = Math.max(0, Math.min(1, percent));
  return `${Math.round(clamped * 1000) / 10}%`.replace(/\.0%$/, '%');
}

function percentNumber(value: unknown): number | null {
  const parsed = num(value);
  if (parsed == null) return null;
  const ratio = parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
  return Math.max(0, Math.min(1, ratio));
}

export function renderLiquid(config: Record<string, unknown>, theme: ThemeTokens): string | null {
  const ratio = percentNumber(config.percent);
  if (ratio == null) return null;
  const title = text(config.title);
  const fill = theme.palette[0];
  return `
    <div class="gve-liquid">
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
      <div class="gve-liquid-disc" style="--fill:${fill};--ink:${theme.text};--track:${theme.grid}">
        <div class="gve-liquid-level" style="height:${ratio * 100}%"></div>
        <strong>${formatPercent(ratio)}</strong>
      </div>
    </div>`;
}

export function renderTable(config: Record<string, unknown>, theme: ThemeTokens): string | null {
  const rows = rowsOf(config.data);
  if (!rows.length) return null;
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  const title = text(config.title);
  const head = columns.map((key) => `<th>${escapeHtml(key)}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns
        .map((key) => `<td>${row[key] == null || row[key] === '' ? '—' : escapeHtml(text(row[key]))}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `
    <div class="gve-table" style="--ink:${theme.text};--muted:${theme.muted};--line:${theme.grid};--bg:${theme.background}">
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
      <div class="gve-table-scroll">
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
}

export function renderSummaryView(config: Record<string, unknown>, theme: ThemeTokens): string | null {
  const body = text(config.content || config.text || '');
  const title = text(config.title);
  if (!body.trim() && !title) return null;
  return `
    <article class="gve-summary" style="--ink:${theme.text};--muted:${theme.muted};--accent:${theme.palette[0]};--bg:${theme.background}">
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
      ${renderSummary(body)}
    </article>`;
}

export function renderWordCloud(config: Record<string, unknown>, theme: ThemeTokens): string | null {
  const words = rowsOf(config.data)
    .map((row) => ({ text: text(row.text || row.name || row.word), value: num(row.value) ?? 0 }))
    .filter((word) => word.text);
  if (!words.length) return null;
  const max = Math.max(...words.map((word) => word.value), 1);
  const title = text(config.title);
  const spans = words
    .map((word, index) => {
      const size = 14 + Math.round((Math.max(word.value, 0) / max) * 42);
      const color = theme.palette[index % theme.palette.length];
      return `<span style="font-size:${size}px;color:${color}">${escapeHtml(word.text)}</span>`;
    })
    .join('');
  return `
    <div class="gve-cloud" style="--ink:${theme.text}">
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
      <div class="gve-cloud-words">${spans}</div>
    </div>`;
}

export function renderVenn(config: Record<string, unknown>, theme: ThemeTokens): string | null {
  const items = rowsOf(config.data)
    .map((row) => ({ sets: setsOf(row.sets ?? row.name), value: num(row.value) ?? 0, label: text(row.label) }))
    .filter((item) => item.sets.length);
  if (!items.length) return null;
  const names: string[] = [];
  for (const item of items) {
    for (const set of item.sets) if (!names.includes(set)) names.push(set);
  }
  if (names.length < 2 || names.length > 3) return null;
  const find = (...sets: string[]) =>
    items.find((item) => item.sets.length === sets.length && sets.every((set) => item.sets.includes(set)));
  const title = text(config.title);
  const [a, b, c] = names;
  const colors = theme.palette;
  const label = (sets: string[], x: number, y: number) => {
    const item = find(...sets);
    if (!item) return '';
    return `<text x="${x}" y="${y}" text-anchor="middle">${escapeHtml(item.label || String(item.value))}</text>`;
  };
  const circles =
    names.length === 2
      ? `
        <circle cx="250" cy="210" r="120" fill="${colors[0]}" fill-opacity="0.38" stroke="${colors[0]}"/>
        <circle cx="390" cy="210" r="120" fill="${colors[1]}" fill-opacity="0.38" stroke="${colors[1]}"/>
        <text class="gve-venn-name" x="180" y="78">${escapeHtml(a)}</text>
        <text class="gve-venn-name" x="460" y="78">${escapeHtml(b)}</text>
        ${label([a], 190, 214)}
        ${label([a, b], 320, 214)}
        ${label([b], 450, 214)}`
      : `
        <circle cx="300" cy="180" r="110" fill="${colors[0]}" fill-opacity="0.35" stroke="${colors[0]}"/>
        <circle cx="230" cy="290" r="110" fill="${colors[1]}" fill-opacity="0.35" stroke="${colors[1]}"/>
        <circle cx="370" cy="290" r="110" fill="${colors[2]}" fill-opacity="0.35" stroke="${colors[2]}"/>
        <text class="gve-venn-name" x="300" y="52">${escapeHtml(a)}</text>
        <text class="gve-venn-name" x="120" y="400">${escapeHtml(b)}</text>
        <text class="gve-venn-name" x="480" y="400">${escapeHtml(c)}</text>
        ${label([a], 300, 160)}
        ${label([b], 190, 310)}
        ${label([c], 410, 310)}
        ${label([a, b], 230, 230)}
        ${label([a, c], 370, 230)}
        ${label([b, c], 300, 320)}
        ${label([a, b, c], 300, 250)}`;
  return `
    <div class="gve-venn" style="--ink:${theme.text};--muted:${theme.muted}">
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
      <svg viewBox="0 0 640 440" role="img" aria-label="${escapeHtml(title || '韦恩图')}">${circles}</svg>
    </div>`;
}

export function renderViolin(config: Record<string, unknown>, theme: ThemeTokens): string | null {
  const grouped = new Map<string, number[]>();
  for (const row of rowsOf(config.data)) {
    const category = text(row.category || row.name || '未分组');
    const value = num(row.value);
    if (value == null) continue;
    const bucket = grouped.get(category) ?? [];
    bucket.push(value);
    grouped.set(category, bucket);
  }
  if (!grouped.size) return null;
  const all = [...grouped.values()].flat();
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const bins = 16;
  const width = 760;
  const height = 420;
  const pad = { left: 56, right: 20, top: text(config.title) ? 56 : 28, bottom: 46 };
  const slot = (width - pad.left - pad.right) / grouped.size;
  const yOf = (value: number) => pad.top + ((max - value) / span) * (height - pad.top - pad.bottom);
  const paths: string[] = [];
  let index = 0;
  for (const [category, values] of grouped) {
    const counts = Array.from({ length: bins }, () => 0);
    for (const value of values) {
      const bin = Math.max(0, Math.min(bins - 1, Math.floor(((value - min) / span) * (bins - 1))));
      counts[bin] += 1;
    }
    const smooth = counts.map((count, bin) => ((counts[bin - 1] ?? count) + count * 2 + (counts[bin + 1] ?? count)) / 4);
    const peak = Math.max(...smooth, 1);
    const center = pad.left + slot * index + slot / 2;
    const half = slot * 0.36;
    const points = smooth.map((count, bin) => {
      const value = min + ((bin + 0.5) / bins) * span;
      return { x: (count / peak) * half, y: yOf(value) };
    });
    const forward = points.map((point) => `${center + point.x},${point.y}`).join(' ');
    const back = [...points].reverse().map((point) => `${center - point.x},${point.y}`).join(' ');
    const color = theme.palette[index % theme.palette.length];
    paths.push(
      `<polygon points="${forward} ${back}" fill="${color}" fill-opacity="0.78" stroke="${color}"/>`,
      `<text x="${center}" y="${height - 18}" text-anchor="middle">${escapeHtml(category)}</text>`,
    );
    index += 1;
  }
  const ticks = [max, min + span / 2, min].map((value) => {
    const y = yOf(value);
    const label = Math.round(value * 100) / 100;
    return `<text x="8" y="${y + 4}">${label}</text><line x1="48" x2="${width - 12}" y1="${y}" y2="${y}" stroke="${theme.grid}"/>`;
  });
  const title = text(config.title);
  return `
    <div class="gve-svgchart" style="--ink:${theme.text};--muted:${theme.muted}">
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title || '小提琴图')}">${ticks.join('')}${paths.join('')}</svg>
    </div>`;
}

export function renderFishbone(config: Record<string, unknown>, theme: ThemeTokens): string | null {
  const root = treeOf(config.data);
  if (!root) return null;
  const causes = rowsOf(root.children).slice(0, 8);
  if (!causes.length && !text(root.name)) return null;
  const width = 860;
  const height = 460;
  const spineY = 230;
  const headX = 760;
  const tailX = 48;
  const color = theme.palette[0];
  const ribs = causes.map((cause, index) => {
    const upward = index % 2 === 0;
    const x = tailX + 70 + index * 78;
    const y = upward ? 78 : 382;
    const kids = rowsOf(cause.children)
      .slice(0, 4)
      .map((child, childIndex) => {
        const along = 0.28 + childIndex * 0.16;
        const cx = x + (headX - 80 - x) * along * 0.15 + (upward ? -8 : 8);
        const cy = spineY + (y - spineY) * along;
        return `<text x="${cx}" y="${cy}" text-anchor="${upward ? 'end' : 'start'}">${escapeHtml(text(child.name))}</text>`;
      })
      .join('');
    return `
      <line x1="${x}" y1="${spineY}" x2="${x + 36}" y2="${y}" stroke="${theme.palette[(index + 1) % theme.palette.length]}" stroke-width="2"/>
      <text class="gve-bone" x="${x + 42}" y="${y + (upward ? -8 : 16)}" text-anchor="start">${escapeHtml(text(cause.name))}</text>
      ${kids}`;
  });
  const title = text(config.title);
  return `
    <div class="gve-svgchart" style="--ink:${theme.text};--muted:${theme.muted}">
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title || '鱼骨图')}">
        <line x1="${tailX}" y1="${spineY}" x2="${headX - 20}" y2="${spineY}" stroke="${color}" stroke-width="3"/>
        ${ribs.join('')}
        <rect x="${headX - 16}" y="${spineY - 28}" width="84" height="56" rx="28" fill="${color}"/>
        <text class="gve-head" x="${headX + 26}" y="${spineY + 5}" text-anchor="middle" fill="#fbf9f6">${escapeHtml(text(root.name) || '结果')}</text>
      </svg>
    </div>`;
}

export function renderPending(message: string): string {
  return `<div class="gve-status"><p>${escapeHtml(message)}</p></div>`;
}

export function renderUnsupported(type: string): string {
  const label = chartLabel(type);
  return `<div class="gve-status"><p>还不能画「${escapeHtml(label)}」。</p><span>类型标识是 ${escapeHtml(type)}。换一种已支持的 vis 类型，或补全它需要的数据字段。</span></div>`;
}
