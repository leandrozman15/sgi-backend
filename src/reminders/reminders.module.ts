import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { RemindersService } from './reminders.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, EmailModule],
  providers: [RemindersService],
})
export class RemindersModule {}
