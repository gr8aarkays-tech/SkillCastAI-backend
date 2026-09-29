import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_progress')
export class UserProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'questions_completed', type: 'int', default: 0 })
  questionsCompleted!: number;

  @Column({ name: 'questions_correct', type: 'int', default: 0 })
  questionsCorrect!: number;

  @Column({ name: 'quiz_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  quizScore!: number | null;

  @Column({ name: 'podcasts_listened', type: 'int', default: 0 })
  podcastsListened!: number;

  @Column({
    name: 'completion_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  completionPercentage!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
