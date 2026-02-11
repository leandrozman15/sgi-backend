import { IsOptional, IsString, IsBoolean, IsObject } from "class-validator";

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsObject()
  data?: any;
}
