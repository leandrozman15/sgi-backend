import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
