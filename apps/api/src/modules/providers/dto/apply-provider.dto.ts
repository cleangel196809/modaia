import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyProviderDto {
  @ApiProperty({ example: 'Confecciones Andina SAS' })
  @IsString()
  @MaxLength(150)
  businessName: string;

  @ApiProperty({ example: '900123456-7' })
  @IsString()
  @MaxLength(50)
  taxId: string;

  @ApiProperty({ example: '+57 300 123 4567' })
  @IsString()
  @MaxLength(30)
  phone: string;

  @ApiProperty({ example: 'Medellín' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
