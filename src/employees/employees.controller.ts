import { Body, Controller, Delete, Get, Post, Query, Req, Param, Patch } from "@nestjs/common";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("employees")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles("admin", "manager")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    return this.employeesService.list(req, parsedLimit);
  }

  @Get(":id")
  @Roles("admin", "manager")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.employeesService.getById(req, id);
  }

  @Post()
  @Roles("admin")
  async create(@Req() req: AuthRequest, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.employeesService.remove(req, id);
  }
}
