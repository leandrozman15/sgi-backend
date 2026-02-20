import { Injectable } from '@nestjs/common';
import { BaseService } from '../database/base.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class FinanceService extends BaseService {
  constructor(protected db: DatabaseService) {
    super(db);
    this.tableName = 'TaxServicePayment';
  }
}
