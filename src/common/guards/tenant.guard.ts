import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

type AuthedReq = any & {
  user?: { uid: string; email?: string | null };
  companyId?: string;
  membershipRoles?: string[];
};

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedReq>();

    const uid = req.user?.uid;
    if (!uid) throw new UnauthorizedException("Missing auth user");

    const raw = req.headers["x-company-id"];
    const companyId = Array.isArray(raw) ? raw[0] : raw;

    if (!companyId || typeof companyId !== "string" || !companyId.trim()) {
      throw new ForbiddenException("Missing X-Company-Id header");
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId: uid, companyId },
      select: { roles: true },
    });

    if (!membership) throw new ForbiddenException("No membership for this company");

    req.companyId = companyId;
    req.membershipRoles = membership.roles;

    return true;
  }
}
