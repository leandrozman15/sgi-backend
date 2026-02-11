import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { BankTransactionsService } from "./bank-transactions.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("finance/bank-transactions")
export class BankTransactionsController {
  constructor(private readonly service: BankTransactionsService) {}

  @Get()
  @Roles("admin", "manager")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = parseInt(limit || "200", 10);
    return this.service.list(req, parsedLimit);
  }

  @Post()
  @Roles("admin", "manager")
  async create(@Req() req: AuthRequest, @Body() dto: any) {
    return this.service.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: any) {
    return this.service.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.service.remove(req, id);
  }
}