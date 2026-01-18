import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PageType {
  PAGE = 'page',
  NOTE = 'note',
  GOAL = 'goal',
  CHECKLIST = 'checklist',
  BOARD = 'board',
}

export class CreateWorkspacePageDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ enum: PageType, default: PageType.PAGE })
  @IsEnum(PageType)
  pageType: PageType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  content?: any;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  position?: number;
}
