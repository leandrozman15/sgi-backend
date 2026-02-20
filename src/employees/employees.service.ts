import { Injectable } from '@nestjs/common';
import { BaseService } from '../database/base.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class EmployeeService extends BaseService {
  constructor(protected db: DatabaseService) {
    super(db);
  }

  async findByCompany(companyId: string) {
    return this.findAll(companyId, 'Employee');
  }

  async findById(id: string, companyId: string) {
    return this.findOne(id, companyId, 'Employee');
  }

  async createItem(data: any, companyId: string) {
    return this.create(data, companyId, 'Employee');
  }

  async updateItem(id: string, data: any, companyId: string) {
    return this.update(id, data, companyId, 'Employee');
  }

  async deleteItem(id: string, companyId: string) {
    return this.remove(id, companyId, 'Employee');
  }
}
