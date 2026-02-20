export enum UserRole {
  MASTER = 'master',
  ADMIN = 'admin',
  GERENTE = 'gerente',
  SUPERVISOR = 'supervisor',
  OPERADOR = 'operador',
  CONSULTOR = 'consultor'
}

export const RoleHierarchy: Record<UserRole, number> = {
  [UserRole.MASTER]: 100,
  [UserRole.ADMIN]: 80,
  [UserRole.GERENTE]: 60,
  [UserRole.SUPERVISOR]: 40,
  [UserRole.OPERADOR]: 20,
  [UserRole.CONSULTOR]: 10
};

export interface UserClaims {
  uid: string;
  email: string;
  role: UserRole;
  companyId: string;
  permissions: string[];
}
