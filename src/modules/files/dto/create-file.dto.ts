import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { FileStatus } from '../entities/file.entity';

export class CreateFileDto {
  @IsNotEmpty()
  @IsString()
  fileHash: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  size: number;

  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @IsOptional()
  @IsEnum(FileStatus)
  status?: FileStatus;

  @IsOptional()
  @IsString()
  s3Url?: string;

  @IsOptional()
  chunks?: any;
}
