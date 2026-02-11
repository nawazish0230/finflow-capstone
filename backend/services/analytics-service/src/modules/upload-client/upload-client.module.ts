import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UploadClientService } from './upload-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [UploadClientService],
  exports: [UploadClientService],
})
export class UploadClientModule {}
