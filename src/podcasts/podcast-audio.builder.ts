import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TTS_PROVIDER, type TTSProvider } from '../tts/interfaces/tts.provider.js';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/interfaces/storage.provider.js';
import { PodcastEntity, PodcastStatus } from '../podcasts/podcast.entity.js';
import { PodcastSegmentEntity, Speaker } from '../podcasts/podcast-segment.entity.js';

/** Rough estimate: average spoken words-per-minute × chars-per-word */
const CHARS_PER_SECOND = 14; // ~840 cpm at normal rate

/**
 * Takes all `podcast_segments` for a podcast, synthesises each one via TTS,
 * concatenates the raw MP3 buffers, uploads to storage, and updates the
 * podcast row with `audio_url`, `duration_seconds`, and `status = ready`.
 */
@Injectable()
export class PodcastAudioBuilder {
  private readonly logger = new Logger(PodcastAudioBuilder.name);

  constructor(
    @Inject(TTS_PROVIDER) private readonly tts: TTSProvider,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @InjectRepository(PodcastEntity)
    private readonly podcastRepo: Repository<PodcastEntity>,
    @InjectRepository(PodcastSegmentEntity)
    private readonly segmentRepo: Repository<PodcastSegmentEntity>,
  ) {}

  async build(podcastId: string): Promise<void> {
    const podcast = await this.podcastRepo.findOne({ where: { id: podcastId } });
    if (!podcast) throw new NotFoundException(`Podcast ${podcastId} not found`);

    // Mark as processing
    podcast.status = PodcastStatus.PROCESSING;
    await this.podcastRepo.save(podcast);

    try {
      const segments = await this.segmentRepo.find({
        where: { podcastId },
        order: { sequenceOrder: 'ASC' },
      });

      if (segments.length === 0) {
        throw new Error(`Podcast ${podcastId} has no segments`);
      }

      this.logger.log(`Synthesising ${segments.length} segments for podcast ${podcastId}`);

      // Synthesise each segment sequentially (rate-limit friendly)
      const audioBuffers: Buffer[] = [];
      for (const segment of segments) {
        const voice =
          segment.speaker === Speaker.HOST ? this.tts.hostVoice : this.tts.expertVoice;
        const result = await this.tts.synthesize({
          text: segment.text,
          voice,
          format: 'mp3',
        });
        audioBuffers.push(result.audio);

        // Store per-segment audio URL
        const segKey = `podcasts/${podcastId}/segment_${segment.sequenceOrder}.mp3`;
        const segUrl = await this.storage.upload({
          key: segKey,
          data: result.audio,
          contentType: 'audio/mpeg',
        });
        segment.audioUrl = segUrl;
        await this.segmentRepo.save(segment);
      }

      // Concatenate all segment buffers into one MP3 stream
      // (MP3 frames are self-contained — simple concatenation produces a valid stream)
      const combined = Buffer.concat(audioBuffers);

      // Upload combined audio
      const key = `podcasts/${podcastId}/full.mp3`;
      const audioUrl = await this.storage.upload({
        key,
        data: combined,
        contentType: 'audio/mpeg',
      });

      // Estimate duration
      const totalChars = segments.reduce((sum, s) => sum + s.text.length, 0);
      const durationSeconds = Math.max(1, Math.round(totalChars / CHARS_PER_SECOND));

      // Update podcast record
      podcast.audioUrl = audioUrl;
      podcast.durationSeconds = durationSeconds;
      podcast.status = PodcastStatus.READY;
      await this.podcastRepo.save(podcast);

      this.logger.log(
        `Podcast ${podcastId} built: ${combined.length} bytes, ~${durationSeconds}s`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Podcast audio build failed for ${podcastId}: ${message}`);
      podcast.status = PodcastStatus.ERROR;
      await this.podcastRepo.save(podcast);
      throw err;
    }
  }
}
