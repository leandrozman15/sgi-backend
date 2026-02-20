import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Usar PORT del .env, con fallback a 3001
  const port = process.env.PORT || 3001;
  
  await app.listen(port);
  
  console.log('='.repeat(50));
  console.log(`🚀 Backend running on port ${port}`);
  console.log('='.repeat(50));
}
bootstrap();