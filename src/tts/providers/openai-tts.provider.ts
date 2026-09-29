import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  TTSProvider,
  TTSSynthesizeOptions,
  TTSResult,
} from '../interfaces/tts.provider.js';

/**
 * OpenAI TTS provider.
 *
 * Uses the `tts-1` model (fast, low-latency) with two distinct voices:
 *   - Host  → "alloy"  (neutral, authoritative)
 *   - Expert → "nova"   (warm, conversational)
 *
 * Override via env:
 *   OPENAI_TTS_MODEL=tts-1-hd
 *   OPENAI_TTS_HOST_VOICE=echo
 *   OPENAI_TTS_EXPERT_VOICE=shimmer
 */
@Injectable()
export class OpenAITTSProvider implements TTSProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  readonly hostVoice: string;
  readonly expertVoice: string;

  private readonly logger = new Logger(OpenAITTSProvider.name);

  constructor(config: ConfigService) {
    this.client = new OpenAI({
      apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.model = config.get<string>('OPENAI_TTS_MODEL') ?? 'tts-1';
    this.hostVoice = config.get<string>('OPENAI_TTS_HOST_VOICE') ?? 'alloy';
    this.expertVoice = config.get<string>('OPENAI_TTS_EXPERT_VOICE') ?? 'nova';
  }

  async synthesize(options: TTSSynthesizeOptions): Promise<TTSResult> {
    const { text, voice, format = 'mp3', speed = 1.0 } = options;

    this.logger.debug(`TTS synthesize: voice=${voice} chars=${text.length}`);

    const response = await this.client.audio.speech.create({
      model: this.model,
      voice: voice as Parameters<typeof this.client.audio.speech.create>[0]['voice'],
      input: text,
      response_format: format,
      speed,
    });

    const arrayBuffer = await response.arrayBuffer();
    return {
      audio: Buffer.from(arrayBuffer),
      mimeType: format === 'mp3' ? 'audio/mpeg' : `audio/${format}`,
    };
  }
}
