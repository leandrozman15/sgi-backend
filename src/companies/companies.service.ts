import { Injectable } from '@nestjs/common';
import { BaseService } from '../database/base.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CompanyService extends BaseService {
  constructor(protected db: DatabaseService) {
    super(db);
    this.tableName = 'Company';
  }

  // Métodos específicos de Company, si los hay
  async findBySubscriptionStatus(status: string) {
    const sql = `SELECT * FROM "Company" WHERE "subscriptionStatus" = $1 AND "deletedAt" IS NULL`;
    return this.db.queryRows(sql, [status]);
  }
}
