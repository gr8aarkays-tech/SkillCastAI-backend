export const TTS_PROVIDER = 'TTS_PROVIDER';

export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac';

export interface TTSSynthesizeOptions {
  text: string;
  /** Voice identifier — provider-specific string (e.g. 'alloy', 'nova') */
  voice: string;
  format?: AudioFormat;
  /** Speech rate multiplier: 0.25–4.0 */
  speed?: number;
}

export interface TTSResult {
  /** Raw audio buffer */
  audio: Buffer;
  /** MIME type of the audio (e.g. 'audio/mpeg') */
  mimeType: string;
}

export interface TTSProvider {
  /**
   * Synthesize `text` into audio using the named voice.
   * Returns a Buffer of audio bytes.
   */
  synthesize(options: TTSSynthesizeOptions): Promise<TTSResult>;

  /** Host voice ID for the podcast host speaker */
  readonly hostVoice: string;

  /** Expert voice ID for the podcast expert speaker */
  readonly expertVoice: string;
}
