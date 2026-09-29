import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { LibraryService } from './library.service.js';

@Controller('library')
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  /** Get the authenticated user's full content library with aggregated stats */
  @Get()
  getLibrary(@Request() req: { user: { id: string } }) {
    return this.libraryService.getForUser(req.user.id);
  }
}
