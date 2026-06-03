import { Module } from '@nestjs/common';
import { RecepcaoService } from './recepcao.service';
import { RecepcaoController } from './recepcao.controller';

@Module({
  controllers: [RecepcaoController],
  providers: [RecepcaoService],
  exports: [RecepcaoService],
})
export class RecepcaoModule {}
