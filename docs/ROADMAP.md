# Roadmap de módulos — ModaIA Closet

Cada módulo se construye "en profundidad" (arquitectura + código funcional real) antes de pasar al siguiente, sobre la base del módulo core.

## Fase 0 — Core (✅ completado en este repo)
Auth (JWT/roles), Catálogo, Inventario. Ver [ARCHITECTURE.md](ARCHITECTURE.md).

## Fase 1 — Ecommerce funcional
1. **Marketplace de proveedores** (✅ completado en este repo) — solicitud de cuenta de confeccionista con aprobación admin, publicación de prendas propias, ajuste de inventario propio, panel individual. Ver [ARCHITECTURE.md](ARCHITECTURE.md#módulo-marketplace-de-proveedores).
2. **Carrito y checkout** (✅ completado en este repo) — carrito en cliente, `Order`/`OrderItem` con validación de precio/stock del lado servidor, integración Wompi (Web Checkout + webhook), confirmación por email/WhatsApp (stub por ahora). *Cierra el gap que había quedado abierto en el punto 1*: el panel de proveedor ya muestra "Pedidos recibidos" con los ítems de sus propias prendas. Ver [ARCHITECTURE.md](ARCHITECTURE.md#módulo-carrito-y-checkout).
3. **Landing pública ampliada** — colecciones, promociones, blog SEO.

## Fase 2 — Diferenciador IA/AR (el gran valor del producto)
4. **Medición corporal con IA** (✅ completado en este repo) — MediaPipe Pose Landmarker corriendo 100% en el navegador (sin backend de IA, sin credenciales Azure) sobre una foto subida por la usuaria, calibrado con su estatura para estimar busto/cintura/cadera/hombros/largo de brazo. Estimación heurística (~5-10% de margen), no medición clínica — ver [ARCHITECTURE.md](ARCHITECTURE.md#módulo-medición-corporal-con-ia).
5. **Motor de tallas** (✅ MVP funcional en este repo) — endpoint `POST /size-advisor/recommend` + UI `/tallas` para calcular talla ideal, % de compatibilidad, ajuste y riesgo de devolución a partir del perfil antropométrico o medidas manuales.
6. **Probador virtual 3D/AR** (✅ MVP funcional en este repo) — escena 3D con Three.js en `/probador`, vistas frontal/lateral/posterior, tipos de prenda base (blusa/chaqueta/vestido), simulación de movimiento y validación de soporte WebXR. Integración avanzada (avatar 3D personal, simulación física de tela, captura de video) queda como siguiente iteración.

## Fase 3 — Crecimiento e inteligencia de negocio
7. **Dropshipping inteligente** (✅ completado en este repo, 100% real) — `GET /dropshipping/top-selling|restock-alerts|category-demand` analiza pedidos pagados e inventario reales (no hay datos de ejemplo) para detectar productos más vendidos, alertar reposición antes de agotarse (cruzando velocidad de venta con `leadTimeDays`), y rankear categorías por demanda. UI en `/admin/dropshipping`, con vista propia para proveedores.
8. **IA de tendencias** (✅ real vía SerpApi/Google Trends si hay `SERPAPI_KEY`, si no dataset de ejemplo) — `GET /trends` compara interés de búsqueda real en Google Trends (Colombia) para términos de estilo/color curados; hashtags combinan marca propia + el color/estilo real de mayor interés (Instagram/TikTok/Pinterest siguen sin conectar — requieren revisión de app, no solo una key). UI en `/admin/tendencias`.
9. **Marketing automatizado** (✅ real vía OpenAI si hay `OPENAI_API_KEY`, si no plantillas) — `POST /marketing/generate-post` genera caption + hashtags con un modelo real sobre los datos reales del producto, o cae a plantillas si no hay clave o falla la llamada. Botón "Generar contenido" en `/proveedor` y `/admin/productos`.
10. **Chatbot IA** (✅ real vía OpenAI si hay `OPENAI_API_KEY`, si no reglas) — `POST /chatbot/message` redacta la respuesta con un modelo real, pero la búsqueda de productos siempre es una consulta real a la base de datos (nunca inventada por el modelo). Sin clave, cae a coincidencia de palabras clave. Widget flotante en todo el sitio, incluso para visitantes sin sesión.

*Los tres módulos tienen fallback automático a mock/plantillas/reglas si `SERPAPI_KEY`/`OPENAI_API_KEY` no están configuradas o la llamada externa falla — ver `apps/api/.env.example` y `docs/ARCHITECTURE.md`.*

## Fase 4 — Retención y ejecutivo
11. **Experiencia premium** — wishlist, puntos, cashback, cupones, referidos, suscripción VIP.
12. **Dashboard ejecutivo** — KPIs (ventas, conversión, ticket promedio, CAC, LTV, ROI), Power BI Embedded, predicción de demanda.

## Funcionalidades disruptivas (transversales, se evalúan dentro de las fases anteriores)
Armario virtual, asesor de imagen IA, generador de outfits, detección de tono de piel, recomendación por clima/ocasión, avatar 3D personal, personal shopper IA, closet inteligente, asistente de moda por WhatsApp, moda sostenible (huella ambiental), video shopping, live commerce, gemelo digital de la cliente.

## Por qué este orden

- El core (Fase 0) es prerrequisito de todo lo demás: sin usuarios/catálogo/stock no hay sobre qué operar.
- Fase 1 antes que Fase 2 porque monetizar (carrito/checkout) valida el negocio con menor inversión técnica que la IA/AR, y el marketplace de proveedores da contenido real de catálogo para probar medición y probador virtual.
- Fase 2 es el diferenciador competitivo mencionado en el objetivo del proyecto — se prioriza sobre crecimiento (Fase 3) porque sin él la propuesta de valor es un ecommerce de ropa más.
- Fase 3 y 4 dependen de tener tráfico/datos reales (tendencias, KPIs) para ser útiles — construirlas antes sería optimizar sin señal.
