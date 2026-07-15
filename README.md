# ModaIA Closet

Plataforma SaaS/Ecommerce para venta de ropa femenina colombiana con medición corporal por IA, probador virtual (AR) y visión por computador.

Proyecto nacido como emprendimiento familiar para modernizar la venta de ropa femenina colombiana con tecnologia.

Este repositorio contiene el **módulo core** (autenticación, catálogo, inventario), el **marketplace de proveedores**, el **carrito y checkout** (Fase 1 completa) y **Fase 2 MVP** con medición corporal IA + motor de tallas + probador virtual 3D base. Los módulos avanzados (dropshipping, marketing automatizado, chatbot, dashboard ejecutivo) se construyen sobre esta base en iteraciones posteriores — ver [docs/ROADMAP.md](docs/ROADMAP.md).

> El checkout no tiene una cuenta real de Wompi conectada (ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#módulo-carrito-y-checkout)). El link de pago se genera igual; para probar el flujo completo (pago → descuento de stock → notificación) usa el botón "Simular pago" en la página del pedido — no existe en producción (`NODE_ENV=production` lo deshabilita).
>
> La medición corporal (`/medidas`) corre 100% en el navegador (MediaPipe, sin Azure AI Vision ni credenciales) y es una **estimación heurística** a partir de una foto + tu estatura, con ~5-10% de margen de error — pensada para recomendar talla, no para confección a medida. Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#módulo-medición-corporal-con-ia).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS, MUI, Redux Toolkit + RTK Query |
| Backend | NestJS, TypeScript, TypeORM |
| Base de datos | PostgreSQL 16, Redis 7 |
| Auth | JWT (access + refresh), bcrypt, guards por rol. Preparado para Azure Entra ID/OAuth2 (ver docs/ARCHITECTURE.md) |
| DevOps | Docker Compose, GitHub Actions |
| Cloud objetivo | Azure App Service, Azure PostgreSQL, Azure Blob Storage, Azure Key Vault |

## Estructura del monorepo

```
modaia-closet/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/           # Frontend Next.js
├── docs/               # Arquitectura, ERD, roadmap, costos Azure
├── docker-compose.yml
└── .github/workflows/  # CI
```

## Arranque rápido (desarrollo local)

```bash
# 1. Levantar Postgres + Redis
docker compose up -d db redis

# 2. Backend
cd apps/api
cp .env.example .env
npm install
npm run migration:run
npm run seed
npm run start:dev   # http://localhost:3001  (Swagger en /api/docs)

# 3. Frontend (otra terminal)
cd apps/web
cp .env.example .env
npm install
npm run dev          # http://localhost:3000
```

### Cuentas de prueba (creadas por el seed)
- Admin: `admin@modaia.co` / `Admin123!`
- Cliente (con un pedido pagado y uno pendiente de ejemplo): `cliente.demo@modaia.co` / `Cliente123!` — `/pedidos`
- Proveedor aprobado (Confecciones Andina): `confecciones.andina@modaia.co` / `Provider123!` — panel en `/proveedor`
- Proveedor pendiente de aprobación (Taller Bogotá Textil): `taller.bogota@modaia.co` / `Provider123!` — para probar el flujo de aprobación en `/admin/proveedores`

## Rutas nuevas Fase 2

- `GET /medidas`: medición corporal IA (MediaPipe en navegador)
- `GET /tallas`: recomendación de talla ideal y riesgo de devolución
- `GET /probador`: probador virtual 3D (front/side/back)
- `POST /api/size-advisor/recommend`: endpoint de motor de tallas (Swagger)

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Modelo de datos / ERD](docs/ERD.md)
- [Roadmap de módulos](docs/ROADMAP.md)
- [Estimación de costos Azure](docs/AZURE_COSTS.md)
- [Deploy Azure Fase 2](docs/DEPLOY_AZURE_PHASE2.md)
- Swagger/OpenAPI: `http://localhost:3001/api/docs` (con el backend corriendo)
