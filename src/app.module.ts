import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';

// --- Módulos de Funcionalidades (Lista completa del archivo de backup) ---
// La estructura de carpetas es './<nombre>/<nombre>.module'
import { CompanyModule } from './companies/companies.module';
import { MembershipModule } from './memberships/memberships.module';
import { AuditLogModule } from './audit-logs/audit-logs.module';
import { CarrierModule } from './carriers/carriers.module';
import { ClientModule } from './clients/clients.module';
import { EmployeeModule } from './employees/employees.module';
import { InventoryMovementModule } from './inventory/inventory.module';
import { MachineModule } from './machines/machines.module';
import { ProductModule } from './products/products.module';
import { RawMaterialModule } from './raw-materials/raw-materials.module';
import { SaleModule } from './sales/sales.module';
import { SupplierModule } from './suppliers/suppliers.module';
import { WarehouseLocationModule } from './warehouse/warehouse.module';
import { PurchaseRequestModule } from './purchase-requests/purchase-requests.module';


// --- Guards de Seguridad Globales ---
import { TenantMembershipGuard } from './auth/guards/tenant-membership.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    // Módulos Core
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    HealthModule,

    // Módulos de Funcionalidades (limpios y sin duplicados)
    CompanyModule,
    MembershipModule,
    AuditLogModule,
    CarrierModule,
    ClientModule,
    EmployeeModule,
    InventoryMovementModule,
    MachineModule,
    ProductModule,
    RawMaterialModule,
    SaleModule,
    SupplierModule,
    WarehouseLocationModule,
    PurchaseRequestModule,
  ],
  providers: [
    // Configuración de Guards Globales (CRÍTICO)
    // Esto aplica la seguridad a todas las rutas de la aplicación.
    
    {
      provide: APP_GUARD,
      useClass: TenantMembershipGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}