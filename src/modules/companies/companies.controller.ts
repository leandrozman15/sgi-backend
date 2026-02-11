import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";

@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateCompanyDto) {
    // Endpoints de gerenciamento de empresas usam apenas o UID (não dependem de um companyId no header)
    const { uid, email } = req.user;
    return this.companies.createCompany({ uid, email }, dto);
  }

  @Get()
  async list(@Req() req: any) {
    const { uid, email } = req.user;
    return this.companies.listCompanies({ uid, email });
  }
}
