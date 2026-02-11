import { IsOptional, IsString, Length, IsObject, IsArray } from "class-validator";

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  nome?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  nomeFantasia?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  cnpjCpf?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  cidade?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  uf?: string;

  @IsOptional()
  @IsString()
  inscricaoEstadual?: string;

  @IsOptional()
  @IsString()
  formasPagamento?: string;

  @IsOptional()
  @IsObject()
  endereco?: any;

  @IsOptional()
  @IsArray()
  contacts?: any[];
}
