import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('admin', 'provider', 'customer')`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "fullName" varchar(150) NOT NULL,
        "email" varchar(255) NOT NULL,
        "passwordHash" varchar NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'customer',
        "isActive" boolean NOT NULL DEFAULT true,
        "refreshTokenHash" varchar,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(120) NOT NULL,
        "description" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "UQ_categories_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sku" varchar(40) NOT NULL,
        "name" varchar(150) NOT NULL,
        "description" text,
        "categoryId" uuid NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "cost" numeric(12,2) NOT NULL,
        "stock" integer NOT NULL DEFAULT 0,
        "lowStockThreshold" integer NOT NULL DEFAULT 5,
        "leadTimeDays" integer NOT NULL DEFAULT 5,
        "restockDate" date,
        "sizes" text NOT NULL DEFAULT '',
        "colors" text NOT NULL DEFAULT '',
        "material" varchar(100),
        "images" text NOT NULL DEFAULT '',
        "video360Url" varchar,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_products_sku" UNIQUE ("sku"),
        CONSTRAINT "FK_products_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_products_categoryId" ON "products" ("categoryId")`);

    await queryRunner.query(`CREATE TYPE "inventory_movements_type_enum" AS ENUM ('in', 'out', 'adjustment')`);
    await queryRunner.query(`
      CREATE TABLE "inventory_movements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "productId" uuid NOT NULL,
        "type" "inventory_movements_type_enum" NOT NULL,
        "quantity" integer NOT NULL,
        "stockAfter" integer NOT NULL,
        "reason" varchar(255),
        "createdByUserId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_inventory_movements_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inventory_movements_user" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_inventory_movements_productId" ON "inventory_movements" ("productId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_movements"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "inventory_movements_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
