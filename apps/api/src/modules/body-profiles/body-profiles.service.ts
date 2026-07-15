import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BodyProfile } from './body-profile.entity';
import { CreateBodyProfileDto } from './dto/create-body-profile.dto';

@Injectable()
export class BodyProfilesService {
  constructor(@InjectRepository(BodyProfile) private readonly repo: Repository<BodyProfile>) {}

  async create(userId: string, dto: CreateBodyProfileDto): Promise<BodyProfile> {
    const profile = this.repo.create({ ...dto, userId });
    return this.repo.save(profile);
  }

  async findLatest(userId: string): Promise<BodyProfile> {
    const profile = await this.repo.findOne({ where: { userId }, order: { measuredAt: 'DESC' } });
    if (!profile) {
      throw new NotFoundException('Todavía no tienes una medición corporal guardada');
    }
    return profile;
  }

  async findHistory(userId: string): Promise<BodyProfile[]> {
    return this.repo.find({ where: { userId }, order: { measuredAt: 'DESC' }, take: 20 });
  }
}
