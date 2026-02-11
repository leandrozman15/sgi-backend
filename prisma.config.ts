import "dotenv/config";
import { defineConfig } from "@prisma/config";

/**
 * @fileOverview Configuração externa do Prisma para a versão 7.3.0+.
 * Gerencia a URL de conexão do banco de dados separada do schema.prisma.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
