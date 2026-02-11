import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { QualityService } from "./quality.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("quality")
export class QualityController {
  constructor(private readonly service: QualityService) {}

  // --- Inspeções ---
  @Get("inspections")
  @Roles("admin", "manager", "operator")
  async listInspections(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = parseInt(limit || "200", 10);
    return this.service.listInspections(req, parsedLimit);
  }

  @Get("inspections/:id")
  @Roles("admin", "manager", "operator")
  async getInspection(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.service.getInspectionById(req, id);
  }

  @Post("inspections")
  @Roles("admin", "manager")
  async createInspection(@Req() req: AuthRequest, @Body() dto: any) {
    return this.service.createInspection(req, dto);
  }

  @Patch("inspections/:id")
  @Roles("admin", "manager", "operator")
  async updateInspection(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: any) {
    return this.service.updateInspection(req, id, dto);
  }

  @Delete("inspections/:id")
  @Roles("admin")
  async removeInspection(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.service.removeInspection(req, id);
  }

  // --- Reclamações ---
  @Get("complaints")
  @Roles("admin", "manager")
  async listComplaints(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = parseInt(limit || "200", 10);
    return this.service.listComplaints(req, parsedLimit);
  }

  @Post("complaints")
  @Roles("admin", "manager")
  async createComplaint(@Req() req: AuthRequest, @Body() dto: any) {
    return this.service.createComplaint(req, dto);
  }

  @Patch("complaints/:id")
  @Roles("admin", "manager")
  async updateComplaint(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: any) {
    return this.service.updateComplaint(req, id, dto);
  }

  @Delete("complaints/:id")
  @Roles("admin")
  async removeComplaint(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.service.removeComplaint(req, id);
  }

  // --- Calibrações ---
  @Get("calibrations")
  @Roles("admin", "manager", "operator")
  async listCalibrations(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = parseInt(limit || "200", 10);
    return this.service.listCalibrations(req, parsedLimit);
  }

  @Post("calibrations")
  @Roles("admin", "manager")
  async createCalibration(@Req() req: AuthRequest, @Body() dto: any) {
    return this.service.createCalibration(req, dto);
  }

  @Patch("calibrations/:id")
  @Roles("admin", "manager", "operator")
  async updateCalibration(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: any) {
    return this.service.updateCalibration(req, id, dto);
  }
}
