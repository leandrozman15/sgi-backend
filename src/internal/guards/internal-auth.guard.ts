import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.uid) {
      throw new ForbiddenException("Não autenticado.");
    }

    // O seu UID específico é sempre permitido
    const MASTER_ADMIN_UID = "HOR0BYhNFjSyJmrPKWySk8vdz6y2";
    
    const allowedUidsRaw = this.config.get<string>("SUPER_ADMIN_UIDS") || "";
    const allowedUids = allowedUidsRaw.split(",").map((uid) => uid.trim());

    if (user.uid !== MASTER_ADMIN_UID && !allowedUids.includes(user.uid)) {
      console.warn(`[Bootstrap] Tentativa de acesso negada para UID: ${user.uid}`);
      throw new ForbiddenException("Acesso negado: UID não autorizado.");
    }

    const bootstrapSecret = this.config.get<string>("BOOTSTRAP_SECRET") || process.env.BOOTSTRAP_SECRET;
    const incomingSecret = request.headers["x-bootstrap-secret"];

    if (bootstrapSecret && incomingSecret !== bootstrapSecret) {
      console.warn(`[Bootstrap] Secret inválido fornecido por UID: ${user.uid}`);
      throw new ForbiddenException("Acesso negado: Secret inválido.");
    }

    return true;
  }
}
