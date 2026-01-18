import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';

export enum TemplateType {
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  QUOTE = 'quote',
  REPORT = 'report',
}

export class CreatePdfTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TemplateType)
  template_type: TemplateType;

  @IsObject()
  template_data: Record<string, any>;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  created_by?: string;
}
