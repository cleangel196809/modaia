# Arquitectura — ModaIA Closet

## 1. Visión general

ModaIA Closet es una plataforma SaaS/Ecommerce modular. Este documento describe la arquitectura objetivo completa (12 módulos) y el estado real de lo implementado en este repositorio (módulo core).

**Implementado en este repo:** Auth (JWT), Users, Categories, Products (catálogo), Inventory, Providers (marketplace de proveedores), Orders/Payments/Notifications (carrito y checkout), BodyProfiles (medición corporal IA), SizeAdvisor (motor de tallas), Probador virtual 3D MVP (frontend), Dropshipping (real), Trends/Marketing/Chatbot (MVP con mocks/reglas etiquetados — ver más abajo).
**Diseñado, no implementado aún:** experiencia premium, dashboard ejecutivo. Ver [ROADMAP.md](ROADMAP.md).

## 2. Arquitectura empresarial (alto nivel)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clientes                                 │
│   Web (Next.js)   ·   Móvil (PWA/WebXR)   ·   WhatsApp Business  │
└───────────────────────────┬───────────────────────────────────────┘
                             │ HTTPS
┌───────────────────────────▼───────────────────────────────────────┐
│                     Azure Front Door / CDN                         │
└───────────────────────────┬───────────────────────────────────────┘
                             │
        ┌────────────────────┼───────────────────────┐
        ▼                    ▼                       ▼
┌───────────────┐   ┌────────────────┐      ┌──────────────────┐
│  Azure App     │   │  Azure App      │      │  Azure Functions  │
│  Service (Web) │   │  Service (API)  │      │  (IA/procesos     │
│  Next.js       │   │  NestJS         │      │  async: medición, │
│                │   │  Módulo core ✅ │      │  tendencias, IA)  │
└───────────────┘   └────────┬────────┘      └─────────┬─────────┘
                              │                          │
        ┌─────────────────────┼──────────────────────────┘
        ▼                     ▼                     ▼
┌───────────────┐   ┌────────────────┐      ┌──────────────────┐
│ Azure Database │   │  Azure Cache    │      │  Azure Blob       │
│ for PostgreSQL │   │  for Redis      │      │  Storage (fotos,  │
│                │   │                 │      │  video360, avatar)│
└───────────────┘   └────────────────┘      └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌───────────────┐  ┌──────────────────┐
            │ Azure OpenAI   │  │ Azure AI Vision    │
            │ (chatbot,      │  │ (medición corporal,│
            │ tendencias)    │  │ detección de tono) │
            └───────────────┘  └──────────────────┘

Transversal: Azure Entra ID (auth) · Azure Key Vault (secretos) · Azure Monitor/App Insights (observabilidad)
```

## 3. Arquitectura del módulo core (este repo)

```
apps/web (Next.js 14, App Router)
  ├─ Redux Toolkit + RTK Query  → llama a apps/api vía REST
  └─ MUI + Tailwind

apps/api (NestJS)
  ├─ AuthModule       → JWT access (15 min) + refresh (7 días), bcrypt, guards por rol
  ├─ UsersModule       → roles: admin | provider | customer
  ├─ CategoriesModule  → CRUD
  ├─ ProductsModule    → CRUD con ownership por proveedor, cálculo de margen, SKU único
  ├─ InventoryModule   → movimientos de stock (transaccionales, con lock pesimista, con ownership),
  │                       alertas de stock bajo, fecha de reposición
  ├─ ProvidersModule   → solicitud de cuenta de confeccionista, aprobación/rechazo admin
  ├─ OrdersModule      → checkout (valida precio/stock server-side), estados de pedido, "mis pedidos"
  │                       por cliente/proveedor/admin
  ├─ PaymentsModule    → integración Wompi (Web Checkout + webhook) + simulador solo-dev
  ├─ NotificationsModule → confirmación de pedido (stub: loguea, listo para SendGrid/Twilio)
  ├─ BodyProfilesModule → guarda las medidas estimadas por MediaPipe (el cálculo de IA corre en el navegador,
  │                       no en este backend — ver más abajo)
  ├─ SizeAdvisorModule  → recomendación de talla a partir del perfil corporal
  ├─ DropshippingModule → insights reales sobre pedidos/inventario propios (sin mocks)
  ├─ TrendsModule       → Google Trends real vía SerpApi si hay SERPAPI_KEY, si no dataset de ejemplo
  ├─ MarketingModule    → copy/hashtags con OpenAI real si hay OPENAI_API_KEY, si no plantillas
  └─ ChatbotModule      → respuesta con OpenAI real si hay OPENAI_API_KEY, si no reglas/palabras clave

