/**
 * Parser-only entry point for servers, workers and validation pipelines.
 * This module must not load ECharts, React, the runtime or any chart builder.
 */
export { isVisSyntax, parse, readConfig } from './parser.js';
export type { ParsedConfig, ParseOptions } from './parser.js';
