import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles("admin", "manager")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "50", 10) || 50, 1), 200);
    return this.auditLogsService.list(req, parsedLimit);
  }

  @Post()
  @Roles("admin", "manager")
  async create(@Req() req: AuthRequest, @Body() dto: any) {
    return this.auditLogsService.create(req, dto);
  }
}
