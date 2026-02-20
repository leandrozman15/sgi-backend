import { IsString, IsEmail, IsOptional, Length } from 'class-validator';

export class BootstrapCompanyDto {
  @IsString()
  @Length(3, 100)
  companyName: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @IsOptional()
  @Length(2, 100)
  ownerName?: string;

  @IsString()
  @IsOptional()
  @Length(14, 18)
  cnpj?: string;
}
