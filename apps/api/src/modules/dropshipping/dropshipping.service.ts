import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { Product } from '../products/product.entity';
import { OrderStatus } from '../orders/order.entity';

export interface TopSellingProduct {
  productId: string;
  sku: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface RestockAlert {
  productId: string;
  sku: string;
  name: string;
  stock: number;
  dailyVelocity: number;
  daysOfStockLeft: number;
  leadTimeDays: number;
}

export interface CategoryDemand {
  categoryId: string;
  categoryName: string;
  activeProducts: number;
  unitsSold: number;
  demandPerProduct: number;
}

const DEFAULT_WINDOW_DAYS = 30;

@Injectable()
export class DropshippingService {
  constructor(
    @InjectRepository(OrderItem) private readonly orderItemsRepo: Repository<OrderItem>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
  ) {}

  /**
   * Productos con más unidades vendidas (pedidos pagados) en la ventana de tiempo.
   * Si se pasa `providerId`, se limita al catálogo de ese proveedor.
   */
  async topSelling(days = DEFAULT_WINDOW_DAYS, limit = 10, providerId?: string): Promise<TopSellingProduct[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const qb = this.orderItemsRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.paidAt >= :since', { since })
      .select('item.productId', 'productId')
      .addSelect('item.sku', 'sku')
      .addSelect('item.productName', 'name')
      .addSelect('SUM(item.quantity)', 'unitsSold')
      .addSelect('SUM(item.subtotal)', 'revenue')
      .groupBy('item.productId')
      .addGroupBy('item.sku')
      .addGroupBy('item.productName')
      .orderBy('"unitsSold"', 'DESC')
      .limit(limit);

    if (providerId) {
      qb.andWhere('item.providerId = :providerId', { providerId });
    }

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      productId: row.productId,
      sku: row.sku,
      name: row.name,
      unitsSold: Number(row.unitsSold),
      revenue: Number(row.revenue),
    }));
  }

  /**
   * Productos que se venden rápido pero cuyo stock actual no alcanza a cubrir el
   * tiempo de entrega del proveedor (`Product.leadTimeDays`) — candidatos a reordenar
   * antes de que se agoten. La "velocidad diaria" sale de ventas reales recientes, no
   * de una proyección — por eso un producto sin ventas en la ventana no genera alerta
   * aunque tenga poco stock (ese caso ya lo cubre InventoryService.findLowStockAlerts).
   */
  async restockAlerts(days = DEFAULT_WINDOW_DAYS, providerId?: string): Promise<RestockAlert[]> {
    const topSelling = await this.topSelling(days, 100, providerId);
    if (topSelling.length === 0) return [];

    const products = await this.productsRepo.findByIds(topSelling.map((t) => t.productId));
    const productById = new Map(products.map((p) => [p.id, p]));

    const alerts: RestockAlert[] = [];
    for (const item of topSelling) {
      const product = productById.get(item.productId);
      if (!product || !product.isActive) continue;

      const dailyVelocity = item.unitsSold / days;
      if (dailyVelocity <= 0) continue;

      const daysOfStockLeft = product.stock / dailyVelocity;
      if (daysOfStockLeft < product.leadTimeDays) {
        alerts.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          stock: product.stock,
          dailyVelocity: Number(dailyVelocity.toFixed(2)),
          daysOfStockLeft: Number(daysOfStockLeft.toFixed(1)),
          leadTimeDays: product.leadTimeDays,
        });
      }
    }

    return alerts.sort((a, b) => a.daysOfStockLeft - b.daysOfStockLeft);
  }

  /**
   * Ranking de categorías por "demanda por producto" (unidades vendidas / cantidad de
   * prendas activas en esa categoría) — una categoría con pocas prendas pero mucha
   * demanda es candidata a que se incorporen más productos allí. Solo tiene sentido a
   * nivel plataforma (las categorías no son propiedad de un proveedor).
   */
  async categoryDemand(days = DEFAULT_WINDOW_DAYS): Promise<CategoryDemand[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const salesRows = await this.orderItemsRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin(Product, 'product', 'product.id = item.productId')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.paidAt >= :since', { since })
      .select('product.categoryId', 'categoryId')
      .addSelect('SUM(item.quantity)', 'unitsSold')
      .groupBy('product.categoryId')
      .getRawMany();

    const countRows = await this.productsRepo
      .createQueryBuilder('product')
      .where('product.isActive = :isActive', { isActive: true })
      .select('product.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'activeProducts')
      .addSelect('category.name', 'categoryName')
      .leftJoin('product.category', 'category')
      .groupBy('product.categoryId')
      .addGroupBy('category.name')
      .getRawMany();

    const salesByCategory = new Map(salesRows.map((r) => [r.categoryId, Number(r.unitsSold)]));

    return countRows
      .map((row) => {
        const activeProducts = Number(row.activeProducts);
        const unitsSold = salesByCategory.get(row.categoryId) ?? 0;
        return {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          activeProducts,
          unitsSold,
          demandPerProduct: activeProducts > 0 ? Number((unitsSold / activeProducts).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => b.demandPerProduct - a.demandPerProduct);
  }
}
