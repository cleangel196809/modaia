export interface TrendScore {
  label: string;
  score: number;
}

/**
 * Interés de búsqueda real en Google Trends vía SerpApi (máx. 5 términos por
 * llamada, es el límite que impone Google Trends para comparaciones). Devuelve
 * el último punto de la serie temporal (últimos 7 días, `date` por defecto de
 * SerpApi) por cada término, ya normalizado 0-100 por Google.
 * No se pudo probar contra una cuenta real de SerpApi en este entorno — validar
 * la forma exacta de `interest_over_time.timeline_data` la primera vez que se
 * conecte una API key real y ajustar el parseo si SerpApi cambió el esquema.
 */
export async function fetchGoogleTrendsInterest(
  apiKey: string,
  terms: string[],
  geo: string,
): Promise<TrendScore[]> {
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_trends');
  url.searchParams.set('q', terms.slice(0, 5).join(','));
  url.searchParams.set('geo', geo);
  url.searchParams.set('data_type', 'TIMESERIES');
  url.searchParams.set('api_key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`SerpApi respondió ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    interest_over_time?: { timeline_data?: { values: { query: string; extracted_value?: number }[] }[] };
  };
  const timeline = data.interest_over_time?.timeline_data ?? [];
  const lastPoint = timeline[timeline.length - 1];
  if (!lastPoint) {
    throw new Error('SerpApi no devolvió serie temporal de interés');
  }

  return lastPoint.values.map((v) => ({ label: v.query, score: v.extracted_value ?? 0 }));
}
