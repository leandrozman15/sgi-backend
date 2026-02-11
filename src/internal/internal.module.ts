import { Module } from "@nestjs/common";
import { InternalController } from "./internal.controller";
import { InternalService } from "./internal.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}
