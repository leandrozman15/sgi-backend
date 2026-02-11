import { Body, Controller, Delete, Get, Post, Query, Req, Param, Patch } from "@nestjs/common";
import { SaleQuotesService } from "./sale-quotes.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("sale-quotes")
export class SaleQuotesController {
  constructor(private readonly saleQuotesService: SaleQuotesService) {}

  @Get()
  @Roles("admin", "manager", "vendedor")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    return this.saleQuotesService.list(req, parsedLimit);
  }

  @Get(":id")
  @Roles("admin", "manager", "vendedor")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.saleQuotesService.getById(req, id);
  }

  @Post()
  @Roles("admin", "manager", "vendedor")
  async create(@Req() req: AuthRequest, @Body() dto: any) {
    return this.saleQuotesService.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager", "vendedor")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: any) {
    return this.saleQuotesService.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.saleQuotesService.remove(req, id);
  }
}