import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BodyProfile } from '../body-profiles/body-profile.entity';
import { Product } from '../products/product.entity';
import { SizeAdvisorController } from './size-advisor.controller';
import { SizeAdvisorService } from './size-advisor.service';

@Module({
  imports: [TypeOrmModule.forFeature([BodyProfile, Product])],
  controllers: [SizeAdvisorController],
  providers: [SizeAdvisorService],
})
export class SizeAdvisorModule {}
