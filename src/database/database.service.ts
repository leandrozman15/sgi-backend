import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL não está definida');
    }

    this.logger.log('Inicializando pool de conexões PostgreSQL');
    
    this.pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false, // Importante para Neon
      },
      max: 20, // máximo de conexões no pool
      idleTimeoutMillis: 30000, // tempo máximo que uma conexão pode ficar ociosa
      connectionTimeoutMillis: 2000, // tempo máximo para estabelecer conexão
    });

    // Tratamento de erros no pool
    this.pool.on('error', (err) => {
      this.logger.error(`Erro inesperado no pool de conexões: ${err.message}`);
    });
  }

  async onModuleInit() {
    try {
      // Testa a conexão ao iniciar
      await this.pool.query('SELECT 1');
      this.logger.log('✅ Conexão com PostgreSQL estabelecida com sucesso');
    } catch (error) {
      this.logger.error(`❌ Falha ao conectar ao PostgreSQL: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Fechando pool de conexões PostgreSQL');
    await this.pool.end();
  }

  /**
   * Executa uma query SQL com parâmetros
   * @param text SQL query
   * @param params Parâmetros para a query
   * @returns Resultado completo da query
   */
  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        this.logger.warn(`Query lenta (${duration}ms): ${text.substring(0, 100)}...`);
      } else {
        this.logger.debug(`Query executada em ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Erro na query: ${error.message}`);
      this.logger.debug(`Query: ${text}`);
      this.logger.debug(`Params: ${JSON.stringify(params)}`);
      throw error;
    }
  }

  /**
   * Executa uma query e retorna apenas as linhas
   */
  async queryRows(text: string, params?: any[]) {
    const result = await this.query(text, params);
    return result.rows;
  }

  /**
   * Executa uma query e retorna apenas a primeira linha
   */
  async queryOne(text: string, params?: any[]) {
    const result = await this.query(text, params);
    return result.rows[0];
  }

  /**
   * Executa uma query e retorna apenas o valor da primeira coluna da primeira linha
   */
  async queryValue(text: string, params?: any[]) {
    const result = await this.query(text, params);
    return result.rows[0]?.[Object.keys(result.rows[0] || {})[0]];
  }

  /**
   * Inicia uma transação
   * @returns Cliente para usar na transação
   */
  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Comita uma transação
   */
  async commitTransaction(client: any) {
    try {
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  }

  /**
   * Reverte uma transação
   */
  async rollbackTransaction(client: any) {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  /**
   * Executa queries dentro de uma transação
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
