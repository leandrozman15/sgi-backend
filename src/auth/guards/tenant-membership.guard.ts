import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../database/database.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(
    private db: DatabaseService,
    private reflector: Reflector,
  ) {}

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
    if (isUserSessionRoute) {
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
    const isMaster = userRole === 'MASTER';

    if (!companyId) {
      if (isMaster) {
        return true;
      }
      throw new ForbiddenException('Acesso negado: companyId não informado');
    }

    if (!isMaster && headerCompanyId && user.companyId && headerCompanyId !== user.companyId) {
      throw new ForbiddenException('x-company-id não coincide com o claim companyId');
    }

    if (isMaster) {
      return true;
    }

    try {
      const sql = 'SELECT * FROM user_companies WHERE user_id = $1 AND company_id = $2';
      const result = await this.db.query(sql, [user.uid, companyId]);

      if (result.rows.length === 0) {
        throw new ForbiddenException('Usuário não pertence a esta empresa');
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar permissão de empresa:', error);
      throw new ForbiddenException('Erro ao verificar permissão de empresa');
    }
  }
}