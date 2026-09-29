import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// prompts/ is at project root (3 levels up from src/ai/)
const PROMPTS_DIR = join(__dirname, '../../../prompts');

type PromptName = 'role-context' | 'question-generation' | 'explanation' | 'podcast-script';

@Injectable()
export class PromptLoader implements OnModuleInit {
  private readonly logger = new Logger(PromptLoader.name);
  private readonly prompts = new Map<PromptName, string>();

  onModuleInit() {
    const names: PromptName[] = [
      'role-context',
      'question-generation',
      'explanation',
      'podcast-script',
    ];

    for (const name of names) {
      const filePath = join(PROMPTS_DIR, `${name}.md`);
      try {
        const content = readFileSync(filePath, 'utf-8');
        this.prompts.set(name, content);
        this.logger.log(`Loaded prompt: ${name}`);
      } catch {
        throw new Error(`Missing required prompt file: ${filePath}`);
      }
    }
  }

  get(name: PromptName): string {
    const prompt = this.prompts.get(name);
    if (!prompt) throw new Error(`Prompt not loaded: ${name}`);
    return prompt;
  }
}
