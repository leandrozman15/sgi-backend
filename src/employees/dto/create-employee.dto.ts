import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsObject } from "class-validator";

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsString()
  @IsNotEmpty()
  accessLevel!: string;

  @IsOptional()
  @IsBoolean()
  hasAccess?: boolean;

  @IsOptional()
  @IsObject()
  data?: any;
}
