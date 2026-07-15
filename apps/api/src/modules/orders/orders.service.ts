import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';
import { InventoryMovement, MovementType } from '../inventory/inventory-movement.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { ActingUser } from '../../common/types/acting-user';
import { Role } from '../../common/enums/role.enum';

const FREE_SHIPPING_THRESHOLD = 150_000;
const FLAT_SHIPPING_COST = 12_000;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemsRepo: Repository<OrderItem>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      let subtotal = 0;
      const items: Partial<OrderItem>[] = [];

      for (const line of dto.items) {
        const product = await manager.findOne(Product, { where: { id: line.productId } });
        if (!product || !product.isActive) {
          throw new BadRequestException(`El producto ${line.productId} ya no está disponible`);
        }
        if (product.stock < line.quantity) {
          throw new BadRequestException(`No hay suficiente stock de "${product.name}"`);
        }
        const unitPrice = Number(product.price);
        const lineSubtotal = unitPrice * line.quantity;
        subtotal += lineSubtotal;

        items.push({
          productId: product.id,
          providerId: product.providerId ?? null,
          productName: product.name,
          sku: product.sku,
          unitPrice,
          quantity: line.quantity,
          subtotal: lineSubtotal,
        });
      }

      const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST;
      const total = subtotal + shippingCost;

      const order = manager.create(Order, {
        userId,
        status: OrderStatus.PENDING_PAYMENT,
        subtotal,
        shippingCost,
        total,
        shippingFullName: dto.shippingFullName,
        shippingPhone: dto.shippingPhone,
        shippingAddress: dto.shippingAddress,
        shippingCity: dto.shippingCity,
        items: items as OrderItem[],
      });

      return manager.save(order);
    });
  }

  private canView(order: Order, actingUser: ActingUser): boolean {
    if (actingUser.role === Role.ADMIN) return true;
    if (order.userId === actingUser.userId) return true;
    if (actingUser.role === Role.PROVIDER) {
      return order.items?.some((item) => item.providerId === actingUser.userId) ?? false;
    }
    return false;
  }

  async findOne(id: string, actingUser: ActingUser): Promise<Order> {
    const order = await this.ordersRepo.findOne({ where: { id }, relations: ['items'] });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (!this.canView(order, actingUser)) {
      throw new ForbiddenException('No puedes ver este pedido');
    }
    return order;
  }

  async findMine(userId: string): Promise<Order[]> {
    return this.ordersRepo.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(query: QueryOrderDto): Promise<Order[]> {
    return this.ordersRepo.find({
      where: query.status ? { status: query.status } : {},
      relations: ['items'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  /** "Mis pedidos" del proveedor: ítems de sus prendas, agrupados por pedido. */
  async findItemsForProvider(providerId: string): Promise<OrderItem[]> {
    return this.orderItemsRepo.find({
      where: { providerId },
      relations: ['order'],
      order: { order: { createdAt: 'DESC' } },
    });
  }

  /**
   * Confirma el pago: descuenta stock de cada ítem (con lock pesimista) y deja rastro en
   * inventory_movements. Si el stock ya no alcanza (carrera entre el checkout y el pago),
   * el pedido pasa a `failed` en vez de sobrevender. Idempotente ante reintentos del webhook.
   */
  async markPaid(orderId: string, paymentReference: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId }, relations: ['items'] });
      if (!order) {
        throw new NotFoundException('Pedido no encontrado');
      }
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        return order;
      }

      for (const item of order.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product || product.stock < item.quantity) {
          order.status = OrderStatus.FAILED;
          return manager.save(order);
        }
        const stockAfter = product.stock - item.quantity;
        product.stock = stockAfter;
        await manager.save(product);

        const movement = manager.create(InventoryMovement, {
          productId: product.id,
          type: MovementType.OUT,
          quantity: item.quantity,
          stockAfter,
          reason: `Venta — pedido ${order.id}`,
        });
        await manager.save(movement);
      }

      order.status = OrderStatus.PAID;
      order.paymentReference = paymentReference;
      order.paidAt = new Date();
      return manager.save(order);
    });
  }

  async markFailed(orderId: string): Promise<Order> {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (order.status === OrderStatus.PENDING_PAYMENT) {
      order.status = OrderStatus.FAILED;
      await this.ordersRepo.save(order);
    }
    return order;
  }
}
