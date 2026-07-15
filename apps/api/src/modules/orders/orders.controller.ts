import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActingUser } from '../../common/types/acting-user';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: ActingUser) {
    return this.ordersService.create(user.userId, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: ActingUser) {
    return this.ordersService.findMine(user.userId);
  }

  @Get('provider/items')
  @UseGuards(RolesGuard)
  @Roles(Role.PROVIDER)
  findProviderItems(@CurrentUser() user: ActingUser) {
    return this.ordersService.findItemsForProvider(user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: ActingUser) {
    return this.ordersService.findOne(id, user);
  }
}
