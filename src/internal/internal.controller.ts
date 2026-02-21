import { Controller, Post, Body } from '@nestjs/common';
import { InternalService } from './internal.service';
import { BootstrapCompanyDto } from './dto/bootstrap-company.dto';

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('bootstrap-company')
  async bootstrapCompany(@Body() dto: BootstrapCompanyDto) {
    return this.internalService.bootstrapCompany(dto);
  }
}
