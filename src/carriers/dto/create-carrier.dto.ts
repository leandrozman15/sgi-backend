import { IsOptional, IsString, IsObject } from "class-validator";

export class CreateCarrierDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsObject()
  data?: any;
}
