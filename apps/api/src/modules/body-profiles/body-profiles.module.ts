import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BodyProfile } from './body-profile.entity';
import { BodyProfilesService } from './body-profiles.service';
import { BodyProfilesController } from './body-profiles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BodyProfile])],
  controllers: [BodyProfilesController],
  providers: [BodyProfilesService],
  exports: [BodyProfilesService],
})
export class BodyProfilesModule {}
