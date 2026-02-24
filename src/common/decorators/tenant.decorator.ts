import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const headerCompanyIdRaw = request.headers?.['x-company-id'];
    const headerCompanyId = Array.isArray(headerCompanyIdRaw)
      ? headerCompanyIdRaw[0]
      : headerCompanyIdRaw;

    return (
      request.params?.companyId ||
      request.body?.companyId ||
      request.query?.companyId ||
      headerCompanyId ||
      request.user?.companyId ||
      request.user?.claims?.companyId ||
      null
    );
  },
);
