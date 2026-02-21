import { HealthModule } from "./health/health.module";
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { FirebaseModule } from './firebase/firebase.module';
import { InternalModule } from './internal/internal.module';

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    FirebaseModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    InternalModule,  // ← AGREGADO
  ],
})
export class AppModule {}
