import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TenantMembershipGuard } from '../auth/guards/tenant-membership.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('users')
@UseGuards(FirebaseAuthGuard, TenantMembershipGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Tenant('companyId') companyId: string) {
    return this.usersService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.usersService.findOne(id, companyId);
  }

  @Post()
  create(@Body() createDto: any, @Tenant('companyId') companyId: string) {
    return this.usersService.create(createDto, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Tenant('companyId') companyId: string) {
    return this.usersService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.usersService.remove(id, companyId);
  }
}
