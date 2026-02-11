import { Body, Controller, Delete, Get, Post, Query, Req, Param, Patch } from "@nestjs/common";
import { SalesService } from "./sales.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @Roles("admin", "manager", "vendedor")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    return this.salesService.list(req, parsedLimit);
  }

  @Get("tax-summary")
  @Roles("admin", "manager")
  async getTaxSummary(
    @Req() req: AuthRequest,
    @Query("startDate") start: string,
    @Query("endDate") end: string
  ) {
    return this.salesService.getTaxSummary(req, new Date(start), new Date(end));
  }

  @Get("journal")
  @Roles("admin", "manager")
  async getSalesJournal(
    @Req() req: AuthRequest,
    @Query("startDate") start: string,
    @Query("endDate") end: string
  ) {
    return this.salesService.getSalesJournal(req, new Date(start), new Date(end));
  }

  @Get(":id")
  @Roles("admin", "manager", "vendedor")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.salesService.getById(req, id);
  }

  @Post()
  @Roles("admin", "manager", "vendedor")
  async create(@Req() req: AuthRequest, @Body() dto: any) {
    return this.salesService.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager", "vendedor")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: any) {
    return this.salesService.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.salesService.remove(req, id);
  }
}
