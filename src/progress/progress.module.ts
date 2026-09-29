import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProgressEntity } from './user-progress.entity.js';
import { UserProgressService } from './user-progress.service.js';
import { UserProgressController } from './user-progress.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserProgressEntity])],
  controllers: [UserProgressController],
  providers: [UserProgressService],
  exports: [UserProgressService],
})
export class ProgressModule {}
