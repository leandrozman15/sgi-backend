import { IsOptional, IsString, IsBoolean, IsObject } from "class-validator";

export class CreateProductDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsObject()
  data?: any;
}
