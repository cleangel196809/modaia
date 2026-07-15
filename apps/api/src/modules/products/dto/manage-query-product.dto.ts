import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { QueryProductDto } from './query-product.dto';

export class ManageQueryProductDto extends QueryProductDto {
  @ApiPropertyOptional({ description: 'Incluir prendas desactivadas (solo dueño/admin)' })
  @IsOptional()
  @IsBooleanString()
  includeInactive?: string;
}
