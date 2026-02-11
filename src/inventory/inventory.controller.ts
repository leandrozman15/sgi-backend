import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("movements")
  @Roles("admin", "manager", "operator")
  async listMovements(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    return this.inventoryService.listMovements(req, parsedLimit);
  }

  @Post("movements")
  @Roles("admin", "manager", "operator")
  async createMovement(@Req() req: AuthRequest, @Body() dto: any) {
    return this.inventoryService.createMovement(req, dto);
  }
}
