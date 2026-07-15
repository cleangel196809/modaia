import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../products/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Index()
  @Column()
  orderId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Index()
  @Column()
  productId: string;

  /** Copia del dueño de la prenda al momento de la compra, para el panel "mis pedidos" del proveedor. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  providerId?: string | null;

  /** Snapshot: los datos del producto pueden cambiar después de la compra, la orden refleja lo que se pagó. */
  @Column({ length: 150 })
  productName: string;

  @Column({ length: 40 })
  sku: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  subtotal: number;
}
