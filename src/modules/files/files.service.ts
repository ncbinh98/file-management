import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File, FileStatus } from './entities/file.entity';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { User } from '../users/entities/user.entity';
import { S3Service } from '../../infra/s3/s3.service';
import { ConfigService } from '@nestjs/config';
import { InitiateMultipartDto } from './dto/multipart.dto';
import { UserJwtPayload } from '../auth/interfaces/user-jwt-payload.interface';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

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
        uploadId: true,
        totalParts: true,
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
        uploadId: true,
        totalParts: true,
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

  async getUploadUrl(id: string): Promise<any> {
    const file = await this.findOne(id);
    const key = `${file.id}_${file.name}`;
    return await this.s3Service.getPresignedPostUrl(key, file.mimeType);
  }

  async initiateMultipart(
    dto: InitiateMultipartDto,
    user: UserJwtPayload,
  ): Promise<any> {
    const { fileHash, name, size, mimeType, totalParts } = dto;

    // 1. Deduplication: Check if file already exists with same hash
    const existingFile = await this.fileRepository.findOne({
      where: { fileHash },
    });
    if (existingFile) {
      if (existingFile.status === FileStatus.UPLOADED) {
        return {
          id: existingFile.id,
          status: existingFile.status,
          s3Url: existingFile.s3Url,
          message: 'File already exists',
        };
      }

      // 2. Resumption: If PENDING, return existing state
      if (existingFile.status === FileStatus.PENDING && existingFile.uploadId) {
        this.logger.log(`Resuming multipart upload for hash ${fileHash}`);
        return {
          id: existingFile.id,
          uploadId: existingFile.uploadId,
          totalParts: existingFile.totalParts,
          uploadedParts: Object.keys(existingFile.chunks || {}).map(Number),
          status: existingFile.status,
        };
      }
    }

    // 3. Start New: Create file record and initiate S3 upload
    const file = this.fileRepository.create({
      name,
      size,
      mimeType,
      fileHash,
      totalParts,
      uploadedBy: user,
      chunks: {},
    });

    const savedFile = await this.fileRepository.save(file);
    const key = `${savedFile.id}_${name}`;

    const uploadId = await this.s3Service.startMultipartUpload(key, mimeType);
    if (!uploadId) throw new Error('Failed to start multipart upload');

    savedFile.uploadId = uploadId;
    await this.fileRepository.save(savedFile);

    return {
      id: savedFile.id,
      uploadId,
      totalParts,
      uploadedParts: [],
      status: savedFile.status,
    };
  }

  async getPartUrl(id: string, partNumber: number): Promise<any> {
    const file = await this.findOne(id);
    if (!file.uploadId)
      throw new NotFoundException('Multipart upload not initiated');

    const key = `${file.id}_${file.name}`;
    return await this.s3Service.getPresignedUrlForPart(
      key,
      file.uploadId,
      partNumber,
    );
  }

  async reportPartComplete(
    id: string,
    partNumber: number,
    eTag: string,
  ): Promise<any> {
    const file = await this.findOne(id);
    if (!file.uploadId)
      throw new NotFoundException('Multipart upload not initiated');

    if (!file.chunks) file.chunks = {};
    file.chunks[partNumber.toString()] = eTag;

    await this.fileRepository.save(file);

    return {
      uploadedParts: Object.keys(file.chunks).map(Number),
      totalParts: file.totalParts,
      progress: Math.round(
        (Object.keys(file.chunks).length / file.totalParts) * 100,
      ),
    };
  }

  async completeMultipart(id: string): Promise<File> {
    const file = await this.findOne(id);
    if (!file.uploadId)
      throw new NotFoundException('Multipart upload not initiated');

    const uploadedPartsCount = Object.keys(file.chunks || {}).length;
    if (uploadedPartsCount < file.totalParts) {
      throw new ConflictException(
        `Missing parts. Uploaded: ${uploadedPartsCount}, Total: ${file.totalParts}`,
      );
    }

    const key = `${file.id}_${file.name}`;
    const parts = Object.entries(file.chunks).map(([partNumber, eTag]) => ({
      PartNumber: parseInt(partNumber),
      ETag: eTag,
    }));

    await this.s3Service.completeMultipartUpload(key, file.uploadId, parts);

    file.status = FileStatus.UPLOADED;
    file.s3Url = `https://${this.configService.get('s3.bucket')}.s3.${this.configService.get('s3.region')}.amazonaws.com/${key}`;
    return await this.fileRepository.save(file);
  }

  async listPartsS3(id: string): Promise<any> {
    const file = await this.findOne(id);
    if (!file.uploadId)
      throw new NotFoundException('Multipart upload not initiated');

    const key = `${file.id}_${file.name}`;
    return await this.s3Service.listParts(key, file.uploadId);
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
