import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { callOpenAiChat } from '../../common/utils/openai.util';

export interface ChatbotReply {
  reply: string;
  products: Pick<Product, 'id' | 'sku' | 'name' | 'price' | 'images'>[];
  source: 'rule-based' | 'openai';
}

const CATEGORY_KEYWORDS = ['blusa', 'blusas', 'chaqueta', 'chaquetas', 'conjunto', 'conjuntos', 'falda', 'faldas', 'vestido', 'vestidos'];

type MinimalProduct = Pick<Product, 'id' | 'sku' | 'name' | 'price' | 'images'>;

const STORE_FACTS = {
  tallas:
    'El usuario puede subir una foto de cuerpo completo en "Mis medidas" para calcular su perfil corporal, y luego ver la talla recomendada en "Tallas IA" para cualquier prenda del catálogo.',
  pago: 'Wompi: tarjeta de crédito/débito, PSE, Nequi y Daviplata. El stock se descuenta automáticamente al confirmarse el pago.',
  envio: 'Envío gratis en compras desde $150.000 COP; por debajo tiene un costo fijo de $12.000. Confirmación por correo y WhatsApp al despachar.',
};

/**
 * Con OPENAI_API_KEY configurada, el texto de la respuesta lo redacta un modelo real —
 * pero la búsqueda de productos SIEMPRE es una consulta real a la base de datos (nunca
 * la inventa el modelo), para no arriesgarnos a que alucine SKUs o precios que no existen.
 * Sin clave, o si la llamada a OpenAI falla, cae al modo por reglas (coincidencia de
 * palabras clave), que sigue siendo genuinamente funcional para las preguntas comunes.
 */
@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    private readonly config: ConfigService,
  ) {}

  async reply(message: string): Promise<ChatbotReply> {
    const apiKey = this.config.get<string>('openai.apiKey');
    if (!apiKey) {
      return this.replyRuleBased(message);
    }
    try {
      return await this.replyWithOpenAi(message, apiKey);
    } catch (error) {
      this.logger.warn(`Falló la respuesta con OpenAI, usando modo por reglas: ${error}`);
      return this.replyRuleBased(message);
    }
  }

  private async findMatchingProducts(text: string): Promise<MinimalProduct[]> {
    const matchedCategory = CATEGORY_KEYWORDS.find((kw) => text.includes(kw));
    if (!matchedCategory && !/busco|recomienda|recomiéndame|quiero/.test(text)) {
      return [];
    }
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
    return products.map((p) => ({ id: p.id, sku: p.sku, name: p.name, price: p.price, images: p.images }));
  }

  private async replyWithOpenAi(message: string, apiKey: string): Promise<ChatbotReply> {
    const products = await this.findMatchingProducts(message.toLowerCase());
    const model = this.config.get<string>('openai.model')!;

    const context = {
      productos_encontrados: products.map((p) => ({ sku: p.sku, nombre: p.name, precio: p.price })),
      ...STORE_FACTS,
    };

    const content = await callOpenAiChat(apiKey, model, [
      {
        role: 'system',
        content:
          'Eres el asistente de la tienda de moda colombiana ModaIA Closet. Responde en español, tono cercano, ' +
          'máximo 3 frases cortas. SOLO puedes mencionar prendas que aparezcan en "productos_encontrados" del ' +
          'contexto — si esa lista está vacía, no inventes ni menciones prendas específicas ni precios. No inventes ' +
          'políticas de tallas/pago/envío fuera de las que te doy en el contexto.',
      },
      {
        role: 'user',
        content: `Mensaje del cliente: "${message}"\n\nContexto real de la tienda (JSON):\n${JSON.stringify(context)}`,
      },
    ]);

    return { reply: content.trim(), products, source: 'openai' };
  }

  private async replyRuleBased(message: string): Promise<ChatbotReply> {
    const text = message.toLowerCase();

    if (/hola|buenas|hey/.test(text)) {
      return this.plain(
        '¡Hola! Soy el asistente de ModaIA Closet 👋 Puedo ayudarte a encontrar una prenda, resolver dudas de talla, pago o envío. ¿Qué necesitas?',
      );
    }

    if (/talla|medida/.test(text)) {
      return this.plain(STORE_FACTS.tallas);
    }

    if (/pago|pagar|wompi|tarjeta|pse/.test(text)) {
      return this.plain(STORE_FACTS.pago);
    }

    if (/envio|envío|entrega|domicilio/.test(text)) {
      return this.plain(STORE_FACTS.envio);
    }

    const matchedCategory = CATEGORY_KEYWORDS.find((kw) => text.includes(kw));
    if (matchedCategory || /busco|recomienda|recomiéndame|quiero/.test(text)) {
      const products = await this.findMatchingProducts(text);
      if (products.length > 0) {
        return {
          reply: matchedCategory
            ? `Encontré estas opciones para "${matchedCategory}":`
            : 'Estas son algunas prendas que podrían gustarte:',
          products,
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
