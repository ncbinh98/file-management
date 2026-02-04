import { MigrationInterface, QueryRunner } from "typeorm";

export class InitFileManagement1770196616731 implements MigrationInterface {
    name = 'InitFileManagement1770196616731'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."files_status_enum" AS ENUM('PENDING', 'UPLOADED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fileHash" character varying NOT NULL, "name" character varying NOT NULL, "size" bigint NOT NULL, "mimeType" character varying NOT NULL, "status" "public"."files_status_enum" NOT NULL DEFAULT 'PENDING', "s3Url" character varying, "chunks" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "uploadedById" uuid, CONSTRAINT "UQ_d89cbdebb32f5c5f4545205fe4c" UNIQUE ("fileHash"), CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_a525d85f0ac59aa9a971825e1af" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_a525d85f0ac59aa9a971825e1af"`);
        await queryRunner.query(`DROP TABLE "files"`);
        await queryRunner.query(`DROP TYPE "public"."files_status_enum"`);
    }

}
