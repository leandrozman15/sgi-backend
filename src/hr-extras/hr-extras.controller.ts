import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { HrExtrasService } from "./hr-extras.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("hr-extras")
export class HrExtrasController {
  constructor(private readonly service: HrExtrasService) {}

  @Get("vacations")
  @Roles("admin", "manager")
  async listVacations(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    return this.service.listVacations(req, parseInt(limit || "200", 10));
  }

  @Post("vacations")
  @Roles("admin", "manager")
  async createVacation(@Req() req: AuthRequest, @Body() dto: any) {
    return this.service.createVacation(req, dto);
  }

  @Patch("vacations/:id")
  @Roles("admin", "manager")
  async updateVacation(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: any) {
    return this.service.updateVacation(req, id, dto);
  }

  @Delete("vacations/:id")
  @Roles("admin")
  async removeVacation(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.service.removeVacation(req, id);
  }

  @Get("epis")
  @Roles("admin", "manager")
  async listEpis(@Req() req: AuthRequest) {
    return this.service.listEpiDeliveries(req);
  }

  @Post("epis")
  @Roles("admin", "manager")
  async createEpi(@Req() req: AuthRequest, @Body() dto: any) {
    return this.service.createEpiDelivery(req, dto);
  }

  @Get("attendance")
  @Roles("admin", "manager")
  async listAttendance(@Req() req: AuthRequest) {
    return this.service.listAttendance(req);
  }

  @Post("attendance")
  @Roles("admin", "manager")
  async createAttendance(@Req() req: AuthRequest, @Body() dto: any) {
    return this.service.createAttendance(req, dto);
  }

  @Get("accidents")
  @Roles("admin", "manager")
  async listAccidents(@Req() req: AuthRequest) {
    return this.service.listAccidents(req);
  }

  @Post("accidents")
  @Roles("admin", "manager")
  async createAccident(@Req() req: AuthRequest, @Body() dto: any) {
    return this.service.createAccident(req, dto);
  }
}
