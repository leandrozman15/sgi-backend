import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { Prisma, PrismaClient } from '@prisma/client';

type AdminBootstrapPayload = {
  name: string;
  cnpj?: string;
  adminEmail: string;
  adminName?: string;
  plan?: string;
  trial?: boolean;
};

@Injectable()
export class CompanyService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private normalizePlan(plan?: string): string {
    const normalized = (plan || 'basic').trim().toLowerCase();
    if (normalized === 'pro' || normalized === 'enterprise' || normalized === 'basic') {
      return normalized;
    }
    return 'basic';
  }

  private computeUsagePercent(
    plan: string,
    counters: { employees: number; machines: number; orders: number },
  ): number {
    const limitsByPlan: Record<string, { employees: number; machines: number; orders: number }> = {
      basic: { employees: 20, machines: 10, orders: 100 },
      pro: { employees: 100, machines: 40, orders: 500 },
      enterprise: { employees: 500, machines: 200, orders: 5000 },
    };

    const selectedLimits = limitsByPlan[plan] || limitsByPlan.basic;
    const employeesRatio = counters.employees / selectedLimits.employees;
    const machinesRatio = counters.machines / selectedLimits.machines;
    const ordersRatio = counters.orders / selectedLimits.orders;
    const peakRatio = Math.max(employeesRatio, machinesRatio, ordersRatio, 0);

    return Math.max(0, Math.min(100, Math.round(peakRatio * 100)));
  }

  async getAdminOverview() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const companies = await this.prisma.companies.findMany({
      include: {
        _count: {
          select: {
            employees: true,
            machines: true,
            production_orders: true,
            user_companies: true,
          },
        },
        user_companies: {
          where: { role: 'ADMIN' },
          include: {
            users: {
              select: {
                email: true,
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const revenueRows = await this.prisma.financial_transactions.groupBy({
      by: ['company_id'],
      where: {
        type: 'revenue',
        date: {
          gte: startOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const revenueByCompany = new Map<string, number>(
      revenueRows.map((row) => [row.company_id, Number(row._sum.amount ?? 0)]),
    );

    const list = companies
      .map((company) => {
        const plan = this.normalizePlan(company.plan || 'basic');
        const status = company.plan === 'deleted'
          ? 'deleted'
          : company.active
            ? company._count.user_companies > 0
              ? 'active'
              : 'pending'
            : 'paused';

        const usagePercent = this.computeUsagePercent(plan, {
          employees: company._count.employees,
          machines: company._count.machines,
          orders: company._count.production_orders,
        });

        const adminMember = company.user_companies[0];
        const adminEmail = adminMember?.users?.email || null;

        const activationLink =
          status === 'pending' && adminEmail
            ? `${process.env.FRONTEND_URL || 'https://studio--base-17793905-8ce2e.us-central1.hosted.app'}/ativar-conta?email=${encodeURIComponent(
                adminEmail,
              )}&company=${encodeURIComponent(company.name)}`
            : null;

        return {
          id: company.id,
          name: company.name,
          cnpj: company.cnpj,
          plan,
          trial: false,
          status,
          usagePercent,
          monthRevenue: revenueByCompany.get(company.id) || 0,
          adminEmail,
          activationLink,
          createdAt: company.created_at,
          updatedAt: company.updated_at,
        };
      })
      .filter((company) => company.status !== 'deleted');

    const metrics = {
      totalCompanies: list.length,
      activeCompanies: list.filter((company) => company.status === 'active').length,
      pausedCompanies: list.filter((company) => company.status === 'paused').length,
      monthRevenue: list.reduce((sum, company) => sum + company.monthRevenue, 0),
    };

    return { metrics, companies: list };
  }

  async getAdminDetails(id: string) {
    const company = await this.prisma.companies.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            machines: true,
            production_orders: true,
            user_companies: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthRevenue, latestOrders, subscriptionHistory] = await Promise.all([
      this.prisma.financial_transactions.aggregate({
        where: {
          company_id: id,
          type: 'revenue',
          date: {
            gte: startOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.production_orders.findMany({
        where: { company_id: id },
        select: {
          id: true,
          number: true,
          status: true,
          quantity: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
      this.prisma.subscription_history.findMany({
        where: { company_id: id },
        orderBy: { created_at: 'desc' },
        take: 12,
      }),
    ]);

    return {
      company: {
        id: company.id,
        name: company.name,
        cnpj: company.cnpj,
        plan: this.normalizePlan(company.plan || 'basic'),
        active: company.active,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
      },
      stats: {
        employees: company._count.employees,
        machines: company._count.machines,
        orders: company._count.production_orders,
        users: company._count.user_companies,
        monthRevenue: Number(monthRevenue._sum.amount ?? 0),
      },
      usageHistory: {
        latestOrders,
        subscriptionHistory,
      },
    };
  }

  async bootstrapAdminCompany(payload: AdminBootstrapPayload) {
    const companyName = payload?.name?.trim();
    const adminEmail = payload?.adminEmail?.trim().toLowerCase();
    const adminName = payload?.adminName?.trim();
    const cnpj = payload?.cnpj?.trim() || null;
    const plan = this.normalizePlan(payload?.plan);
    const isTrial = Boolean(payload?.trial);

    if (!companyName || !adminEmail) {
      throw new NotFoundException('Nome da empresa e email do admin são obrigatórios');
    }

    const auth = getAuth();
    let userRecord: any;
    let isNewUser = false;

    try {
      userRecord = await auth.getUserByEmail(adminEmail);
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        isNewUser = true;
        userRecord = await auth.createUser({
          email: adminEmail,
          displayName: adminName || `Admin ${companyName}`,
          password: Math.random().toString(36).slice(-10),
        });
      } else {
        throw error;
      }
    }

    let company: { id: string; name: string; cnpj: string | null };
    try {
      company = await this.prisma.$transaction(async (tx) => {
        const createdCompany = await tx.companies.create({
          data: {
            name: companyName,
            cnpj,
            plan,
            active: true,
          },
        });

        await tx.users.upsert({
          where: { id: userRecord.uid },
          update: {
            email: adminEmail,
            name: adminName || userRecord.displayName || null,
            role: 'ADMIN',
            company_id: createdCompany.id,
            updated_at: new Date(),
          },
          create: {
            id: userRecord.uid,
            email: adminEmail,
            name: adminName || userRecord.displayName || null,
            role: 'ADMIN',
            company_id: createdCompany.id,
          },
        });

        await tx.user_companies.upsert({
          where: {
            user_id_company_id: {
              user_id: userRecord.uid,
              company_id: createdCompany.id,
            },
          },
          update: {
            role: 'ADMIN',
          },
          create: {
            user_id: userRecord.uid,
            company_id: createdCompany.id,
            role: 'ADMIN',
          },
        });

        if (isTrial) {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 14);

          await tx.subscription_history.create({
            data: {
              company_id: createdCompany.id,
              data: {
                event: 'trial_started',
                plan,
                endsAt: trialEndsAt.toISOString(),
              },
            },
          });
        }

        return {
          id: createdCompany.id,
          name: createdCompany.name,
          cnpj: createdCompany.cnpj,
        };
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(', ') : 'campo único';
        throw new ConflictException(`Já existe um registro com valor duplicado em: ${target}`);
      }
      throw error;
    }

    let claimsUpdated = true;
    let claimsErrorMessage: string | null = null;

    try {
      await auth.setCustomUserClaims(userRecord.uid, {
        role: 'ADMIN',
        companyId: company.id,
        permissions: [
          'companies:read',
          'companies:write',
          'users:manage',
          'production:read',
          'production:write',
          'financial:read',
        ],
      });
    } catch (error: any) {
      claimsUpdated = false;
      claimsErrorMessage = error?.message || 'Falha ao atualizar custom claims';
      console.error('[companies.bootstrapAdminCompany] warning: company created but failed to update claims', {
        companyId: company.id,
        userId: userRecord.uid,
        error: claimsErrorMessage,
      });
    }

    const activationLink = isNewUser
      ? `${process.env.FRONTEND_URL || 'https://studio--base-17793905-8ce2e.us-central1.hosted.app'}/ativar-conta?email=${encodeURIComponent(
          adminEmail,
        )}&company=${encodeURIComponent(companyName)}`
      : null;

    return {
      company: {
        id: company.id,
        name: company.name,
        cnpj: company.cnpj,
        plan,
        trial: isTrial,
      },
      admin: {
        uid: userRecord.uid,
        email: adminEmail,
        isNewUser,
      },
      activationLink,
      status: isNewUser ? 'pending' : 'active',
      claimsUpdated,
      warning: claimsUpdated ? null : 'Empresa criada, porém as permissões do usuário precisam ser sincronizadas novamente no próximo login.',
      claimsError: claimsErrorMessage,
    };
  }

  async pauseCompany(id: string) {
    const existing = await this.prisma.companies.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.prisma.companies.update({
      where: { id },
      data: {
        active: false,
        updated_at: new Date(),
      },
    });
  }

  async reactivateCompany(id: string) {
    const existing = await this.prisma.companies.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.prisma.companies.update({
      where: { id },
      data: {
        active: true,
        plan: existing.plan === 'deleted' ? 'basic' : existing.plan,
        updated_at: new Date(),
      },
    });
  }

  async softDeleteCompany(id: string) {
    const existing = await this.prisma.companies.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.prisma.companies.update({
      where: { id },
      data: {
        active: false,
        plan: 'deleted',
        updated_at: new Date(),
      },
    });
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return this.prisma.companies.findMany({
        orderBy: { name: 'asc' },
      });
    }

    const company = await this.prisma.companies.findFirst({
      where: {
        id: companyId,
      },
    });

    return company ? [company] : [];
  }

  async findById(id: string, companyId: string) {
    if (companyId && id !== companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const company = await this.prisma.companies.findFirst({
      where: {
        id,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async createItem(data: any, companyId: string) {
    const name = typeof data?.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new NotFoundException('Nome da empresa é obrigatório');
    }

    return this.prisma.companies.create({
      data: {
        name,
        cnpj: typeof data?.cnpj === 'string' ? data.cnpj : null,
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (companyId && id !== companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const updateData: { name?: string } = {};
    if (typeof data?.name === 'string' && data.name.trim()) {
      updateData.name = data.name.trim();
    }

    const existing = await this.prisma.companies.findFirst({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.prisma.companies.update({
      where: { id },
      data: {
        ...updateData,
        cnpj: typeof data?.cnpj === 'string' ? data.cnpj : existing.cnpj,
      },
    });
  }

  async deleteItem(id: string, companyId: string) {
    if (companyId && id !== companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.companies.findFirst({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Empresa não encontrada');
    }

    await this.prisma.companies.delete({
      where: { id },
    });

    return { id };
  }
}
