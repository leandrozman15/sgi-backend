import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  async onModuleInit() {
    try {
      await this.pool.connect();
      console.log('Banco de dados conectado com sucesso');
    } catch (error) {
      console.error('Erro ao conectar ao banco de dados:', error);
    }
  }

  async query(text: string, params?: any[]) {
    try {
      return await this.pool.query(text, params);
    } catch (error) {
      console.error('Erro na query:', error);
      throw error;
    }
  }
}
