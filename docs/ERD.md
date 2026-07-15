# Modelo de datos — módulo core

## Diagrama ERD

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar fullName
        varchar email UK
        varchar passwordHash
        enum role "admin | provider | customer"
        boolean isActive
        varchar refreshTokenHash
        timestamptz createdAt
        timestamptz updatedAt
    }

    CATEGORIES {
        uuid id PK
        varchar name UK
        varchar slug UK
        text description
        timestamptz createdAt
    }

    PRODUCTS {
        uuid id PK
        varchar sku UK
        varchar name
        text description
        uuid categoryId FK
        uuid providerId FK "nullable, dueño de la prenda"
        numeric price
        numeric cost
        int stock
        int lowStockThreshold
        int leadTimeDays
        date restockDate
        text sizes "csv"
        text colors "csv"
        varchar material
        text images "csv de URLs"
        varchar video360Url
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
    }

    INVENTORY_MOVEMENTS {
        uuid id PK
        uuid productId FK
        enum type "in | out | adjustment"
        int quantity
        int stockAfter
        varchar reason
        uuid createdByUserId FK
        timestamptz createdAt
    }

    PROVIDER_PROFILES {
        uuid id PK
        uuid userId FK UK
        varchar businessName
        varchar taxId
        varchar phone
        varchar city
        text description
        enum status "pending | approved | rejected | suspended"
        varchar rejectionReason
        timestamptz createdAt
        timestamptz updatedAt
    }

    ORDERS {
        uuid id PK
        uuid userId FK
        enum status "pending_payment | paid | failed | cancelled"
        numeric subtotal
        numeric shippingCost
        numeric total
        varchar currency
        varchar shippingFullName
        varchar shippingPhone
        varchar shippingAddress
        varchar shippingCity
        varchar paymentProvider
        varchar paymentReference "id de transacción Wompi"
        timestamptz paidAt
        timestamptz createdAt
        timestamptz updatedAt
    }

    ORDER_ITEMS {
        uuid id PK
        uuid orderId FK
        uuid productId FK
        uuid providerId "nullable, copia de products.providerId al comprar"
        varchar productName "snapshot"
        varchar sku "snapshot"
        numeric unitPrice "snapshot"
        int quantity
        numeric subtotal
    }

    BODY_PROFILES {
        uuid id PK
        uuid userId FK
        numeric heightCm "ingresada por la usuaria, calibra el resto"
        numeric bustCm "estimado"
        numeric waistCm "estimado"
        numeric hipsCm "estimado"
        numeric shoulderWidthCm "medido directo de landmarks"
        numeric armLengthCm "medido directo de landmarks"
        varchar source "mediapipe-estimate"
        timestamptz measuredAt
    }

    CATEGORIES ||--o{ PRODUCTS : "categoriza"
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : "tiene movimientos"
    USERS ||--o{ INVENTORY_MOVEMENTS : "registra"
    USERS ||--o{ PRODUCTS : "publica (providerId)"
    USERS ||--o| PROVIDER_PROFILES : "solicita ser proveedor"
    USERS ||--o{ ORDERS : "compra"
    ORDERS ||--o{ ORDER_ITEMS : "contiene"
    PRODUCTS ||--o{ ORDER_ITEMS : "se vende como"
    USERS ||--o{ BODY_PROFILES : "se mide"
```

## Notas

- `PRODUCTS.stock` es una caché derivada: la única forma soportada de modificarlo es `InventoryService.adjustStock`, que dentro de una transacción con lock pesimista actualiza el producto **y** crea el registro en `INVENTORY_MOVEMENTS` de forma atómica.
- `margin` / `marginPercentage` (precio − costo) **no están en la tabla** — se calculan al vuelo en `ProductsService`.
- `sizes`, `colors`, `images` se guardan como `simple-array` (CSV) de TypeORM. Para catálogos grandes con imágenes múltiples de alta resolución, migrar a una tabla `product_images` (1:N) sería la siguiente evolución natural — no se hizo en el MVP para no sobre-diseñar antes de tener necesidad real.
- `PRODUCTS.providerId` es nulo para catálogo propio de la plataforma; si tiene valor, apunta al `User` (rol `provider`) dueño de la prenda. `ON DELETE SET NULL` — si se elimina la cuenta del proveedor, la prenda no se borra, vuelve a ser catálogo huérfano.
- `PROVIDER_PROFILES.userId` es único (1:1 con `USERS`): cada usuario puede tener a lo sumo una solicitud de proveedor. El `role` del usuario solo cambia a `provider` cuando `status` pasa a `approved` (ver [ARCHITECTURE.md](ARCHITECTURE.md#módulo-marketplace-de-proveedores)).
- No hay tablas `carts`/`cart_items`: el carrito vive en el cliente (Redux + localStorage) hasta que se confirma el pedido — no había requisito de continuarlo desde otro dispositivo, así que persistirlo en base de datos habría sido una tabla más sin necesidad real todavía.
- `ORDER_ITEMS` guarda una **copia** (`productName`, `sku`, `unitPrice`) del producto al momento de la compra, no una referencia en vivo — si el precio o nombre cambian después, el historial de pedidos sigue mostrando lo que el cliente realmente pagó. `providerId` se copia igual, para que el panel del proveedor no dependa de que el producto siga existiendo con el mismo dueño.
- `ORDERS.total` y el stock resultante en `PRODUCTS`/`INVENTORY_MOVEMENTS` solo se actualizan cuando el pedido pasa a `paid` (`OrdersService.markPaid`, transaccional con lock pesimista) — al crear el pedido (`pending_payment`) el stock todavía no se toca, para no bloquear inventario por checkouts abandonados.
- `BODY_PROFILES` es un **historial**, no un perfil único que se sobreescribe: cada medición es una fila nueva. `GET /body-profiles/me` devuelve la más reciente (`ORDER BY measuredAt DESC LIMIT 1`); el resto queda disponible para comparar mediciones en el tiempo. `bustCm`/`waistCm`/`hipsCm` son estimaciones calculadas en el navegador (no en este backend) a partir de landmarks de pose — ver [ARCHITECTURE.md](ARCHITECTURE.md#módulo-medición-corporal-con-ia).
- Migraciones: [`1700000000000-InitSchema.ts`](../apps/api/src/database/migrations/1700000000000-InitSchema.ts) (core), [`1700000100000-AddProviders.ts`](../apps/api/src/database/migrations/1700000100000-AddProviders.ts) (marketplace), [`1700000200000-AddOrders.ts`](../apps/api/src/database/migrations/1700000200000-AddOrders.ts) (checkout) y [`1700000300000-AddBodyProfiles.ts`](../apps/api/src/database/migrations/1700000300000-AddBodyProfiles.ts) (medición corporal).

## Módulos futuros (impacto en el modelo de datos)

| Módulo | Tablas nuevas previstas |
|---|---|
| Motor de tallas | `size_recommendations` (referencia `body_profiles` + tabla de tallas por producto) |
| Probador virtual 3D/AR | ninguna nueva prevista — reutiliza `body_profiles` |
| Experiencia premium | `wishlists`, `loyalty_points`, `coupons`, `referrals` |
| Marketing automatizado | `campaigns`, `social_posts` |
