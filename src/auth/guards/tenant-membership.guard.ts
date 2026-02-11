import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Request } from "express";
import { TenantContext } from "../auth.types";

/**
 * @fileOverview Guard responsável por validar se o usuário autenticado pertence à empresa solicitada.
 * Verifica a existência de um registro na tabela Membership vinculando o UID do Firebase ao CompanyId do header.
 */
@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: any; tenant?: TenantContext; companyId?: string }>();

    const userId = req.user?.uid;
    
    // Como os Guards rodam antes dos Interceptors, extraímos o header diretamente aqui
    const companyId = (req.headers["x-company-id"] as string) || (req.headers["X-Company-Id"] as string);

    // Se não houver companyId no header, permitimos o fluxo (Interceptors de rota pública tratarão a obrigatoriedade depois)
    if (!companyId) {
      return true;
    }

    if (!userId) {
      throw new UnauthorizedException("Usuário não autenticado no Firebase.");
    }

    // Busca membresia usando a constraint UNIQUE [userId, companyId] definida no Prisma
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      select: { roles: true },
    });

    if (!membership) {
      throw new ForbiddenException("Acesso negado: O usuário não possui membresia nesta empresa.");
    }

    // Resolve o contexto de tenant para uso posterior pelo RolesGuard e nos Controllers
    const tenant: TenantContext = {
      uid: userId,
      email: req.user.email,
      companyId,
      roles: membership.roles || [],
    };

    req.tenant = tenant;
    
    // Injeta companyId na raiz para compatibilidade com CompanyInterceptor
    req.companyId = companyId;

    return true;
  }
}
