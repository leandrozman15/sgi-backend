import { Body, Controller, Delete, Get, Post, Query, Req, Param, Patch } from "@nestjs/common";
import { MachinesService } from "./machines.service";
import { CreateMachineDto } from "./dto/create-machine.dto";
import { UpdateMachineDto } from "./dto/update-machine.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("machines")
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  @Roles("admin", "manager", "operator")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    return this.machinesService.list(req, parsedLimit);
  }

  @Get(":id")
  @Roles("admin", "manager", "operator")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.machinesService.getById(req, id);
  }

  @Post()
  @Roles("admin", "manager")
  async create(@Req() req: AuthRequest, @Body() dto: CreateMachineDto) {
    return this.machinesService.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateMachineDto) {
    return this.machinesService.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.machinesService.remove(req, id);
  }
}
