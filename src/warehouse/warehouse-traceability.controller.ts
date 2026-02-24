import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WarehouseTraceabilityService } from './warehouse-traceability.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { UserRole } from '../types/roles';

@Controller('warehouse-traceability')
@UseGuards(AuthGuard, RolesGuard)
export class WarehouseTraceabilityController {
  constructor(private readonly service: WarehouseTraceabilityService) {}

  @Get('lots')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listLots(@Tenant() companyId: string, @Query() query: any) {
    return this.service.listLots(companyId, query);
  }

  @Get('lots/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getLotById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.getLotById(id, companyId);
  }

  @Post('lots')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createLot(@Body() payload: any, @Tenant() companyId: string) {
    return this.service.createLot(payload, companyId);
  }

  @Put('lots/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async updateLot(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateLot(id, payload, companyId);
  }

  @Delete('lots/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async deleteLot(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteLot(id, companyId);
  }

  @Get('positions')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listPositions(@Tenant() companyId: string, @Query() query: any) {
    return this.service.listPositions(companyId, query);
  }

  @Get('positions/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getPositionById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.getPositionById(id, companyId);
  }

  @Post('positions')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createPosition(@Body() payload: any, @Tenant() companyId: string) {
    return this.service.createPosition(payload, companyId);
  }

  @Put('positions/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async updatePosition(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updatePosition(id, payload, companyId);
  }

  @Delete('positions/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async deletePosition(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deletePosition(id, companyId);
  }

  @Get('reservations')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listReservations(@Tenant() companyId: string, @Query() query: any) {
    return this.service.listReservations(companyId, query);
  }

  @Get('reservations/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getReservationById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.getReservationById(id, companyId);
  }

  @Post('reservations')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createReservation(@Body() payload: any, @Tenant() companyId: string) {
    return this.service.createReservation(payload, companyId);
  }

  @Put('reservations/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async updateReservation(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateReservation(id, payload, companyId);
  }

  @Delete('reservations/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async deleteReservation(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteReservation(id, companyId);
  }

  @Get('movements')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listMovements(@Tenant() companyId: string, @Query() query: any) {
    return this.service.listMovements(companyId, query);
  }

  @Get('movements/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getMovementById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.getMovementById(id, companyId);
  }

  @Post('movements')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createMovement(@Body() payload: any, @Tenant() companyId: string) {
    return this.service.createMovement(payload, companyId);
  }

  @Put('movements/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async updateMovement(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateMovement(id, payload, companyId);
  }

  @Delete('movements/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async deleteMovement(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteMovement(id, companyId);
  }
}
