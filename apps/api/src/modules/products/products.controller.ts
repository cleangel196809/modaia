import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ManageQueryProductDto } from './dto/manage-query-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActingUser } from '../../common/types/acting-user';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROVIDER)
  findMine(@Query() query: ManageQueryProductDto, @CurrentUser() user: ActingUser) {
    // Un provider siempre está limitado a lo suyo (se ignora cualquier providerId que
    // mande en la query, para que no pueda ver el costo/margen de otro provider). Un
    // admin gestiona todo el catálogo, así que "mine" para admin es "todo".
    const providerId = user.role === Role.PROVIDER ? user.userId : query.providerId;
    return this.productsService.findMine({ ...query, providerId });
  }

  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get(':id/manage')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROVIDER)
  findOneForManagement(@Param('id') id: string, @CurrentUser() user: ActingUser) {
    return this.productsService.findOneForManagement(id, user);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROVIDER)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: ActingUser) {
    return this.productsService.create(dto, user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROVIDER)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: ActingUser) {
    return this.productsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROVIDER)
  remove(@Param('id') id: string, @CurrentUser() user: ActingUser) {
    return this.productsService.remove(id, user);
  }
}
