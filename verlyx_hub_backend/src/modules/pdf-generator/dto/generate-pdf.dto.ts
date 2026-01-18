import { IsString, IsNotEmpty, IsObject, IsOptional, IsUUID } from 'class-validator';

export class GeneratePdfDto {
  @IsUUID()
  @IsNotEmpty()
  template_id: string;

  @IsString()
  @IsNotEmpty()
  file_name: string;

  @IsObject()
  document_data: Record<string, any>;

  @IsUUID()
  @IsOptional()
  related_contact_id?: string;

  @IsUUID()
  @IsOptional()
  related_project_id?: string;

  @IsString()
  @IsOptional()
  created_by?: string;
}
