#!/usr/bin/env node
import './sourcemap-register.cjs';import { createRequire as __WEBPACK_EXTERNAL_createRequire } from "module";
/******/ // The require scope
/******/ var __nccwpck_require__ = {};
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/compat get default export */
/******/ (() => {
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__nccwpck_require__.n = (module) => {
/******/ 		var getter = module && module.__esModule ?
/******/ 			() => (module['default']) :
/******/ 			() => (module);
/******/ 		__nccwpck_require__.d(getter, { a: getter });
/******/ 		return getter;
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__nccwpck_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "node:fs"
const external_node_fs_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:fs");
var external_node_fs_default = /*#__PURE__*/__nccwpck_require__.n(external_node_fs_namespaceObject);
;// CONCATENATED MODULE: external "node:path"
const external_node_path_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:path");
var external_node_path_default = /*#__PURE__*/__nccwpck_require__.n(external_node_path_namespaceObject);
;// CONCATENATED MODULE: external "node:zlib"
const external_node_zlib_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:zlib");
var external_node_zlib_default = /*#__PURE__*/__nccwpck_require__.n(external_node_zlib_namespaceObject);
;// CONCATENATED MODULE: ./src/analyzer.ts



/**
 * Parses human-readable size strings (e.g., '150KB', '1.2MB', '500B') to bytes.
 */
function parseSizeToBytes(value) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === 'number')
        return value;
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
function analyzer_formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const approx = bytes / Math.pow(1024, exponent);
    return `${approx.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}
/**
 * Recursively scans directory and collects file size metrics including compression.
 */
function collectFileMetrics(rootDir, currentDir = rootDir) {
    if (!external_node_fs_default().existsSync(currentDir))
        return [];
    const entries = external_node_fs_default().readdirSync(currentDir, { withFileTypes: true });
    const metrics = [];
    for (const entry of entries) {
        const fullPath = external_node_path_default().join(currentDir, entry.name);
        if (entry.isDirectory()) {
            metrics.push(...collectFileMetrics(rootDir, fullPath));
        }
        else if (entry.isFile()) {
            const buffer = external_node_fs_default().readFileSync(fullPath);
            const gzipBytes = external_node_zlib_default().gzipSync(buffer).length;
            const brotliBytes = external_node_zlib_default().brotliCompressSync(buffer).length;
            metrics.push({
                filePath: fullPath,
                relativePath: external_node_path_default().relative(rootDir, fullPath).replace(/\\/g, '/'),
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
function patternToRegExp(pattern) {
    const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.*')
        .replace(/(?<!\.)\*/g, '[^/]*');
    return new RegExp(`^${escaped}$`);
}
/**
 * Evaluates configured budget rules against collected file metrics.
 */
function evaluateBudgets(config) {
    const files = collectFileMetrics(config.directory);
    let totalRaw = 0;
    let totalGzip = 0;
    let totalBrotli = 0;
    for (const f of files) {
        totalRaw += f.rawBytes;
        totalGzip += f.gzipBytes;
        totalBrotli += f.brotliBytes;
    }
    const results = [];
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
        const violations = [];
        const maxRaw = parseSizeToBytes(rule.maxRawSize);
        if (maxRaw !== undefined && ruleRaw > maxRaw) {
            violations.push(`Raw size ${analyzer_formatBytes(ruleRaw)} exceeds budget of ${analyzer_formatBytes(maxRaw)}`);
        }
        const maxGzip = parseSizeToBytes(rule.maxGzipSize);
        if (maxGzip !== undefined && ruleGzip > maxGzip) {
            violations.push(`Gzip size ${analyzer_formatBytes(ruleGzip)} exceeds budget of ${analyzer_formatBytes(maxGzip)}`);
        }
        const maxBrotli = parseSizeToBytes(rule.maxBrotliSize);
        if (maxBrotli !== undefined && ruleBrotli > maxBrotli) {
            violations.push(`Brotli size ${analyzer_formatBytes(ruleBrotli)} exceeds budget of ${analyzer_formatBytes(maxBrotli)}`);
        }
        const passed = violations.length === 0;
        if (!passed)
            allPassed = false;
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

;// CONCATENATED MODULE: ./src/formatter.ts

/**
 * Generates an ANSI terminal output report.
 */
function generateTerminalReport(summary) {
    const lines = [];
    lines.push('\n📊 Bundle Budgets Evaluation Report');
    lines.push('───────────────────────────────────────────────────────');
    lines.push(`📁 Scanned Directory: ${summary.directory}`);
    lines.push(`📦 Total Scanned Files: ${summary.totalFiles}`);
    lines.push(`💾 Total Raw Size: ${analyzer_formatBytes(summary.totalRawBytes)}`);
    lines.push(`🗜️  Total Gzip:     ${analyzer_formatBytes(summary.totalGzipBytes)}`);
    lines.push(`⚡ Total Brotli:   ${analyzer_formatBytes(summary.totalBrotliBytes)}`);
    lines.push('───────────────────────────────────────────────────────\n');
    lines.push('Budget Rules:');
    for (const r of summary.results) {
        const icon = r.passed ? '✅ PASS' : '❌ FAIL';
        lines.push(`${icon} Pattern: ${r.rule.pathPattern}`);
        lines.push(`   Matched: ${r.matchedFiles.length} file(s)`);
        const rawBudget = r.rule.maxRawSize ? ` / max ${r.rule.maxRawSize}` : '';
        const gzipBudget = r.rule.maxGzipSize ? ` / max ${r.rule.maxGzipSize}` : '';
        const brotliBudget = r.rule.maxBrotliSize ? ` / max ${r.rule.maxBrotliSize}` : '';
        lines.push(`   Raw:    ${analyzer_formatBytes(r.totalRawBytes)}${rawBudget}`);
        lines.push(`   Gzip:   ${analyzer_formatBytes(r.totalGzipBytes)}${gzipBudget}`);
        lines.push(`   Brotli: ${analyzer_formatBytes(r.totalBrotliBytes)}${brotliBudget}`);
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
function generateMarkdownReport(summary) {
    const statusEmoji = summary.allPassed ? '✅' : '❌';
    const statusTitle = summary.allPassed
        ? 'All asset budgets passed'
        : 'Asset budget thresholds breached';
    const rows = [];
    rows.push('| Pattern | Files | Raw Size | Gzip Size | Brotli Size | Status |');
    rows.push('| :--- | :---: | :---: | :---: | :---: | :---: |');
    for (const r of summary.results) {
        const status = r.passed ? '✅ Pass' : '❌ Breached';
        const rawBudgetStr = r.rule.maxRawSize ? `<br><sub>max ${r.rule.maxRawSize}</sub>` : '';
        const gzipBudgetStr = r.rule.maxGzipSize ? `<br><sub>max ${r.rule.maxGzipSize}</sub>` : '';
        const brotliBudgetStr = r.rule.maxBrotliSize ? `<br><sub>max ${r.rule.maxBrotliSize}</sub>` : '';
        rows.push(`| \`${r.rule.pathPattern}\` | ${r.matchedFiles.length} | ${formatBytes(r.totalRawBytes)}${rawBudgetStr} | ${formatBytes(r.totalGzipBytes)}${gzipBudgetStr} | ${formatBytes(r.totalBrotliBytes)}${brotliBudgetStr} | ${status} |`);
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

;// CONCATENATED MODULE: ./src/cli.ts



function printHelp() {
    console.log(`
bundle-budgets CLI - Fast, zero-config bundle size & budget validator

Usage:
  bundle-budgets [options]

Options:
  -d, --dir <directory>     Directory containing built assets (default: "dist")
  -c, --config <file>       Path to budget config file (default: ".bundle-budgetrc.json")
  --fail-on-breach          Exit with code 1 if any budget is breached (default: true)
  -h, --help                Show help message
`);
}
function run() {
    const args = process.argv.slice(2);
    let directory = 'dist';
    let configFile = '.bundle-budgetrc.json';
    let failOnBreach = true;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-h' || args[i] === '--help') {
            printHelp();
            process.exit(0);
        }
        else if (args[i] === '-d' || args[i] === '--dir') {
            directory = args[++i];
        }
        else if (args[i] === '-c' || args[i] === '--config') {
            configFile = args[++i];
        }
        else if (args[i] === '--no-fail') {
            failOnBreach = false;
        }
    }
    let budgets = [];
    if (external_node_fs_default().existsSync(configFile)) {
        const parsed = JSON.parse(external_node_fs_default().readFileSync(configFile, 'utf-8'));
        budgets = parsed.budgets || [];
    }
    else {
        budgets = [
            { pathPattern: '**/*.js', maxGzipSize: '250KB' },
            { pathPattern: '**/*.css', maxGzipSize: '50KB' },
        ];
    }
    const config = {
        directory,
        budgets,
        failOnThreshold: failOnBreach,
    };
    const summary = evaluateBudgets(config);
    console.log(generateTerminalReport(summary));
    if (failOnBreach && !summary.allPassed) {
        process.exit(1);
    }
}
run();


//# sourceMappingURL=index.js.map