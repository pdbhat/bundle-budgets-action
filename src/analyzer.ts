import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

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
export function parseSizeToBytes(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;

  const trimmed = value.trim().toUpperCase();
  const match = trimmed.match(/^([\d.]+)\s*(B|KB|MB|GB)?$/);
  if (!match) {
    throw new Error(`Invalid size string format: "${value}". Expected format like "150KB", "1.2MB", or "500B".`);
  }

  const num = parseFloat(match[1]);
  const unit = match[2] || 'B';

  switch (unit) {
    case 'B':
      return Math.round(num);
    case 'KB':
      return Math.round(num * 1024);
    case 'MB':
      return Math.round(num * 1024 * 1024);
    case 'GB':
      return Math.round(num * 1024 * 1024 * 1024);
    default:
      return Math.round(num);
  }
}

/**
 * Formats byte values into readable representations.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const approx = bytes / Math.pow(1024, exponent);
  return `${approx.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

/**
 * Recursively scans directory and collects file size metrics including compression.
 */
export function collectFileMetrics(rootDir: string, currentDir: string = rootDir): FileMetric[] {
  if (!fs.existsSync(currentDir)) return [];

  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const metrics: FileMetric[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      metrics.push(...collectFileMetrics(rootDir, fullPath));
    } else if (entry.isFile()) {
      const buffer = fs.readFileSync(fullPath);
      const gzipBytes = zlib.gzipSync(buffer).length;
      const brotliBytes = zlib.brotliCompressSync(buffer).length;

      metrics.push({
        filePath: fullPath,
        relativePath: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
        rawBytes: buffer.length,
        gzipBytes,
        brotliBytes,
      });
    }
  }

  return metrics;
}

/**
 * Converts a glob-like pattern string to RegExp.
 */
function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/(?<!\.)\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`);
}

/**
 * Evaluates configured budget rules against collected file metrics.
 */
export function evaluateBudgets(config: BudgetConfig): AnalysisSummary {
  const files = collectFileMetrics(config.directory);

  let totalRaw = 0;
  let totalGzip = 0;
  let totalBrotli = 0;

  for (const f of files) {
    totalRaw += f.rawBytes;
    totalGzip += f.gzipBytes;
    totalBrotli += f.brotliBytes;
  }

  const results: BudgetEvaluationResult[] = [];
  let allPassed = true;

  for (const rule of config.budgets) {
    const regex = patternToRegExp(rule.pathPattern);
    const matched = files.filter((f) => regex.test(f.relativePath));

    let ruleRaw = 0;
    let ruleGzip = 0;
    let ruleBrotli = 0;

    for (const m of matched) {
      ruleRaw += m.rawBytes;
      ruleGzip += m.gzipBytes;
      ruleBrotli += m.brotliBytes;
    }

    const violations: string[] = [];

    const maxRaw = parseSizeToBytes(rule.maxRawSize);
    if (maxRaw !== undefined && ruleRaw > maxRaw) {
      violations.push(`Raw size ${formatBytes(ruleRaw)} exceeds budget of ${formatBytes(maxRaw)}`);
    }

    const maxGzip = parseSizeToBytes(rule.maxGzipSize);
    if (maxGzip !== undefined && ruleGzip > maxGzip) {
      violations.push(`Gzip size ${formatBytes(ruleGzip)} exceeds budget of ${formatBytes(maxGzip)}`);
    }

    const maxBrotli = parseSizeToBytes(rule.maxBrotliSize);
    if (maxBrotli !== undefined && ruleBrotli > maxBrotli) {
      violations.push(`Brotli size ${formatBytes(ruleBrotli)} exceeds budget of ${formatBytes(maxBrotli)}`);
    }

    const passed = violations.length === 0;
    if (!passed) allPassed = false;

    results.push({
      rule,
      matchedFiles: matched,
      totalRawBytes: ruleRaw,
      totalGzipBytes: ruleGzip,
      totalBrotliBytes: ruleBrotli,
      passed,
      violations,
    });
  }

  return {
    evaluatedAt: new Date().toISOString(),
    directory: config.directory,
    totalFiles: files.length,
    totalRawBytes: totalRaw,
    totalGzipBytes: totalGzip,
    totalBrotliBytes: totalBrotli,
    results,
    allPassed,
  };
}
