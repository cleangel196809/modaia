export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'modaia',
    password: process.env.DB_PASSWORD || 'modaia_dev_password',
    name: process.env.DB_DATABASE || 'modaia_closet',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change_me_access_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change_me_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  wompi: {
    publicKey: process.env.WOMPI_PUBLIC_KEY || 'pub_test_replace_with_real_sandbox_key',
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
    eventsSecret: process.env.WOMPI_EVENTS_SECRET || '',
    checkoutUrl: process.env.WOMPI_CHECKOUT_URL || 'https://checkout.wompi.co/p/',
  },
  webAppUrl: process.env.WEB_APP_URL || 'http://localhost:3000',
});
