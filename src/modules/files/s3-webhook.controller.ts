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

  /* 
  example response
    {
    version: '0',
    id: 'f7fe3fa2-572d-93d3-721e-5e93ec1971ba',
    'detail-type': 'Object Created',
    source: 'aws.s3',
    account: '269657587864',
    time: '2026-02-04T13:28:22Z',
    region: 'ap-southeast-1',
    resources: [ 'arn:aws:s3:::bin-dropbox-demo' ],
    detail: {
      version: '0',
      bucket: { name: 'bin-dropbox-demo' },
      object: {
        key: 'a36a0d2d-cbe8-4b8e-9b36-eb062b3a0140_LOCAL_TEST.jpg',
        size: 0,
        etag: 'd41d8cd98f00b204e9800998ecf8427e',
        sequencer: '0069834976A7539EA1'
      },
      'request-id': 'BB7PD6C31HNYPNWT',
      requester: '269657587864',
      'source-ip-address': '27.74.202.247',
      reason: 'PutObject'
    }
  }
  */
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
