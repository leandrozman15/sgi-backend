import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export abstract class BaseService {
  constructor(protected db: DatabaseService) {}

  protected tableName: string;

  async findAll(companyId: string) {
    const sql = `SELECT * FROM "${this.tableName}" WHERE "companyId" = $1 AND "deletedAt" IS NULL ORDER BY "createdAt" DESC`;
    return this.db.queryRows(sql, [companyId]);
  }

  async findOne(id: string, companyId: string) {
    const sql = `SELECT * FROM "${this.tableName}" WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`;
    return this.db.queryOne(sql, [id, companyId]);
  }

  async create(data: any, companyId: string) {
    const keys = Object.keys(data).map(k => `"${k}"`).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 2}`).join(', ');
    
    const sql = `INSERT INTO "${this.tableName}" (companyId, ${keys}) VALUES ($1, ${placeholders}) RETURNING *`;
    return this.db.queryOne(sql, [companyId, ...values]);
  }

  async update(id: string, data: any, companyId: string) {
    const setClause = Object.keys(data).map((key, i) => `"${key}" = $${i + 3}`).join(', ');
    const values = [...Object.values(data), id, companyId];
    
    const sql = `UPDATE "${this.tableName}" SET ${setClause}, "updatedAt" = NOW() WHERE id = $${values.length - 1} AND "companyId" = $${values.length} AND "deletedAt" IS NULL RETURNING *`;
    return this.db.queryOne(sql, values);
  }

  async remove(id: string, companyId: string) {
    const sql = `UPDATE "${this.tableName}" SET "deletedAt" = NOW() WHERE id = $1 AND "companyId" = $2 RETURNING id`;
    return this.db.queryOne(sql, [id, companyId]);
  }

  async findByCompany(companyId: string) {
    return this.findAll(companyId);
  }
}
