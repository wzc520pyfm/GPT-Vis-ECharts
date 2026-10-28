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

function inline(source: string): string {
  let html = escapeHtml(source);
  html = html.replace(/\[([^\]]+)\]\((metric_value|delta_value)(?:[^)]*)\)/g, (_match, label: string, kind: string) => {
    const tone = kind === 'delta_value' ? 'gve-chip delta' : 'gve-chip';
    return `<span class="${tone}">${label}</span>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  return html;
}
