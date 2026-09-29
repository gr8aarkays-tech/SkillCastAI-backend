import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('flashcards')
export class FlashcardEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId!: string;

  @Column({ name: 'front_text', type: 'text' })
  frontText!: string;

  @Column({ name: 'back_text', type: 'text' })
  backText!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
