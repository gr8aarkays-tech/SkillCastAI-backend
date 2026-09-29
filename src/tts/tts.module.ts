import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TTS_PROVIDER } from './interfaces/tts.provider.js';
import { OpenAITTSProvider } from './providers/openai-tts.provider.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: TTS_PROVIDER,
      useClass: OpenAITTSProvider,
    },
  ],
  exports: [TTS_PROVIDER],
})
export class TtsModule {}
