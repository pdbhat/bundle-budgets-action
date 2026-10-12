import { AnalysisSummary, formatBytes, parseSizeToBytes } from './analyzer.js';

/**
 * Generates an ANSI terminal output report.
 */
export function generateTerminalReport(summary: AnalysisSummary): string {
  const lines: string[] = [];

  lines.push('\n📊 Bundle Budgets Evaluation Report');
  lines.push('───────────────────────────────────────────────────────');
  lines.push(`📁 Scanned Directory: ${summary.directory}`);
  lines.push(`📦 Total Scanned Files: ${summary.totalFiles}`);
  lines.push(`💾 Total Raw Size: ${formatBytes(summary.totalRawBytes)}`);
  lines.push(`🗜️  Total Gzip:     ${formatBytes(summary.totalGzipBytes)}`);
  lines.push(`⚡ Total Brotli:   ${formatBytes(summary.totalBrotliBytes)}`);
  lines.push('───────────────────────────────────────────────────────\n');

  lines.push('Budget Rules:');
  for (const r of summary.results) {
    const icon = r.passed ? '✅ PASS' : '❌ FAIL';
    lines.push(`${icon} Pattern: ${r.rule.pathPattern}`);
    lines.push(`   Matched: ${r.matchedFiles.length} file(s)`);

    const rawBudget = r.rule.maxRawSize ? ` / max ${r.rule.maxRawSize}` : '';
    const gzipBudget = r.rule.maxGzipSize ? ` / max ${r.rule.maxGzipSize}` : '';
    const brotliBudget = r.rule.maxBrotliSize ? ` / max ${r.rule.maxBrotliSize}` : '';

    lines.push(`   Raw:    ${formatBytes(r.totalRawBytes)}${rawBudget}`);
    lines.push(`   Gzip:   ${formatBytes(r.totalGzipBytes)}${gzipBudget}`);
    lines.push(`   Brotli: ${formatBytes(r.totalBrotliBytes)}${brotliBudget}`);

    if (!r.passed) {
      for (const v of r.violations) {
        lines.push(`   ⚠️  ${v}`);
      }
    }
    lines.push('');
  }

  lines.push(`Status: ${summary.allPassed ? '✅ All budgets passed!' : '❌ Budgets breached!'}\n`);
  return lines.join('\n');
}

/**
 * Generates a clean GitHub Markdown comment report for PRs.
 */
export function generateMarkdownReport(summary: AnalysisSummary): string {
  const statusEmoji = summary.allPassed ? '✅' : '❌';
  const statusTitle = summary.allPassed
    ? 'All asset budgets passed'
    : 'Asset budget thresholds breached';

  const rows: string[] = [];
  rows.push('| Pattern | Files | Raw Size | Gzip Size | Brotli Size | Status |');
  rows.push('| :--- | :---: | :---: | :---: | :---: | :---: |');

  for (const r of summary.results) {
    const status = r.passed ? '✅ Pass' : '❌ Breached';
    const rawBudgetStr = r.rule.maxRawSize ? `<br><sub>max ${r.rule.maxRawSize}</sub>` : '';
    const gzipBudgetStr = r.rule.maxGzipSize ? `<br><sub>max ${r.rule.maxGzipSize}</sub>` : '';
    const brotliBudgetStr = r.rule.maxBrotliSize ? `<br><sub>max ${r.rule.maxBrotliSize}</sub>` : '';

    rows.push(
      `| \`${r.rule.pathPattern}\` | ${r.matchedFiles.length} | ${formatBytes(r.totalRawBytes)}${rawBudgetStr} | ${formatBytes(r.totalGzipBytes)}${gzipBudgetStr} | ${formatBytes(r.totalBrotliBytes)}${brotliBudgetStr} | ${status} |`
    );
  }

  let violationSection = '';
  const failingRules = summary.results.filter((r) => !r.passed);
  if (failingRules.length > 0) {
    violationSection = '\n### ⚠️ Violations\n\n' + failingRules.map((f) => {
      return `- **\`${f.rule.pathPattern}\`**:\n  - ${f.violations.join('\n  - ')}`;
    }).join('\n') + '\n';
  }

  return `<!-- bundle-budgets-action -->
## ${statusEmoji} Bundle Budget Report: ${statusTitle}

Scanned \`${summary.totalFiles}\` assets in \`${summary.directory}\`. Total Brotli: **${formatBytes(summary.totalBrotliBytes)}** (Gzip: **${formatBytes(summary.totalGzipBytes)}**).

${rows.join('\n')}
${violationSection}
> *Evaluated by [bundle-budgets-action](https://github.com/pdbhat/bundle-budgets-action) at ${summary.evaluatedAt}*
`;
}
