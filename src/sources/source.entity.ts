import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SourceType {
  PDF = 'pdf',
  URL = 'url',
  TEXT = 'text',
}

export enum SourceStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
}

@Entity('sources')
export class SourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: SourceType })
  type!: SourceType;

  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @Column({ name: 'raw_url', type: 'text', nullable: true })
  rawUrl!: string | null;

  @Column({ name: 'file_path', type: 'text', nullable: true })
  filePath!: string | null;

  @Column({ type: 'enum', enum: SourceStatus, default: SourceStatus.PENDING })
  status!: SourceStatus;

  /** Stores error details when status = error */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
