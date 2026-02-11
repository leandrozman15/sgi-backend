import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ClientsModule } from './clients/clients.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CarriersModule } from './carriers/carriers.module';
import { RawMaterialsModule } from './raw-materials/raw-materials.module';
import { EmployeesModule } from './employees/employees.module';
import { MachinesModule } from './machines/machines.module';
import { ProductionOrdersModule } from './production-orders/production-orders.module';
import { InventoryModule } from './inventory/inventory.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { SalesModule } from './sales/sales.module';
import { FinanceModule } from './finance/finance.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { QualityModule } from './quality/quality.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { HrExtrasModule } from './hr-extras/hr-extras.module';
import { InternalModule } from './internal/internal.module';
import { FirebaseTenantGuard } from './auth/guards/firebase-tenant.guard';
import { TenantMembershipGuard } from './auth/guards/tenant-membership.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CompanyInterceptor } from './common/interceptors/company.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CompaniesModule,
    ClientsModule,
    ProductsModule,
    SuppliersModule,
    CarriersModule,
    RawMaterialsModule,
    EmployeesModule,
    MachinesModule,
    ProductionOrdersModule,
    InventoryModule,
    WarehouseModule,
    SalesModule,
    FinanceModule,
    AuditLogsModule,
    QualityModule,
    PurchaseRequestsModule,
    HrExtrasModule,
    InternalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: FirebaseTenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantMembershipGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CompanyInterceptor,
    },
  ],
})
export class AppModule {}
