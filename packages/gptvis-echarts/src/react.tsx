import { useEffect, useRef, type CSSProperties } from 'react';
import { GPTVis, type GPTVisOptions, type RenderStatus } from './runtime.js';
import type { ThemeName } from './theme.js';

export interface GPTVisChartProps {
  content: string | Record<string, unknown>;
  theme?: ThemeName;
  streaming?: boolean;
  className?: string;
  style?: CSSProperties;
  onStatus?: (status: RenderStatus) => void;
}

export function GPTVisChart({ content, theme = 'default', streaming = false, className, style, onStatus }: GPTVisChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<GPTVis | null>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    if (!host.current) return;
    const options: GPTVisOptions = {
      container: host.current,
      theme,
      streaming,
      onStatus: (status) => statusRef.current?.(status),
    };
    const instance = new GPTVis(options);
    chart.current = instance;
    instance.render(content);
    return () => {
      instance.destroy();
      chart.current = null;
    };
    // Recreate when the frame theme or streaming mode changes. Content updates go through render().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, streaming]);

  useEffect(() => {
    chart.current?.render(content);
  }, [content]);

  return <div ref={host} className={className} style={{ width: '100%', height: '100%', minHeight: 280, ...style }} />;
}
