import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { ApplyProviderDto } from './dto/apply-provider.dto';
import { RejectProviderDto } from './dto/reject-provider.dto';
import { QueryProviderDto } from './dto/query-provider.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post('apply')
  apply(@Body() dto: ApplyProviderDto, @CurrentUser() user: { userId: string }) {
    return this.providersService.apply(user.userId, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: { userId: string }) {
    return this.providersService.findMine(user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Query() query: QueryProviderDto) {
    return this.providersService.findAll(query);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  approve(@Param('id') id: string) {
    return this.providersService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  reject(@Param('id') id: string, @Body() dto: RejectProviderDto) {
    return this.providersService.reject(id, dto);
  }
}
