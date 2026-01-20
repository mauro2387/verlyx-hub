import { IsString, IsOptional, IsInt, IsUUID, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BlockType {
  PARAGRAPH = 'paragraph',
  HEADING_1 = 'heading_1',
  HEADING_2 = 'heading_2',
  HEADING_3 = 'heading_3',
  BULLETED_LIST = 'bulleted_list',
  NUMBERED_LIST = 'numbered_list',
  TODO = 'todo',
  TOGGLE = 'toggle',
  QUOTE = 'quote',
  DIVIDER = 'divider',
  CALLOUT = 'callout',
  CODE = 'code',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
  EMBED = 'embed',
  TABLE = 'table',
  TABLE_ROW = 'table_row',
  BOOKMARK = 'bookmark',
  LINK_TO_PAGE = 'link_to_page',
}

export class CreateBlockDto {
  @ApiProperty({ description: 'ID de la página' })
  @IsUUID()
  pageId: string;

  @ApiPropertyOptional({ description: 'ID del bloque padre (para nested)' })
  @IsOptional()
  @IsUUID()
  parentBlockId?: string;

  @ApiProperty({ enum: BlockType, description: 'Tipo de bloque' })
  @IsEnum(BlockType)
  type: BlockType;

  @ApiProperty({ description: 'Contenido en formato JSON' })
  @IsObject()
  content: Record<string, any>;

  @ApiPropertyOptional({ description: 'Orden del bloque', default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ description: 'Nivel de indentación', default: 0 })
  @IsOptional()
  @IsInt()
  indentLevel?: number;
}
