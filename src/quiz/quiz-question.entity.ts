import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type QuizOption = 'a' | 'b' | 'c' | 'd';

@Entity('quiz_questions')
export class QuizQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'quiz_id', type: 'uuid' })
  quizId!: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText!: string;

  @Column({ name: 'option_a', type: 'text' })
  optionA!: string;

  @Column({ name: 'option_b', type: 'text' })
  optionB!: string;

  @Column({ name: 'option_c', type: 'text' })
  optionC!: string;

  @Column({ name: 'option_d', type: 'text' })
  optionD!: string;

  @Column({
    name: 'correct_option',
    type: 'enum',
    enum: ['a', 'b', 'c', 'd'],
  })
  correctOption!: QuizOption;

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
