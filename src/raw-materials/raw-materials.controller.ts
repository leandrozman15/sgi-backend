import { Body, Controller, Delete, Get, Post, Query, Req, Param, Patch } from "@nestjs/common";
import { RawMaterialsService } from "./raw-materials.service";
import { CreateRawMaterialDto } from "./dto/create-raw-material.dto";
import { UpdateRawMaterialDto } from "./dto/update-raw-material.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("raw-materials")
export class RawMaterialsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Get()
  @Roles("admin", "manager", "operator", "comprador")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    return this.rawMaterialsService.list(req, parsedLimit);
  }

  @Get(":id")
  @Roles("admin", "manager", "operator", "comprador")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.rawMaterialsService.getById(req, id);
  }

  @Post()
  @Roles("admin", "manager", "comprador")
  async create(@Req() req: AuthRequest, @Body() dto: CreateRawMaterialDto) {
    return this.rawMaterialsService.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager", "comprador")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateRawMaterialDto) {
    return this.rawMaterialsService.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.rawMaterialsService.remove(req, id);
  }
}
