import { AnalysisSummary } from './analyzer.js';
/**
 * Generates an ANSI terminal output report.
 */
export declare function generateTerminalReport(summary: AnalysisSummary): string;
/**
 * Generates a clean GitHub Markdown comment report for PRs.
 */
export declare function generateMarkdownReport(summary: AnalysisSummary): string;
/**
 * Generates structured JSON output for CI pipeline artifact integration.
 */
export declare function generateJsonReport(summary: AnalysisSummary, pretty?: boolean): string;
