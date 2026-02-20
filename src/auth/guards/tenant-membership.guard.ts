import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(
    private db: DatabaseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    
    if (!user?.uid) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    const companyId = req.headers['x-company-id'] as string;

    if (!companyId) {
      return true;
    }

    // Buscar membresía con SQL directo
    const sql = `
      SELECT m.*, 
             row_to_json(c.*) as company
      FROM "Membership" m
      JOIN "Company" c ON c.id = m."companyId"
      WHERE m."userId" = $1 
        AND m."companyId" = $2 
        AND m."deletedAt" IS NULL
    `;
    
    const membership = await this.db.queryOne(sql, [user.uid, companyId]);

    if (!membership) {
      throw new ForbiddenException('Usuário não pertence a esta empresa');
    }

    req.tenant = {
      uid: user.uid,
      email: user.email,
      companyId,
      roles: membership.roles,
    };

    return true;
  }
}
