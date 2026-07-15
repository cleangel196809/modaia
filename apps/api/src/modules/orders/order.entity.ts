import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total: number;

  @Column({ length: 3, default: 'COP' })
  currency: string;

  @Column({ length: 150 })
  shippingFullName: string;

  @Column({ length: 30 })
  shippingPhone: string;

  @Column({ length: 255 })
  shippingAddress: string;

  @Column({ length: 100 })
  shippingCity: string;

  @Column({ length: 30, default: 'wompi' })
  paymentProvider: string;

  @Column({ type: 'varchar', nullable: true })
  paymentReference?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
