import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'BLU-FORM-001' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 'Blusa formal manga larga' })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 129900 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 62000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cost: number;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ required: false, example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiProperty({ required: false, example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @ApiProperty({ example: ['XS', 'S', 'M', 'L'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  sizes: string[];

  @ApiProperty({ example: ['Negro', 'Blanco'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  colors: string[];

  @ApiProperty({ required: false, example: 'Algodón 95% - Elastano 5%' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  video360Url?: string;

  @ApiProperty({
    required: false,
    description: 'Solo admin: asignar la prenda a un proveedor. Un proveedor siempre publica a su propio nombre.',
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
