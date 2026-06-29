import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EmailService } from './email.service';
import { EmailAssetsController } from './email-assets.controller';

@Module({
  imports: [PrismaModule],
  controllers: [EmailAssetsController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
