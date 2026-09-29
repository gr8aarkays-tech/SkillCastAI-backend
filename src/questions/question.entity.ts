import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('questions')
export class QuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'topic_id', type: 'uuid' })
  topicId!: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText!: string;

  @Column({ name: 'quick_answer', type: 'text', nullable: true })
  quickAnswer!: string | null;

  @Column({ name: 'detailed_answer', type: 'text', nullable: true })
  detailedAnswer!: string | null;

  @Column({ name: 'role_specific_explanation', type: 'text', nullable: true })
  roleSpecificExplanation!: string | null;

  @Column({ name: 'practical_example', type: 'text', nullable: true })
  practicalExample!: string | null;

  @Column({ name: 'interview_answer', type: 'text', nullable: true })
  interviewAnswer!: string | null;

  @Column({ name: 'follow_up_question', type: 'text', nullable: true })
  followUpQuestion!: string | null;

  /** The role this question was generated for */
  @Column({ type: 'text', nullable: true })
  role!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
