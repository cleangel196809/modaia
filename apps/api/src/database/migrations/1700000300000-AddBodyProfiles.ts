import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBodyProfiles1700000300000 implements MigrationInterface {
  name = 'AddBodyProfiles1700000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "body_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "heightCm" numeric(6,2) NOT NULL,
        "bustCm" numeric(6,2) NOT NULL,
        "waistCm" numeric(6,2) NOT NULL,
        "hipsCm" numeric(6,2) NOT NULL,
        "shoulderWidthCm" numeric(6,2) NOT NULL,
        "armLengthCm" numeric(6,2) NOT NULL,
        "source" varchar(30) NOT NULL DEFAULT 'mediapipe-estimate',
        "measuredAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_body_profiles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_body_profiles_userId" ON "body_profiles" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "body_profiles"`);
  }
}
