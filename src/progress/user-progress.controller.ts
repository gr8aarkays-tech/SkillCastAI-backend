import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  UserProgressService,
  type ProgressEventType,
  type ProgressEventPayload,
} from './user-progress.service.js';

class RecordEventDto {
  @IsUUID()
  sourceId!: string;

  @IsEnum(['flashcard_complete', 'quiz_complete', 'podcast_listen', 'question_view'])
  event!: ProgressEventType;

  @IsOptional()
  payload?: ProgressEventPayload;
}

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class UserProgressController {
  constructor(private readonly progressService: UserProgressService) {}

  /** Get all progress for the authenticated user */
  @Get()
  getProgress(@Request() req: { user: { id: string } }) {
    return this.progressService.getForUser(req.user.id);
  }

  /** Record a progress event */
  @Post('event')
  @HttpCode(HttpStatus.OK)
  recordEvent(
    @Request() req: { user: { id: string } },
    @Body() dto: RecordEventDto,
  ) {
    return this.progressService.recordEvent(
      req.user.id,
      dto.sourceId,
      dto.event,
      dto.payload ?? {},
    );
  }
}
