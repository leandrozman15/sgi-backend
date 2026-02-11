import { Body, Controller, Delete, Get, Post, Query, Req, Param, Patch } from "@nestjs/common";
import { ProductionOrdersService } from "./production-orders.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("production-orders")
export class ProductionOrdersController {
  constructor(private readonly ordersService: ProductionOrdersService) {}

  @Get()
  @Roles("admin", "manager", "operator")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string, @Query("archived") archived?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    const isArchived = archived === "true";
    return this.ordersService.list(req, parsedLimit, isArchived);
  }

  @Get(":id")
  @Roles("admin", "manager", "operator")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.ordersService.getById(req, id);
  }

  @Post()
  @Roles("admin", "manager")
  async create(@Req() req: AuthRequest, @Body() dto: any) {
    return this.ordersService.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager", "operator")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: any) {
    return this.ordersService.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.ordersService.remove(req, id);
  }
}
