# Estimación de costos Azure

Estimación referencial en USD/mes (precios públicos aproximados, región East US / Brazil South — validar con la calculadora de precios de Azure antes de presupuestar formalmente). Dos escenarios: **MVP** (módulo core, tráfico bajo) y **Escala objetivo** (100.000 usuarios, 10.000 productos, 5.000 pedidos/día, con IA/AR activos).

## Escenario MVP (Fase 0-1)

| Servicio | SKU sugerido | Costo aprox./mes |
|---|---|---|
| Azure App Service (API) | B1 (1 core, 1.75 GB) | ~$13 |
| Azure App Service (Web) | B1 | ~$13 |
| Azure Database for PostgreSQL Flexible Server | Burstable B1ms, 32GB | ~$25 |
| Azure Cache for Redis | Basic C0 (250MB) | ~$16 |
| Azure Blob Storage | Hot tier, ~50GB + transacciones | ~$5 |
| Azure Key Vault | Standard, uso bajo | ~$3 |
| Azure Front Door / CDN | Tier básico | ~$10 |
| Application Insights / Monitor | Plan básico | ~$5 |
| **Total MVP** | | **≈ $90/mes** |

## Escenario de escala (100k usuarios · 10k productos · 5k pedidos/día · IA/AR activos)

| Servicio | SKU sugerido | Costo aprox./mes |
|---|---|---|
| Azure App Service (API), Premium P1v3, autoscale 2-6 instancias | | ~$220–$650 |
| Azure App Service (Web), Premium P1v3, autoscale 2-4 instancias | | ~$220–$440 |
| Azure Functions (medición IA, tendencias) — Consumption/Premium | | ~$150–$400 |
| Azure Database for PostgreSQL Flexible Server | General Purpose D4s, 256GB | ~$350 |
| Azure Cache for Redis | Standard C2 | ~$100 |
| Azure Blob Storage | ~2TB (fotos, video360, avatars) + CDN egress | ~$120 |
| Azure AI Vision (medición corporal) | Por transacción, ~5k mediciones/día | ~$400–$1,000 |
| Azure OpenAI (chatbot + IA de tendencias) | Según tokens, uso moderado | ~$300–$1,500 |
| Azure Key Vault | Standard | ~$5 |
| Azure Front Door Premium (WAF incluido) | | ~$330 |
| Azure Entra ID (External ID) | Hasta 50k MAU gratis, luego por MAU | ~$0–$200 |
| Application Insights / Log Analytics | Volumen medio-alto | ~$150 |
| Power BI Embedded | A1 (1 v-core) | ~$750 |
| **Total escala** | | **≈ $3,000–$5,000/mes** |

## Notas

- Los rangos amplios en IA (Vision/OpenAI) dependen directamente del volumen real de mediciones corporales y conversaciones de chatbot — se recomienda instrumentar el uso desde el día uno (Application Insights) para ajustar el presupuesto con datos reales en vez de proyecciones.
- Power BI Embedded es el rubro más caro fijo del escenario de escala; si el dashboard ejecutivo no necesita embeberse en la app del cliente, un Power BI Pro estándar (~$10/usuario/mes) es sustancialmente más barato para uso interno.
- No se incluyen costos de licenciamiento de pasarelas de pago (Wompi/PSE/PayU cobran por transacción, no por infraestructura Azure).
- Esta tabla es una estimación de planeación, no una cotización — antes de comprometer presupuesto, validar con la [calculadora oficial de Azure](https://azure.microsoft.com/pricing/calculator/).
