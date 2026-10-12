#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { BudgetConfig, evaluateBudgets } from './analyzer.js';
import { generateTerminalReport } from './formatter.js';

function printHelp(): void {
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

function run(): void {
  const args = process.argv.slice(2);
  let directory = 'dist';
  let configFile = '.bundle-budgetrc.json';
  let failOnBreach = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-h' || args[i] === '--help') {
      printHelp();
      process.exit(0);
    } else if (args[i] === '-d' || args[i] === '--dir') {
      directory = args[++i];
    } else if (args[i] === '-c' || args[i] === '--config') {
      configFile = args[++i];
    } else if (args[i] === '--no-fail') {
      failOnBreach = false;
    }
  }

  let budgets = [];
  if (fs.existsSync(configFile)) {
    const parsed = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    budgets = parsed.budgets || [];
  } else {
    budgets = [
      { pathPattern: '**/*.js', maxGzipSize: '250KB' },
      { pathPattern: '**/*.css', maxGzipSize: '50KB' },
    ];
  }

  const config: BudgetConfig = {
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
