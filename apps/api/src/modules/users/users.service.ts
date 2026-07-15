import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async create(data: { fullName: string; email: string; password: string; role?: Role }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = this.usersRepository.create({
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role ?? Role.CUSTOMER,
    });
    return this.usersRepository.save(user);
  }

  async setRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void> {
    await this.usersRepository.update(userId, { refreshTokenHash });
  }

  async setRole(userId: string, role: Role): Promise<void> {
    await this.usersRepository.update(userId, { role });
  }
}
