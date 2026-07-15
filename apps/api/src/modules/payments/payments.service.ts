import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WompiService, WompiWebhookPayload } from './wompi.service';
import { OrderStatus } from '../orders/order.entity';
import { ActingUser } from '../../common/types/acting-user';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly wompiService: WompiService,
  ) {}

  async getCheckoutUrl(orderId: string, actingUser: ActingUser): Promise<{ checkoutUrl: string }> {
    const order = await this.ordersService.findOne(orderId, actingUser);
    return { checkoutUrl: this.wompiService.buildCheckoutUrl(order) };
  }

  private async notifyOutcome(orderId: string, approved: boolean): Promise<void> {
    const order = approved
      ? await this.ordersService.markPaid(orderId, `sim_${Date.now()}`)
      : await this.ordersService.markFailed(orderId);

    const user = await this.usersService.findById(order.userId);
    const target = { email: user.email, phone: order.shippingPhone };

    if (order.status === OrderStatus.PAID) {
      await this.notificationsService.sendOrderConfirmation(order, target);
    } else {
      await this.notificationsService.sendOrderFailed(order, target);
    }
  }

  async handleWebhook(payload: WompiWebhookPayload): Promise<void> {
    const isValid = this.wompiService.verifyWebhookSignature(payload);
    if (!isValid) {
      this.logger.warn(
        `Webhook de Wompi con firma inválida, ignorado (reference=${payload?.data?.transaction?.reference})`,
      );
      return;
    }

    const { reference, status, id } = payload.data.transaction;

    try {
      if (status === 'APPROVED') {
        const order = await this.ordersService.markPaid(reference, id);
        const user = await this.usersService.findById(order.userId);
        await this.notificationsService.sendOrderConfirmation(order, { email: user.email, phone: order.shippingPhone });
      } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(status)) {
        const order = await this.ordersService.markFailed(reference);
        const user = await this.usersService.findById(order.userId);
        await this.notificationsService.sendOrderFailed(order, { email: user.email, phone: order.shippingPhone });
      }
    } catch (error) {
      this.logger.error(`No se pudo procesar el webhook para el pedido ${reference}`, (error as Error).stack);
    }
  }

  async simulatePayment(orderId: string, approve: boolean, actingUser: ActingUser): Promise<void> {
    await this.ordersService.findOne(orderId, actingUser);
    await this.notifyOutcome(orderId, approve);
  }
}
