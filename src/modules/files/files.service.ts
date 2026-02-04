import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './entities/file.entity';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
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
    await this.fileRepository.remove(file);
  }
}
