import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviders1700000100000 implements MigrationInterface {
  name = 'AddProviders1700000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "provider_profiles_status_enum" AS ENUM ('pending', 'approved', 'rejected', 'suspended')`,
    );
    await queryRunner.query(`
      CREATE TABLE "provider_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "businessName" varchar(150) NOT NULL,
        "taxId" varchar(50) NOT NULL,
        "phone" varchar(30) NOT NULL,
        "city" varchar(100) NOT NULL,
        "description" text,
        "status" "provider_profiles_status_enum" NOT NULL DEFAULT 'pending',
        "rejectionReason" varchar,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_provider_profiles_userId" UNIQUE ("userId"),
        CONSTRAINT "FK_provider_profiles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "providerId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_provider" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX "IDX_products_providerId" ON "products" ("providerId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_provider"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_providerId"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "providerId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_profiles"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "provider_profiles_status_enum"`);
  }
}
