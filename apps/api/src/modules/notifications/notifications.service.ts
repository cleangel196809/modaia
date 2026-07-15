import { Injectable, Logger } from '@nestjs/common';
import { Order } from '../orders/order.entity';

export interface OrderConfirmationTarget {
  email: string;
  phone: string;
}

/**
 * Envía confirmaciones de pedido. Hoy solo loguea el mensaje — no hay cuenta de
 * SendGrid/Twilio conectada. La forma del método (destinatario + pedido) ya es la
 * que necesitaría una integración real, para no tener que tocar los llamadores
 * (PaymentsService) cuando se conecte un proveedor de verdad.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendOrderConfirmation(order: Order, target: OrderConfirmationTarget): Promise<void> {
    const itemsSummary = order.items?.map((item) => `${item.quantity}x ${item.productName}`).join(', ');
    this.logger.log(
      `[email→${target.email}] [whatsapp→${target.phone}] Pedido ${order.id} confirmado. ` +
        `Total: $${order.total} ${order.currency}. Items: ${itemsSummary}`,
    );
  }

  async sendOrderFailed(order: Order, target: OrderConfirmationTarget): Promise<void> {
    this.logger.warn(
      `[email→${target.email}] [whatsapp→${target.phone}] El pago del pedido ${order.id} no se pudo confirmar.`,
    );
  }
}
