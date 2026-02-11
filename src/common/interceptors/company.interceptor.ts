import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { Request } from "express";

@Injectable()
export class CompanyInterceptor implements NestInterceptor {
  /** Rotas que não exigem o header X-Company-Id */
  private readonly publicPaths = [
    "/health",
    "/me",
    "/companies",
    "/internal",
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { companyId?: string }>();

    const path = request.url;

    if (this.publicPaths.some((p) => path.startsWith(p))) {
      return next.handle();
    }

    const companyId =
      request.headers["x-company-id"] ||
      request.headers["X-Company-Id"];

    if (!companyId || typeof companyId !== "string" || !companyId.trim()) {
      throw new BadRequestException(
        "Missing required header: X-Company-Id"
      );
    }

    // Injeta o companyId na raiz do objeto de request para uso nos controllers
    request.companyId = companyId;

    return next.handle();
  }
}
