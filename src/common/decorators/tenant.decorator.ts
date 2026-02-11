import { createParamDecorator, ExecutionContext } from "@nestjs/common";

type AuthedReq = Request & {
  companyId?: string;
  membershipRoles?: string[];
};

export const CompanyId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<AuthedReq>();
  return req.companyId;
});

export const MembershipRoles = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<AuthedReq>();
  return req.membershipRoles ?? [];
});
