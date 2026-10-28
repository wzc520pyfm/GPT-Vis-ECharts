/**
 * Parser for the GPT-Vis markdown-like grammar.
 *
 * The grammar is the public vis syntax (vis <type>, key/value lines,
 * dash lists, nested children/data, and a style object). This file is an
 * independent implementation so existing chart skills can target ECharts
 * without learning a second language.
 */

export interface ParsedConfig {
  type: string;
  [key: string]: unknown;
}

const ARRAY_SECTIONS = new Set(['data', 'categories', 'series', 'children', 'nodes', 'edges']);
const OBJECT_SECTIONS = new Set(['style']);

export function isVisSyntax(input: unknown): input is string {
  return typeof input === 'string' && input.trim().startsWith('vis ');
}

function isPartialVisStart(trimmed: string): boolean {
  return trimmed === 'vis' || 'vis '.startsWith(trimmed);
}

export interface ParseOptions {
  /** Drop a trailing partial line so token streams can render before the newline. */
  streaming?: boolean;
}

export function parse(syntax: string, options: ParseOptions = {}): ParsedConfig {
  const source = unwrapFence(syntax);
  const lines = tokenize(source, Boolean(options.streaming));
  const result: ParsedConfig = { type: '' };
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.indent === 0 && line.text.startsWith('vis ')) {
      result.type = line.text.slice(4).trim();
      index += 1;
      continue;
    }

    if (line.indent === 0 && isSectionName(line.text)) {
      if (ARRAY_SECTIONS.has(line.text)) {
        const parsed = readArrayLike(lines, index);
        if (parsed.value !== undefined) result[line.text] = parsed.value;
        index = parsed.next;
        continue;
      }
      const parsed = readStyle(lines, index);
      result[line.text] = parsed.value;
      index = parsed.next;
      continue;
    }

    if (line.indent === 0) {
      const pair = parseKeyValue(line.text);
      if (pair) result[pair.key] = parseValue(pair.value);
    }
    index += 1;
  }

  return result;
}

/** Accept a vis string, a JSON string, or a config object. Incomplete JSON yields an empty type. */
export function readConfig(input: unknown, options: ParseOptions = {}): ParsedConfig {
  if (typeof input !== 'string') {
    if (input && typeof input === 'object') {
      const record = input as Record<string, unknown>;
      return { type: typeof record.type === 'string' ? record.type : '', ...record };
    }
    return { type: '' };
  }

  const trimmed = unwrapFence(input).trim();
  if (!trimmed) return { type: '' };
  if (options.streaming && isPartialVisStart(trimmed)) return { type: '' };
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed) as unknown;
      return readConfig(json, options);
    } catch {
      return { type: '' };
    }
  }
  if (!isVisSyntax(trimmed)) {
    return { type: 'summary', content: input };
  }
  return parse(trimmed, options);
}

function unwrapFence(syntax: string): string {
  const trimmed = syntax.trim();
  const fenced = trimmed.match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
  return fenced ? fenced[1] : syntax;
}

interface Line {
  text: string;
  indent: number;
}

function tokenize(syntax: string, streaming: boolean): Line[] {
  const normalized = syntax.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const raw = normalized.split('\n');
  if (streaming && raw.length > 0 && !normalized.endsWith('\n')) raw.pop();

  const lines: Line[] = [];
  for (const row of raw) {
    const text = row.trim();
    if (!text || text === '```') continue;
    lines.push({ text, indent: indentOf(row) });
  }
  return lines;
}

function indentOf(row: string): number {
  let width = 0;
  for (const char of row) {
    if (char === ' ') width += 1;
    else if (char === '\t') width += 2;
    else break;
  }
  return width;
}

function isSectionName(text: string): boolean {
  return /^[A-Za-z_][\w-]*$/.test(text) && (ARRAY_SECTIONS.has(text) || OBJECT_SECTIONS.has(text));
}

function isBullet(text: string): boolean {
  return text.startsWith('-');
}

function bulletBody(text: string): string {
  return text.replace(/^-\s*/, '');
}

function isQuoted(value: string): boolean {
  if (value.length < 2) return false;
  const quote = value[0];
  return (quote === '"' || quote === "'") && value.endsWith(quote) && value.indexOf(quote, 1) === value.length - 1;
}

function parseValue(raw: string): unknown {
  const value = raw.trim();
  if (!value) return '';
  if (isQuoted(value)) return value.slice(1, -1);
  if (value === 'true') return true;
  if (value === 'false') return false;
  const numeric = Number(value);
  if (value !== '' && Number.isFinite(numeric)) return numeric;
  return value;
}

