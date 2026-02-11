import { Module } from "@nestjs/common";
import { MachinesController } from "./machines.controller";
import { MachinesService } from "./machines.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MachinesController],
  providers: [MachinesService],
})
export class MachinesModule {}
