import { Body, Controller, Get, Param, Post, Req, Delete } from "@nestjs/common";
import { WarehouseService } from "./warehouse.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("warehouse")
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get("locations")
  @Roles("admin", "manager", "operator")
  async listLocations(@Req() req: AuthRequest) {
    return this.warehouseService.listLocations(req);
  }

  @Post("locations/:locationId")
  @Roles("admin", "manager", "operator")
  async updateLocation(@Req() req: AuthRequest, @Param("locationId") locationId: string, @Body() dto: any) {
    return this.warehouseService.updateLocation(req, locationId, dto);
  }

  @Delete("locations/:locationId")
  @Roles("admin", "manager", "operator")
  async freeLocation(@Req() req: AuthRequest, @Param("locationId") locationId: string) {
    return this.warehouseService.freeLocation(req, locationId);
  }
}
