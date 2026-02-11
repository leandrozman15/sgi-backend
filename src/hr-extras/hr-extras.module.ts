import { Module } from "@nestjs/common";
import { HrExtrasController } from "./hr-extras.controller";
import { HrExtrasService } from "./hr-extras.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [HrExtrasController],
  providers: [HrExtrasService],
})
export class HrExtrasModule {}
