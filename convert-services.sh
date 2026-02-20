#!/bin/bash

SERVICES=(
  "audit-logs:AuditLog:auditLog"
  "carriers:Carrier:carrier"
  "clients:Client:client"
  "employees:Employee:employee"
  "inventory:InventoryMovement:inventoryMovement"
  "machines:Machine:machine"
  "memberships:Membership:membership"
  "products:Product:product"
  "production-orders:ProductionOrder:productionOrder"
  "raw-materials:RawMaterial:rawMaterial"
  "sales:Sale:sale"
  "suppliers:Supplier:supplier"
  "warehouse:WarehouseLocation:warehouseLocation"
  "finance:TaxServicePayment:taxServicePayment"
  "hr-extras:WorkAccident:workAccident"
  "purchase-requests:PurchaseRequest:purchaseRequest"
  "quality:Calibration:calibration"
  "subscriptions:SubscriptionHistory:subscriptionHistory"
  "users:User:user"
)

for item in "${SERVICES[@]}"; do
  IFS=':' read -r dir model table <<< "$item"
  
  cat > "src/$dir/$dir.service.ts" << SERVEOF
import { Injectable } from '@nestjs/common';
import { BaseService } from '../database/base.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ${model}Service extends BaseService {
  constructor(protected db: DatabaseService) {
    super(db);
    this.tableName = '${model}';
  }

  // Métodos específicos podem ser adicionados aqui
}
SERVEOF

  echo "✅ Convertido: $dir/$dir.service.ts"
done
