import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Criar app com configurações de log
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  // Usar PORT do .env, com fallback a 3001
  const port = process.env.PORT || 3001;
  
  // Configurar CORS para aceitar o frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://3000-firebase-base-1767745831923.cluster-ve345ymguzcd6qqzuko2qbxtfe.cloudworkstations.dev',
      /\.cloudworkstations\.dev$/,  // Qualquer subdomínio do cloudworkstations
      /\.googleusercontent\.com$/,  // Qualquer domínio do Google Cloud
      'https://studio--base-17793905-8ce2e.us-central1.hosted.app', // Firebase Hosting
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global prefix (opcional - descomentar se quiser /api)
  // app.setGlobalPrefix('api');
  
  await app.listen(port);
  
  console.log('='.repeat(60));
  console.log(`🚀 Backend running on port ${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for:`);
  console.log(`   - http://localhost:3000`);
  console.log(`   - *.cloudworkstations.dev`);
  console.log(`   - *.googleusercontent.com`);
  console.log(`   - Firebase Hosting`);
  console.log('='.repeat(60));
  
  // Log das rotas disponíveis (útil para debug)
  const server = app.getHttpServer();
  const router = server._events.request._router;
  const routes = router.stack
    .filter(layer => layer.route)
    .map(layer => ({
      path: layer.route?.path,
      method: Object.keys(layer.route?.methods)[0]?.toUpperCase()
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