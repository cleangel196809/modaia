import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BodyProfile } from '../body-profiles/body-profile.entity';
import { Product } from '../products/product.entity';
import { RecommendSizeDto } from './dto/recommend-size.dto';

type GarmentType = 'top' | 'bottom' | 'dress' | 'outerwear' | 'general';

interface SizeChartRow {
  size: string;
  bust: [number, number];
  waist: [number, number];
  hips: [number, number];
}

interface Metrics {
  bustCm: number;
  waistCm: number;
  hipsCm: number;
  shoulderWidthCm?: number;
  armLengthCm?: number;
  heightCm?: number;
}

const WOMEN_SIZE_CHART: SizeChartRow[] = [
  { size: 'XS', bust: [80, 86], waist: [62, 68], hips: [88, 94] },
  { size: 'S', bust: [87, 93], waist: [69, 75], hips: [95, 101] },
  { size: 'M', bust: [94, 100], waist: [76, 82], hips: [102, 108] },
  { size: 'L', bust: [101, 108], waist: [83, 90], hips: [109, 116] },
  { size: 'XL', bust: [109, 116], waist: [91, 98], hips: [117, 124] },
];

@Injectable()
export class SizeAdvisorService {
  constructor(
    @InjectRepository(BodyProfile) private readonly bodyProfileRepo: Repository<BodyProfile>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  async recommend(userId: string, dto: RecommendSizeDto) {
    const metrics = await this.resolveMetrics(userId, dto);
    const product = dto.productId ? await this.findProduct(dto.productId) : null;
    const garmentType = this.detectGarmentType(product);
    const stylePreference = dto.stylePreference ?? 'regular';

    const allowedSizes = product?.sizes?.length ? product.sizes.map((size) => size.toUpperCase()) : null;
    const candidates = WOMEN_SIZE_CHART.filter((row) => (allowedSizes ? allowedSizes.includes(row.size) : true));

    if (candidates.length === 0) {
      throw new BadRequestException('El producto no tiene tallas configuradas para recomendar');
    }

    const scored = candidates
      .map((row) => {
        const score = this.computeCompatibilityScore(metrics, row, garmentType, stylePreference);
        const fit = this.fitLabel(metrics, row, garmentType, stylePreference);
        return {
          size: row.size,
          compatibilityPercent: Math.round(score * 100),
          fit,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const returnRisk = this.returnRisk(best.compatibilityPercent);

    return {
      recommendedSize: best.size,
      compatibilityPercent: best.compatibilityPercent,
      fit: best.fit,
      returnRisk,
      garmentType,
      stylePreference,
      profileUsed: {
        bustCm: metrics.bustCm,
        waistCm: metrics.waistCm,
        hipsCm: metrics.hipsCm,
        shoulderWidthCm: metrics.shoulderWidthCm,
        armLengthCm: metrics.armLengthCm,
        heightCm: metrics.heightCm,
      },
      alternatives: scored.slice(1, 3).map((item) => ({
        size: item.size,
        compatibilityPercent: item.compatibilityPercent,
        fit: item.fit,
      })),
      message: this.buildMessage(best.size, best.compatibilityPercent, best.fit, returnRisk),
      product: product
        ? {
            id: product.id,
            sku: product.sku,
            name: product.name,
          }
        : undefined,
    };
  }

  private async resolveMetrics(userId: string, dto: RecommendSizeDto): Promise<Metrics> {
    if (dto.bustCm && dto.waistCm && dto.hipsCm) {
      return {
        bustCm: dto.bustCm,
        waistCm: dto.waistCm,
        hipsCm: dto.hipsCm,
        shoulderWidthCm: dto.shoulderWidthCm,
        armLengthCm: dto.armLengthCm,
        heightCm: dto.heightCm,
      };
    }

    const profile = await this.bodyProfileRepo.findOne({
      where: { userId },
      order: { measuredAt: 'DESC' },
    });

    if (!profile) {
      throw new BadRequestException('No encontramos medidas guardadas. Primero registra tu perfil corporal en /medidas.');
    }

    return {
      bustCm: Number(profile.bustCm),
      waistCm: Number(profile.waistCm),
      hipsCm: Number(profile.hipsCm),
      shoulderWidthCm: Number(profile.shoulderWidthCm),
      armLengthCm: Number(profile.armLengthCm),
      heightCm: Number(profile.heightCm),
    };
  }

  private async findProduct(productId: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  private detectGarmentType(product: Product | null): GarmentType {
    if (!product) return 'general';

    const source = `${product.name} ${product.category?.name ?? ''}`.toLowerCase();
    if (source.includes('blusa') || source.includes('camisa') || source.includes('top')) return 'top';
    if (source.includes('pantalon') || source.includes('falda') || source.includes('jean')) return 'bottom';
    if (source.includes('chaqueta') || source.includes('abrigo')) return 'outerwear';
    if (source.includes('vestido') || source.includes('conjunto')) return 'dress';
    return 'general';
  }

  private computeCompatibilityScore(
    metrics: Metrics,
    row: SizeChartRow,
    garmentType: GarmentType,
    stylePreference: 'comfort' | 'regular' | 'slim',
  ): number {
    const weightsByGarment: Record<GarmentType, { bust: number; waist: number; hips: number }> = {
      top: { bust: 0.55, waist: 0.35, hips: 0.1 },
      bottom: { bust: 0.05, waist: 0.5, hips: 0.45 },
      dress: { bust: 0.35, waist: 0.3, hips: 0.35 },
      outerwear: { bust: 0.6, waist: 0.3, hips: 0.1 },
      general: { bust: 0.34, waist: 0.33, hips: 0.33 },
    };

    const styleShift = stylePreference === 'comfort' ? -2 : stylePreference === 'slim' ? 2 : 0;
    const scoreBust = this.rangeScore(metrics.bustCm + styleShift, row.bust[0], row.bust[1]);
    const scoreWaist = this.rangeScore(metrics.waistCm + styleShift, row.waist[0], row.waist[1]);
    const scoreHips = this.rangeScore(metrics.hipsCm + styleShift, row.hips[0], row.hips[1]);

    const w = weightsByGarment[garmentType];
    return scoreBust * w.bust + scoreWaist * w.waist + scoreHips * w.hips;
  }

  private rangeScore(value: number, min: number, max: number): number {
    if (value >= min && value <= max) return 1;

    const buffer = 8;
    if (value < min) {
      const delta = min - value;
      return Math.max(0, 1 - delta / buffer);
    }

    const delta = value - max;
    return Math.max(0, 1 - delta / buffer);
  }

  private fitLabel(
    metrics: Metrics,
    row: SizeChartRow,
    garmentType: GarmentType,
    stylePreference: 'comfort' | 'regular' | 'slim',
  ): string {
    const styleOffset = stylePreference === 'comfort' ? -1 : stylePreference === 'slim' ? 1 : 0;
    const pivot = garmentType === 'bottom' ? metrics.hipsCm : garmentType === 'top' ? metrics.bustCm : metrics.waistCm;
    const range = garmentType === 'bottom' ? row.hips : garmentType === 'top' ? row.bust : row.waist;
    const center = (range[0] + range[1]) / 2;
    const delta = pivot + styleOffset - center;

    if (delta <= -3) return 'Holgado';
    if (delta >= 3) return 'Ajustado';
    return 'Comodo';
  }

  private returnRisk(compatibilityPercent: number): 'low' | 'medium' | 'high' {
    if (compatibilityPercent >= 90) return 'low';
    if (compatibilityPercent >= 75) return 'medium';
    return 'high';
  }

  private buildMessage(
    size: string,
    compatibilityPercent: number,
    fit: string,
    returnRisk: 'low' | 'medium' | 'high',
  ): string {
    const riskLabel = returnRisk === 'low' ? 'bajo' : returnRisk === 'medium' ? 'medio' : 'alto';
    return `Talla sugerida: ${size}. Compatibilidad ${compatibilityPercent}%, ajuste ${fit.toLowerCase()}, riesgo de devolucion ${riskLabel}.`;
  }
}
