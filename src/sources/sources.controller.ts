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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateTextSourceDto, CreateUrlSourceDto } from './dto/create-source.dto.js';
import { SourcesService } from './sources.service.js';

const pdfMulterOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (_req, _file, cb) => {
      cb(null, `${randomUUID()}${extname(_file.originalname)}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'), false);
    }
  },
};

@Controller('sources')
@UseGuards(JwtAuthGuard)
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  /** Upload a PDF file */
  @Post('pdf')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', pdfMulterOptions))
  uploadPdf(
    @Request() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    if (!file) throw new Error('No file uploaded');
    return this.sourcesService.createFromFile(req.user.id, file, title);
  }

  /** Submit pasted text */
  @Post('text')
  @HttpCode(HttpStatus.CREATED)
  uploadText(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateTextSourceDto,
  ) {
    return this.sourcesService.createFromText(req.user.id, dto);
  }

  /** Submit a public URL */
  @Post('url')
  @HttpCode(HttpStatus.CREATED)
  uploadUrl(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateUrlSourceDto,
  ) {
    return this.sourcesService.createFromUrl(req.user.id, dto);
  }

  /** List all sources for the authenticated user */
  @Get()
  findAll(@Request() req: { user: { id: string } }) {
    return this.sourcesService.findAllByUser(req.user.id);
  }

  /** Poll processing status */
  @Get(':id/status')
  getStatus(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sourcesService.findStatus(req.user.id, id);
  }
}
