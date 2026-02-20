#!/bin/bash

echo "🔧 CORREÇÃO DEFINITIVA - TODOS OS MÓDULOS"

# Lista COMPLETA de todos os módulos do projeto
modules=(
  "audit-logs:AuditLog"
  "carriers:Carrier"
  "clients:Client"
  "companies:Company"
  "employees:Employee"
  "finance:TaxServicePayment"
  "hr-extras:WorkAccident"
  "inventory:InventoryMovement"
  "machines:Machine"
  "memberships:Membership"
  "production-orders:ProductionOrder"
  "products:Product"
  "purchase-requests:PurchaseRequest"
  "quality:Calibration"
  "raw-materials:RawMaterial"
  "sales:Sale"
  "subscriptions:SubscriptionHistory"
  "suppliers:Supplier"
  "users:User"
  "warehouse:WarehouseLocation"
)

echo "📦 Total de módulos a processar: ${#modules[@]}"

for module in "${modules[@]}"; do
  IFS=':' read -r dir table <<< "$module"
  
  # Determinar nomes corretos (manejo de casos especiais)
  case $dir in
    "audit-logs")
      service_name="AuditLog"
      controller_name="AuditLog"
      ;;
    "hr-extras")
      service_name="WorkAccident"
      controller_name="WorkAccident"
      ;;
    "production-orders")
      service_name="ProductionOrder"
      controller_name="ProductionOrder"
      ;;
    "purchase-requests")
      service_name="PurchaseRequest"
      controller_name="PurchaseRequest"
      ;;
    "raw-materials")
      service_name="RawMaterial"
      controller_name="RawMaterial"
      ;;
    *)
      # Capitalizar primeira letra
      service_name="$(echo $table | sed 's/.*/\u&/')"
      controller_name="$service_name"
      ;;
  esac

  echo ""
  echo "🔄 Processando módulo: $dir → $service_name"

  service_file="src/${dir}/${dir}.service.ts"
  controller_file="src/${dir}/${dir}.controller.ts"
  module_file="src/${dir}/${dir}.module.ts"

  # 1. CORRIGIR SERVICE
  if [ -f "$service_file" ]; then
    echo "  📝 Service encontrado: $service_file"
    cp "$service_file" "${service_file}.bak"
    
    cat > "$service_file" << EOS
import { Injectable } from '@nestjs/common';
import { BaseService } from '../database/base.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ${service_name}Service extends BaseService {
  constructor(protected db: DatabaseService) {
    super(db);
  }

  async findByCompany(companyId: string) {
    return this.findAll(companyId, '${table}');
  }

  async findById(id: string, companyId: string) {
    return this.findOne(id, companyId, '${table}');
  }

  async createItem(data: any, companyId: string) {
    return this.create(data, companyId, '${table}');
  }

  async updateItem(id: string, data: any, companyId: string) {
    return this.update(id, data, companyId, '${table}');
  }

  async deleteItem(id: string, companyId: string) {
    return this.remove(id, companyId, '${table}');
  }
}
EOS
    echo "  ✅ Service corrigido"
    
    # Remover referências a tableName
    sed -i 's/this\.tableName/\/\/ this.tableName/g' "$service_file"
  else
    echo "  ⚠️ Service não encontrado: $service_file"
  fi

  # 2. CORRIGIR CONTROLLER
  if [ -f "$controller_file" ]; then
    echo "  �� Controller encontrado: $controller_file"
    cp "$controller_file" "${controller_file}.bak"
    
    # Verificar se já tem as correções
    if ! grep -q "findByCompany" "$controller_file"; then
      cat > "$controller_file" << EOS
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { ${service_name}Service } from './${dir}.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('${dir}')
@UseGuards(AuthGuard, RolesGuard)
export class ${controller_name}Controller {
  constructor(private readonly service: ${service_name}Service) {}

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findAll(@Tenant() companyId: string) {
    return this.service.findByCompany(companyId);
  }

