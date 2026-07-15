import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { WompiWebhookPayload } from './wompi.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActingUser } from '../../common/types/acting-user';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Get('wompi/checkout-link/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getCheckoutLink(@Param('orderId') orderId: string, @CurrentUser() user: ActingUser) {
    return this.paymentsService.getCheckoutUrl(orderId, user);
  }

  @Post('wompi/webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() payload: WompiWebhookPayload) {
    return this.paymentsService.handleWebhook(payload);
  }

  /**
   * Solo para desarrollo local: simula la respuesta de Wompi sin necesitar una cuenta
   * real, para poder probar el pipeline completo pago→stock→notificación.
   * No existe en producción.
   */
  @Post('dev/simulate/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  simulate(@Param('orderId') orderId: string, @Body() dto: SimulatePaymentDto, @CurrentUser() user: ActingUser) {
    if (this.config.get<string>('nodeEnv') === 'production') {
      throw new NotFoundException();
    }
    return this.paymentsService.simulatePayment(orderId, dto.approve, user);
  }
}
