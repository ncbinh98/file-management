import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum FileStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  FAILED = 'FAILED',
}

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  fileHash: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'varchar' })
  mimeType: string;

  @ManyToOne(() => User)
  uploadedBy: User;

  @Column({
    type: 'enum',
    enum: FileStatus,
    default: FileStatus.PENDING,
  })
  status: FileStatus;

  @Column({ type: 'varchar', nullable: true })
  s3Url: string;

  @Column({ type: 'varchar', nullable: true })
  uploadId: string;

  @Column({ type: 'int', default: 0 })
  totalParts: number;

  @Column({ type: 'jsonb', nullable: true })
  chunks: Record<string, string>; // partNumber -> eTag

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
