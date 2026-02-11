import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { InternalService } from "./internal.service";
import { InternalAuthGuard } from "./guards/internal-auth.guard";

@Controller("internal")
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post("bootstrap-company")
  async bootstrap(@Body() dto: {
    companyName: string;
    adminEmail: string;
    adminName?: string;
    cnpj?: string;
  }) {
    return this.internalService.bootstrapCompany(dto);
  }

  @Get("users")
  async listUsers() {
    return this.internalService.listUsers();
  }

  @Get("companies")
  async listCompanies() {
    return this.internalService.listCompanies();
  }
}
