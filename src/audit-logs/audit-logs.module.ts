import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditLogService } from './audit-logs.service';
import { AuditLogController } from './audit-logs.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService]
})
export class AuditLogModule {}
