import { Module } from "@nestjs/common";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";
import { SaleQuotesController } from "./sale-quotes.controller";
import { SaleQuotesService } from "./sale-quotes.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SalesController, SaleQuotesController],
  providers: [SalesService, SaleQuotesService],
  exports: [SalesService, SaleQuotesService],
})
export class SalesModule {}