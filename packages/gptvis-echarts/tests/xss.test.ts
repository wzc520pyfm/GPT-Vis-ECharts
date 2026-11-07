import { describe, expect, it } from 'vitest';
import { buildView } from '../src/build';
import { safeColor } from '../src/theme';

const IMG = '<img src=x onerror=alert(1)>';
const SCRIPT = '<script>alert(1)</script>';

function expectEscaped(html: string) {
  expect(html).toContain('&lt;');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('<script');
}

describe('HTML escaping', () => {
  it('escapes liquid titles and aria labels', () => {
    const view = buildView(`vis liquid
percent 0.4
title ${IMG}
`);
    expect(view.kind).toBe('html');
    if (view.kind === 'html') expectEscaped(view.html);
  });

  it('escapes table titles, headers and cells', () => {
    const view = buildView(`vis table
title ${IMG}
data
  - 名称 ${IMG}
    备注 ${SCRIPT}
`);
    expect(view.kind).toBe('html');
    if (view.kind === 'html') expectEscaped(view.html);
  });

  it('escapes summary content and entity labels', () => {
    const view = buildView({
      type: 'summary',
      title: IMG,
      content: `${SCRIPT}\n\n[${IMG}](metric_value)`,
    });
    expect(view.kind).toBe('html');
    if (view.kind === 'html') expectEscaped(view.html);
  });

  it('escapes word cloud titles and words', () => {
    const view = buildView(`vis word-cloud
title ${IMG}
data
  - text ${SCRIPT}
    value 10
  - text 安全
    value 5
`);
    expect(view.kind).toBe('html');
    if (view.kind === 'html') expectEscaped(view.html);
  });

  it('escapes venn titles, set names and labels', () => {
    const view = buildView(`vis venn
title ${IMG}
data
  - sets ${IMG}, 乙
    label ${SCRIPT}
    value 1
  - sets 乙, 丙
    value 2
`);
    expect(view.kind).toBe('html');
    if (view.kind === 'html') expectEscaped(view.html);
  });

  it('escapes violin titles and categories', () => {
    const view = buildView(`vis violin
title ${IMG}
data
  - category ${IMG}
    value 1
  - category ${IMG}
    value 2
`);
    expect(view.kind).toBe('html');
    if (view.kind === 'html') expectEscaped(view.html);
  });

  it('escapes fishbone titles, causes and children', () => {
    const view = buildView(`vis fishbone-diagram
title ${IMG}
data
  - name ${IMG}
    children
      - name ${SCRIPT}
`);
    expect(view.kind).toBe('html');
    if (view.kind === 'html') expectEscaped(view.html);
  });

  it('rejects url() and expression() colors', () => {
    expect(safeColor('url(javascript:alert(1))')).toBeUndefined();
    expect(safeColor('expression(alert(1))')).toBeUndefined();
    expect(safeColor('red;background:url(x)')).toBeUndefined();
    expect(safeColor('#0f6e6b')).toBe('#0f6e6b');
  });
});
