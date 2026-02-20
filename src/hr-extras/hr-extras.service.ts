import { Injectable } from '@nestjs/common';
import { BaseService } from '../database/base.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WorkAccidentService extends BaseService {
  constructor(protected db: DatabaseService) {
    super(db);
  }

  async findByCompany(companyId: string) {
    return this.findAll(companyId, 'WorkAccident');
  }

  async findById(id: string, companyId: string) {
    return this.findOne(id, companyId, 'WorkAccident');
  }

  async createItem(data: any, companyId: string) {
    return this.create(data, companyId, 'WorkAccident');
  }

  async updateItem(id: string, data: any, companyId: string) {
    return this.update(id, data, companyId, 'WorkAccident');
  }

  async deleteItem(id: string, companyId: string) {
    return this.remove(id, companyId, 'WorkAccident');
  }
}
