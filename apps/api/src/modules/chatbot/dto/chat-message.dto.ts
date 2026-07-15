import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ example: 'busco una chaqueta' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;
}
