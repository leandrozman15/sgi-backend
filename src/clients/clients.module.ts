import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ClientService } from './clients.service';
import { ClientController } from './clients.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService]
})
export class ClientModule {}
