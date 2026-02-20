import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class CompaniesService {
  constructor(private database: DatabaseService) {}

  async findAll() {
    const sql = 'SELECT * FROM companies ORDER BY name';
    try {
      const result = await this.database.query(sql);      return result.rows || [];
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      return [];
    }
  }

  async findOne(id: string) {
    const sql = 'SELECT * FROM companies WHERE id = $1';
    try {
      const result = await this.database.query(sql, [id]);
      if (result.rows.length === 0) {
        throw new NotFoundException('Empresa não encontrada');
      }
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao buscar empresa:', error);
      throw new NotFoundException('Empresa não encontrada');
    }
  }

  async create(createCompanyDto: any) {
    const { name, cnpj, email, phone, address, active = true } = createCompanyDto;
    const sql = `
      INSERT INTO companies (name, cnpj, email, phone, address, active, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
      RETURNING *
    `;
    
    try {
      const result = await this.database.query(sql, [name, cnpj, email, phone, address, active]);
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      throw error;
    }
  }

  async update(id: string, updateCompanyDto: any) {
    const { name, cnpj, email, phone, address, active } = updateCompanyDto;
    
    // Construir query dinamicamente baseado nos campos fornecidos
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (cnpj !== undefined) {
      fields.push(`cnpj = $${paramIndex++}`);
      values.push(cnpj);
    }
    if (email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (address !== undefined) {
      fields.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    if (active !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      values.push(active);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    
    const sql = `
      UPDATE companies 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;
    
    try {
      const result = await this.database.query(sql, values);
      if (result.rows.length === 0) {
        throw new NotFoundException('Empresa não encontrada');
      }
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao atualizar empresa:', error);
      throw new NotFoundException('Empresa não encontrada');
    }
  }

  async delete(id: string) {
    const sql = 'DELETE FROM companies WHERE id = $1 RETURNING id';
    
    try {
      const result = await this.database.query(sql, [id]);
      if (result.rows.length === 0) {
        throw new NotFoundException('Empresa não encontrada');
      }
      return { message: 'Empresa deletada com sucesso' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao deletar empresa:', error);
      throw new NotFoundException('Empresa não encontrada');
    }
  }

  async activate(id: string) {
    const sql = 'UPDATE companies SET active = true, updated_at = NOW() WHERE id = $1 RETURNING *';
    
    try {
      const result = await this.database.query(sql, [id]);
      if (result.rows.length === 0) {
        throw new NotFoundException('Empresa não encontrada');
      }
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao ativar empresa:', error);
      throw new NotFoundException('Empresa não encontrada');
    }
  }

  async deactivate(id: string) {
    const sql = 'UPDATE companies SET active = false, updated_at = NOW() WHERE id = $1 RETURNING *';
    
    try {
      const result = await this.database.query(sql, [id]);
      if (result.rows.length === 0) {
        throw new NotFoundException('Empresa não encontrada');
      }
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao desativar empresa:', error);
      throw new NotFoundException('Empresa não encontrada');
    }
  }
}
