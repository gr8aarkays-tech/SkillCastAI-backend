import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProgressEntity } from './user-progress.entity.js';

export type ProgressEventType =
  | 'flashcard_complete'
  | 'quiz_complete'
  | 'podcast_listen'
  | 'question_view';

export interface ProgressEventPayload {
  /** For quiz_complete: score 0–100 */
  quizScore?: number;
  /** For quiz_complete: number of correct answers */
  correct?: number;
  /** For quiz_complete: total questions */
  total?: number;
}

@Injectable()
export class UserProgressService {
  constructor(
    @InjectRepository(UserProgressEntity)
    private readonly progressRepo: Repository<UserProgressEntity>,
  ) {}

  /** Upsert progress row for user+source, apply event delta */
  async recordEvent(
    userId: string,
    sourceId: string,
    event: ProgressEventType,
    payload: ProgressEventPayload = {},
  ): Promise<UserProgressEntity> {
    let row = await this.progressRepo.findOne({ where: { userId, sourceId } });
    if (!row) {
      row = this.progressRepo.create({ userId, sourceId });
    }

    switch (event) {
      case 'flashcard_complete':
        row.questionsCompleted = (row.questionsCompleted ?? 0) + 1;
        break;
      case 'question_view':
        // nothing extra — just ensure row exists
        break;
      case 'podcast_listen':
        row.podcastsListened = (row.podcastsListened ?? 0) + 1;
        break;
      case 'quiz_complete':
        if (payload.quizScore !== undefined) {
          row.quizScore = payload.quizScore;
        }
        if (payload.correct !== undefined) {
          row.questionsCorrect = payload.correct;
        }
        if (payload.total !== undefined) {
          row.questionsCompleted = Math.max(
            row.questionsCompleted ?? 0,
            payload.total,
          );
        }
        break;
    }

    // Recalculate completion: crude formula — can be refined in Sprint 6
    const completed = row.questionsCompleted ?? 0;
    const target = Math.max(completed, 10); // assume 10 questions as baseline
    row.completionPercentage = Math.min(100, Math.round((completed / target) * 100));

    return this.progressRepo.save(row);
  }

  /** Get all progress rows for a user (one per source) */
  async getForUser(userId: string): Promise<UserProgressEntity[]> {
    return this.progressRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /** Get progress for a single source */
  async getForSource(userId: string, sourceId: string): Promise<UserProgressEntity | null> {
    return this.progressRepo.findOne({ where: { userId, sourceId } });
  }
}
