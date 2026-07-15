import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { ActingUser } from '../../common/types/acting-user';
import { Role } from '../../common/enums/role.enum';

export interface GeneratedPost {
  productId: string;
  caption: string;
  hashtags: string[];
  suggestedPlatforms: string[];
  source: 'template-generator';
  disclaimer: string;
}

const CAPTION_TEMPLATES = [
  '✨ Nueva favorita: {name}. {material} con un ajuste que se siente tan bien como se ve. Disponible ahora en ModaIA Closet.',
  '{name} llegó para quedarse en tu clóset 👗 Confeccionada en {material}, perfecta para {category}.',
  'El detalle está en los materiales: {name} en {material}. Descúbrela en nuestro catálogo.',
  '¿Buscas algo para {category}? {name} es la respuesta. Tallas disponibles, envíos a toda Colombia 🇨🇴',
];

const BASE_HASHTAGS = ['#ModaColombiana', '#ModaIACloset', '#HechoEnColombia'];

function slugifyHashtag(text: string): string {
  return (
    '#' +
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
  );
}

/**
 * Genera el copy con PLANTILLAS, no con un modelo de lenguaje real — Azure OpenAI
 * necesita una suscripción/credenciales que no existen en este entorno (mismo
 * problema que Wompi/Azure AI Vision). La forma del resultado (caption + hashtags +
 * plataformas sugeridas) ya es la que necesitaría una integración real; para conectar
 * Azure OpenAI de verdad solo hay que reemplazar `pickCaption()` por una llamada al
 * modelo con el producto como contexto.
 */
@Injectable()
export class MarketingService {
  constructor(@InjectRepository(Product) private readonly productsRepo: Repository<Product>) {}

  async generatePost(productId: string, actingUser: ActingUser): Promise<GeneratedPost> {
    const product = await this.productsRepo.findOne({ where: { id: productId }, relations: ['category'] });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (actingUser.role === Role.PROVIDER && product.providerId !== actingUser.userId) {
      throw new ForbiddenException('No puedes generar contenido para prendas que no te pertenecen');
    }

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
      suggestedPlatforms: ['Instagram', 'WhatsApp Business', 'Pinterest'],
      source: 'template-generator',
      disclaimer:
        'Generado con plantillas, no con IA generativa real — no hay cuenta de Azure OpenAI conectada. Revisa el texto antes de publicarlo.',
    };
  }
}
