import { Controller, Get, Query, Req } from "@nestjs/common";
import { VendasService } from "./vendas.service";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("vendas")
export class VendasController {
  constructor(private readonly vendas: VendasService) {}

  @Roles("admin", "manager")
  @Get()
  listar(@Req() req: any, @Query("limit") limit?: string) {
    // O FirebaseTenantGuard já garantiu que companyId existe e é válido
    const { companyId } = req.tenant;
    const n = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : 50;
    return this.vendas.listar(companyId, n);
  }
}
