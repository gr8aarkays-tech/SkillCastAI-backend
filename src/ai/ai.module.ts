import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './interfaces/ai.provider.js';
import { PromptLoader } from './prompt.loader.js';
import { OpenAIProvider } from './providers/openai.provider.js';

@Module({
  providers: [
    PromptLoader,
    {
      provide: AI_PROVIDER,
      useClass: OpenAIProvider,
    },
  ],
  exports: [AI_PROVIDER, PromptLoader],
})
export class AiModule {}
