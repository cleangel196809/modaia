import { Injectable } from '@nestjs/common';

export interface TrendItem {
  label: string;
  score: number;
}

export interface TrendsSnapshot {
  generatedAt: string;
  source: 'example-data';
  disclaimer: string;
  colors: TrendItem[];
  styles: TrendItem[];
  hashtags: TrendItem[];
}

/**
 * NO conecta a Instagram/TikTok/Pinterest/Google Trends de verdad — esas APIs necesitan
 * cuentas de negocio y credenciales que no existen en este entorno (mismo problema que
 * Wompi/Azure AI Vision). Esto devuelve un dataset de ejemplo fijo, para dejar armados el
 * contrato de API, el frontend y el punto de integración exactos. Cuando haya credenciales
 * reales, este método es el único lugar que hay que reemplazar — llamar a la API externa
 * correspondiente y mapear su respuesta a `TrendsSnapshot`.
 */
@Injectable()
export class TrendsService {
  getSnapshot(): TrendsSnapshot {
    return {
      generatedAt: new Date().toISOString(),
      source: 'example-data',
      disclaimer:
        'Datos de ejemplo — no conectado a Instagram/TikTok/Pinterest/Google Trends todavía. Ver TrendsService.getSnapshot().',
      colors: [
        { label: 'Terracota', score: 92 },
        { label: 'Verde oliva', score: 87 },
        { label: 'Marfil', score: 81 },
        { label: 'Negro carbón', score: 78 },
        { label: 'Dorado', score: 65 },
      ],
      styles: [
        { label: 'Oversized', score: 89 },
        { label: 'Minimalista', score: 84 },
        { label: 'Blazer estructurado', score: 76 },
        { label: 'Conjuntos de dos piezas', score: 74 },
        { label: 'Corte vintage', score: 61 },
      ],
      hashtags: [
        { label: '#ModaColombiana', score: 95 },
        { label: '#OOTD', score: 90 },
        { label: '#EstiloBogota', score: 72 },
        { label: '#ModaSostenible', score: 68 },
        { label: '#HechoEnColombia', score: 64 },
      ],
    };
  }
}
