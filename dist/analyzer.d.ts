export interface BudgetRule {
    pathPattern: string;
    maxRawSize?: string | number;
    maxGzipSize?: string | number;
    maxBrotliSize?: string | number;
    critical?: boolean;
}
export interface BudgetConfig {
    directory: string;
    budgets: BudgetRule[];
    failOnThreshold?: boolean;
}
export interface FileMetric {
    filePath: string;
    relativePath: string;
    rawBytes: number;
    gzipBytes: number;
    brotliBytes: number;
}
export interface BudgetEvaluationResult {
    rule: BudgetRule;
    matchedFiles: FileMetric[];
    totalRawBytes: number;
    totalGzipBytes: number;
    totalBrotliBytes: number;
    passed: boolean;
    violations: string[];
}
export interface AnalysisSummary {
    evaluatedAt: string;
    directory: string;
    totalFiles: number;
    totalRawBytes: number;
    totalGzipBytes: number;
    totalBrotliBytes: number;
    results: BudgetEvaluationResult[];
    allPassed: boolean;
}
/**
 * Parses human-readable size strings (e.g., '150KB', '1.2MB', '500B') to bytes.
 */
export declare function parseSizeToBytes(value: string | number | undefined): number | undefined;
/**
 * Formats byte values into readable representations.
 */
export declare function formatBytes(bytes: number): string;
/**
 * Recursively scans directory and collects file size metrics including compression.
 */
export declare function collectFileMetrics(rootDir: string, currentDir?: string): FileMetric[];
/**
 * Evaluates configured budget rules against collected file metrics.
 */
export declare function evaluateBudgets(config: BudgetConfig): AnalysisSummary;
