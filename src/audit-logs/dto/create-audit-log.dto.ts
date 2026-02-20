
import { IsString, IsOptional, IsJSON } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  companyId: string;

  @IsString()
  user: string;

  @IsString()
  module: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsJSON()
  data?: any;
}