  @Get(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findOne(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findById(id, companyId);
  }

  @Post()
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async create(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createItem(createDto, companyId);
  }

  @Put(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Tenant() companyId: string
  ) {
    return this.service.updateItem(id, updateDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteItem(id, companyId);
  }
}
EOS
      echo "  ✅ Controller corrigido"
    else
      echo "  ✅ Controller já corrigido"
    fi
  fi

  # 3. CORRIGIR MODULE
  if [ -f "$module_file" ]; then
    echo "  📝 Module encontrado: $module_file"
    cp "$module_file" "${module_file}.bak"
    
    # Recriar module com estrutura correta
    cat > "$module_file" << EOS
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ${service_name}Service } from './${dir}.service';
import { ${controller_name}Controller } from './${dir}.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [${controller_name}Controller],
  providers: [${service_name}Service],
  exports: [${service_name}Service]
})
export class ${controller_name}Module {}
EOS
    echo "  ✅ Module corrigido"
  fi
done

# 4. CORREÇÕES ESPECIAIS PARA MÓDULOS COM COMPORTAMENTO DIFERENTE

echo ""
echo "🔧 Corrigindo módulos especiais..."

# Corrigir internal.service.ts (tem métodos especiais)
if [ -f src/internal/internal.service.ts ]; then
  cp src/internal/internal.service.ts src/internal/internal.service.ts.bak
  # Substituir queryRows por query
  sed -i 's/this\.db\.queryRows/this.db.query/g' src/internal/internal.service.ts
  # Comentar métodos de transação se não existirem
  sed -i 's/this\.db\.beginTransaction/\/\/ this.db.beginTransaction/g' src/internal/internal.service.ts
  sed -i 's/this\.db\.commitTransaction/\/\/ this.db.commitTransaction/g' src/internal/internal.service.ts
  sed -i 's/this\.db\.rollbackTransaction/\/\/ this.db.rollbackTransaction/g' src/internal/internal.service.ts
  echo "✅ internal.service.ts corrigido"
fi

# Corrigir companies.service.ts (tem queryRows)
if [ -f src/companies/companies.service.ts ]; then
  cp src/companies/companies.service.ts src/companies/companies.service.ts.bak
  sed -i 's/this\.db\.queryRows/this.db.query/g' src/companies/companies.service.ts
  echo "✅ companies.service.ts corrigido"
fi

# Corrigir finance.service.ts (nome da tabela)
if [ -f src/finance/finance.service.ts ]; then
  cp src/finance/finance.service.ts src/finance/finance.service.ts.bak
  sed -i 's/this\.tableName/\/\/ this.tableName/g' src/finance/finance.service.ts
  echo "✅ finance.service.ts corrigido"
fi

# 5. GARANTIR QUE BASE SERVICE E TENANT DECORATOR EXISTEM
echo ""
echo "🔧 Verificando arquivos base..."

mkdir -p src/common/decorators

# Base Service
if [ ! -f src/database/base.service.ts ]; then
  cat > src/database/base.service.ts << 'EOD'
import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class BaseService {
  constructor(protected db: DatabaseService) {}

  async findAll(companyId: string, table: string) {
    const sql = `SELECT * FROM ${table} WHERE company_id = $1 ORDER BY created_at DESC`;
    const result = await this.db.query(sql, [companyId]);
    return result.rows;
  }

  async findOne(id: string, companyId: string, table: string) {
    const sql = `SELECT * FROM ${table} WHERE id = $1 AND company_id = $2`;
    const result = await this.db.query(sql, [id, companyId]);
    return result.rows[0];
  }

  async create(data: any, companyId: string, table: string) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 2}`).join(', ');
    
    const sql = `INSERT INTO ${table} (company_id, ${keys.join(', ')}) VALUES ($1, ${placeholders}) RETURNING *`;
    const result = await this.db.query(sql, [companyId, ...values]);
    return result.rows[0];
  }

  async update(id: string, data: any, companyId: string, table: string) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 3}`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`;
    const result = await this.db.query(sql, [id, companyId, ...values]);
    return result.rows[0];
  }

  async remove(id: string, companyId: string, table: string) {
    const sql = `DELETE FROM ${table} WHERE id = $1 AND company_id = $2 RETURNING id`;
    const result = await this.db.query(sql, [id, companyId]);
    return result.rows[0];
  }
}
EOD
  echo "✅ BaseService criado"
fi

# Tenant Decorator
if [ ! -f src/common/decorators/tenant.decorator.ts ]; then
  cat > src/common/decorators/tenant.decorator.ts << 'EOD'
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.companyId || request.body.companyId || request.params.companyId;
  },
);
EOD
  echo "✅ Tenant decorator criado"
fi

echo ""
echo "🎯 CORREÇÕES FINALIZADAS!"
