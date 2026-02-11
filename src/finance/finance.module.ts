import { Module } from "@nestjs/common";
import { BankTransactionsController } from "./bank-transactions.controller";
import { BankTransactionsService } from "./bank-transactions.service";
import { TaxPaymentsController } from "./tax-payments.controller";
import { TaxPaymentsService } from "./tax-payments.service";
import { SalaryPaymentsController } from "./salary-payments.controller";
import { SalaryPaymentsService } from "./salary-payments.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [
    BankTransactionsController,
    TaxPaymentsController,
    SalaryPaymentsController,
  ],
  providers: [
    BankTransactionsService,
    TaxPaymentsService,
    SalaryPaymentsService,
  ],
})
export class FinanceModule {}