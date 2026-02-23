import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const port = process.env.PORT || 3001;
  const corsFromEnv = (process.env.CORS_ORIGIN || process.env.APP_PUBLIC_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const corsOrigins = [
    ...new Set([
      ...corsFromEnv,
      'http://localhost:3000',
      'https://studio--base-17793905-8ce2e.us-central1.hosted.app',
      /^https:\/\/.*\.cloudworkstations\.dev$/,
      /^https:\/\/.*\.googleusercontent\.com$/,
    ]),
  ];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-company-id'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  await app.listen(port);

  console.log('='.repeat(60));
  console.log(`🚀 Backend running on port ${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for:`);
  corsOrigins.forEach((origin) => {
    console.log(`   - ${origin.toString()}`);
  });
  console.log('='.repeat(60));

  // Log de rutas (debug)
  const server = app.getHttpServer();
  const router = server._events.request._router;
  const routes = router.stack
    .filter(layer => layer.route)
    .map(layer => ({
      path: layer.route?.path,
      method: Object.keys(layer.route?.methods)[0]?.toUpperCase(),
    }))
    .filter(route => route.path && route.method);

  logger.debug(`📋 Rotas disponíveis (${routes.length}):`);
  routes.slice(0, 10).forEach(route => {
    logger.debug(`   ${route.method} ${route.path}`);
  });
  if (routes.length > 10) {
    logger.debug(`   ... mais ${routes.length - 10} rotas`);
  }
}

bootstrap().catch(err => {
  console.error('❌ Erro ao iniciar o servidor:', err);
  process.exit(1);
});