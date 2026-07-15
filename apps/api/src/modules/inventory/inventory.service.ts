import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryMovement, MovementType } from './inventory-movement.entity';
import { Product } from '../products/product.entity';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ActingUser } from '../../common/types/acting-user';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryMovement) private readonly movementsRepo: Repository<InventoryMovement>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
  ) {}

  private assertOwnership(product: Product, actingUser: ActingUser): void {
    if (actingUser.role === Role.ADMIN) return;
    if (actingUser.role === Role.PROVIDER && product.providerId === actingUser.userId) return;
    throw new ForbiddenException('No puedes gestionar el inventario de prendas que no te pertenecen');
  }

  async adjustStock(dto: AdjustStockDto, actingUser: ActingUser): Promise<InventoryMovement> {
    return this.movementsRepo.manager.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: dto.productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }
      this.assertOwnership(product, actingUser);

      const delta = dto.type === MovementType.OUT ? -dto.quantity : dto.quantity;
      const newStock = product.stock + delta;
      if (newStock < 0) {
        throw new ConflictException('El movimiento dejaría el stock en negativo');
      }

      product.stock = newStock;
      await manager.save(product);

      const movement = manager.create(InventoryMovement, {
        productId: product.id,
        type: dto.type,
        quantity: dto.quantity,
        stockAfter: newStock,
        reason: dto.reason,
        createdByUserId: actingUser.userId,
      });
      return manager.save(movement);
    });
  }

  async findMovementsByProduct(productId: string, actingUser: ActingUser): Promise<InventoryMovement[]> {
    const product = await this.productsRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    this.assertOwnership(product, actingUser);

    return this.movementsRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findLowStockAlerts(actingUser: ActingUser): Promise<Product[]> {
    const qb = this.productsRepo
      .createQueryBuilder('product')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.stock <= product.lowStockThreshold');

    if (actingUser.role === Role.PROVIDER) {
      qb.andWhere('product.providerId = :providerId', { providerId: actingUser.userId });
    }

    return qb.orderBy('product.stock', 'ASC').getMany();
  }

  async setRestockDate(productId: string, restockDate: string, actingUser: ActingUser): Promise<Product> {
    const product = await this.productsRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    this.assertOwnership(product, actingUser);
    product.restockDate = restockDate;
    return this.productsRepo.save(product);
  }
}
