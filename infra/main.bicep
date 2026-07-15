targetScope = 'resourceGroup'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Environment name (dev, stg, prod)')
param environment string = 'dev'

@description('Unique project prefix, 3-20 chars, lowercase letters and numbers')
param projectPrefix string

@secure()
@description('Admin password for PostgreSQL flexible server')
param postgresAdminPassword string

@description('PostgreSQL admin user')
param postgresAdminLogin string = 'modaiaadmin'

@description('Node runtime version for App Service')
param nodeVersion string = '20-lts'

var appServicePlanName = '${projectPrefix}-${environment}-asp'
var apiAppName = '${projectPrefix}-${environment}-api'
var webAppName = '${projectPrefix}-${environment}-web'
var postgresServerName = '${projectPrefix}-${environment}-pg'
var postgresDbName = 'modaia_closet'
var redisName = '${projectPrefix}-${environment}-redis'
var storageName = take(replace('${projectPrefix}${environment}st', '-', ''), 24)
var keyVaultName = '${projectPrefix}-${environment}-kv'
var appInsightsName = '${projectPrefix}-${environment}-appi'
var logAnalyticsName = '${projectPrefix}-${environment}-log'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'P1v3'
    tier: 'PremiumV3'
    size: 'P1v3'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: []
    enabledForTemplateDeployment: true
    publicNetworkAccess: 'Enabled'
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
}

resource redis 'Microsoft.Cache/Redis@2023-08-01' = {
  name: redisName
  location: location
  properties: {
    sku: {
      name: 'Standard'
      family: 'C'
      capacity: 1
    }
    minimumTlsVersion: '1.2'
    enableNonSslPort: false
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_D2ds_v5'
    tier: 'GeneralPurpose'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 128
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgres
  name: postgresDbName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource apiApp 'Microsoft.Web/sites@2023-12-01' = {
  name: apiAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|${nodeVersion}'
      alwaysOn: true
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'DB_HOST'
          value: postgres.properties.fullyQualifiedDomainName
        }
        {
          name: 'DB_PORT'
          value: '5432'
        }
        {
          name: 'DB_DATABASE'
          value: postgresDbName
        }
        {
          name: 'DB_USERNAME'
          value: '${postgresAdminLogin}@${postgresServerName}'
        }
        {
          name: 'REDIS_HOST'
          value: redis.properties.hostName
        }
        {
          name: 'REDIS_PORT'
          value: '6380'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ]
    }
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|${nodeVersion}'
      alwaysOn: true
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'NEXT_PUBLIC_API_URL'
          value: 'https://${apiApp.properties.defaultHostName}/api'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ]
    }
  }
}

output apiHostName string = apiApp.properties.defaultHostName
output webHostName string = webApp.properties.defaultHostName
output keyVaultName string = keyVault.name
output storageAccountName string = storage.name
output postgresFqdn string = postgres.properties.fullyQualifiedDomainName
