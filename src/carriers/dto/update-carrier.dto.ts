import { IsOptional, IsString, IsObject } from "class-validator";

export class UpdateCarrierDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsObject()
  data?: any;
}
