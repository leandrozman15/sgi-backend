import { Request } from "express";

/**
 * @fileOverview Interface para requisições autenticadas no SGI.
 * Representa o estado do objeto Request após passar pelo FirebaseTenantGuard e CompanyInterceptor.
 */
export interface AuthRequest extends Request {
  /** Dados básicos do usuário vindos do Firebase Auth */
  user: {
    uid: string;
    email: string | null;
  };
  /** Contexto multi-tenant resolvido pelo Guard */
  tenant: {
    uid: string;
    email: string | null;
    companyId?: string;
    roles: string[];
  };
  /** ID da empresa ativa injetado pelo CompanyInterceptor */
  companyId: string;
}
