import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ManageQueryProductDto } from './dto/manage-query-product.dto';
import { ActingUser } from '../../common/types/acting-user';
import { Role } from '../../common/enums/role.enum';

export interface ProductWithMargin extends Product {
  margin: number;
  marginPercentage: number;
}

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private readonly repo: Repository<Product>) {}

  private withMargin(product: Product): ProductWithMargin {
    const price = Number(product.price);
    const cost = Number(product.cost);
    const margin = price - cost;
    const marginPercentage = price > 0 ? Number(((margin / price) * 100).toFixed(2)) : 0;
    return { ...product, margin, marginPercentage };
  }

  private assertOwnership(product: Product, actingUser: ActingUser): void {
    if (actingUser.role === Role.ADMIN) return;
    if (actingUser.role === Role.PROVIDER && product.providerId === actingUser.userId) return;
    throw new ForbiddenException('No puedes gestionar prendas que no te pertenecen');
  }

  async findAll(query: QueryProductDto | ManageQueryProductDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.repo.createQueryBuilder('product').leftJoinAndSelect('product.category', 'category');

    if ((query as ManageQueryProductDto).includeInactive !== 'true') {
      qb.andWhere('product.isActive = :isActive', { isActive: true });
    }
    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId: query.categoryId });
    }
    if (query.providerId) {
      qb.andWhere('product.providerId = :providerId', { providerId: query.providerId });
    }
    if (query.search) {
      qb.andWhere('(product.name ILIKE :search OR product.sku ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.lowStock === 'true') {
      qb.andWhere('product.stock <= product.lowStockThreshold');
    }

    qb.orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((item) => this.withMargin(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ProductWithMargin> {
    const product = await this.repo.findOne({ where: { id }, relations: ['category'] });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return this.withMargin(product);
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.repo.findOne({ where: { sku } });
  }

  async create(dto: CreateProductDto, actingUser: ActingUser): Promise<ProductWithMargin> {
    const existing = await this.findBySku(dto.sku);
    if (existing) {
      throw new ConflictException(`Ya existe un producto con el SKU "${dto.sku}"`);
    }
    const providerId = actingUser.role === Role.PROVIDER ? actingUser.userId : dto.providerId ?? null;
    const product = this.repo.create({ ...dto, providerId });
    const saved = await this.repo.save(product);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateProductDto, actingUser: ActingUser): Promise<ProductWithMargin> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    this.assertOwnership(product, actingUser);

    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.findBySku(dto.sku);
      if (existing) {
        throw new ConflictException(`Ya existe un producto con el SKU "${dto.sku}"`);
      }
    }
    // La propiedad de la prenda no se transfiere por esta vía, solo al crearla.
    const { providerId: _ignored, ...updatable } = dto;
    Object.assign(product, updatable);
    await this.repo.save(product);
    return this.findOne(id);
  }

  async remove(id: string, actingUser: ActingUser): Promise<void> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    this.assertOwnership(product, actingUser);
    product.isActive = false;
    await this.repo.save(product);
  }
}
