import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { NumberSequenceService } from './number-sequences.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('number-sequences')
@UseGuards(AuthGuard, RolesGuard)
export class NumberSequenceController {
  constructor(private readonly service: NumberSequenceService) {}

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async list(@Tenant() companyId: string) {
    return this.service.listAll(companyId);
  }

  @Put(':key')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async update(
    @Param('key') key: string,
    @Body() dto: any,
    @Tenant() companyId: string,
  ) {
    return this.service.upsert(companyId, key, dto || {});
  }

  @Delete(':key')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async remove(@Param('key') key: string, @Tenant() companyId: string) {
    return this.service.remove(companyId, key);
  }
}
