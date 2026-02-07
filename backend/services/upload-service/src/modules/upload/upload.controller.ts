import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('initiate')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async initiate(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('password') password?: string,
  ) {
    if (!file?.buffer)
      throw new BadRequestException(
        'No file uploaded. Send multipart form with key "file".',
      );
    return this.uploadService.initiateUpload(
      user.sub,
      {
        buffer: file.buffer,
        originalname: file.originalname ?? 'statement.pdf',
      },
      password,
    );
  }

  @Get('status/:documentId')
  async getStatus(
    @CurrentUser() user: JwtPayload,
    @Param('documentId') documentId: string,
  ) {
    return this.uploadService.getStatus(user.sub, documentId);
  }

  @Get('documents')
  async listDocuments(@CurrentUser() user: JwtPayload) {
    return this.uploadService.listDocuments(user.sub);
  }
}
