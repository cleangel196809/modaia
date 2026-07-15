import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';

export class OrderItemInputDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @ApiProperty({ example: 'Camila Rodríguez' })
  @IsString()
  @MaxLength(150)
  shippingFullName: string;

  @ApiProperty({ example: '+57 300 123 4567' })
  @IsString()
  @MaxLength(30)
  shippingPhone: string;

  @ApiProperty({ example: 'Calle 10 # 20-30, Apto 501' })
  @IsString()
  @MaxLength(255)
  shippingAddress: string;

  @ApiProperty({ example: 'Bogotá' })
  @IsString()
  @MaxLength(100)
  shippingCity: string;
}
