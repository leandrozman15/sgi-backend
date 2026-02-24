import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  private getMasterUids(): string[] {
    const raw = process.env.MASTER_UIDS || process.env.MASTER_UID || 'HOR0BYhNFjSyJmrPKWySk8vdz6y2';
    return String(raw)
      .split(',')
      .map((uid) => uid.trim())
      .filter(Boolean);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ✅ VERIFICAR SI LA RUTA ES PÚBLICA
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Acesso negado');
    }

    const routePath = request.route?.path || '';
    const method = request.method;
    const isUserSessionRoute = method === 'GET' && (routePath === '/users/me' || routePath === '/users/session-init');
    const isCompaniesAdminRoute = routePath.startsWith('/companies/admin');
    if (isUserSessionRoute || isCompaniesAdminRoute) {
      return true;
    }

    const headerCompanyIdRaw = request.headers['x-company-id'];
    const headerCompanyId = Array.isArray(headerCompanyIdRaw)
      ? headerCompanyIdRaw[0]
      : headerCompanyIdRaw;

    const companyId =
      request.params.companyId ||
      request.body.companyId ||
      request.query.companyId ||
      headerCompanyId ||
      user.companyId ||
      user.claims?.companyId;

    const userRole = String(user.role || user.claims?.role || '').toUpperCase();
    const isMasterByUid = this.getMasterUids().includes(String(user.uid || '').trim());
    const isMaster = userRole === 'MASTER' || isMasterByUid;

    if (!companyId) {
      if (isMaster) {
        return true;
      }
      throw new ForbiddenException('Acesso negado: companyId não informado');
    }

    if (isMaster) {
      return true;
    }

    try {
      const membership = await this.prisma.user_companies.findFirst({
        where: {
          user_id: user.uid,
          company_id: String(companyId),
        },
        select: {
          id: true,
        },
      });

      if (!membership) {
        throw new ForbiddenException('Usuário não pertence a esta empresa');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException('Usuário não pertence a esta empresa');
      }
      console.error('Erro ao verificar permissão de empresa:', error);
      throw new ForbiddenException('Erro ao verificar permissão de empresa');
    }
  }
}