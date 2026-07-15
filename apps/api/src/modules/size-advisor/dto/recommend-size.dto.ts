import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class RecommendSizeDto {
  @ApiPropertyOptional({ description: 'Producto para restringir recomendacion a sus tallas disponibles' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  bustCm?: number;

  @ApiPropertyOptional({ example: 78 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  waistCm?: number;

  @ApiPropertyOptional({ example: 102 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  hipsCm?: number;

  @ApiPropertyOptional({ example: 41 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  shoulderWidthCm?: number;

  @ApiPropertyOptional({ example: 58 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  armLengthCm?: number;

  @ApiPropertyOptional({ example: 165 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  heightCm?: number;

  @ApiPropertyOptional({ enum: ['comfort', 'regular', 'slim'], default: 'regular' })
  @IsOptional()
  @IsIn(['comfort', 'regular', 'slim'])
  stylePreference?: 'comfort' | 'regular' | 'slim';
}
