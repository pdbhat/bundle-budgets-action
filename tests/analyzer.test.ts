import { describe, it, expect } from 'vitest';
import { parseSizeToBytes, formatBytes } from '../src/analyzer.js';

describe('parseSizeToBytes', () => {
  it('parses pure numbers', () => {
    expect(parseSizeToBytes(1024)).toBe(1024);
  });

  it('parses bytes representation', () => {
    expect(parseSizeToBytes('500B')).toBe(500);
    expect(parseSizeToBytes('500 B')).toBe(500);
  });

  it('parses KB representation', () => {
    expect(parseSizeToBytes('1KB')).toBe(1024);
    expect(parseSizeToBytes('1.5KB')).toBe(1536);
  });

  it('parses MB representation', () => {
    expect(parseSizeToBytes('2MB')).toBe(2 * 1024 * 1024);
  });

  it('handles undefined or null gracefully', () => {
    expect(parseSizeToBytes(undefined)).toBeUndefined();
  });
});

describe('formatBytes', () => {
  it('formats zero correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes correctly', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatBytes(1536)).toBe('1.50 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatBytes(1048576 * 2.5)).toBe('2.50 MB');
  });
});

describe('generateJsonReport', () => {
  it('serializes summary into valid JSON', async () => {
    const { generateJsonReport } = await import('../src/formatter.js');
    const mockSummary = {
      evaluatedAt: '2026-10-12T12:00:00.000Z',
      directory: 'dist',
      totalFiles: 2,
      totalRawBytes: 2048,
      totalGzipBytes: 512,
      totalBrotliBytes: 400,
      results: [],
      allPassed: true,
    };
    const jsonStr = generateJsonReport(mockSummary);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.totalFiles).toBe(2);
    expect(parsed.allPassed).toBe(true);
  });
});
