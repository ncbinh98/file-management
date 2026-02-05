import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class InitiateMultipartDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  size: number;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  fileHash: string;

  @IsInt()
  @Min(1)
  totalParts: number;
}

export class GetPartUrlDto {
  @IsInt()
  @Min(1)
  partNumber: number;
}

export class ReportPartDto {
  @IsInt()
  @Min(1)
  partNumber: number;

  @IsString()
  @IsNotEmpty()
  eTag: string;
}
