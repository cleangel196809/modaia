import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SimulatePaymentDto {
  @ApiProperty({ description: 'true = aprobar el pago simulado, false = rechazarlo' })
  @IsBoolean()
  approve: boolean;
}
