import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';

export interface ChatbotReply {
  reply: string;
  products: Pick<Product, 'id' | 'sku' | 'name' | 'price' | 'images'>[];
  source: 'rule-based';
}

const CATEGORY_KEYWORDS = ['blusa', 'blusas', 'chaqueta', 'chaquetas', 'conjunto', 'conjuntos', 'falda', 'faldas', 'vestido', 'vestidos'];

/**
 * Asistente basado en reglas simples (coincidencia de palabras clave), no un LLM real —
 * Azure OpenAI necesita una suscripción/credenciales que no existen en este entorno
 * (mismo problema que Wompi/Azure AI Vision/tendencias/marketing). Sigue siendo un
 * asistente genuinamente funcional para las preguntas más comunes de la tienda
 * (tallas, pagos, envíos, buscar prendas) — para conectar Azure OpenAI de verdad, este
 * es el único método a reemplazar por una llamada al modelo con el catálogo como contexto.
 */
@Injectable()
export class ChatbotService {
  constructor(@InjectRepository(Product) private readonly productsRepo: Repository<Product>) {}

  async reply(message: string): Promise<ChatbotReply> {
    const text = message.toLowerCase();

    if (/hola|buenas|hey/.test(text)) {
      return this.plain(
        '¡Hola! Soy el asistente de ModaIA Closet 👋 Puedo ayudarte a encontrar una prenda, resolver dudas de talla, pago o envío. ¿Qué necesitas?',
      );
    }

    if (/talla|medida/.test(text)) {
      return this.plain(
        'Para recomendarte una talla exacta, ve a "Mis medidas" y sube una foto de cuerpo completo — con eso calculamos tu perfil corporal. Luego en "Tallas IA" te doy la talla ideal para cualquier prenda del catálogo.',
      );
    }

    if (/pago|pagar|wompi|tarjeta|pse/.test(text)) {
      return this.plain(
        'Aceptamos pago con Wompi (tarjeta de crédito/débito, PSE, Nequi y Daviplata). El pago se confirma automáticamente y ahí mismo se descuenta el stock de tu pedido.',
      );
    }

    if (/envio|envío|entrega|domicilio/.test(text)) {
      return this.plain(
        'El envío es gratis en compras desde $150.000 COP; por debajo de eso tiene un costo fijo de $12.000. Te llega la confirmación por correo y WhatsApp cuando se despacha.',
      );
    }

    const matchedCategory = CATEGORY_KEYWORDS.find((kw) => text.includes(kw));
    if (matchedCategory || /busco|recomienda|recomiéndame|quiero/.test(text)) {
      const products = await this.productsRepo
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .where('product.isActive = :isActive', { isActive: true })
        .andWhere(matchedCategory ? '(product.name ILIKE :kw OR category.name ILIKE :kw)' : '1=1', {
          kw: `%${matchedCategory ?? ''}%`,
        })
        .orderBy('product.createdAt', 'DESC')
        .take(3)
        .getMany();

      if (products.length > 0) {
        return {
          reply: matchedCategory
            ? `Encontré estas opciones para "${matchedCategory}":`
            : 'Estas son algunas prendas que podrían gustarte:',
          products: products.map((p) => ({ id: p.id, sku: p.sku, name: p.name, price: p.price, images: p.images })),
          source: 'rule-based',
        };
      }
    }

    return this.plain(
      'No estoy segura de haber entendido 🙈 Puedo ayudarte con tallas, pagos, envíos, o buscar prendas (ej. "busco una chaqueta"). ¿Con cuál te ayudo?',
    );
  }

  private plain(reply: string): ChatbotReply {
    return { reply, products: [], source: 'rule-based' };
  }
}