function parseKeyValue(raw: string): { key: string; value: string } | null {
  const text = raw.trim();
  if (!text) return null;
  const assigned = text.match(/^([^:\s=]+)\s*[:=]\s*(.*)$/);
  if (assigned) return { key: assigned[1], value: assigned[2] };
  const spaced = text.match(/^(\S+)\s+(.*)$/);
  if (spaced) return { key: spaced[1], value: spaced[2] };
  return { key: text, value: '' };
}

function isScalarItem(body: string): boolean {
  if (isQuoted(body.trim())) return true;
  const pair = parseKeyValue(body);
  return !pair || pair.value === '';
}

function readArrayLike(lines: Line[], header: number): { value: unknown; next: number } {
  const base = lines[header].indent;
  const next = lines[header + 1];
  if (!next || next.indent <= base) return { value: undefined, next: header + 1 };

  if (!isBullet(next.text) && /^[A-Za-z_][\w-]*$/.test(next.text)) {
    return readNamedBlocks(lines, header + 1, base);
  }

  if (!isBullet(next.text)) {
    return readTree(lines, header + 1, base);
  }

  const list = readList(lines, header + 1, base);
  return { value: list.items.length ? list.items : undefined, next: list.next };
}

function readNamedBlocks(lines: Line[], start: number, base: number): { value: Record<string, unknown>; next: number } {
  const value: Record<string, unknown> = {};
  let index = start;
  while (index < lines.length && lines[index].indent > base) {
    const line = lines[index];
    if (/^[A-Za-z_][\w-]*$/.test(line.text) && !isBullet(line.text)) {
      const list = readList(lines, index + 1, line.indent);
      value[line.text] = list.items;
      index = list.next;
      continue;
    }
    index += 1;
  }
  return { value, next: index };
}

function readTree(lines: Line[], start: number, base: number): { value: Record<string, unknown>; next: number } {
  const node: Record<string, unknown> = {};
  let index = start;
  while (index < lines.length && lines[index].indent > base) {
    const line = lines[index];
    const pair = parseKeyValue(line.text);
    if (pair && (pair.key === 'children' || pair.key === 'data') && pair.value === '') {
      const list = readList(lines, index + 1, line.indent);
      node[pair.key] = list.items;
      index = list.next;
      continue;
    }
    if (pair) node[pair.key] = parseValue(pair.value);
    index += 1;
  }
  return { value: node, next: index };
}

function readList(lines: Line[], start: number, base: number): { items: unknown[]; next: number } {
  const items: unknown[] = [];
  let current: Record<string, unknown> | null = null;
  let scalars = false;
  let itemIndent = -1;
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    if (line.indent <= base && !isBullet(line.text)) break;
    if (isBullet(line.text) && line.indent < base) break;

    const sameLevel = isBullet(line.text) && (itemIndent === -1 || line.indent === itemIndent);
    if (sameLevel) {
      if (itemIndent === -1) itemIndent = line.indent;
      if (current && !scalars) items.push(current);
      const body = bulletBody(line.text);
      if (!body) {
        current = {};
        scalars = false;
      } else if (isScalarItem(body)) {
        scalars = true;
        current = null;
        items.push(parseValue(body));
      } else {
        scalars = false;
        current = {};
        const pair = parseKeyValue(body);
        if (pair) current[pair.key] = parseValue(pair.value);
      }
      index += 1;
      continue;
    }

    if (isBullet(line.text) && itemIndent !== -1 && line.indent !== itemIndent && current && !scalars) {
      items.push(current);
      current = {};
      const pair = parseKeyValue(bulletBody(line.text));
      if (pair) current[pair.key] = parseValue(pair.value);
      itemIndent = line.indent;
      index += 1;
      continue;
    }

    if (current && !scalars) {
      const pair = parseKeyValue(line.text);
      if (pair && (pair.key === 'children' || pair.key === 'data') && pair.value === '') {
        const nested = readList(lines, index + 1, line.indent);
        current[pair.key] = nested.items;
        index = nested.next;
        continue;
      }
      if (pair) current[pair.key] = parseValue(pair.value);
    }
    index += 1;
  }

  if (current && !scalars) items.push(current);
  return { items, next: index };
}

function readStyle(lines: Line[], header: number): { value: Record<string, unknown>; next: number } {
  const value: Record<string, unknown> = {};
  const base = lines[header].indent;
  let index = header + 1;
  while (index < lines.length && lines[index].indent > base) {
    const line = lines[index];
    if (isBullet(line.text)) {
      index += 1;
      continue;
    }
    const pair = parseKeyValue(line.text);
    if (!pair) {
      index += 1;
      continue;
    }
    const upcoming = lines[index + 1];
    if (pair.value === '' && upcoming && upcoming.indent > line.indent && isBullet(upcoming.text)) {
      const list = readList(lines, index + 1, line.indent);
      value[pair.key] = list.items;
      index = list.next;
      continue;
    }
    value[pair.key] = parseValue(pair.value);
    index += 1;
  }
  return { value, next: index };
}
