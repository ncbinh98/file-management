import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../shared/guards/api-key.guard';
import { FilesService } from './files.service';

@Controller('infra/s3/webhook')
export class S3WebhookController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() event: any) {
    // AWS EventBridge Event for S3 typically has 'source': 'aws.s3'
    if (event.source === 'aws.s3') {
      await this.filesService.handleS3Event(event);
    }

    return { received: true };
  }
}
