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
