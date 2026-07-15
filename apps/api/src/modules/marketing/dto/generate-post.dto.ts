import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GeneratePostDto {
  @ApiProperty()
  @IsUUID()
  productId: string;
}
