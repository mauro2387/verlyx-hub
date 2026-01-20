import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { TemplateType } from './create-pdf-template.dto';

export class FilterPdfTemplatesDto {
  @IsEnum(TemplateType)
  @IsOptional()
  template_type?: TemplateType;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
