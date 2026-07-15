import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { ActingUser } from '../../common/types/acting-user';
import { Role } from '../../common/enums/role.enum';
import { callOpenAiChat } from '../../common/utils/openai.util';

export interface GeneratedPost {
  productId: string;
  caption: string;
  hashtags: string[];
  suggestedPlatforms: string[];
  source: 'template-generator' | 'openai';
  disclaimer: string;
}

const CAPTION_TEMPLATES = [
  '✨ Nueva favorita: {name}. {material} con un ajuste que se siente tan bien como se ve. Disponible ahora en ModaIA Closet.',
  '{name} llegó para quedarse en tu clóset 👗 Confeccionada en {material}, perfecta para {category}.',
  'El detalle está en los materiales: {name} en {material}. Descúbrela en nuestro catálogo.',
  '¿Buscas algo para {category}? {name} es la respuesta. Tallas disponibles, envíos a toda Colombia 🇨🇴',
];

const BASE_HASHTAGS = ['#ModaColombiana', '#ModaIACloset', '#HechoEnColombia'];
const SUGGESTED_PLATFORMS = ['Instagram', 'WhatsApp Business', 'Pinterest'];

function slugifyHashtag(text: string): string {
  return (
    '#' +
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
  );
}

function templateCaption(product: Product): GeneratedPost {
  const template = CAPTION_TEMPLATES[Math.floor(Math.random() * CAPTION_TEMPLATES.length)];
  const caption = template
    .replace('{name}', product.name)
    .replace('{material}', product.material ?? 'materiales de calidad')
    .replace('{category}', product.category?.name?.toLowerCase() ?? 'tu día a día');

  const hashtags = [
    ...BASE_HASHTAGS,
    slugifyHashtag(product.category?.name ?? ''),
    ...(product.colors ?? []).slice(0, 2).map(slugifyHashtag),
  ].filter((tag) => tag.length > 1);

  return {
    productId: product.id,
    caption,
    hashtags: Array.from(new Set(hashtags)),
    suggestedPlatforms: SUGGESTED_PLATFORMS,
    source: 'template-generator',
    disclaimer:
      'Generado con plantillas, no con IA generativa real — no hay OPENAI_API_KEY configurada (o falló la llamada). Revisa el texto antes de publicarlo.',
  };
}

/**
 * Con OPENAI_API_KEY configurada genera el copy con un modelo real (contexto = los
 * datos reales del producto, nunca inventados). Sin clave, o si la llamada falla,
 * cae al generador de plantillas — el generador nunca deja al usuario sin contenido.
 */
@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    private readonly config: ConfigService,
  ) {}

  async generatePost(productId: string, actingUser: ActingUser): Promise<GeneratedPost> {
    const product = await this.productsRepo.findOne({ where: { id: productId }, relations: ['category'] });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (actingUser.role === Role.PROVIDER && product.providerId !== actingUser.userId) {
      throw new ForbiddenException('No puedes generar contenido para prendas que no te pertenecen');
    }

    const apiKey = this.config.get<string>('openai.apiKey');
    if (!apiKey) {
      return templateCaption(product);
    }

    try {
      const model = this.config.get<string>('openai.model')!;
      const raw = await callOpenAiChat(
        apiKey,
        model,
        [
          {
            role: 'system',
            content:
              'Eres el redactor de contenido para redes sociales de ModaIA Closet, una tienda de moda colombiana. ' +
              'Escribe en español, tono cercano y profesional, máximo 280 caracteres para el caption. ' +
              'Responde ÚNICAMENTE con un JSON con esta forma exacta, sin texto extra: ' +
              '{"caption": string, "hashtags": string[]}. Los hashtags empiezan con # y son 4-6, sin espacios.',
          },
          {
            role: 'user',
            content: `Producto: ${product.name}. Material: ${product.material ?? 'no especificado'}. Categoría: ${
              product.category?.name ?? 'no especificada'
            }. Colores disponibles: ${(product.colors ?? []).join(', ') || 'no especificados'}. Precio: $${product.price} COP.`,
          },
        ],
        true,
      );

      const parsed = JSON.parse(raw) as { caption: string; hashtags: string[] };
      if (!parsed.caption || !Array.isArray(parsed.hashtags) || parsed.hashtags.length === 0) {
        throw new Error('Respuesta de OpenAI con forma inesperada');
      }

      return {
        productId: product.id,
        caption: parsed.caption,
        hashtags: parsed.hashtags,
        suggestedPlatforms: SUGGESTED_PLATFORMS,
        source: 'openai',
        disclaimer: 'Generado con IA (OpenAI) a partir de los datos reales del producto. Revisa el texto antes de publicarlo.',
      };
    } catch (error) {
      this.logger.warn(`Falló la generación con OpenAI, usando plantillas: ${error}`);
      return templateCaption(product);
    }
  }
}
