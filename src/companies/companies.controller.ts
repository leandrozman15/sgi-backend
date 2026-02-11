import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";

type AuthedRequest = Request & {
  user: { uid: string; email?: string | null };
};

@Controller("companies")
@UseGuards(FirebaseAuthGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Post()
  async create(@Req() req: AuthedRequest, @Body() dto: CreateCompanyDto) {
    return this.companies.createCompany(req.user, dto);
  }

  @Get()
  async list(@Req() req: AuthedRequest) {
    return this.companies.listCompanies(req.user);
  }
}
