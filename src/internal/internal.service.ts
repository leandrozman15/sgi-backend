import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { BootstrapCompanyDto } from './dto/bootstrap-company.dto';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class InternalService {
  private readonly logger = new Logger(InternalService.name);
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Helper: obtiene Firebase Auth "en runtime" (evita problemas de init temprana).
   */
  private auth() {
    return getAuth();
  }

  /**
   * Define/actualiza el Custom Claim "role" para un usuario en Firebase Auth,
   * preservando cualquier claim existente (companyId, permissions, etc.).
   * Además revoca tokens para forzar refresh.
   */
  async fixUserRole(uid: string, role: string) {
    try {
      const auth = this.auth();
      const newRole = role.toUpperCase();

      this.logger.log(
        `FixUserRole: iniciando. UID=${uid}, role=${newRole}`,
      );

      // 1) leer claims actuales
      const user = await auth.getUser(uid);
      const currentClaims =
        (user.customClaims ?? {}) as Record<string, any>;

      // 2) merge seguro (NO pisa otros claims)
      const updatedClaims: Record<string, any> = {
        ...currentClaims,
        role: newRole,
      };

      // 3) escribir claims
      await auth.setCustomUserClaims(uid, updatedClaims);

      this.logger.log(
        `✅ Claims atualizados para UID=${uid}: ${JSON.stringify(updatedClaims)}`,
      );

      // 4) revocar tokens para forzar token nuevo con claims nuevos
      await auth.revokeRefreshTokens(uid);

      this.logger.log(
        `✅ Tokens revogados para UID=${uid} (forçar novo login/token).`,
      );

      return {
        success: true,
        uid,
        role: newRole,
        claims: updatedClaims,
      };
    } catch (error) {
      this.logger.error(
        `❌ Falha ao definir Custom Claim para UID=${uid}`,
        error,
      );
      throw new InternalServerErrorException(
        'Erro ao definir o role do usuário.',
      );
    }
  }

  async getUsers() {
    try {
      const auth = this.auth();
      const usersResult = await auth.listUsers(100);

      return usersResult.users.map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        providers: user.providerData.map((p) => p.providerId),
        createdAt: user.metadata.creationTime,
        lastLogin: user.metadata.lastSignInTime,
      }));
    } catch (error) {
      this.logger.error('Erro ao listar usuários:', error);
      throw new InternalServerErrorException('Erro ao listar usuários');
    }
  }

  async getCompanies() {
    try {
      return this.prisma.companies.findMany({
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      this.logger.error('Erro ao listar empresas:', error);
      throw new InternalServerErrorException('Erro ao listar empresas');
    }
  }

  async getUserByEmail(email: string) {
    try {
      const auth = this.auth();
      const user = await auth.getUserByEmail(email);

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        providers: user.providerData.map((p) => p.providerId),
        createdAt: user.metadata.creationTime,
        lastLogin: user.metadata.lastSignInTime,
      };
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        return null;
      }
      this.logger.error('Erro ao buscar usuário por email:', error);
      throw new InternalServerErrorException('Erro ao buscar usuário');
    }
  }

  async bootstrapCompany(dto: BootstrapCompanyDto) {
    const { companyName, ownerEmail, ownerName, cnpj } = dto;

    if (!companyName || !ownerEmail) {
      throw new BadRequestException('companyName e ownerEmail são obrigatórios');
    }

    try {
      const auth = this.auth();

      let userRecord: any;
      let isNewUser = false;

      try {
        userRecord = await auth.getUserByEmail(ownerEmail);
      } catch (error: any) {
        if (error?.code === 'auth/user-not-found') {
          isNewUser = true;
          userRecord = await auth.createUser({
            email: ownerEmail,
            displayName: ownerName || `Admin ${companyName}`,
            password: Math.random().toString(36).slice(-8),
          });
        } else {
          throw error;
        }
      }

      const companyId = await this.prisma.$transaction(async (tx) => {
        const company = await tx.companies.create({
          data: {
            name: companyName,
            cnpj: cnpj || null,
          },
          select: {
            id: true,
          },
        });

        await tx.user_companies.create({
          data: {
            user_id: userRecord.uid,
            company_id: company.id,
            role: 'ADMIN',
          },
        });

        return company.id;
      });

      // ⚠️ Importante: setCustomUserClaims SOBRESCRIBE claims.
      // Acá está bien porque estamos definiendo el set completo para el owner.
      await auth.setCustomUserClaims(userRecord.uid, {
        role: 'ADMIN',
        companyId,
        permissions: [
          'companies:read',
          'companies:write',
          'users:manage',
          'production:read',
          'production:write',
          'financial:read',
          'financial:approve',
        ],
      });

      const activationLink = isNewUser
        ? `${process.env.FRONTEND_URL}/ativar-conta?email=${encodeURIComponent(
            ownerEmail,
          )}&company=${encodeURIComponent(companyName)}`
        : null;

      return {
        company: { id: companyId, name: companyName, cnpj: cnpj || null },
        owner: {
          uid: userRecord.uid,
          email: ownerEmail,
          name: ownerName || null,
          isNewUser,
        },
        activationLink,
        message: 'Empresa criada com sucesso',
      };
    } catch (error: any) {
      this.logger.error('Erro ao criar empresa:', error);

      if (error?.code === '23505') {
        throw new ConflictException('Empresa já existe');
      }
      throw new InternalServerErrorException('Erro ao criar empresa');
    }
  }

  async getCompanyStats(companyId: string) {
    try {
      const stats = { employees: 0, machines: 0, orders: 0, revenue: 0 };

      const [employees, machines, orders, revenue] = await Promise.all([
        this.prisma.employees.count({ where: { company_id: companyId } }),
        this.prisma.machines.count({ where: { company_id: companyId } }),
        this.prisma.production_orders.count({ where: { company_id: companyId } }),
        this.prisma.financial_transactions.aggregate({
          where: {
            company_id: companyId,
            type: 'revenue',
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      stats.employees = employees;
      stats.machines = machines;
      stats.orders = orders;
      stats.revenue = Number(revenue._sum.amount ?? 0);

      return stats;
    } catch (error) {
      this.logger.error('Erro ao buscar estatísticas:', error);
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  async getSystemHealth() {
    try {
      const auth = this.auth();
      await this.prisma.$queryRaw`SELECT 1`;
      await auth.listUsers(1);

      return {
        status: 'healthy',
        database: 'connected',
        firebase: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error('Erro na verificação de saúde:', error);
      return {
        status: 'unhealthy',
        database: '...',
        firebase: '...',
        error: error?.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteUser(uid: string) {
    try {
      const auth = this.auth();
      await auth.deleteUser(uid);
      await this.prisma.user_companies.deleteMany({
        where: { user_id: uid },
      });
      return { message: 'Usuário deletado com sucesso' };
    } catch (error) {
      this.logger.error('Erro ao deletar usuário:', error);
      throw new InternalServerErrorException('Erro ao deletar usuário');
    }
  }

  async deleteCompany(companyId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user_companies.deleteMany({
          where: { company_id: companyId },
        });

        await tx.companies.delete({
          where: { id: companyId },
        });
      });

      return { message: 'Empresa deletada com sucesso' };
    } catch (error) {
      this.logger.error('Erro ao deletar empresa:', error);
      throw new InternalServerErrorException('Erro ao deletar empresa');
    }
  }
}