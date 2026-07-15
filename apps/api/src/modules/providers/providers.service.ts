import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderProfile, ProviderStatus } from './provider-profile.entity';
import { ApplyProviderDto } from './dto/apply-provider.dto';
import { RejectProviderDto } from './dto/reject-provider.dto';
import { QueryProviderDto } from './dto/query-provider.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(ProviderProfile) private readonly repo: Repository<ProviderProfile>,
    private readonly usersService: UsersService,
  ) {}

  async apply(userId: string, dto: ApplyProviderDto): Promise<ProviderProfile> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException(
        existing.status === ProviderStatus.REJECTED
          ? 'Tu solicitud anterior fue rechazada. Contacta a soporte para volver a aplicar.'
          : 'Ya tienes una solicitud de proveedor registrada',
      );
    }
    const profile = this.repo.create({ ...dto, userId, status: ProviderStatus.PENDING });
    return this.repo.save(profile);
  }

  async findMine(userId: string): Promise<ProviderProfile> {
    const profile = await this.repo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('No tienes una solicitud de proveedor registrada');
    }
    return profile;
  }

  async findAll(query: QueryProviderDto): Promise<ProviderProfile[]> {
    return this.repo.find({
      where: query.status ? { status: query.status } : {},
      relations: ['user'],
      select: {
        id: true,
        userId: true,
        businessName: true,
        taxId: true,
        phone: true,
        city: true,
        description: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        user: { id: true, fullName: true, email: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  private async findOne(id: string): Promise<ProviderProfile> {
    const profile = await this.repo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Solicitud de proveedor no encontrada');
    }
    return profile;
  }

  async approve(id: string): Promise<ProviderProfile> {
    const profile = await this.findOne(id);
    profile.status = ProviderStatus.APPROVED;
    profile.rejectionReason = null;
    await this.repo.save(profile);
    await this.usersService.setRole(profile.userId, Role.PROVIDER);
    return profile;
  }

  async reject(id: string, dto: RejectProviderDto): Promise<ProviderProfile> {
    const profile = await this.findOne(id);
    profile.status = ProviderStatus.REJECTED;
    profile.rejectionReason = dto.reason ?? null;
    return this.repo.save(profile);
  }
}
