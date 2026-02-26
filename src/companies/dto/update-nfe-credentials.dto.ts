import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNfeCredentialsDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  personalToken?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  companyToken?: string | null;
}
