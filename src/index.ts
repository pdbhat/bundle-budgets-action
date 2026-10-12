import fs from 'node:fs';
import path from 'node:path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { BudgetConfig, evaluateBudgets } from './analyzer.js';
import { generateMarkdownReport, generateTerminalReport } from './formatter.js';

async function run(): Promise<void> {
  try {
    const directory = core.getInput('directory') || 'dist';
    const configFile = core.getInput('config-file') || '.bundle-budgetrc.json';
    const failOnBreach = core.getBooleanInput('fail-on-breach');
    const commentOnPr = core.getBooleanInput('comment-on-pr');
    const token = core.getInput('github-token');

    let budgets = [];
    if (fs.existsSync(configFile)) {
      const parsed = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      budgets = parsed.budgets || [];
    } else {
      // Default fallback budget if no config provided
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
    const terminalReport = generateTerminalReport(summary);
    core.info(terminalReport);

    core.setOutput('all-passed', summary.allPassed.toString());
    core.setOutput('total-gzip-bytes', summary.totalGzipBytes.toString());
    core.setOutput('total-brotli-bytes', summary.totalBrotliBytes.toString());

    if (commentOnPr && token) {
      const context = github.context;
      const prNumber = context.payload.pull_request?.number;

      if (prNumber) {
        const octokit = github.getOctokit(token);
        const markdownReport = generateMarkdownReport(summary);

        const { data: comments } = await octokit.rest.issues.listComments({
          ...context.repo,
          issue_number: prNumber,
        });

        const botComment = comments.find((c) =>
          c.body?.includes('<!-- bundle-budgets-action -->')
        );

        if (botComment) {
          await octokit.rest.issues.updateComment({
            ...context.repo,
            comment_id: botComment.id,
            body: markdownReport,
          });
          core.info(`Updated existing PR comment on #${prNumber}`);
        } else {
          await octokit.rest.issues.createComment({
            ...context.repo,
            issue_number: prNumber,
            body: markdownReport,
          });
          core.info(`Posted new PR comment to #${prNumber}`);
        }
      } else {
        core.info('Skipping PR comment: Not running in a pull_request event context.');
      }
    }

    if (failOnBreach && !summary.allPassed) {
      core.setFailed('Bundle budget thresholds breached!');
    }
  } catch (error: any) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
