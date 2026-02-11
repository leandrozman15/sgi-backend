import { Body, Controller, Delete, Get, Post, Query, Req, Param, Patch } from "@nestjs/common";
import { SuppliersService } from "./suppliers.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Roles("admin", "manager", "operator", "comprador")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    return this.suppliersService.list(req, parsedLimit);
  }

  @Get(":id")
  @Roles("admin", "manager", "operator", "comprador")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.suppliersService.getById(req, id);
  }

  @Post()
  @Roles("admin", "manager", "comprador")
  async create(@Req() req: AuthRequest, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager", "comprador")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.suppliersService.remove(req, id);
  }
}
