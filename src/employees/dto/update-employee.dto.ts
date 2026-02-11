import { IsBoolean, IsEmail, IsOptional, IsString, IsObject } from "class-validator";

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  accessLevel?: string;

  @IsOptional()
  @IsBoolean()
  hasAccess?: boolean;

  @IsOptional()
  @IsObject()
  data?: any;
}
