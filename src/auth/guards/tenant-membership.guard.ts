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
    const companyId = request.params.companyId || request.body.companyId;

    if (!user || !companyId) {
      throw new ForbiddenException('Acesso negado');
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