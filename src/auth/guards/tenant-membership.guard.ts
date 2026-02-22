
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(private db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const companyId = request.params.companyId || request.body.companyId;

    if (!user || !companyId) {
      throw new ForbiddenException('Acesso negado');
    }

    try {
      // Verificar se o usuário pertence à empresa
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
