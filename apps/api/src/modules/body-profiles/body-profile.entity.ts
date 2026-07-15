import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('body_profiles')
export class BodyProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  heightCm: number;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  bustCm: number;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  waistCm: number;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  hipsCm: number;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  shoulderWidthCm: number;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  armLengthCm: number;

  /** Cómo se obtuvo la medida: hoy siempre estimación heurística por landmarks 2D. */
  @Column({ length: 30, default: 'mediapipe-estimate' })
  source: string;

  @CreateDateColumn()
  measuredAt: Date;
}
