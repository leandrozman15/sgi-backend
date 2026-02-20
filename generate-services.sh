#!/bin/bash

# Lista de modelos (basada en tu schema)
MODELS=(
  "Company"
  "User"
  "Membership"
  "AuditLog"
  "Carrier"
  "Client"
  "Employee"
  "InventoryMovement"
  "Machine"
  "Product"
  "ProductionOrder"
  "RawMaterial"
  "Sale"
  "Supplier"
  "WarehouseLocation"
  "BankTransaction"
  "SalaryPayment"
  "TaxServicePayment"
  "Vacation"
  "EpiDelivery"
  "AttendanceRecord"
  "WorkAccident"
  "PurchaseRequest"
  "QualityInspection"
  "Complaint"
  "Calibration"
  "SaleQuote"
  "UpgradeRequest"
  "Invoice"
  "SubscriptionHistory"
)

# Nombres en minúscula para archivos y rutas
declare -A PATHS=(
  ["Company"]="companies"
  ["User"]="users"
  ["Membership"]="memberships"
  ["AuditLog"]="audit-logs"
  ["Carrier"]="carriers"
  ["Client"]="clients"
  ["Employee"]="employees"
  ["InventoryMovement"]="inventory"
  ["Machine"]="machines"
  ["Product"]="products"
  ["ProductionOrder"]="production-orders"
  ["RawMaterial"]="raw-materials"
  ["Sale"]="sales"
  ["Supplier"]="suppliers"
  ["WarehouseLocation"]="warehouse"
  ["BankTransaction"]="finance"
  ["SalaryPayment"]="finance"
  ["TaxServicePayment"]="finance"
  ["Vacation"]="hr-extras"
  ["EpiDelivery"]="hr-extras"
  ["AttendanceRecord"]="hr-extras"
  ["WorkAccident"]="hr-extras"
  ["PurchaseRequest"]="purchase-requests"
  ["QualityInspection"]="quality"
  ["Complaint"]="quality"
  ["Calibration"]="quality"
  ["SaleQuote"]="sales"
  ["UpgradeRequest"]="subscriptions"
  ["Invoice"]="subscriptions"
  ["SubscriptionHistory"]="subscriptions"
)

# Crear directorios
for model in "${MODELS[@]}"; do
  path=${PATHS[$model]}
  mkdir -p src/$path
  mkdir -p src/$path/dto
done

# Generar servicio para cada modelo
for model in "${MODELS[@]}"; do
  path=${PATHS[$model]}
  service_file="src/$path/${path}.service.ts"
  lower_model=$(echo $model | tr '[:upper:]' '[:lower:]')
  
  # Solo crear si no existe o si queremos sobrescribir
  cat > $service_file << SERV
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ${model}Service {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.${lower_model}.findMany({
      where: { companyId, deletedAt: null },
    });
  }

  async findOne(id: string, companyId: string) {
    return this.prisma.${lower_model}.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  async create(data: any, companyId: string) {
    return this.prisma.${lower_model}.create({
      data: { ...data, companyId },
    });
  }

  async update(id: string, data: any, companyId: string) {
    return this.prisma.${lower_model}.update({
      where: { id, companyId },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    return this.prisma.${lower_model}.update({
      where: { id, companyId },
      data: { deletedAt: new Date() },
    });
  }
}
SERV

  echo "✅ Servicio creado: $service_file"
done

# Generar controladores básicos
for model in "${MODELS[@]}"; do
  path=${PATHS[$model]}
  controller_file="src/$path/${path}.controller.ts"
  lower_model=$(echo $model | tr '[:upper:]' '[:lower:]')
  
  cat > $controller_file << CTRL
import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ${model}Service } from './${path}.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TenantMembershipGuard } from '../auth/guards/tenant-membership.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('${path}')
@UseGuards(FirebaseAuthGuard, TenantMembershipGuard)
export class ${model}Controller {
  constructor(private readonly ${lower_model}Service: ${model}Service) {}

  @Get()
  findAll(@Tenant('companyId') companyId: string) {
    return this.${lower_model}Service.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.${lower_model}Service.findOne(id, companyId);
  }

  @Post()
  create(@Body() createDto: any, @Tenant('companyId') companyId: string) {
    return this.${lower_model}Service.create(createDto, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Tenant('companyId') companyId: string) {
    return this.${lower_model}Service.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.${lower_model}Service.remove(id, companyId);
  }
}
CTRL

  echo "✅ Controlador creado: $controller_file"
done

# Generar módulos
for model in "${MODELS[@]}"; do
  path=${PATHS[$model]}
  module_file="src/$path/${path}.module.ts"
  
  cat > $module_file << MOD
import { Module } from '@nestjs/common';
import { ${model}Service } from './${path}.service';
import { ${model}Controller } from './${path}.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [${model}Controller],
  providers: [${model}Service],
  exports: [${model}Service],
})
export class ${model}Module {}
MOD

  echo "✅ Módulo creado: $module_file"
done

echo ""
echo "🎉 GENERACIÓN COMPLETADA!"
echo "Total de modelos: ${#MODELS[@]}"
echo "Archivos creados en:"
echo "  - src/*/*.service.ts"
echo "  - src/*/*.controller.ts"
echo "  - src/*/*.module.ts"
