import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum Speaker {
  HOST = 'host',
  EXPERT = 'expert',
}

@Entity('podcast_segments')
export class PodcastSegmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'podcast_id', type: 'uuid' })
  podcastId!: string;

  @Column({ type: 'enum', enum: Speaker })
  speaker!: Speaker;

  @Column({ type: 'text' })
  text!: string;

  @Column({ name: 'audio_url', type: 'text', nullable: true })
  audioUrl!: string | null;

  @Column({ name: 'sequence_order', type: 'int' })
  sequenceOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
