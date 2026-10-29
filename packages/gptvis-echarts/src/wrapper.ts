export interface WrapperLabels {
  chart: string;
  code: string;
  download: string;
  copy: string;
  copied: string;
  zoomIn: string;
  zoomOut: string;
}

const LABELS: Record<string, WrapperLabels> = {
  'zh-CN': { chart: '图表', code: '代码', download: '下载', copy: '复制', copied: '已复制', zoomIn: '放大', zoomOut: '缩小' },
  'en-US': { chart: 'Chart', code: 'Code', download: 'Download', copy: 'Copy', copied: 'Copied', zoomIn: 'Zoom in', zoomOut: 'Zoom out' },
};

export function wrapperLabels(locale: string | undefined): WrapperLabels {
  if (locale === 'zh-CN' || locale?.toLowerCase().startsWith('zh')) return LABELS['zh-CN'];
  return LABELS['en-US'];
}

export interface VisShell {
  chartSlot: HTMLElement;
  setSource(source: string): void;
  setZoomVisible(visible: boolean): void;
  destroy(): void;
}

export function mountVisShell(
  container: HTMLElement,
  locale: string | undefined,
  actions: { download(): void; copy(): void; zoomIn(): void; zoomOut(): void },
): VisShell {
  const labels = wrapperLabels(locale);
  const shell = document.createElement('div');
  shell.className = 'gve-shell';
  shell.innerHTML = `
    <div class="gve-shell-bar">
      <div class="gve-shell-tabs" role="tablist">
        <button type="button" class="gve-shell-tab on" data-tab="chart" role="tab" aria-selected="true">${labels.chart}</button>
        <button type="button" class="gve-shell-tab" data-tab="code" role="tab" aria-selected="false">${labels.code}</button>
      </div>
      <div class="gve-shell-actions">
        <button type="button" class="gve-shell-icon" data-action="zoom-out" aria-label="${labels.zoomOut}" hidden>${labels.zoomOut}</button>
        <button type="button" class="gve-shell-icon" data-action="zoom-in" aria-label="${labels.zoomIn}" hidden>${labels.zoomIn}</button>
        <button type="button" class="gve-shell-icon" data-action="download">${labels.download}</button>
        <button type="button" class="gve-shell-icon" data-action="copy" hidden>${labels.copy}</button>
      </div>
    </div>
    <div class="gve-shell-chart" data-panel="chart"></div>
    <pre class="gve-shell-code" data-panel="code" hidden></pre>
  `;
  container.append(shell);
  const chartSlot = shell.querySelector('.gve-shell-chart') as HTMLElement;
  const code = shell.querySelector('.gve-shell-code') as HTMLElement;
  const copyButton = shell.querySelector('[data-action="copy"]') as HTMLButtonElement;
  let copyTimer = 0;

  shell.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest('button') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    const tab = target.dataset.tab;
    if (tab === 'chart' || tab === 'code') {
      const showCode = tab === 'code';
      shell.querySelectorAll<HTMLButtonElement>('.gve-shell-tab').forEach((button) => {
        const selected = button.dataset.tab === tab;
        button.classList.toggle('on', selected);
        button.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      chartSlot.hidden = showCode;
      code.hidden = !showCode;
      copyButton.hidden = !showCode;
      shell.querySelector<HTMLButtonElement>('[data-action="download"]')!.hidden = showCode;
      shell.querySelectorAll<HTMLButtonElement>('[data-action="zoom-in"], [data-action="zoom-out"]').forEach((button) => {
        if (showCode) button.hidden = true;
      });
      if (!showCode) setZoom(shell.dataset.zoom === 'true');
      return;
    }
    if (target.dataset.action === 'download') actions.download();
    if (target.dataset.action === 'zoom-in') actions.zoomIn();
    if (target.dataset.action === 'zoom-out') actions.zoomOut();
    if (target.dataset.action === 'copy') {
      actions.copy();
      copyButton.textContent = labels.copied;
      window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => {
        copyButton.textContent = labels.copy;
      }, 1200);
    }
  });

  function setZoom(visible: boolean) {
    shell.dataset.zoom = visible ? 'true' : 'false';
    const hide = chartSlot.hidden || !visible;
    shell.querySelectorAll<HTMLButtonElement>('[data-action="zoom-in"], [data-action="zoom-out"]').forEach((button) => {
      button.hidden = hide;
    });
  }

  return {
    chartSlot,
    setSource(source: string) {
      code.textContent = source;
    },
    setZoomVisible: setZoom,
    destroy() {
      window.clearTimeout(copyTimer);
      shell.remove();
    },
  };
}

export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement('textarea');
  area.value = value;
  document.body.append(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

export function downloadChart(filename: string, chart: { getDataURL(opts: object): string } | null, fallback: HTMLElement): void {
  if (chart) {
    saveUrl(chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' }), `${filename}.png`);
    return;
  }
  const svg = fallback.querySelector('svg');
  if (svg) {
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg.outerHTML}`], { type: 'image/svg+xml' });
    saveUrl(URL.createObjectURL(blob), `${filename}.svg`);
    return;
  }
  const markup = fallback.innerHTML || '';
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${markup}</div></foreignObject></svg>`;
  const blob = new Blob([wrapped], { type: 'image/svg+xml' });
  saveUrl(URL.createObjectURL(blob), `${filename}.svg`);
}

function saveUrl(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}
