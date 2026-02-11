import { Controller, Get, UseGuards } from "@nestjs/common";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { CompanyId, MembershipRoles } from "../common/decorators/tenant.decorator";

@Controller("tenant-debug")
@UseGuards(FirebaseAuthGuard, TenantGuard)
export class TenantDebugController {
  @Get()
  debug(@CompanyId() companyId: string, @MembershipRoles() roles: string[]) {
    return { companyId, roles };
  }
}
