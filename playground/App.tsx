import { useEffect, useMemo, useState } from 'react';
import { CHARTS } from '../src/catalog';
import { EXAMPLES } from '../src/examples';
import { readConfig } from '../src/parser';
import { GPTVisChart } from '../src/react';
import type { RenderStatus } from '../src/runtime';
import type { ThemeName } from '../src/theme';

const THEMES: { id: ThemeName; label: string }[] = [
  { id: 'default', label: '默认' },
  { id: 'academy', label: '学院' },
  { id: 'dark', label: '深色' },
];

export function App() {
  const [source, setSource] = useState(EXAMPLES[0].source);
  const [activeId, setActiveId] = useState(EXAMPLES[0].id);
  const [theme, setTheme] = useState<ThemeName>('default');
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<RenderStatus | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (!streaming) return;
    const full = source;
    let count = 0;
    setSource('');
    const timer = window.setInterval(() => {
      count += Math.max(2, Math.round(full.length / 90));
      setSource(full.slice(0, count));
      if (count >= full.length) {
        window.clearInterval(timer);
        setStreaming(false);
      }
    }, 30);
    return () => window.clearInterval(timer);
    // The playback freezes the text it started with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);

  const parsed = useMemo(() => {
    try {
      return JSON.stringify(readConfig(source, { streaming }), null, 2);
    } catch (error) {
      return error instanceof Error ? error.message : '无法解析';
    }
  }, [source, streaming]);

  function choose(id: string) {
    const example = EXAMPLES.find((item) => item.id === id);
    if (!example) return;
    setStreaming(false);
    setActiveId(id);
    setSource(example.source);
  }

  function play() {
    if (streaming) {
      setStreaming(false);
      return;
    }
    const example = EXAMPLES.find((item) => item.id === activeId);
    if (example) setSource(example.source);
    setStreaming(true);
  }

  return (
    <div className="studio">
      <header className="topbar">
        <div>
          <p className="eyebrow">Apache ECharts</p>
          <h1>GPTVis ECharts</h1>
        </div>
        <p className="lede">模型继续写 vis 语法。解析、容错和流式更新在这里完成，图交给 ECharts，不经过 AntV。</p>
      </header>

      <div className="layout">
        <section className="editor-pane">
          <div className="examples" role="tablist" aria-label="示例">
            {EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                role="tab"
                aria-selected={example.id === activeId}
                className={example.id === activeId ? 'chip on' : 'chip'}
                onClick={() => choose(example.id)}
              >
                {example.label}
              </button>
            ))}
          </div>
          <label className="source-label" htmlFor="vis-source">
            vis 语法
          </label>
          <textarea
            id="vis-source"
            spellCheck={false}
            value={source}
            onChange={(event) => {
              setStreaming(false);
              setActiveId('');
              setSource(event.target.value);
            }}
          />
          <div className="toolbar">
            <button type="button" className="primary" onClick={play}>
              {streaming ? '停止' : '按 token 流式播放'}
            </button>
            <div className="themes" role="group" aria-label="主题">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={theme === item.id ? 'chip on' : 'chip'}
                  onClick={() => setTheme(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" className="chip" onClick={() => setShowConfig((value) => !value)}>
              {showConfig ? '收起配置' : '查看解析结果'}
            </button>
          </div>
          {showConfig ? <pre className="config">{parsed}</pre> : null}
        </section>

        <section className="stage-pane">
          <div className="stage-meta">
            <span className={status ? `dot ${status.state}` : 'dot'} />
            <p>{status?.message ?? '等待渲染'}</p>
          </div>
          <div className="stage">
            <GPTVisChart content={source} theme={theme} streaming={streaming} onStatus={setStatus} />
          </div>
        </section>
      </div>

      <section className="matrix">
        <h2>这一版能画的图</h2>
        <div className="matrix-grid">
          {CHARTS.map((chart) => (
            <article key={chart.type}>
              <header>
                <strong>{chart.label}</strong>
                <code>{chart.type}</code>
              </header>
              <p>{chart.note}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
