import { IsOptional, IsString, IsObject } from "class-validator";

export class CreateRawMaterialDto {
  @IsString()
  nome!: string;

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
