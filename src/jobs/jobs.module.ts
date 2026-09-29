import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExtractionModule } from '../extraction/extraction.module.js';
import { DocumentEntity } from '../sources/document.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { QUEUE_SOURCE_PROCESSING } from './jobs.constants.js';
import { SourceProcessingProcessor } from './jobs.processor.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          // ioredis parses REDIS_URL automatically
          lazyConnect: true,
          ...((): object => {
            const url = config.getOrThrow<string>('REDIS_URL');
            return { url };
          })(),
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUE_SOURCE_PROCESSING }),
    TypeOrmModule.forFeature([SourceEntity, DocumentEntity]),
    ExtractionModule,
  ],
  providers: [SourceProcessingProcessor],
  exports: [BullModule],
})
export class JobsModule {}
