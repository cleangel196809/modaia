import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BodyProfilesService } from './body-profiles.service';
import { CreateBodyProfileDto } from './dto/create-body-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActingUser } from '../../common/types/acting-user';

@ApiTags('body-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('body-profiles')
export class BodyProfilesController {
  constructor(private readonly bodyProfilesService: BodyProfilesService) {}

  @Post()
  create(@Body() dto: CreateBodyProfileDto, @CurrentUser() user: ActingUser) {
    return this.bodyProfilesService.create(user.userId, dto);
  }

  @Get('me')
  findLatest(@CurrentUser() user: ActingUser) {
    return this.bodyProfilesService.findLatest(user.userId);
  }

  @Get('me/history')
  findHistory(@CurrentUser() user: ActingUser) {
    return this.bodyProfilesService.findHistory(user.userId);
  }
}
