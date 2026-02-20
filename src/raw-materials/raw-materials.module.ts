import { Module } from '@nestjs/common';
import { RawMaterialService } from './raw-materials.service';
import { RawMaterialController } from './raw-materials.controller';

@Module({
  controllers: [RawMaterialController],
  providers: [RawMaterialService],
  exports: [RawMaterialService],
})
export class RawMaterialModule {}
