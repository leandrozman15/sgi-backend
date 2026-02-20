#!/bin/bash

echo "🔧 Corrigindo todos os services para usar BaseService..."

# Lista completa de todos os serviços (ATUALIZADA)
services=(
  "quality:Calibration"
  "raw-materials:RawMaterial"
  "sales:Sale"
  "subscriptions:SubscriptionHistory"
  "suppliers:Supplier"
  "users:User"
  "warehouse:WarehouseLocation"
  "products:Product"
  "purchase-requests:PurchaseRequest"
  "machines:Machine"
  "memberships:Membership"
  "production-orders:ProductionOrder"
)

for service in "${services[@]}"; do
  IFS=':' read -r dir table <<< "$service"
  
  # Corrigir nomes especiais
  case $dir in
    "purchase-requests")
      service_name="PurchaseRequest"
      controller_name="PurchaseRequest"
      ;;
    "raw-materials")
      service_name="RawMaterial"
      controller_name="RawMaterial"
      ;;
    "production-orders")
      service_name="ProductionOrder"
      controller_name="ProductionOrder"
      ;;
    *)
      service_name="$table"
      controller_name="$table"
      ;;
  esac

  service_file="src/${dir}/${dir}.service.ts"
  controller_file="src/${dir}/${dir}.controller.ts"
  module_file="src/${dir}/${dir}.module.ts"
  
  echo "📝 Corrigindo $service_file..."
  
  # Corrigir o service
  if [ -f "$service_file" ]; then
    cp "$service_file" "${service_file}.bak"
    
    cat > "$service_file" << INNER_EOF
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
INNER_EOF
    
    echo "✅ Service corrigido: $service_file"
  fi
  
  # Corrigir o controller
  if [ -f "$controller_file" ]; then
    cp "$controller_file" "${controller_file}.bak"
    
    cat > "$controller_file" << INNER_EOF
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
INNER_EOF
    
    echo "✅ Controller corrigido: $controller_file"
  fi

  # Corrigir o módulo
  if [ -f "$module_file" ]; then
    cp "$module_file" "${module_file}.bak"
    
    # Adicionar imports corretos
    cat > "$module_file" << INNER_EOF
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
INNER_EOF
    
    echo "✅ Module corrigido: $module_file"
  fi
done

# 2. VERIFICAR SE TODOS OS DIRETÓRIOS EXISTEM
echo "📝 Verificando diretórios dos módulos..."

for dir in machines memberships production-orders; do
  if [ ! -d "src/${dir}" ]; then
    echo "⚠️ Diretório src/${dir} não encontrado, criando..."
    mkdir -p "src/${dir}"
  fi
done

# 3. CRIAR TENANT DECORATOR SE NÃO EXISTIR
mkdir -p src/common/decorators
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

# 4. CORRIGIR BASE SERVICE
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
echo "✅ Base service verificado"

# 5. CORREÇÕES MANUAIS PARA MÓDULOS ESPECÍFICOS
echo "📝 Corrigindo módulos específicos..."

# Corrigir sales module
if [ -f src/sales/sales.module.ts ]; then
  cp src/sales/sales.module.ts src/sales/sales.module.ts.bak
  sed -i 's/SaleQuoteController/SaleController/g' src/sales/sales.module.ts
  echo "✅ Sales module corrigido"
fi

# Corrigir users module
if [ -f src/users/users.module.ts ]; then
  cp src/users/users.module.ts src/users/users.module.ts.bak
  sed -i 's/UsersService/UserService/g' src/users/users.module.ts
  sed -i 's/UsersController/UserController/g' src/users/users.module.ts
  echo "✅ Users module corrigido"
fi

echo "🎯 Todos os serviços foram corrigidos!"
