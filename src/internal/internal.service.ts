import { Injectable, BadRequestException, InternalServerErrorException, ConflictException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { getAuth } from 'firebase-admin/auth';
import { BootstrapCompanyDto } from './dto/bootstrap-company.dto';

@Injectable()
export class InternalService {
  private readonly logger = new Logger(InternalService.name);
  private readonly auth = getAuth();

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async listUsers() {
    const usersResult = await this.auth.listUsers(100);
    return usersResult.users.map(u => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      providers: u.providerData.map(p => p.providerId),
      createdAt: u.metadata.creationTime,
      lastLogin: u.metadata.lastSignInTime,
    }));
  }

  async listCompanies() {
    const sql = `
      SELECT c.*, 
             json_agg(json_build_object(
               'user', json_build_object(
                 'id', u.id,
                 'email', u.email
               )
             )) as memberships
      FROM "Company" c
      LEFT JOIN "Membership" m ON m."companyId" = c.id AND m."deletedAt" IS NULL
      LEFT JOIN "User" u ON u.id = m."userId" AND u."deletedAt" IS NULL
      WHERE c."deletedAt" IS NULL
      GROUP BY c.id
      ORDER BY c."createdAt" DESC
    `;
    return this.db.queryRows(sql);
  }

  async bootstrapCompany(dto: BootstrapCompanyDto) {
    const { companyName, ownerEmail, ownerName, cnpj } = dto;
    
    this.logger.log(`Bootstrapping company: ${companyName} for owner: ${ownerEmail}`);

    let firebaseUser;
    let isNewUser = false;
    
    try {
      firebaseUser = await this.auth.getUserByEmail(ownerEmail);
      this.logger.log(`Usuario existente encontrado: ${firebaseUser.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        firebaseUser = await this.auth.createUser({
          email: ownerEmail,
          displayName: ownerName,
          emailVerified: false,
        });
        isNewUser = true;
        this.logger.log(`Nuevo usuario creado: ${firebaseUser.uid}`);
      } else {
        throw new InternalServerErrorException('Error al verificar usuario en Firebase');
      }
    }

    const uid = firebaseUser.uid;

    // Usar transacción manual
    const client = await this.db.beginTransaction();
    
    try {
      // Crear usuario
      const userSql = `
        INSERT INTO "User" (id, email, password, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET email = $2
        RETURNING *
      `;
      const user = await client.query(userSql, [uid, ownerEmail, Math.random().toString(36).slice(-8)]);
      
      // Crear empresa
      const companySql = `
        INSERT INTO "Company" (id, name, "subscriptionPlan", "subscriptionStatus", "subscriptionSince", "subscriptionRenewal", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
        RETURNING *
      `;
      const company = await client.query(companySql, [companyName, 'FREE', 'ACTIVE']);
      
      // Crear membresía
      const membershipSql = `
        INSERT INTO "Membership" (id, "userId", "companyId", roles, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
        RETURNING *
      `;
      const membership = await client.query(membershipSql, [user.rows[0].id, company.rows[0].id, ['owner', 'admin']]);
      
      await this.db.commitTransaction(client);

      const result = {
        company: company.rows[0],
        user: user.rows[0],
        membership: membership.rows[0],
      };

      let activationLink = null;
      if (isNewUser) {
        const publicUrl = this.config.get<string>('APP_PUBLIC_URL') || 'http://localhost:3000';
        activationLink = await this.auth.generatePasswordResetLink(ownerEmail, {
          url: `${publicUrl}/login?mode=resetPassword`,
          handleCodeInApp: true,
        });
      }

      return {
        success: true,
        company: {
          id: result.company.id,
          name: result.company.name,
        },
        owner: {
          uid: result.user.id,
          email: result.user.email,
        },
        membership: result.membership,
        activationLink,
      };
    } catch (error) {
      await this.db.rollbackTransaction(client);
      this.logger.error('Error en bootstrap:', error);
      
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Ya existe una empresa con esos datos');
      }
      
      throw new InternalServerErrorException('Error al crear la empresa en la base de datos');
    }
  }
}
