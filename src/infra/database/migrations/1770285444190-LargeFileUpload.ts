import { MigrationInterface, QueryRunner } from "typeorm";

export class LargeFileUpload1770285444190 implements MigrationInterface {
    name = 'LargeFileUpload1770285444190'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" ADD "uploadId" character varying`);
        await queryRunner.query(`ALTER TABLE "files" ADD "totalParts" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "totalParts"`);
        await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "uploadId"`);
    }

}
