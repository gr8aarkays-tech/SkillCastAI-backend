import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PodcastAudioBuilder } from '../podcasts/podcast-audio.builder.js';
import { TTS_PROVIDER } from '../tts/interfaces/tts.provider.js';
import { STORAGE_PROVIDER } from '../storage/interfaces/storage.provider.js';
import { PodcastEntity, PodcastStatus } from '../podcasts/podcast.entity.js';
import { PodcastSegmentEntity, Speaker } from '../podcasts/podcast-segment.entity.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PODCAST_ID = 'podcast-uuid-001';

const makeSegments = (texts: string[]): PodcastSegmentEntity[] =>
  texts.map((text, i) => ({
    id: `seg-${i}`,
    podcastId: PODCAST_ID,
    speaker: i % 2 === 0 ? Speaker.HOST : Speaker.EXPERT,
    text,
    audioUrl: null,
    sequenceOrder: i,
    createdAt: new Date(),
  }));

// ── Mocks ─────────────────────────────────────────────────────────────────────

const MP3_STUB = Buffer.from([0xff, 0xe3, 0x18, 0x00]); // minimal MP3 frame stub

const mockTts = {
  hostVoice: 'alloy',
  expertVoice: 'nova',
  synthesize: vi.fn().mockResolvedValue({ audio: MP3_STUB, mimeType: 'audio/mpeg' }),
};

const mockStorage = {
  upload: vi.fn().mockImplementation(({ key }: { key: string }) =>
    Promise.resolve(`http://localhost:3000/audio/${key.replace(/\//g, '_')}`),
  ),
  getUrl: vi.fn((key: string) => `http://localhost:3000/audio/${key}`),
};

const makePodcast = (overrides: Partial<PodcastEntity> = {}): PodcastEntity => ({
  id: PODCAST_ID,
  sourceId: 'source-001',
  title: 'Test Podcast',
  audioUrl: null,
  durationSeconds: 0,
  status: PodcastStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

let savedPodcast: PodcastEntity;

const mockPodcastRepo = {
  findOne: vi.fn().mockImplementation(() => Promise.resolve(makePodcast())),
  save: vi.fn().mockImplementation((entity: PodcastEntity) => {
    savedPodcast = { ...entity };
    return Promise.resolve(savedPodcast);
  }),
};

const mockSegmentRepo = {
  find: vi.fn(),
  save: vi.fn().mockImplementation((entity: PodcastSegmentEntity) => Promise.resolve(entity)),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PodcastAudioBuilder', () => {
  let builder: PodcastAudioBuilder;

  beforeEach(async () => {
    vi.clearAllMocks();
    savedPodcast = makePodcast();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PodcastAudioBuilder,
        { provide: TTS_PROVIDER, useValue: mockTts },
        { provide: STORAGE_PROVIDER, useValue: mockStorage },
        { provide: getRepositoryToken(PodcastEntity), useValue: mockPodcastRepo },
        { provide: getRepositoryToken(PodcastSegmentEntity), useValue: mockSegmentRepo },
      ],
    }).compile();

    builder = module.get<PodcastAudioBuilder>(PodcastAudioBuilder);
  });

  it('calls TTS for each segment with the correct voice', async () => {
    const segments = makeSegments([
      'Welcome to SkillCastAI.',
      'Today we discuss API testing.',
      'Great — let us start with definitions.',
    ]);
    mockSegmentRepo.find.mockResolvedValue(segments);

    await builder.build(PODCAST_ID);

    // 3 segments → 3 TTS calls
    expect(mockTts.synthesize).toHaveBeenCalledTimes(3);

    // First segment is HOST (index 0 = even) → alloy voice
    expect(mockTts.synthesize).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ voice: 'alloy' }),
    );
    // Second segment is EXPERT (index 1 = odd) → nova voice
    expect(mockTts.synthesize).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ voice: 'nova' }),
    );
    // Third is HOST again
    expect(mockTts.synthesize).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ voice: 'alloy' }),
    );
  });

  it('uploads full combined audio and each segment audio', async () => {
    const segments = makeSegments(['Hello.', 'Hello back.']);
    mockSegmentRepo.find.mockResolvedValue(segments);

    await builder.build(PODCAST_ID);

    // 2 segment uploads + 1 full upload = 3 total
    expect(mockStorage.upload).toHaveBeenCalledTimes(3);

    // One of the calls must use the full podcast key
    const uploadKeys: string[] = mockStorage.upload.mock.calls.map(
      (c: [{ key: string }]) => c[0].key,
    );
    expect(uploadKeys).toContain(`podcasts/${PODCAST_ID}/full.mp3`);
  });

  it('sets podcast status to READY and audio_url after success', async () => {
    mockSegmentRepo.find.mockResolvedValue(makeSegments(['Hello world.']));

    await builder.build(PODCAST_ID);

    expect(savedPodcast.status).toBe(PodcastStatus.READY);
    expect(savedPodcast.audioUrl).toBeTruthy();
    expect(typeof savedPodcast.audioUrl).toBe('string');
  });

  it('sets durationSeconds > 0', async () => {
    mockSegmentRepo.find.mockResolvedValue(
      makeSegments(['This is a longer sentence for estimating duration correctly.']),
    );

    await builder.build(PODCAST_ID);

    expect(savedPodcast.durationSeconds).toBeGreaterThan(0);
  });

  it('sets podcast status to ERROR if TTS throws', async () => {
    mockSegmentRepo.find.mockResolvedValue(makeSegments(['Fail me.']));
    mockTts.synthesize.mockRejectedValueOnce(new Error('TTS quota exceeded'));

    await expect(builder.build(PODCAST_ID)).rejects.toThrow('TTS quota exceeded');
    expect(savedPodcast.status).toBe(PodcastStatus.ERROR);
  });

  it('throws NotFoundException if podcast does not exist', async () => {
    mockPodcastRepo.findOne.mockResolvedValueOnce(null);
    mockSegmentRepo.find.mockResolvedValue([]);

    await expect(builder.build('nonexistent-id')).rejects.toThrow('not found');
  });
});
