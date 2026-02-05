import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { InitiateMultipartDto, ReportPartDto } from './dto/multipart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  create(@Body() createFileDto: CreateFileDto, @Req() req: any) {
    return this.filesService.create(createFileDto, req.user);
  }

  @Get()
  findAll() {
    return this.filesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
    return this.filesService.update(id, updateFileDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.filesService.remove(id);
  }

  @Get(':id/upload-url')
  getUploadUrl(@Param('id') id: string) {
    return this.filesService.getUploadUrl(id);
  }

  @Post('multipart/initiate')
  initiateMultipart(@Body() dto: InitiateMultipartDto, @Req() req: any) {
    return this.filesService.initiateMultipart(dto, req.user);
  }

  @Get(':id/multipart/url/:partNumber')
  getPartUrl(@Param('id') id: string, @Param('partNumber') partNumber: number) {
    return this.filesService.getPartUrl(id, partNumber);
  }

  @Post(':id/multipart/report-part')
  reportPartComplete(@Param('id') id: string, @Body() dto: ReportPartDto) {
    return this.filesService.reportPartComplete(id, dto.partNumber, dto.eTag);
  }

  @Post(':id/multipart/complete')
  completeMultipart(@Param('id') id: string) {
    return this.filesService.completeMultipart(id);
  }

  @Get(':id/multipart/list-parts')
  listPartsS3(@Param('id') id: string) {
    return this.filesService.listPartsS3(id);
  }
}
