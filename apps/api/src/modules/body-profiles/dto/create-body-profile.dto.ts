import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

export class CreateBodyProfileDto {
  @ApiProperty({ example: 165 })
  @IsNumber()
  @IsPositive()
  heightCm: number;

  @ApiProperty({ example: 92 })
  @IsNumber()
  @IsPositive()
  bustCm: number;

  @ApiProperty({ example: 74 })
  @IsNumber()
  @IsPositive()
  waistCm: number;

  @ApiProperty({ example: 98 })
  @IsNumber()
  @IsPositive()
  hipsCm: number;

  @ApiProperty({ example: 38 })
  @IsNumber()
  @IsPositive()
  shoulderWidthCm: number;

  @ApiProperty({ example: 56 })
  @IsNumber()
  @IsPositive()
  armLengthCm: number;

  @ApiProperty({ required: false, default: 'mediapipe-estimate' })
  @IsOptional()
  @IsString()
  source?: string;
}
