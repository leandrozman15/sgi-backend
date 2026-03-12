import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard that protects internal/admin endpoints with a shared API secret.
 * Requires header: x-internal-secret: <INTERNAL_API_SECRET>
 *
 * If INTERNAL_API_SECRET is not set, all requests are denied.
 */
@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('INTERNAL_API_SECRET');
    if (!secret) {
      throw new ForbiddenException('Internal endpoints disabled (no secret configured)');
    }

    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-internal-secret'];

    if (!provided || provided !== secret) {
      throw new ForbiddenException('Invalid internal API secret');
    }

    return true;
  }
}
