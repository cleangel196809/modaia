import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Order } from '../orders/order.entity';

export interface WompiWebhookPayload {
  event: string;
  data: {
    transaction: {
      id: string;
      status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING';
      reference: string;
      amount_in_cents: number;
      currency: string;
    };
  };
  signature: {
    checksum: string;
    properties: string[];
  };
  timestamp: number;
}

@Injectable()
export class WompiService {
  constructor(private readonly config: ConfigService) {}

  private amountInCents(total: number): number {
    return Math.round(total * 100);
  }

  /**
   * Genera la URL del Web Checkout de Wompi (redirect hospedado por ellos).
   * La `reference` es el id del pedido: así el webhook puede encontrarlo directo.
   * Si no hay integrity secret configurado (modo sandbox local sin cuenta real),
   * se omite la firma — Wompi la exige en producción pero el link igual sirve
   * para inspeccionar los parámetros durante desarrollo.
   */
  buildCheckoutUrl(order: Order): string {
    const publicKey = this.config.get<string>('wompi.publicKey')!;
    const baseUrl = this.config.get<string>('wompi.checkoutUrl')!;
    const webAppUrl = this.config.get<string>('webAppUrl')!;
    const amountInCents = this.amountInCents(order.total);
    const currency = order.currency;

    const params = new URLSearchParams({
      'public-key': publicKey,
      currency,
      'amount-in-cents': String(amountInCents),
      reference: order.id,
      'redirect-url': `${webAppUrl}/pedidos/${order.id}`,
    });

    const integritySecret = this.config.get<string>('wompi.integritySecret');
    if (integritySecret) {
      const signature = createHash('sha256')
        .update(`${order.id}${amountInCents}${currency}${integritySecret}`)
        .digest('hex');
      params.set('signature:integrity', signature);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Verifica el checksum del webhook según el esquema documentado por Wompi
   * (concatenar los valores de `signature.properties` en orden + timestamp + events secret,
   * SHA-256 en hex). No se pudo probar contra un webhook real de Wompi en este entorno —
   * validar contra su documentación vigente antes de conectar credenciales de producción.
   */
  verifyWebhookSignature(payload: WompiWebhookPayload): boolean {
    const eventsSecret = this.config.get<string>('wompi.eventsSecret');
    if (!eventsSecret) {
      // Sin secret configurado (modo dev sin cuenta Wompi real) no podemos validar;
      // se acepta el payload para poder seguir probando el flujo localmente.
      return true;
    }

    const values = payload.signature.properties.map((path) => {
      return path.split('.').reduce<any>((obj, key) => obj?.[key], payload);
    });
    const checksum = createHash('sha256')
      .update(`${values.join('')}${payload.timestamp}${eventsSecret}`)
      .digest('hex');

    return checksum === payload.signature.checksum;
  }
}
