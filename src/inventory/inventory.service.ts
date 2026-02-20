import { Injectable } from '@nestjs/common';
import { BaseService } from '../database/base.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InventoryMovementService extends BaseService {
  constructor(protected db: DatabaseService) {
    super(db);
  }

  async findByCompany(companyId: string) {
    return this.findAll(companyId, 'InventoryMovement');
  }

  async findById(id: string, companyId: string) {
    return this.findOne(id, companyId, 'InventoryMovement');
  }

  async createItem(data: any, companyId: string) {
    return this.create(data, companyId, 'InventoryMovement');
  }

  async updateItem(id: string, data: any, companyId: string) {
    return this.update(id, data, companyId, 'InventoryMovement');
  }

  async deleteItem(id: string, companyId: string) {
    return this.remove(id, companyId, 'InventoryMovement');
  }
}
