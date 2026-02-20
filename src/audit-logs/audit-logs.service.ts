import { Injectable } from '@nestjs/common';
import { BaseService } from '../database/base.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditLogService extends BaseService {
  constructor(protected db: DatabaseService) {
    super(db);
  }

  async findByCompany(companyId: string) {
    return this.findAll(companyId, 'AuditLog');
  }

  async findById(id: string, companyId: string) {
    return this.findOne(id, companyId, 'AuditLog');
  }

  async createItem(data: any, companyId: string) {
    return this.create(data, companyId, 'AuditLog');
  }

  async updateItem(id: string, data: any, companyId: string) {
    return this.update(id, data, companyId, 'AuditLog');
  }

  async deleteItem(id: string, companyId: string) {
    return this.remove(id, companyId, 'AuditLog');
  }
}
