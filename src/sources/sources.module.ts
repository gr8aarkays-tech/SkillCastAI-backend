import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '../jobs/jobs.module.js';
import { DocumentEntity } from './document.entity.js';
import { SourceEntity } from './source.entity.js';
import { SourcesController } from './sources.controller.js';
import { SourcesService } from './sources.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SourceEntity, DocumentEntity]),
    JobsModule,
  ],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}
