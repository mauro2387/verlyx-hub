import { IsString, IsOptional, IsBoolean, IsUUID, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePageDto {
  @ApiProperty({ description: 'ID del workspace' })
  @IsUUID()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'ID de la página padre (para jerarquía)' })
  @IsOptional()
  @IsUUID()
  parentPageId?: string;

  @ApiProperty({ description: 'Título de la página' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Icono (emoji)' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'URL de imagen de portada' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'Es pública', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Es template', default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Tipo de template' })
  @IsOptional()
  @IsString()
  templateType?: string;

  @ApiPropertyOptional({ description: 'Permitir comentarios', default: true })
  @IsOptional()
  @IsBoolean()
  canComment?: boolean;

  @ApiPropertyOptional({ description: 'Otros pueden editar', default: false })
  @IsOptional()
  @IsBoolean()
  canEditByOthers?: boolean;
}
