import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File, FileStatus } from './entities/file.entity';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { User } from '../users/entities/user.entity';
import { S3Service } from '../../infra/s3/s3.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  async create(createFileDto: CreateFileDto, user: User): Promise<File> {
    const file = this.fileRepository.create({
      ...createFileDto,
      uploadedBy: user,
    });
    return await this.fileRepository.save(file);
  }

  async findAll(): Promise<File[]> {
    return await this.fileRepository.find({
      relations: { uploadedBy: true },
      select: {
        id: true,
        fileHash: true,
        name: true,
        size: true,
        mimeType: true,
        status: true,
        s3Url: true,
        chunks: true,
        createdAt: true,
        updatedAt: true,
        uploadedBy: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    });
  }

  async findOne(id: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id },
      relations: { uploadedBy: true },
      select: {
        id: true,
        fileHash: true,
        name: true,
        size: true,
        mimeType: true,
        status: true,
        s3Url: true,
        chunks: true,
        createdAt: true,
        updatedAt: true,
        uploadedBy: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    });
    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }
    return file;
  }

  async update(id: string, updateFileDto: UpdateFileDto): Promise<File> {
    const file = await this.findOne(id);
    Object.assign(file, updateFileDto);
    return await this.fileRepository.save(file);
  }

  async remove(id: string): Promise<void> {
    const file = await this.findOne(id);
    if (file.s3Url) {
      const key = `${file.id}_${file.name}`;
      await this.s3Service.deleteFile(key);
    }
    await this.fileRepository.remove(file);
  }

  async getUploadUrl(id: string): Promise<string> {
    const file = await this.findOne(id);
    const key = `${file.id}_${file.name}`;
    return await this.s3Service.getPresignedPostUrl(key, file.mimeType);
  }

  async handleS3Event(event: any): Promise<void> {
    const detail = event.detail;
    const bucketName = detail.bucket.name;
    const objectKey = detail.object.key;

    // Expected key format: {fileId}_{fileName}
    const fileId = objectKey.split('_')[0];

    try {
      const file = await this.findOne(fileId);
      if (file) {
        file.status = FileStatus.UPLOADED;
        file.s3Url = `https://${bucketName}.s3.${this.configService.get('s3.region')}.amazonaws.com/${objectKey}`;
        await this.fileRepository.save(file);
      }
    } catch (error) {
      // If file not found, we might want to log it but not fail the webhook
      console.error(
        `Error handling S3 event for key ${objectKey}:`,
        error.message,
      );
    }
  }
}
