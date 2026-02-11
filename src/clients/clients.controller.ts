import { Body, Controller, Delete, Get, Post, Query, Req, Param, Patch } from "@nestjs/common";
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @Roles("admin", "manager", "operator")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    // Validação defensiva do parâmetro limit (Min: 1, Max: 500, Default: 200)
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    
    return this.clientsService.list(req, parsedLimit);
  }

  @Get(":id")
  @Roles("admin", "manager", "operator")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.clientsService.getById(req, id);
  }

  @Post()
  @Roles("admin", "manager")
  async create(@Req() req: AuthRequest, @Body() dto: CreateClientDto) {
    return this.clientsService.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.clientsService.remove(req, id);
  }
}
