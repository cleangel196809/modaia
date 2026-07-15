import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchGoogleTrendsInterest } from '../../common/utils/serpapi.util';

export interface TrendItem {
  label: string;
  score: number;
}

export interface TrendsSnapshot {
  generatedAt: string;
  source: 'example-data' | 'google-trends';
  disclaimer: string;
  colors: TrendItem[];
  styles: TrendItem[];
  hashtags: TrendItem[];
}

// Términos curados en español (Colombia) — Google Trends no tiene una categoría nativa
// de "colores de moda" ni "estilos de moda", así que comparamos interés de búsqueda real
// para una lista fija representativa de cada una (máx. 5 por llamada, límite de Google).
const STYLE_TERMS = ['blazer oversized', 'conjunto dos piezas', 'vestido midi', 'jean colombiano', 'ropa minimalista'];
const COLOR_TERMS = ['blusa terracota', 'vestido verde oliva', 'chaqueta negra', 'ropa color marfil', 'top dorado'];

function slugifyHashtag(text: string): string {
  return (
    '#' +
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
  );
}

const EXAMPLE_SNAPSHOT: Omit<TrendsSnapshot, 'generatedAt'> = {
  source: 'example-data',
  disclaimer:
    'Datos de ejemplo — no hay SERPAPI_KEY configurada (o falló la llamada a Google Trends). Ver TrendsService.getSnapshot().',
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

@Injectable()
export class TrendsService {
  private readonly logger = new Logger(TrendsService.name);

  constructor(private readonly config: ConfigService) {}

  async getSnapshot(): Promise<TrendsSnapshot> {
    const apiKey = this.config.get<string>('serpapi.apiKey');
    if (!apiKey) {
      return { generatedAt: new Date().toISOString(), ...EXAMPLE_SNAPSHOT };
    }

    try {
      const geo = this.config.get<string>('serpapi.geo')!;
      const [styles, colors] = await Promise.all([
        fetchGoogleTrendsInterest(apiKey, STYLE_TERMS, geo),
        fetchGoogleTrendsInterest(apiKey, COLOR_TERMS, geo),
      ]);
      const sortedStyles = [...styles].sort((a, b) => b.score - a.score);
      const sortedColors = [...colors].sort((a, b) => b.score - a.score);

      // Google Trends no expone volumen de hashtags (eso es un dato propio de Instagram/TikTok,
      // sin API accesible): los sugerimos combinando la marca con el color/estilo de mayor
      // interés real, en vez de inventar un número de "score" de hashtag que no existe.
      const hashtags: TrendItem[] = [
        { label: '#ModaColombiana', score: 95 },
        { label: '#OOTD', score: 85 },
        ...(sortedStyles[0] ? [{ label: slugifyHashtag(sortedStyles[0].label), score: sortedStyles[0].score }] : []),
        ...(sortedColors[0] ? [{ label: slugifyHashtag(sortedColors[0].label), score: sortedColors[0].score }] : []),
      ];

      return {
        generatedAt: new Date().toISOString(),
        source: 'google-trends',
        disclaimer:
          'Colores y estilos: interés de búsqueda real en Google Trends (Colombia, vía SerpApi) de los últimos 7 días. Hashtags: marca propia combinada con el color/estilo de mayor interés real — Google Trends no mide volumen de hashtags de redes sociales.',
        colors: sortedColors,
        styles: sortedStyles,
        hashtags,
      };
    } catch (error) {
      this.logger.warn(`Falló la consulta a SerpApi/Google Trends, usando dataset de ejemplo: ${error}`);
      return { generatedAt: new Date().toISOString(), ...EXAMPLE_SNAPSHOT };
    }
  }
}
