import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { SetRestockDateDto } from './dto/set-restock-date.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActingUser } from '../../common/types/acting-user';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.PROVIDER)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements')
  adjustStock(@Body() dto: AdjustStockDto, @CurrentUser() user: ActingUser) {
    return this.inventoryService.adjustStock(dto, user);
  }

  @Get('products/:productId/movements')
  findMovements(@Param('productId') productId: string, @CurrentUser() user: ActingUser) {
    return this.inventoryService.findMovementsByProduct(productId, user);
  }

  @Get('alerts/low-stock')
  findLowStockAlerts(@CurrentUser() user: ActingUser) {
    return this.inventoryService.findLowStockAlerts(user);
  }

  @Patch('products/:productId/restock-date')
  setRestockDate(
    @Param('productId') productId: string,
    @Body() dto: SetRestockDateDto,
    @CurrentUser() user: ActingUser,
  ) {
    return this.inventoryService.setRestockDate(productId, dto.restockDate, user);
  }
}
