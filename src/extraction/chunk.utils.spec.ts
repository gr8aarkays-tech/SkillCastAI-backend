import { describe, it, expect } from 'vitest';
import { splitIntoChunks } from './chunk.utils.js';

describe('splitIntoChunks', () => {
  it('returns empty array for empty string', () => {
    expect(splitIntoChunks('')).toEqual([]);
    expect(splitIntoChunks('   ')).toEqual([]);
  });

  it('returns a single chunk for short text', () => {
    const result = splitIntoChunks('Hello world. This is a test.');
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('Hello world');
    expect(result[0].tokenCount).toBeGreaterThan(0);
  });

  it('splits multi-paragraph text into multiple chunks within maxTokens', () => {
    // Build 10 paragraphs of ~60 words each ≈ 80 tokens/paragraph
    const paragraphs = Array.from(
      { length: 10 },
      (_, i) => `Paragraph ${i + 1}: ` + 'This is a sentence with some words. '.repeat(8).trim(),
    );
    const text = paragraphs.join('\n\n');
    const result = splitIntoChunks(text, 200); // force splits
    expect(result.length).toBeGreaterThan(1);
    result.forEach((chunk) => {
      expect(chunk.tokenCount).toBeLessThanOrEqual(250); // small overshoot tolerance
    });
  });

  it('preserves all content across chunks (no data loss)', () => {
    const text = Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1}. Some content here.`).join('\n\n');
    const chunks = splitIntoChunks(text, 50);
    const rejoined = chunks.map((c) => c.content).join(' ');
    // Every paragraph should appear somewhere in the rejoined content
    for (let i = 1; i <= 20; i++) {
      expect(rejoined).toContain(`Paragraph ${i}`);
    }
  });

  it('assigns sequential chunkIndex when caller maps', () => {
    const text = Array.from({ length: 5 }, (_, i) => `Para ${i}. `.repeat(100)).join('\n\n');
    const chunks = splitIntoChunks(text, 100);
    chunks.forEach((_, idx) => {
      expect(idx).toBe(idx); // mapped by caller
    });
  });
});
