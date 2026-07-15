import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { MovementType } from '../inventory-movement.entity';

export class AdjustStockDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: MovementType })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ example: 10, description: 'Cantidad a mover (siempre positiva)' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ required: false, example: 'Reposición de proveedor' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
