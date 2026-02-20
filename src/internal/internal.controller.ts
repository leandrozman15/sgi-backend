import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InternalService } from './internal.service';
import { BootstrapCompanyDto } from './dto/bootstrap-company.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('internal')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('bootstrap-company')
  @Roles('super-admin')
  @HttpCode(HttpStatus.CREATED)
  async bootstrapCompany(@Body() dto: BootstrapCompanyDto) {
    return this.internalService.bootstrapCompany(dto);
  }
}
