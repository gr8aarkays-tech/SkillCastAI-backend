import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { QuizService } from './quiz.service.js';
import type { QuizOption } from './quiz-question.entity.js';

class SubmitAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsEnum(['a', 'b', 'c', 'd'])
  selected!: QuizOption;
}

class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}

@Controller()
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /** Get or create a quiz for a source */
  @Post('sources/:sourceId/quiz')
  @HttpCode(HttpStatus.OK)
  async getOrCreateQuiz(
    @Request() req: { user: { id: string } },
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    const quiz = await this.quizService.getOrCreateForSource(req.user.id, sourceId);
    const { questions } = await this.quizService.getWithQuestions(req.user.id, quiz.id);
    return { quiz, questions };
  }

  /** Submit answers and get scored result */
  @Post('quizzes/:id/submit')
  @HttpCode(HttpStatus.OK)
  submitQuiz(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizService.submit(req.user.id, id, dto.answers);
  }
}
