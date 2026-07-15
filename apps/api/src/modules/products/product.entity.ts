import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { User } from '../users/user.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 40 })
  sku: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => Category, (category) => category.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  categoryId: string;

  /** Confeccionista dueño de la prenda. Nulo = catálogo propio de la plataforma. */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'providerId' })
  provider?: User;

  @Column({ type: 'uuid', nullable: true })
  providerId?: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  cost: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 5 })
  lowStockThreshold: number;

  @Column({ type: 'int', default: 5 })
  leadTimeDays: number;

  @Column({ type: 'date', nullable: true })
  restockDate?: string;

  @Column({ type: 'simple-array', default: '' })
  sizes: string[];

  @Column({ type: 'simple-array', default: '' })
  colors: string[];

  @Column({ length: 100, nullable: true })
  material?: string;

  @Column({ type: 'simple-array', default: '' })
  images: string[];

  @Column({ nullable: true })
  video360Url?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
