/**
 * Splits a long text string into overlapping chunks of ~maxTokens each.
 * Splits on paragraph or sentence boundaries where possible.
 * Token estimate: 1 token ≈ 0.75 English words (OpenAI approximation).
 */
export function splitIntoChunks(
  text: string,
  maxTokens = 500,
): Array<{ content: string; tokenCount: number }> {
  // Normalise whitespace
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim();

  if (!cleaned) return [];

  // Split into paragraphs first
  const paragraphs = cleaned.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks: Array<{ content: string; tokenCount: number }> = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paraTokens = estimateTokens(paragraph);

    if (currentTokens + paraTokens <= maxTokens) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokens += paraTokens;
    } else {
      // Flush current chunk
      if (currentChunk) {
        chunks.push({ content: currentChunk.trim(), tokenCount: currentTokens });
      }

      // If a single paragraph exceeds maxTokens, split by sentence
      if (paraTokens > maxTokens) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) ?? [paragraph];
        currentChunk = '';
        currentTokens = 0;

        for (const sentence of sentences) {
          const sentTokens = estimateTokens(sentence);
          if (currentTokens + sentTokens <= maxTokens) {
            currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
            currentTokens += sentTokens;
          } else {
            if (currentChunk) {
              chunks.push({ content: currentChunk.trim(), tokenCount: currentTokens });
            }
            currentChunk = sentence.trim();
            currentTokens = sentTokens;
          }
        }
      } else {
        currentChunk = paragraph;
        currentTokens = paraTokens;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ content: currentChunk.trim(), tokenCount: currentTokens });
  }

  return chunks;
}

function estimateTokens(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount / 0.75);
}
