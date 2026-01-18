import { IsString, IsOptional, IsUUID, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskCommentDto {
  @ApiProperty({ description: 'ID de la tarea' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ description: 'ID de la empresa (my_company)' })
  @IsUUID()
  myCompanyId: string;

  @ApiProperty({ description: 'Contenido del comentario (Markdown)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Contenido HTML renderizado con @menciones' })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiPropertyOptional({ description: 'ID del comentario padre (para replies)', type: String })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;

  @ApiPropertyOptional({ description: 'IDs de usuarios mencionados', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentionedUsers?: string[];

  @ApiPropertyOptional({ description: 'Archivos adjuntos' })
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiPropertyOptional({ description: 'Reacciones {emoji: [user_ids]}' })
  @IsOptional()
  @IsObject()
  reactions?: Record<string, string[]>;
}
