export type TenantContext = {
  uid: string;
  email?: string | null;
  companyId?: string;
  roles: string[];
};

export type AuthUser = { uid: string; email?: string | null };
