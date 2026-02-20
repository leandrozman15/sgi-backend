import { HealthModule } from "./health/health.module";
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { FirebaseModule } from './firebase/firebase.module'; // ✅ NUEVO

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    FirebaseModule, // ✅ AGREGADO - Inicializa Firebase Admin globalmente
    AuthModule,
    CompaniesModule,
    UsersModule,
  ],
})
export class AppModule {}