import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  DEVELOPER = 'developer',
  TESTER = 'tester',
  ARCHITECT = 'architect',
  MANAGER = 'manager',
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Entity('profiles')
export class ProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * References auth.users(id) in Supabase — enforced in the DB migration.
   * TypeORM does not manage cross-schema FKs, so we store it as a plain uuid column.
   */
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ type: 'enum', enum: UserRole, nullable: true })
  role!: UserRole | null;

  @Column({
    name: 'experience_level',
    type: 'enum',
    enum: ExperienceLevel,
    nullable: true,
  })
  experienceLevel!: ExperienceLevel | null;

  @Column({ name: 'learning_goal', type: 'text', nullable: true })
  learningGoal!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
