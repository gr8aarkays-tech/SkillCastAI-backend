import {
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { FlashcardService } from './flashcard.service.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}

  /** Get (or generate) flashcards for a source */
  @Get('sources/:sourceId/flashcards')
  getFlashcards(
    @Request() req: { user: { id: string } },
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    return this.flashcardService.getForSource(req.user.id, sourceId);
  }

  /** Mark a flashcard as completed */
  @Post('flashcards/:id/complete')
  @HttpCode(HttpStatus.OK)
  completeFlashcard(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.flashcardService.complete(req.user.id, id);
  }
}