PostgreSQL (TypeORM, migraciones versionadas)
Redis (reservado para cache de catálogo y sesiones — no usado aún por el core)
```

## 4. Decisiones clave y por qué

- **JWT propio en vez de Azure Entra ID directo en el MVP**: se implementó JWT + bcrypt + guards por rol para tener autenticación funcional desde el día uno sin depender de un tenant Azure. Las estrategias Passport están aisladas (`strategies/jwt.strategy.ts`) para poder añadir una `EntraIdStrategy` en paralelo cuando se conecte Azure AD B2C/Entra External ID, sin reescribir el resto del módulo.
- **Refresh token con hash en base de datos**: el refresh token nunca se guarda en texto plano; se compara con bcrypt, igual que el password. El login/logout invalida la sesión reemplazando/limpiando ese hash.
- **Movimientos de inventario como ledger, no solo un contador**: `InventoryMovement` registra cada entrada/salida/ajuste con el stock resultante. `Product.stock` es una caché derivada que solo se modifica dentro de la transacción de `InventoryService.adjustStock` (con `pessimistic_write` lock) — así se evita que dos ajustes concurrentes pisen el stock y se pierde trazabilidad de por qué cambió.
- **Margen no persistido**: `margin` y `marginPercentage` se calculan en el momento de la respuesta (`ProductsService.withMargin`) a partir de `price`/`cost`, en vez de guardarse en la tabla — evita que quede desincronizado si se actualiza el precio sin recalcular.

## Módulo Marketplace de proveedores

**Flujo:** un usuario ya registrado aplica en `POST /providers/apply` (nombre de negocio, NIT, teléfono, ciudad) → queda `ProviderProfile.status = pending` y su rol sigue siendo `customer`. Un admin revisa en `/admin/proveedores` y aprueba (`PATCH /providers/:id/approve`) o rechaza. Al aprobar, el rol del usuario cambia a `provider` — solo entonces puede publicar prendas y gestionar inventario propio.

**Ownership de catálogo e inventario**: `Product.providerId` (nullable, FK a `users`) marca quién es dueño de la prenda; `null` = catálogo propio de la plataforma. `ProductsService` y `InventoryService` exponen `assertOwnership(product, actingUser)`: un `admin` puede todo, un `provider` solo puede crear/editar/eliminar/ajustar stock de sus propias prendas (403 en caso contrario). Al crear una prenda, si quien la crea es `provider`, el backend fuerza `providerId = actingUser.userId` — el campo del DTO se ignora para evitar que un proveedor publique a nombre de otro. La propiedad no se puede transferir después de creada (no hay caso de uso para eso en el MVP).

**Por qué el rol no cambia hasta la aprobación**: si el rol pasara a `provider` en el momento de aplicar, alguien con una solicitud sin revisar ya tendría permisos de escritura en el catálogo. Cambiarlo solo en `approve()` mantiene el catálogo público controlado por personas verificadas.

**"Gestionar pedidos" — resuelto por el módulo de checkout**: cuando se escribió esta sección todavía no existía `Order`, así que el proveedor no tenía pedidos que gestionar. Con el módulo de Carrito y checkout (abajo), `GET /orders/provider/items` ya expone los `OrderItem` de las prendas del proveedor — visible en `/proveedor` bajo "Pedidos recibidos".

**Alcance no cubierto aún**: catálogo público de "storefront por proveedor" (aunque `GET /products?providerId=` ya lo permite a nivel de API), calificación/reputación de proveedores, comisión de la plataforma sobre ventas, fulfillment parcial por proveedor (hoy el estado del pedido es único para toda la orden, no por proveedor/ítem).

## Módulo Carrito y checkout

**Flujo:** el carrito vive en el cliente (Redux + localStorage, `cartSlice`) — no hay `Cart` persistido en base de datos porque no hay requisito de continuar la compra desde otro dispositivo; el primer punto de persistencia real es al confirmar el pedido. `POST /orders` recibe `{ productId, quantity }[]` + datos de envío, y **recalcula precio y valida stock en el servidor** (nunca confía en lo que mandó el cliente) dentro de `OrdersService.create`. El pedido nace en `pending_payment` — el stock **no se descuenta todavía** (evita bloquear inventario por checkouts abandonados).

**Confirmación de pago y descuento de stock atómico**: `OrdersService.markPaid()` corre en una transacción que, por cada ítem, toma un lock pesimista sobre el producto, descuenta el stock y crea un `InventoryMovement` (mismo ledger que usa el proveedor al ajustar stock manualmente, con `reason: "Venta — pedido <id>"`). Si el stock ya no alcanza (carrera entre el checkout y la confirmación del pago), el pedido pasa a `failed` en vez de sobrevender. El método es idempotente: un webhook duplicado de Wompi no vuelve a descontar stock porque solo actúa si el pedido sigue en `pending_payment`.

**Integración de pago — Wompi sin cuenta real conectada**: `WompiService.buildCheckoutUrl()` arma la URL del Web Checkout (redirect hospedado por Wompi) con la firma de integridad SHA-256 que exigen en producción; sin `WOMPI_INTEGRITY_SECRET` configurado, el link se genera igual mostrando sus parámetros. `PaymentsController` expone `POST /payments/wompi/webhook` para cuando sí haya una cuenta conectada, con verificación de checksum — **no se pudo probar contra un webhook real de Wompi en este entorno**, validar el esquema exacto contra su documentación vigente antes de ir a producción. Mientras tanto, `POST /payments/dev/simulate/:orderId` (deshabilitado si `NODE_ENV=production`) dispara el mismo camino de código que el webhook (`markPaid`/`markFailed` + notificación), para poder probar el pipeline completo sin credenciales — así es como se verificó este módulo end-to-end en este repo.

**Notificaciones — stub declarado como tal**: `NotificationsService.sendOrderConfirmation()` hoy solo loguea el mensaje que se "enviaría" por email/WhatsApp. No hay cuenta de SendGrid/Twilio conectada. La firma del método (pedido + destinatario) ya es la que necesitaría una integración real, para no tener que tocar `PaymentsService` cuando se conecte un proveedor de verdad.

**Snapshot en `OrderItem`**: `productName`, `sku` y `unitPrice` se copian del producto al momento de la compra en vez de referenciarlo en vivo — si el proveedor cambia el precio o el nombre después, el historial de pedidos debe seguir mostrando lo que el cliente realmente pagó.

## Módulo Medición corporal con IA

**Dónde corre la IA — 100% en el navegador, no en este backend**: el objetivo original pedía Azure AI Vision + MediaPipe desde el celular. Azure AI Vision requiere una suscripción y credenciales que no existen en este entorno (mismo problema que Wompi). MediaPipe sí se pudo integrar de verdad: `@mediapipe/tasks-vision` (`PoseLandmarker`) corre por WASM directamente en el navegador de la clienta — sin API key, sin llamar a ningún backend de IA, sin costo por medición. `apps/web/src/lib/poseLandmarker.ts` carga el modelo `pose_landmarker_lite` una vez (se cachea en el navegador) y detecta 33 puntos del cuerpo sobre la foto que la usuaria sube en `/medidas`.

**De landmarks 2D a medidas en cm — heurística documentada, no medición clínica**: una sola foto no tiene escala absoluta, así que `apps/web/src/lib/bodyMeasurement.ts` calibra usando la estatura que la usuaria ingresa (distancia nariz-tobillo en píxeles × 1.15 de corrección ≈ estatura real, de ahí sale una relación píxeles-por-cm). Ancho de hombros y cadera salen directo de la distancia entre landmarks; **busto/cintura/cadera son estimaciones**: se multiplica el ancho frontal detectado por un factor de corrección elíptica (busto ×2.9, cintura ×2.8, cadera ×2.95 — constantes típicas de antropometría 2D-a-3D, ajustables si en el futuro se calibran contra medidas reales). El margen de error esperado es ~5-10%: suficiente para recomendar una talla, no para confección a medida. Esto se declara explícitamente en la UI (`/medidas`), no se presenta como medición exacta.

**"Avatar digital" = silueta proporcional, no un modelo 3D**: `BodySilhouette.tsx` dibuja una silueta plana en SVG cuyos anchos de hombro/cintura/cadera se escalan según las medidas calculadas. No es un avatar 3D fotorrealista ni usa un modelo corporal tipo SMPL — generar eso es un problema de gráficos por computador de meses de trabajo, no de una sesión. Sirve como confirmación visual de la proporción detectada, y es la base geométrica que reutilizará el probador virtual (Fase 2, punto 6) cuando se construya.

**Persistencia**: `BodyProfile` es un historial (una fila por medición, no un perfil único que se sobreescribe) — `GET /body-profiles/me` devuelve la más reciente. Guardar el historial permite comparar mediciones en el tiempo sin perder datos, útil si más adelante se quiere mostrar "cómo cambiaron tus medidas" o auditar por qué una recomendación de talla cambió.

**Por qué la foto se sube en vez de exigir cámara en vivo**: la extracción de landmarks funciona igual sobre una imagen ya tomada, y subir una foto es más fácil de probar/depurar (y de usar en cualquier dispositivo, incluyendo los que no tienen buena cámara frontal) que forzar un flujo de captura en vivo con permisos de cámara — que además no se puede automatizar de forma confiable con las herramientas de verificación de este entorno. Nada en el diseño impide añadir captura en vivo después; solo cambiaría cómo se obtiene el `HTMLImageElement`, no el resto del pipeline.

**Bug real encontrado en la verificación — landmarks fuera de cuadro producían medidas absurdas**: al probar con una foto real (una fotografía de moda recortada a la altura de la falda, sin tobillos visibles), MediaPipe igual devolvió coordenadas para los tobillos — "adivinadas" por el modelo con `visibility` baja en vez de fallar — y el cálculo original las usó sin filtrar, produciendo "busto: 185.7 cm" para una persona de 165 cm. La causa: la calibración estatura→cm depende por completo de la distancia nariz-tobillo, así que un tobillo mal ubicado arruina todas las demás medidas derivadas. `computeMeasurements()` ahora valida `visibility >= 0.6` en nariz/tobillos/hombros/cadera antes de calibrar, y además aplica una red de seguridad de rangos humanos plausibles (`assertPlausible`) sobre el resultado final — si cualquiera de las dos validaciones falla, se lanza `UnreliablePhotoError` y la UI pide una foto de cuerpo completo en vez de mostrar un número con apariencia de medición real pero sin sentido. Esto se descubrió con una foto pública real, no con datos sintéticos — confirma que el guardrail era necesario, no defensivo por exceso de cautela.

## Módulo Motor de tallas (Fase 2 MVP)

Se implementó `POST /size-advisor/recommend` (JWT requerido) para calcular:

- talla ideal
- compatibilidad porcentual
- ajuste esperado (holgado/comodo/ajustado)
- riesgo de devolucion

La recomendación usa el último `BodyProfile` del usuario o medidas manuales enviadas en la request. Si se envía `productId`, la recomendación se restringe a las tallas realmente disponibles en esa prenda (`Product.sizes`). La puntuación pondera busto/cintura/cadera según tipo de prenda (top, bottom, dress, outerwear).

## Módulo Probador virtual 3D (Fase 2 MVP)

Se agregó una experiencia inicial en `/probador` usando Three.js:

- avatar/maniquí 3D simplificado
- cambio de tipo de prenda base (blusa, chaqueta, vestido)
- vistas frontal/lateral/posterior
- animación de movimiento base
- verificación de soporte WebXR en navegador

Este MVP valida el flujo UX y el pipeline técnico de render en cliente. La simulación física avanzada de tela y el avatar 3D personalizado se planifican en la siguiente iteración.

### Probador con cámara en vivo (`/probador/camara/[id]`)

A diferencia del maniquí genérico de arriba, esta vista está atada a un producto real y usa la cámara del dispositivo (PC o celular) en vivo:

- `getUserMedia` pide la cámara (frontal o trasera, elegible en la UI); requiere gesto explícito del usuario (botón "Activar cámara") por las políticas de autoplay de los navegadores.
- `getVideoPoseLandmarker()` (`apps/web/src/lib/poseLandmarker.ts`) corre MediaPipe Pose Landmarker en modo `VIDEO` (`detectForVideo` por cuadro, con `requestAnimationFrame`) — mismo modelo que usa la medición corporal en `/medidas`, pero en modo streaming en vez de una sola imagen, y con `delegate: 'GPU'` por el requisito de rendimiento en tiempo real.
- `computeTorsoTransform()` (`apps/web/src/lib/arOverlay.ts`) calcula centro/ancho/alto/rotación del torso a partir de los landmarks de hombros (11, 12) y cadera (23, 24) de cada cuadro.
- La foto real del producto (`product.images[0]`) se dibuja en el `<canvas>` con esa transformación, semitransparente.

**Qué es y qué no es esto**: es un ajuste de posición/tamaño/rotación en tiempo real sobre un rectángulo de la foto real del producto, con seguimiento corporal genuino — no un recorte de la silueta de la prenda (la foto no está segmentada del fondo) ni una simulación física de tela. Un resultado más fotorrealista (que la prenda "siga" los pliegues del cuerpo, recorte exacto de bordes) requeriría un motor de AR de moda dedicado con modelos de segmentación de ropa entrenados para eso (ej. Zeekit, Vue.ai) — son servicios de pago con su propia integración, no algo que MediaPipe resuelva out-of-the-box. Se documenta así explícitamente en vez de dar la impresión de un try-on fotorrealista que no es.

## Módulo Dropshipping inteligente (Fase 3 — el único 100% real de la fase)

**Por qué este sí es real y los otros tres de la fase no**: dropshipping/tendencias internas de producto no dependen de ninguna API externa — toda la señal que necesita ya vive en `orders`, `order_items` e `inventory_movements` de este mismo repo. `DropshippingService` (`apps/api/src/modules/dropshipping/dropshipping.service.ts`) hace tres análisis sobre datos reales, no de ejemplo:

- **`topSelling()`** — suma `OrderItem.quantity` de pedidos `paid` en una ventana de días, agrupado por producto.
- **`restockAlerts()`** — cruza la velocidad de venta real (unidades/día en la ventana) con el stock actual y `Product.leadTimeDays`: si al ritmo de venta actual el stock se agota antes de que llegue un reabastecimiento, genera alerta. A propósito **no** se dispara para productos con poco stock pero sin ventas recientes — ese caso ya lo cubre `InventoryService.findLowStockAlerts()`; mezclar ambos habría duplicado la misma señal con distinto significado.
- **`categoryDemand()`** — unidades vendidas ÷ prendas activas por categoría, para detectar categorías con poco catálogo pero mucha demanda (candidatas a que se sumen más prendas). Solo tiene sentido a nivel plataforma (admin), no por proveedor.

Ownership igual que en Products/Inventory/Orders: un `provider` autenticado solo ve `topSelling`/`restockAlerts` de sus propias prendas (filtro por `providerId` a nivel de query, no en el cliente); `categoryDemand` es admin-only.

## Módulos Fase 3 con integración real opcional (Tendencias, Marketing, Chatbot)

Los tres dependen de una API externa de pago (SerpApi/OpenAI). En vez de dejarlos fijos en modo mock, cada uno intenta la llamada real cuando hay credenciales en el entorno (`SERPAPI_KEY`, `OPENAI_API_KEY` — ver `apps/api/.env.example`) y **cae automáticamente al mock/plantillas/reglas** si la variable no está configurada o la llamada falla (rate limit, timeout, créditos agotados). Así el proyecto funciona sin credenciales (modo demo) y mejora solo con configurarlas, sin tocar código ni romper nada si la API externa falla en producción.

- **`TrendsService.getSnapshot()`** (`apps/api/src/modules/trends/`): con `SERPAPI_KEY`, compara interés de búsqueda real en Google Trends (Colombia, últimos 7 días) para una lista curada de términos de estilo y de color (`STYLE_TERMS`/`COLOR_TERMS` en el mismo archivo — Google Trends no tiene categorías nativas de "colores/estilos de moda", así que se aproxima comparando términos representativos). Los hashtags combinan la marca propia con el color/estilo de mayor interés real, porque Google Trends no mide volumen de hashtags de redes sociales — eso seguiría siendo mock hasta integrar la Graph API de Instagram/TikTok (requiere revisión de app y verificación de negocio, no solo una API key). `source: 'google-trends'` vs `'example-data'` distingue cuál modo respondió; la UI (`/admin/tendencias`) muestra el `disclaimer` correspondiente tal cual.
- **`MarketingService.generatePost()`** (`apps/api/src/modules/marketing/`): con `OPENAI_API_KEY`, genera el caption y los hashtags con un modelo real (`gpt-4o-mini` por defecto, configurable vía `OPENAI_MODEL`), usando los datos reales del producto (nombre, material, categoría, colores) como único contexto — el modelo no inventa atributos del producto. Respeta el mismo ownership que Products: un proveedor solo genera contenido para sus propias prendas. `source: 'openai'` vs `'template-generator'` distingue el origen.
- **`ChatbotService.reply()`** (`apps/api/src/modules/chatbot/`): con `OPENAI_API_KEY`, el texto de la respuesta lo redacta el modelo, pero **la búsqueda de productos sigue siendo siempre una consulta real a la base de datos** (`findMatchingProducts()`) — nunca la inventa el modelo, justamente para evitar que alucine SKUs o precios inexistentes. El prompt del sistema restringe al modelo a solo mencionar prendas presentes en ese resultado real. Sigue siendo el único endpoint de todo el backend sin `JwtAuthGuard` (un visitante sin cuenta necesita poder preguntar antes de registrarse).

## 5. Seguridad implementada vs. pendiente

| Control | Estado |
|---|---|
| HTTPS | Pendiente de configurar en Azure App Service / Front Door |
| Helmet (cabeceras HTTP) | ✅ Implementado |
| Rate limiting | ✅ `@nestjs/throttler` (100 req/min por IP) |
| Validación de entrada (OWASP) | ✅ `class-validator` + `whitelist`/`forbidNonWhitelisted` |
| JWT + bcrypt | ✅ Implementado |
| Roles/autorización | ✅ `RolesGuard` + decorador `@Roles()` |
| MFA | Pendiente — se añade al integrar Azure Entra ID |
| WAF | Pendiente — Azure Front Door / Application Gateway en producción |
| Secretos en Key Vault | Pendiente — hoy via variables de entorno (`.env`) |

## 6. Próximos módulos

Ver [ROADMAP.md](ROADMAP.md) para el orden sugerido de construcción de los 11 módulos restantes.
