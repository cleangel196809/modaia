import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectProviderDto {
  @ApiProperty({ required: false, example: 'Falta cámara de comercio vigente' })
  @IsOptional()
  @IsString()
  reason?: string;
}
