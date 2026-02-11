import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { PurchaseRequestsService } from "./purchase-requests.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("purchase-requests")
export class PurchaseRequestsController {
  constructor(private readonly service: PurchaseRequestsService) {}

  @Get()
  @Roles("admin", "manager", "comprador")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    return this.service.list(req, parseInt(limit || "200", 10));
  }

  @Get(":id")
  @Roles("admin", "manager", "comprador")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.service.getById(req, id);
  }

  @Post()
  @Roles("admin", "manager", "comprador")
  async create(@Req() req: AuthRequest, @Body() dto: any) {
    return this.service.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager", "comprador")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: any) {
    return this.service.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.service.remove(req, id);
  }
}
