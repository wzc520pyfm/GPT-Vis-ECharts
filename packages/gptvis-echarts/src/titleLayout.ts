/**
 * Shared canvas and CSS font stack. Names with spaces or digits must stay
 * quoted so Canvas ctx.font accepts the shorthand; otherwise the whole
 * declaration is dropped and the browser falls back to 10px sans-serif,
 * ignoring title fontSize.
 */
export const DEFAULT_FONT_FAMILY = '"IBM Plex Sans", "Source Sans 3", sans-serif';

/**
 * Default font size for ECharts canvas titles and HTML-rendered chart titles
 * (table, liquid, venn, violin, word-cloud, fishbone, summary, and fallback).
 */
export const DEFAULT_TITLE_FONT_SIZE = 16;

/**
 * Extra top inset applied to the previous 16px title layout so the legend
 * and plot area stay clear of the larger default title.
 */
export const TITLE_RESERVE_EXTRA = DEFAULT_TITLE_FONT_SIZE - 16;

/** Pick a top inset, adding TITLE_RESERVE_EXTRA when a title is shown. */
export function topForTitle(hasTitle: boolean, titled: number, open: number): number {
  return hasTitle ? titled + TITLE_RESERVE_EXTRA : open;
}
