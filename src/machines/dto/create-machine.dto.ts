import { IsOptional, IsString, IsObject } from "class-validator";

export class CreateMachineDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  data?: any;
}
