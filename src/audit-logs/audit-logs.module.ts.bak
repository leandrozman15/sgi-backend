import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-logs.service';
import { AuditLogController } from './audit-logs.controller';

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
