import "dotenv/config";
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getAdminAuth } from './lib/firebase-admin';

async function bootstrap() {
  // Log de diagnóstico para confirmar se o Nest vê a variável do .env
  console.log("🔍 Diagnóstico: FIREBASE_SERVICE_ACCOUNT_PATH =", process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

  // Inicializa o Firebase Admin garantindo logs claros de diagnóstico
  getAdminAuth();

  const app = await NestFactory.create(AppModule);

  // Middleware temporário para depurar o cabeçalho de autorização
  app.use((req, _res, next) => {
    const h = req.headers;
    const auth = h["authorization"];
    console.log("REQ", req.method, req.url, "authHeader?", !!auth, "len", typeof auth === "string" ? auth.length : 0);
    next();
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Backend rodando em: http://localhost:${port}`);
}
bootstrap();
