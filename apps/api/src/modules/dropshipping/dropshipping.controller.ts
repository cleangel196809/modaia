import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DropshippingService } from './dropshipping.service';
import { QueryInsightsDto } from './dto/query-insights.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActingUser } from '../../common/types/acting-user';

@ApiTags('dropshipping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.PROVIDER)
@Controller('dropshipping')
export class DropshippingController {
  constructor(private readonly dropshippingService: DropshippingService) {}

  @Get('top-selling')
  topSelling(@Query() query: QueryInsightsDto, @CurrentUser() user: ActingUser) {
    const providerId = user.role === Role.PROVIDER ? user.userId : undefined;
    return this.dropshippingService.topSelling(query.days, query.limit, providerId);
  }

  @Get('restock-alerts')
  restockAlerts(@Query() query: QueryInsightsDto, @CurrentUser() user: ActingUser) {
    const providerId = user.role === Role.PROVIDER ? user.userId : undefined;
    return this.dropshippingService.restockAlerts(query.days, providerId);
  }

  @Get('category-demand')
  @Roles(Role.ADMIN)
  categoryDemand(@Query() query: QueryInsightsDto) {
    return this.dropshippingService.categoryDemand(query.days);
  }
}
