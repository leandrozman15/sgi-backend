import { Body, Controller, Delete, Get, Post, Query, Req, Param, Patch } from "@nestjs/common";
import { CarriersService } from "./carriers.service";
import { CreateCarrierDto } from "./dto/create-carrier.dto";
import { UpdateCarrierDto } from "./dto/update-carrier.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("carriers")
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @Get()
  @Roles("admin", "manager", "operator", "comprador", "vendedor")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    return this.carriersService.list(req, parsedLimit);
  }

  @Get(":id")
  @Roles("admin", "manager", "operator")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.carriersService.getById(req, id);
  }

  @Post()
  @Roles("admin", "manager", "comprador")
  async create(@Req() req: AuthRequest, @Body() dto: CreateCarrierDto) {
    return this.carriersService.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager", "comprador")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateCarrierDto) {
    return this.carriersService.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.carriersService.remove(req, id);
  }
}
