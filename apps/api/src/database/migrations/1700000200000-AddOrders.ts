import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrders1700000200000 implements MigrationInterface {
  name = 'AddOrders1700000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "orders_status_enum" AS ENUM ('pending_payment', 'paid', 'failed', 'cancelled')`,
    );
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "status" "orders_status_enum" NOT NULL DEFAULT 'pending_payment',
        "subtotal" numeric(12,2) NOT NULL,
        "shippingCost" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'COP',
        "shippingFullName" varchar(150) NOT NULL,
        "shippingPhone" varchar(30) NOT NULL,
        "shippingAddress" varchar(255) NOT NULL,
        "shippingCity" varchar(100) NOT NULL,
        "paymentProvider" varchar(30) NOT NULL DEFAULT 'wompi',
        "paymentReference" varchar,
        "paidAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_orders_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_orders_userId" ON "orders" ("userId")`);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "providerId" uuid,
        "productName" varchar(150) NOT NULL,
        "sku" varchar(40) NOT NULL,
        "unitPrice" numeric(12,2) NOT NULL,
        "quantity" integer NOT NULL,
        "subtotal" numeric(12,2) NOT NULL,
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_order_items_orderId" ON "order_items" ("orderId")`);
    await queryRunner.query(`CREATE INDEX "IDX_order_items_productId" ON "order_items" ("productId")`);
    await queryRunner.query(`CREATE INDEX "IDX_order_items_providerId" ON "order_items" ("providerId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_status_enum"`);
  }
}
