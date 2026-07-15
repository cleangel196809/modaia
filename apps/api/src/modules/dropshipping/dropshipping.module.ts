import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { Product } from '../products/product.entity';
import { DropshippingService } from './dropshipping.service';
import { DropshippingController } from './dropshipping.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrderItem, Product])],
  controllers: [DropshippingController],
  providers: [DropshippingService],
})
export class DropshippingModule {}
