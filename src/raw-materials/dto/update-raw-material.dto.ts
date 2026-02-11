import { IsOptional, IsString, IsObject } from "class-validator";

export class UpdateRawMaterialDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsObject()
  data?: any;
}
