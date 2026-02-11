import { Module } from "@nestjs/common";
import { RawMaterialsController } from "./raw-materials.controller";
import { RawMaterialsService } from "./raw-materials.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [RawMaterialsController],
  providers: [RawMaterialsService],
})
export class RawMaterialsModule {}
