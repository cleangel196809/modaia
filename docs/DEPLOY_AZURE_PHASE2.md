# Deploy Fase 2 en Azure

Este proyecto queda preparado para despliegue de `web` y `api` en Azure App Service con IaC en Bicep.

## 1. Recursos

- IaC: `infra/main.bicep`
- Parámetros ejemplo: `infra/main.parameters.example.json`
- GitHub Actions deploy: `.github/workflows/deploy-azure-appservice.yml`
- Azure DevOps pipeline: `azure-pipelines.yml`

## 2. Provisionar infraestructura con Azure CLI

```bash
az group create --name rg-modaia-prod --location eastus

az deployment group create \
  --resource-group rg-modaia-prod \
  --template-file infra/main.bicep \
  --parameters @infra/main.parameters.example.json \
  --parameters postgresAdminPassword="<password-fuerte>"
```

## 3. Secretos y variables en GitHub

Crear en el repositorio:

Variables (`Settings > Secrets and variables > Actions > Variables`):
- `AZURE_API_APP_NAME`
- `AZURE_WEB_APP_NAME`

Secrets (`Settings > Secrets and variables > Actions > Secrets`):
- `AZURE_API_PUBLISH_PROFILE`
- `AZURE_WEB_PUBLISH_PROFILE`

## 4. Variables de aplicación recomendadas

En API App Service:
- `NODE_ENV=production`
- `PORT=8080`
- `DB_HOST`
- `DB_PORT=5432`
- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD` (referencia de Key Vault)
- `REDIS_HOST`
- `REDIS_PORT=6380`
- `REDIS_PASSWORD` (si aplica)
- `JWT_ACCESS_SECRET` (Key Vault)
- `JWT_REFRESH_SECRET` (Key Vault)
- `CORS_ORIGIN=https://<web-domain>`

En Web App Service:
- `NODE_ENV=production`
- `PORT=8080`
- `NEXT_PUBLIC_API_URL=https://<api-domain>/api`

## 5. Despliegue continuo

- Push a `main` o ejecutar `workflow_dispatch` en `Deploy to Azure App Service`.
- El pipeline primero despliega API y luego Web.

## 6. Post-despliegue

- Ejecutar migraciones de base de datos en la API (job manual o task inicial).
- Cargar seed solo para entornos de prueba, nunca en producción real.
- Configurar dominio, TLS, WAF y Front Door/CDN.
